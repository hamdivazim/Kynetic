import type { Animation, AnimationProject, Drawable, Point } from "./types";

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_m, ch: string) => ch.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapKeysDeep(value: unknown, keyFn: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => mapKeysDeep(item, keyFn));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === null || item === undefined) continue;
      out[keyFn(key)] = mapKeysDeep(item, keyFn);
    }
    return out;
  }
  return value;
}

interface DrawableSpec {
  required: string[];
  defaults: Record<string, unknown>;
}

const ARROW_DEFAULTS = {
  arrowHeadType: "->",
  arrowHeadSize: 10,
  arrowHeadAngle: 45,
};

const DRAWABLE_SPECS: Record<Drawable["type"], DrawableSpec> = {
  math: {
    required: ["texExpression"],
    defaults: { fontSize: 96, fontName: "feasibly" },
  },
  text: {
    required: ["text"],
    defaults: { fontSize: 96, fontName: "feasibly" },
  },
  square: { required: ["sideLength"], defaults: {} },
  rectangle: { required: ["width", "height"], defaults: {} },
  line: { required: ["endPoint"], defaults: {} },
  polygon: { required: ["points"], defaults: {} },
  svg: { required: ["src"], defaults: { scaleX: 1, scaleY: 1 } },
  eraser: { required: ["objectsToErase"], defaults: {} },
  group: { required: [], defaults: { childrenIds: [] } },
  arrow: { required: ["startPoint", "endPoint"], defaults: ARROW_DEFAULTS },
  curved_arrow: { required: ["points"], defaults: ARROW_DEFAULTS },
  curve: { required: ["points"], defaults: {} },
  ellipse: { required: ["center", "width", "height"], defaults: {} },
  circle: { required: ["center", "radius"], defaults: {} },
  glow_dot: { required: ["center"], defaults: { radius: 1 } },
  ngon: { required: ["center", "radius", "n"], defaults: {} },
  rounded_rectangle: {
    required: ["topLeft", "width", "height"],
    defaults: { borderRadius: 0.1 },
  },
  rounded_square: {
    required: ["topLeft", "sideLength"],
    defaults: { borderRadius: 0.1 },
  },
};

const ANIMATION_TYPES: readonly Animation["type"][] = [
  "sketch",
  "fade_in",
  "fade_out",
  "zoom_out",
  "translate_to",
];


const CREATION_TYPES = new Set<Animation["type"]>(["sketch", "fade_in"]);

const SKETCHABLE_TYPES = new Set<Drawable["type"]>([
  "square",
  "rectangle",
  "line",
  "polygon",
  "curve",
  "arrow",
  "curved_arrow",
  "ellipse",
  "circle",
  "ngon",
  "rounded_rectangle",
  "rounded_square",
  "svg",
  "eraser",
]);

export function entranceAnimationFor(
  drawable: Drawable,
  startTime = 0,
  duration = 1,
): Animation {
  const type: Animation["type"] = SKETCHABLE_TYPES.has(drawable.type) ? "sketch" : "fade_in";
  return { type, targetId: drawable.id, startTime, duration } as Animation;
}

export function ensureEntranceEvents(project: AnimationProject): Animation[] {
  const emptyTimeline = project.timeline.length === 0;
  const covered = new Set<string>();
  const injected: Animation[] = [];

  for (const drawable of [...project.definitions].reverse()) {
    const ownCreation = project.timeline.some(
      (e) => e.targetId === drawable.id && CREATION_TYPES.has(e.type),
    );
    const createdElsewhere = covered.has(drawable.id);
    const willBeCreated = ownCreation || createdElsewhere;

    if (drawable.type === "group" && willBeCreated) {
      for (const childId of drawable.childrenIds) covered.add(childId);
    }
    if (willBeCreated) continue;

    const own = project.timeline.filter((e) => e.targetId === drawable.id);
    const firstStart = own.length > 0 ? Math.min(...own.map((e) => e.startTime)) : null;
    const duration = emptyTimeline ? 4 : SKETCHABLE_TYPES.has(drawable.type) ? 1 : 0.5;
    const startTime = firstStart === null ? 0 : Math.max(0, firstStart - duration);
    injected.push(entranceAnimationFor(drawable, startTime, duration));

    if (drawable.type === "group") {
      for (const childId of drawable.childrenIds) covered.add(childId);
    }
  }

  return [...project.timeline, ...injected].sort((a, b) => a.startTime - b.startTime);
}


