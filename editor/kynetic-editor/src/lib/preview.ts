
import type { Animation, AnimationProject, Drawable, Point } from "./types";
import { ensureEntranceEvents } from "./serialise";

export interface RenderState {
  visible: boolean;
  opacity: number;
  scale: number;
  dx: number;
  dy: number;
  drawProgress: number;
}

const STATIC_STATE: RenderState = {
  visible: true,
  opacity: 1,
  scale: 1,
  dx: 0,
  dy: 0,
  drawProgress: 1,
};

const CREATION_TYPES = new Set<Animation["type"]>(["sketch", "fade_in"]);
const DELETION_TYPES = new Set<Animation["type"]>(["fade_out", "zoom_out"]);

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export interface WorldViewport {
  margin: number;
  scale: number;
}

export function worldViewport(sceneWidth: number, sceneHeight: number): WorldViewport {
  const margin = 20;
  const worldWidth = 1000 * (sceneWidth / sceneHeight);
  const worldHeight = 1000;
  const scale = Math.min(
    (sceneWidth - 2 * margin) / worldWidth,
    (sceneHeight - 2 * margin) / worldHeight,
  );
  return { margin, scale };
}

export function worldViewportTransform(sceneWidth: number, sceneHeight: number): string {
  const { margin, scale } = worldViewport(sceneWidth, sceneHeight);
  return `translate(${margin} ${margin}) scale(${scale})`;
}

export function screenToWorld(
  sceneWidth: number,
  sceneHeight: number,
  x: number,
  y: number,
): Point {
  const { margin, scale } = worldViewport(sceneWidth, sceneHeight);
  return { x: (x - margin) / scale, y: (y - margin) / scale };
}

export function getAnchor(drawable: Drawable): Point {
  switch (drawable.type) {
    case "circle":
    case "ellipse":
    case "glow_dot":
    case "ngon":
      return drawable.center;
    case "rounded_rectangle":
    case "rounded_square":
      return drawable.topLeft;
    case "line":
      return drawable.position ?? { x: 0, y: 0 };
    case "arrow":
      return drawable.startPoint;
    case "polygon":
    case "curve":
    case "curved_arrow":
      return drawable.points[0] ?? { x: 0, y: 0 };
    default:
      return drawable.position ?? { x: 0, y: 0 };
  }
}

function stripTex(tex: string): string {
  return tex.replace(/^\$\$?/, "").replace(/\$\$?$/, "").trim() || tex;
}

