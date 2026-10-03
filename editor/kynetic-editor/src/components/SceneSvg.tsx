"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AnimationProject, Drawable, Point, StrokeStyle, FillStyle } from "@/lib/types";
import {
  computeSceneStates,
  getAnchor,
  getBBoxCenter,
  screenToWorld,
  worldViewportTransform,
  type RenderState,
} from "@/lib/preview";

export interface SceneSvgProps {
  project: AnimationProject;
  time?: number | null;
  assets?: Record<string, string | null>;
  selectedIds?: string[];
  onSelect?: (id: string | null, additive?: boolean) => void;
  onMove?: (id: string, dx: number, dy: number) => void;
  panZoom?: boolean;
  className?: string;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

const DEFAULT_STROKE: StrokeStyle = { color: "#111111", width: 2 };
const TEXT_FONT = "'Segoe Print', 'Comic Sans MS', 'Bradley Hand', cursive";
const MATH_FONT = "Georgia, 'Times New Roman', serif";

export function stripTex(tex: string): string {
  return tex.replace(/^\$\$?/, "").replace(/\$\$?$/, "").trim() || tex;
}

function toPolylinePoints(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return `M ${points[0].x} ${points[0].y} L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function arrowHeadPath(tail: Point, tip: Point, size: number, spreadDeg: number): string {
  const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
  const spread = (spreadDeg * Math.PI) / 180;
  const p1x = tip.x - size * Math.cos(angle - spread);
  const p1y = tip.y - size * Math.sin(angle - spread);
  const p2x = tip.x - size * Math.cos(angle + spread);
  const p2y = tip.y - size * Math.sin(angle + spread);
  return `M ${tip.x} ${tip.y} L ${p1x} ${p1y} M ${tip.x} ${tip.y} L ${p2x} ${p2y}`;
}

function ngonPoints(center: Point, radius: number, n: number): Point[] {
  const count = Math.max(3, Math.round(n));
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });
}

export default function SceneSvg({
  project,
  time = null,
  assets = {},
  selectedIds = [],
  onSelect,
  onMove,
  panZoom = false,
  className = "",
}: SceneSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; last: Point } | null>(null);
  const panRef = useRef<{ clientX: number; clientY: number; moved: boolean; shift: boolean } | null>(
    null,
  );

  const [viewBoxState, setViewBoxState] = useState<ViewBox | null>(null);
  const viewBox = useMemo(
    () => viewBoxState ?? { x: 0, y: 0, w: project.scene.width, h: project.scene.height },
    [viewBoxState, project.scene.width, project.scene.height],
  );
  const viewBoxRef = useRef(viewBox);
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  const states = useMemo(() => computeSceneStates(project, time ?? null), [project, time]);

  const childIds = useMemo(() => {
    const ids = new Set<string>();
    for (const drawable of project.definitions) {
      if (drawable.type === "group") {
        for (const childId of drawable.childrenIds) ids.add(childId);
      }
    }
    return ids;
  }, [project]);

  const topLevel = project.definitions.filter((d) => !childIds.has(d.id));

  function clientToViewBox(clientX: number, clientY: number): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vb = viewBoxRef.current;
    const scale = Math.min(rect.width / vb.w, rect.height / vb.h) || 1;
    const offsetX = rect.left + (rect.width - vb.w * scale) / 2;
    const offsetY = rect.top + (rect.height - vb.h * scale) / 2;
    return {
      x: vb.x + (clientX - offsetX) / scale,
      y: vb.y + (clientY - offsetY) / scale,
    };
  }

  function clientToScene(clientX: number, clientY: number): Point {
    const p = clientToViewBox(clientX, clientY);
    return screenToWorld(project.scene.width, project.scene.height, p.x, p.y);
  }

  function zoomAround(cx: number, cy: number, factor: number) {
    setViewBoxState((prev) => {
      const vb = prev ?? { x: 0, y: 0, w: project.scene.width, h: project.scene.height };
      const minW = project.scene.width / 20;
      const maxW = project.scene.width * 4;
      const w = clamp(vb.w / factor, minW, maxW);
      const h = (w * project.scene.height) / project.scene.width;
      const k = w / vb.w;
      return { x: cx - (cx - vb.x) * k, y: cy - (cy - vb.y) * k, w, h };
    });
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !panZoom) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const p = clientToViewBox(e.clientX, e.clientY);
      zoomAround(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panZoom]);

  useEffect(() => {
    if (!panZoom) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing) return;
      const vb = viewBoxRef.current;
      if (e.key === "0" || e.key === "Home") {
        setViewBoxState(null);
      } else if (e.key === "+" || e.key === "=") {
        zoomAround(vb.x + vb.w / 2, vb.y + vb.h / 2, 1.2);
      } else if (e.key === "-" || e.key === "_") {
        zoomAround(vb.x + vb.w / 2, vb.y + vb.h / 2, 1 / 1.2);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panZoom]);

  function handlePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    onSelect?.(id, e.shiftKey);
    if (!onMove) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { id, last: clientToScene(e.clientX, e.clientY) };
  }

  function handleBackgroundPointerDown(e: React.PointerEvent) {
    if (!panZoom) {
      onSelect?.(null, e.shiftKey);
      return;
    }
    svgRef.current?.setPointerCapture(e.pointerId);
    panRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      moved: false,
      shift: e.shiftKey,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag && onMove) {
      const p = clientToScene(e.clientX, e.clientY);
      onMove(drag.id, p.x - drag.last.x, p.y - drag.last.y);
      drag.last = p;
      return;
    }
    const pan = panRef.current;
    if (!pan || !panZoom) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vb = viewBoxRef.current;
    const scale = Math.min(rect.width / vb.w, rect.height / vb.h) || 1;
    const dx = (e.clientX - pan.clientX) / scale;
    const dy = (e.clientY - pan.clientY) / scale;
    if (Math.abs(e.clientX - pan.clientX) > 2 || Math.abs(e.clientY - pan.clientY) > 2) {
      pan.moved = true;
    }
    pan.clientX = e.clientX;
    pan.clientY = e.clientY;
    setViewBoxState((prev) => {
      const cur = prev ?? { x: 0, y: 0, w: project.scene.width, h: project.scene.height };
      return { x: cur.x - dx, y: cur.y - dy, w: cur.w, h: cur.h };
    });
  }

  function handlePointerUp() {
    const pan = panRef.current;
    if (pan && !pan.moved) onSelect?.(null, pan.shift);
    panRef.current = null;
    dragRef.current = null;
  }

  function renderDrawable(drawable: Drawable): ReactElement | null {
    const state: RenderState = states[drawable.id] ?? {
      visible: true,
      opacity: 1,
      scale: 1,
      dx: 0,
      dy: 0,
      drawProgress: 1,
    };
    if (!state.visible || state.opacity <= 0) return null;

    const stroke = drawable.strokeStyle ?? DEFAULT_STROKE;
    const fill: FillStyle | null = drawable.fillStyle ?? null;
    const drawn = state.drawProgress >= 1;

    const sketchProps = drawn
      ? {}
      : { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - state.drawProgress };
    const fillOpacity = fill ? (drawn ? 0.35 : Math.max(0, (state.drawProgress - 0.6) / 0.4) * 0.35) : 0;

    const strokeProps = {
      stroke: stroke.color,
      strokeWidth: stroke.width,
      strokeLinejoin: "round" as const,
      strokeLinecap: "round" as const,
      fill: fill ? fill.color : "none",
      fillOpacity,
      ...sketchProps,
    };

    const anchor = getAnchor(drawable);
    const pivot = getBBoxCenter(drawable);
    const transform =
      state.scale !== 1
        ? `translate(${state.dx} ${state.dy}) translate(${pivot.x} ${pivot.y}) scale(${state.scale}) translate(${-pivot.x} ${-pivot.y})`
        : `translate(${state.dx} ${state.dy})`;

    const selected = selectedIds.includes(drawable.id);
    const interactive: React.SVGProps<SVGGElement> = onSelect
      ? {
          style: {
            cursor: onMove ? "grab" : "pointer",
            filter: selected ? "drop-shadow(0 0 6px #3b82f6)" : undefined,
          },
          onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, drawable.id),
        }
      : {};

    const glowHint =
      !drawn && drawable.glowDotHint ? (
        <circle
          cx={anchor.x}
          cy={anchor.y}
          r={drawable.glowDotHint.radius}
          fill={drawable.glowDotHint.color}
          filter="url(#kynetic-glow)"
        />
      ) : null;

    return (
      <g key={drawable.id} transform={transform} opacity={state.opacity} {...interactive}>
        {renderShape(drawable, strokeProps, state)}
        {glowHint}
      </g>
    );
  }

  function renderShape(
    drawable: Drawable,
    props: React.SVGProps<SVGElement>,
    state: RenderState,
  ): ReactNode {
    const drawn = state.drawProgress >= 1;

    switch (drawable.type) {
      case "square":
        return (
          <rect
            x={drawable.position?.x ?? 0}
            y={drawable.position?.y ?? 0}
            width={drawable.sideLength}
            height={drawable.sideLength}
            {...(props as React.SVGProps<SVGRectElement>)}
          />
        );
      case "rectangle":
        return (
          <rect
            x={drawable.position?.x ?? 0}
            y={drawable.position?.y ?? 0}
            width={drawable.width}
            height={drawable.height}
            {...(props as React.SVGProps<SVGRectElement>)}
          />
        );
      case "rounded_rectangle":
        return (
          <rect
            x={drawable.topLeft.x}
            y={drawable.topLeft.y}
            width={drawable.width}
            height={drawable.height}
            rx={drawable.borderRadius * Math.min(drawable.width, drawable.height)}
            {...(props as React.SVGProps<SVGRectElement>)}
          />
        );
      case "rounded_square":
        return (
          <rect
            x={drawable.topLeft.x}
            y={drawable.topLeft.y}
            width={drawable.sideLength}
            height={drawable.sideLength}
            rx={drawable.borderRadius * drawable.sideLength}
            {...(props as React.SVGProps<SVGRectElement>)}
          />
        );
      case "circle":
        return (
          <circle
            cx={drawable.center.x}
            cy={drawable.center.y}
            r={drawable.radius}
            {...(props as React.SVGProps<SVGCircleElement>)}
          />
        );
      case "ellipse":
        return (
          <ellipse
            cx={drawable.center.x}
            cy={drawable.center.y}
            rx={drawable.width / 2}
            ry={drawable.height / 2}
            {...(props as React.SVGProps<SVGEllipseElement>)}
          />
        );
      case "ngon":
        return (
          <polygon
            points={toPolylinePoints(ngonPoints(drawable.center, drawable.radius, drawable.n))}
            {...(props as React.SVGProps<SVGPolygonElement>)}
          />
        );
      case "polygon":
        return (
          <polygon
            points={toPolylinePoints(drawable.points)}
            {...(props as React.SVGProps<SVGPolygonElement>)}
          />
        );
      case "line":
        return (
          <>
            <line
              x1={drawable.position?.x ?? 0}
              y1={drawable.position?.y ?? 0}
              x2={drawable.endPoint.x}
              y2={drawable.endPoint.y}
              {...(props as React.SVGProps<SVGLineElement>)}
            />
            {onSelect ? (
              <line
                x1={drawable.position?.x ?? 0}
                y1={drawable.position?.y ?? 0}
                x2={drawable.endPoint.x}
                y2={drawable.endPoint.y}
                stroke="transparent"
                strokeWidth={14}
              />
            ) : null}
          </>
        );
      case "curve":
        return (
          <path
            d={smoothPath(drawable.points)}
            fill="none"
            {...(props as React.SVGProps<SVGPathElement>)}
            fillOpacity={0}
          />
        );
      case "curved_arrow": {
        const pts = drawable.points;
        const tail = pts[pts.length - 2] ?? pts[0];
        const tip = pts[pts.length - 1] ?? pts[0];
        return (
          <>
            <path
              d={smoothPath(pts)}
              fill="none"
              {...(props as React.SVGProps<SVGPathElement>)}
              fillOpacity={0}
            />
            <path
              d={arrowHeadPath(tail, tip, drawable.arrowHeadSize, drawable.arrowHeadAngle)}
              fill="none"
              {...(props as React.SVGProps<SVGPathElement>)}
              fillOpacity={0}
            />
          </>
        );
      }
      case "arrow":
        return (
          <>
            <line
              x1={drawable.startPoint.x}
              y1={drawable.startPoint.y}
              x2={drawable.endPoint.x}
              y2={drawable.endPoint.y}
              {...(props as React.SVGProps<SVGLineElement>)}
            />
            <path
              d={arrowHeadPath(
                drawable.startPoint,
                drawable.endPoint,
                drawable.arrowHeadSize,
                drawable.arrowHeadAngle,
              )}
              fill="none"
              {...(props as React.SVGProps<SVGPathElement>)}
              fillOpacity={0}
            />
          </>
        );
      case "glow_dot":
        return (
          <circle
            cx={drawable.center.x}
            cy={drawable.center.y}
            r={drawable.radius}
            fill={drawable.strokeStyle?.color ?? "gold"}
            filter="url(#kynetic-glow)"
          />
        );
      case "text":
      case "math": {
        const label =
          drawable.type === "text" ? drawable.text : stripTex(drawable.texExpression);
        const x = drawable.position?.x ?? 0;
        const y = drawable.position?.y ?? 0;
        const clipId = `kynetic-clip-${drawable.id}`;
        const estWidth = Math.max(label.length * drawable.fontSize * 0.55, 10);
        const isMath = drawable.type === "math";
        const clipY = isMath ? y - drawable.fontSize * 0.2 : y - drawable.fontSize;
        return (
          <>
            {!drawn ? (
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={x - 4}
                    y={clipY}
                    width={estWidth * state.drawProgress}
                    height={drawable.fontSize * 1.7}
                  />
                </clipPath>
              </defs>
            ) : null}
            <g clipPath={drawn ? undefined : `url(#${clipId})`}>
              <text
                x={x}
                y={y}
                fontSize={drawable.fontSize}
                fontFamily={isMath ? MATH_FONT : TEXT_FONT}
                fontStyle={isMath ? "italic" : undefined}
                dominantBaseline={isMath ? "hanging" : undefined}
                fill={drawable.strokeStyle?.color ?? "#111111"}
                style={{ whiteSpace: "pre" }}
              >
                {label}
              </text>
            </g>
          </>
        );
      }
      case "svg": {
        const url = assets[drawable.id] ?? null;
        const width = 300 * drawable.scaleX;
        const height = 300 * drawable.scaleY;
        const x = (drawable.position?.x ?? 0) + 150 * (1 - drawable.scaleX);
        const y = (drawable.position?.y ?? 0) + 150 * (1 - drawable.scaleY);
        if (!url) {
          return (
            <>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="8 6"
              />
              <text
                x={x + width / 2}
                y={y + height / 2}
                fontSize={Math.min(24, width / 10)}
                textAnchor="middle"
                fill="#9ca3af"
                fontFamily="ui-monospace, monospace"
              >
                {drawable.src}
              </text>
            </>
          );
        }
        return (
          <image
            href={url}
            x={x}
            y={y}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />
        );
      }
      case "group":
        return (
          <>
            {drawable.childrenIds.map((childId) => {
              const child = project.definitions.find((d) => d.id === childId);
              return child ? <g key={childId}>{renderDrawable(child)}</g> : null;
            })}
          </>
        );
      case "eraser":
        return null;
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={handleBackgroundPointerDown}
    >
      <defs>
        <filter id="kynetic-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x={0}
        y={0}
        width={project.scene.width}
        height={project.scene.height}
        fill={project.scene.backgroundColor}
      />
      
      <g transform={worldViewportTransform(project.scene.width, project.scene.height)}>
        {topLevel.map((drawable) => renderDrawable(drawable))}
      </g>
    </svg>
  );
}