function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPoint(value: unknown): value is Point {
  return isPlainObject(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}


function validatePointList(value: unknown, label: string, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} must have at least one point.`);
    return;
  }
  value.forEach((p, i) => {
    if (!isPoint(p)) errors.push(`${label}[${i}] must be a point with numeric x and y.`);
  });
}

function validateStyles(drawable: Drawable, errors: string[]): void {
  const label = `Node "${drawable.id}"`;
  if (drawable.strokeStyle) {
    if (!isNonEmptyString(drawable.strokeStyle.color)) errors.push(`${label}: stroke color is required.`);
    if (!isFiniteNumber(drawable.strokeStyle.width)) errors.push(`${label}: stroke width must be a number.`);
  }
  if (drawable.fillStyle && !isNonEmptyString(drawable.fillStyle.color)) {
    errors.push(`${label}: fill color is required.`);
  }
  if (drawable.glowDotHint && !isNonEmptyString(drawable.glowDotHint.color)) {
    errors.push(`${label}: glow dot color is required.`);
  }
}

export function validateProject(project: AnimationProject): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(project.name)) errors.push("Project name is required.");
  if (!isFiniteNumber(project.scene.width) || project.scene.width <= 0) {
    errors.push("Scene width must be a positive number.");
  }
  if (!isFiniteNumber(project.scene.height) || project.scene.height <= 0) {
    errors.push("Scene height must be a positive number.");
  }
  if (!isNonEmptyString(project.scene.backgroundColor)) {
    errors.push("Scene background color is required.");
  }

  const ids = new Set<string>();

  for (const drawable of project.definitions) {
    const label = `Node "${drawable.id || "(missing id)"}"`;

    if (!isNonEmptyString(drawable.id)) {
      errors.push("Every node needs a non-empty id.");
    } else if (ids.has(drawable.id)) {
      errors.push(`Duplicate node id "${drawable.id}".`);
    } else {
      ids.add(drawable.id);
    }

    const spec = DRAWABLE_SPECS[drawable.type];
    if (!spec) {
      errors.push(`${label} has unknown type "${String(drawable.type)}".`);
      continue;
    }

    const record = drawable as unknown as Record<string, unknown>;
    for (const key of spec.required) {
      const value = record[key];
      if (value === undefined || value === null) {
        errors.push(`${label}: "${key}" is required for a ${drawable.type} node.`);
      }
    }

    if (drawable.type === "polygon" || drawable.type === "curve" || drawable.type === "curved_arrow") {
      validatePointList(drawable.points, `${label}: points`, errors);
    }
    if (drawable.type === "line" && !isPoint(drawable.endPoint)) {
      errors.push(`${label}: end point must have numeric x and y.`);
    }
    if (drawable.type === "arrow") {
      if (!isPoint(drawable.startPoint)) errors.push(`${label}: start point must have numeric x and y.`);
      if (!isPoint(drawable.endPoint)) errors.push(`${label}: end point must have numeric x and y.`);
    }
    if (drawable.type === "math" && !isNonEmptyString(drawable.texExpression)) {
      errors.push(`${label}: TeX expression is required.`);
    }
    if (drawable.type === "text" && !isNonEmptyString(drawable.text)) {
      errors.push(`${label}: text content is required.`);
    }
    if (drawable.type === "svg" && !isNonEmptyString(drawable.src)) {
      errors.push(`${label}: src is required (an s3:// key or a file path).`);
    }
    if (drawable.type === "eraser" && drawable.objectsToErase.length === 0) {
      errors.push(`${label}: select at least one node to erase.`);
    }
    if (drawable.type === "group") {
      for (const childId of drawable.childrenIds) {
        if (!project.definitions.some((d) => d.id === childId)) {
          errors.push(`${label}: unknown child id "${childId}".`);
        }
      }
    }
    if (drawable.type === "eraser") {
      for (const targetId of drawable.objectsToErase) {
        if (!project.definitions.some((d) => d.id === targetId)) {
          errors.push(`${label}: unknown erase target "${targetId}".`);
        }
      }
    }

    validateStyles(drawable, errors);
  }

  project.timeline.forEach((event, index) => {
    const label = `Transition ${index + 1}`;
    if (!ids.has(event.targetId)) errors.push(`${label}: unknown target id "${event.targetId}".`);
    if (!isFiniteNumber(event.startTime) || event.startTime < 0) {
      errors.push(`${label}: start time must be a number ≥ 0.`);
    }
    if (!isFiniteNumber(event.duration) || event.duration <= 0) {
      errors.push(`${label}: duration must be a number > 0.`);
    }
    if (event.type === "translate_to" && !isPoint(event.destination)) {
      errors.push(`${label}: destination must have numeric x and y.`);
    }
  });

  return errors;
}