export function getBBoxCenter(drawable: Drawable): Point {
  switch (drawable.type) {
    case "circle":
    case "ellipse":
    case "glow_dot":
    case "ngon":
      return drawable.center;
    case "square":
      return {
        x: (drawable.position?.x ?? 0) + drawable.sideLength / 2,
        y: (drawable.position?.y ?? 0) + drawable.sideLength / 2,
      };
    case "rectangle":
      return {
        x: (drawable.position?.x ?? 0) + drawable.width / 2,
        y: (drawable.position?.y ?? 0) + drawable.height / 2,
      };
    case "rounded_rectangle":
      return {
        x: drawable.topLeft.x + drawable.width / 2,
        y: drawable.topLeft.y + drawable.height / 2,
      };
    case "rounded_square":
      return {
        x: drawable.topLeft.x + drawable.sideLength / 2,
        y: drawable.topLeft.y + drawable.sideLength / 2,
      };
    case "line":
      return {
        x: ((drawable.position?.x ?? 0) + drawable.endPoint.x) / 2,
        y: ((drawable.position?.y ?? 0) + drawable.endPoint.y) / 2,
      };
    case "arrow":
      return {
        x: (drawable.startPoint.x + drawable.endPoint.x) / 2,
        y: (drawable.startPoint.y + drawable.endPoint.y) / 2,
      };
    case "polygon":
    case "curve":
    case "curved_arrow": {
      const xs = drawable.points.map((p) => p.x);
      const ys = drawable.points.map((p) => p.y);
      return {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
    }
    case "math": {
      const label = stripTex(drawable.texExpression);
      const w = Math.max(label.length * drawable.fontSize * 0.55, 10);
      return {
        x: (drawable.position?.x ?? 0) + w / 2,
        y: (drawable.position?.y ?? 0) + drawable.fontSize / 2,
      };
    }
    case "text": {
      const w = Math.max(drawable.text.length * drawable.fontSize * 0.55, 10);
      return {
        x: (drawable.position?.x ?? 0) + w / 2,
        y: (drawable.position?.y ?? 0) - drawable.fontSize * 0.25,
      };
    }
    case "svg": {
      return {
        x: (drawable.position?.x ?? 0) + 150,
        y: (drawable.position?.y ?? 0) + 150,
      };
    }
    case "eraser":
    case "group":
      return drawable.position ?? { x: 0, y: 0 };
  }
}

function eventProgress(event: Animation, t: number): number {
  if (event.duration <= 0) return t >= event.startTime ? 1 : 0;
  return clamp01((t - event.startTime) / event.duration);
}

export function projectDuration(project: AnimationProject): number {
  const timeline = ensureEntranceEvents(project);
  if (timeline.length === 0) return 5;
  const last = Math.max(...timeline.map((e) => e.startTime + e.duration));
  return last + 1;
}

function visibilityToggles(events: Animation[]): number[] {
  const entries: number[] = [];
  for (const event of events) {
    if (CREATION_TYPES.has(event.type)) {
      entries.push(event.startTime);
    } else if (DELETION_TYPES.has(event.type)) {
      if (entries.length === 0) entries.push(event.startTime);
      entries.push(event.startTime + event.duration);
    }
  }
  return entries;
}

function isActiveAt(entries: number[], t: number): boolean {
  let active = false;
  for (const time of entries) {
    if (t >= time) active = !active;
    else break;
  }
  return active;
}

export function computeSceneStates(
  project: AnimationProject,
  t: number | null,
): Record<string, RenderState> {
  const states: Record<string, RenderState> = {};
  for (const drawable of project.definitions) {
    states[drawable.id] = { ...STATIC_STATE };
  }
  if (t === null) return states;

  const byTarget = new Map<string, Animation[]>();
  for (const event of ensureEntranceEvents(project)) {
    const list = byTarget.get(event.targetId);
    if (list) list.push(event);
    else byTarget.set(event.targetId, [event]);
  }

  for (const drawable of project.definitions) {
    const events = byTarget.get(drawable.id) ?? [];
    const state = states[drawable.id];
    if (events.length === 0) {
      state.visible = false;
      continue;
    }

    if (!isActiveAt(visibilityToggles(events), t)) {
      state.visible = false;
      continue;
    }

    const center = getBBoxCenter(drawable);
    let curX = center.x;
    let curY = center.y;

    for (const event of events) {
      const p = eventProgress(event, t);
      switch (event.type) {
        case "sketch":
          if (t >= event.startTime) state.drawProgress = p;
          break;
        case "fade_in":
          if (t >= event.startTime) state.opacity *= p;
          break;
        case "fade_out":
          if (t >= event.startTime) state.opacity *= 1 - p;
          break;
        case "zoom_out":
          if (t >= event.startTime) state.scale *= 1 - p;
          break;
        case "translate_to": {
          const fromX = curX;
          const fromY = curY;
          const end = event.startTime + event.duration;
          if (t >= end) {
            if (event.persist) {
              curX = event.destination.x;
              curY = event.destination.y;
            }
          } else if (t > event.startTime) {
            curX = fromX + (event.destination.x - fromX) * p;
            curY = fromY + (event.destination.y - fromY) * p;
          }
          break;
        }
      }
    }

    state.dx = curX - center.x;
    state.dy = curY - center.y;
    if (state.opacity <= 0 || state.scale <= 0) state.visible = false;
  }

  for (const drawable of project.definitions) {
    if (drawable.type !== "eraser") continue;
    const events = (byTarget.get(drawable.id) ?? [])
      .slice()
      .sort((a, b) => a.startTime - b.startTime);
    if (events.length === 0) continue;
    const first = events[0];
    if (t < first.startTime) continue;

    const p = eventProgress(first, t);
    for (const targetId of drawable.objectsToErase) {
      const state = states[targetId];
      if (!state) continue;
      state.opacity *= 1 - p;
      if (state.opacity <= 0.01) state.visible = false;
    }
  }

  return states;
}
