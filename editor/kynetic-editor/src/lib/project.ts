
import type {
  AnimationProject,
  Drawable,
  Animation,
  Point,
  StrokeStyle,
  FillStyle,
  SketchStyle,
  GlowDotHint,
} from "./types";
import { exportProjectJson } from "./serialise";

export function createProject(name: string): AnimationProject {
  return {
    name,
    scene: {
      width: 1920,
      height: 1080,
      backgroundColor: "white",
    },
    definitions: [],
    timeline: [],
  };
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export function formatForExport(project: AnimationProject): string {
  return exportProjectJson(project);
}

export function downloadJson(project: AnimationProject, filename: string): void {
  const tether = typeof window !== "undefined" && typeof document !== "undefined";
  if (!tether) return;

  const blob = new Blob([formatForExport(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isDrawableIdUsed(project: AnimationProject, id: string): boolean {
  return project.definitions.some((d) => d.id === id);
}

export function maxStartTime(project: AnimationProject): number {
  if (project.timeline.length === 0) return 0;
  return Math.max(...project.timeline.map((event) => event.startTime + event.duration));
}

export function guessDuration(project: AnimationProject): number {
  const last = maxStartTime(project);
  if (last === 0) return 5;
  return last + 1;
}

export function clonePoint(point: Point): Point {
  return { ...point };
}

export function cloneDrawable(drawable: Drawable): Drawable {
  return JSON.parse(JSON.stringify(drawable)) as Drawable;
}

export function cloneAnimation(animation: Animation): Animation {
  return JSON.parse(JSON.stringify(animation)) as Animation;
}

export function defaultPoint(): Point {
  return { x: 0, y: 0 };
}

export function defaultStrokeStyle(): StrokeStyle {
  return { color: "#000000", width: 2 };
}

export function defaultFillStyle(): FillStyle {
  return { color: "white", hachureGap: null, hachureAngle: null };
}

export function defaultSketchStyle(): SketchStyle {
  return { roughness: 1, bowing: 1, strokeWidth: 1 };
}

export function defaultGlowDotHint(): GlowDotHint {
  return { color: "blue", radius: 5 };
}

const CENTER = { x: (1000 * (16 / 9)) / 2, y: 500 };

export function createDrawable(type: Drawable["type"], taken: Iterable<string>): Drawable {
  const id = uniqueId(generateId(type), taken);

  switch (type) {
    case "math":
      return { id, type, texExpression: "$x$", fontSize: 96, fontName: "feasibly", position: at(CENTER.x, CENTER.y) };
    case "text":
      return { id, type, text: "Hello", fontSize: 96, fontName: "feasibly", position: at(CENTER.x, CENTER.y) };
    case "square":
      return { id, type, sideLength: 200, position: at(CENTER.x - 100, CENTER.y - 100) };
    case "rectangle":
      return { id, type, width: 300, height: 180, position: at(CENTER.x - 150, CENTER.y - 90) };
    case "line":
      return { id, type, position: at(CENTER.x - 150, CENTER.y), endPoint: at(CENTER.x + 150, CENTER.y) };
    case "polygon":
      return {
        id,
        type,
        points: [at(CENTER.x, CENTER.y - 120), at(CENTER.x + 120, CENTER.y + 90), at(CENTER.x - 120, CENTER.y + 90)],
      };
    case "svg":
      return { id, type, src: "s3://example.svg", scaleX: 1, scaleY: 1, position: at(CENTER.x - 100, CENTER.y - 100) };
    case "eraser":
      return { id, type, objectsToErase: [] };
    case "group":
      return { id, type, childrenIds: [] };
    case "arrow":
      return {
        id,
        type,
        startPoint: at(CENTER.x - 150, CENTER.y),
        endPoint: at(CENTER.x + 150, CENTER.y),
        arrowHeadType: "->",
        arrowHeadSize: 10,
        arrowHeadAngle: 45,
      };
    case "curved_arrow":
      return {
        id,
        type,
        points: [at(CENTER.x - 150, CENTER.y), at(CENTER.x, CENTER.y - 120), at(CENTER.x + 150, CENTER.y)],
        arrowHeadType: "->",
        arrowHeadSize: 10,
        arrowHeadAngle: 45,
      };
    case "curve":
      return {
        id,
        type,
        points: [at(CENTER.x - 150, CENTER.y), at(CENTER.x, CENTER.y - 120), at(CENTER.x + 150, CENTER.y)],
      };
    case "ellipse":
      return { id, type, center: at(CENTER.x, CENTER.y), width: 300, height: 180 };
    case "circle":
      return { id, type, center: at(CENTER.x, CENTER.y), radius: 120 };
    case "glow_dot":
      return { id, type, center: at(CENTER.x, CENTER.y), radius: 6 };
    case "ngon":
      return { id, type, center: at(CENTER.x, CENTER.y), radius: 120, n: 6 };
    case "rounded_rectangle":
      return { id, type, topLeft: at(CENTER.x - 150, CENTER.y - 90), width: 300, height: 180, borderRadius: 0.1 };
    case "rounded_square":
      return { id, type, topLeft: at(CENTER.x - 100, CENTER.y - 100), sideLength: 200, borderRadius: 0.1 };
  }
}

export function createAnimation(targetId: string, type: Animation["type"]): Animation {
  const base = { targetId, startTime: 0, duration: 1 };
  if (type === "translate_to") {
    return { ...base, type, destination: at(CENTER.x + 100, CENTER.y), persist: true };
  }
  return { ...base, type } as Animation;
}

function at(x: number, y: number): Point {
  return { x, y };
}

export function translateDrawable(drawable: Drawable, dx: number, dy: number): void {
  const move = (p: Point) => {
    p.x += dx;
    p.y += dy;
  };
  switch (drawable.type) {
    case "circle":
    case "ellipse":
    case "glow_dot":
    case "ngon":
      move(drawable.center);
      break;
    case "rounded_rectangle":
    case "rounded_square":
      move(drawable.topLeft);
      break;
    case "line":
      if (drawable.position) move(drawable.position);
      move(drawable.endPoint);
      break;
    case "arrow":
      move(drawable.startPoint);
      move(drawable.endPoint);
      break;
    case "polygon":
    case "curve":
    case "curved_arrow":
      drawable.points.forEach(move);
      break;
    default:
      if (drawable.position) move(drawable.position);
      break;
  }
}