export type SchemaProject = ReturnType<typeof toSchemaProject>;

export function toSchemaProject(project: AnimationProject): unknown {
  return mapKeysDeep(project, toSnakeKey);
}

export function exportProjectJson(project: AnimationProject): string {
  const errors = validateProject(project);
  if (errors.length > 0) {
    throw new Error(`Project is not ready to export:\n- ${errors.join("\n- ")}`);
  }
  const exportable: AnimationProject = {
    ...project,
    timeline: ensureEntranceEvents(project),
  };
  return JSON.stringify(toSchemaProject(exportable), null, 2);
}


function normalizeDrawable(input: Record<string, unknown>): Drawable {
  const type = input.type;
  if (typeof type !== "string" || !(type in DRAWABLE_SPECS)) {
    throw new Error(`Unknown node type "${String(type)}".`);
  }
  if (!isNonEmptyString(input.id)) {
    throw new Error(`A "${type}" node is missing a valid id.`);
  }
  const spec = DRAWABLE_SPECS[type as Drawable["type"]];
  return {
    ...spec.defaults,
    ...input,
    type,
    id: input.id,
  } as unknown as Drawable;
}

function normalizeAnimation(input: Record<string, unknown>): Animation {
  const type = input.type;
  if (typeof type !== "string" || !ANIMATION_TYPES.includes(type as Animation["type"])) {
    throw new Error(`Unknown transition type "${String(type)}".`);
  }
  if (!isNonEmptyString(input.targetId)) {
    throw new Error(`A "${type}" transition is missing a target id.`);
  }
  if (!isFiniteNumber(input.startTime)) {
    throw new Error(`Transition for "${input.targetId}" is missing a start time.`);
  }
  if (!isFiniteNumber(input.duration)) {
    throw new Error(`Transition for "${input.targetId}" is missing a duration.`);
  }
  if (type === "translate_to") {
    if (!isPoint(input.destination)) {
      throw new Error(`translate_to transition for "${input.targetId}" is missing a destination.`);
    }
    return {
      ...input,
      type: "translate_to",
      persist: input.persist === true,
    } as unknown as Animation;
  }
  return { ...input, type } as unknown as Animation;
}

export function fromSchemaProject(raw: string | unknown): AnimationProject {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Project file is not valid JSON: ${message}`);
    }
  }

  const camel = mapKeysDeep(parsed, toCamelKey);
  if (!isPlainObject(camel)) {
    throw new Error("Project file must contain a JSON object.");
  }
  if (!isNonEmptyString(camel.name)) {
    throw new Error("Project file is missing a name.");
  }
  if (!isPlainObject(camel.scene)) {
    throw new Error("Project file is missing a scene configuration.");
  }
  if (!Array.isArray(camel.definitions)) {
    throw new Error("Project file is missing a definitions list.");
  }
  if (!Array.isArray(camel.timeline)) {
    throw new Error("Project file is missing a timeline list.");
  }

  const scene = camel.scene as Record<string, unknown>;

  return {
    name: camel.name,
    scene: {
      width: isFiniteNumber(scene.width) ? scene.width : 1920,
      height: isFiniteNumber(scene.height) ? scene.height : 1080,
      backgroundColor: isNonEmptyString(scene.backgroundColor) ? scene.backgroundColor : "white",
    },
    definitions: camel.definitions.map((d, i) => {
      if (!isPlainObject(d)) throw new Error(`Node ${i + 1} is not an object.`);
      return normalizeDrawable(d);
    }),
    timeline: camel.timeline.map((e, i) => {
      if (!isPlainObject(e)) throw new Error(`Transition ${i + 1} is not an object.`);
      return normalizeAnimation(e);
    }),
  };
}
