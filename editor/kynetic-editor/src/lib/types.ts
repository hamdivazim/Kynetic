export interface Point {
  x: number;
  y: number;
}

export type ColorName =
  | "blue"
  | "red"
  | "black"
  | "orange"
  | "white"
  | "eraser_hint";

export interface GlowDotHint {
  color: string;
  radius: number;
}

export interface StrokeStyle {
  color: string;
  width: number;
}

export interface FillStyle {
  color: string;
  hachureGap?: number | null;
  hachureAngle?: number | null;
}

export interface SketchStyle {
  roughness: number;
  bowing: number;
  strokeWidth: number;
}

export interface BaseDrawable {
  id: string;
  position?: Point | null;
  strokeStyle?: StrokeStyle | null;
  fillStyle?: FillStyle | null;
  sketchStyle?: SketchStyle | null;
  glowDotHint?: GlowDotHint | null;
}

export interface MathDrawable extends BaseDrawable {
  type: "math";
  texExpression: string;
  fontSize: number;
  fontName: string;
}

export interface TextDrawable extends BaseDrawable {
  type: "text";
  text: string;
  fontSize: number;
  fontName: string;
}

export interface SquareDrawable extends BaseDrawable {
  type: "square";
  sideLength: number;
}

export interface RectangleDrawable extends BaseDrawable {
  type: "rectangle";
  width: number;
  height: number;
}

export interface LineDrawable extends BaseDrawable {
  type: "line";
  endPoint: Point;
}

export interface PolygonDrawable extends BaseDrawable {
  type: "polygon";
  points: Point[];
}

export interface SVGDrawable extends BaseDrawable {
  type: "svg";
  src: string;
  scaleX: number;
  scaleY: number;
}

export interface EraserDrawable extends BaseDrawable {
  type: "eraser";
  objectsToErase: string[];
}

export interface GroupDrawable extends BaseDrawable {
  type: "group";
  childrenIds: string[];
}

export interface ArrowDrawable extends BaseDrawable {
  type: "arrow";
  startPoint: Point;
  endPoint: Point;
  arrowHeadType: string;
  arrowHeadSize: number;
  arrowHeadAngle: number;
}

export interface CurvedArrowDrawable extends BaseDrawable {
  type: "curved_arrow";
  points: Point[];
  arrowHeadType: string;
  arrowHeadSize: number;
  arrowHeadAngle: number;
}

export interface CurveDrawable extends BaseDrawable {
  type: "curve";
  points: Point[];
}

export interface EllipseDrawable extends BaseDrawable {
  type: "ellipse";
  center: Point;
  width: number;
  height: number;
}

export interface CircleDrawable extends BaseDrawable {
  type: "circle";
  center: Point;
  radius: number;
}

export interface GlowDotDrawable extends BaseDrawable {
  type: "glow_dot";
  center: Point;
  radius: number;
}

export interface NGonDrawable extends BaseDrawable {
  type: "ngon";
  center: Point;
  radius: number;
  n: number;
}

export interface RoundedRectangleDrawable extends BaseDrawable {
  type: "rounded_rectangle";
  topLeft: Point;
  width: number;
  height: number;
  borderRadius: number;
}

export interface RoundedSquareDrawable extends BaseDrawable {
  type: "rounded_square";
  topLeft: Point;
  sideLength: number;
  borderRadius: number;
}

export type Drawable =
  | MathDrawable
  | TextDrawable
  | SquareDrawable
  | RectangleDrawable
  | LineDrawable
  | PolygonDrawable
  | SVGDrawable
  | EraserDrawable
  | GroupDrawable
  | ArrowDrawable
  | CurvedArrowDrawable
  | CurveDrawable
  | EllipseDrawable
  | CircleDrawable
  | GlowDotDrawable
  | NGonDrawable
  | RoundedRectangleDrawable
  | RoundedSquareDrawable;

export interface BaseAnimation {
  targetId: string;
  startTime: number;
  duration: number;
}

export interface SketchAnimation extends BaseAnimation {
  type: "sketch";
}

export interface FadeInAnimation extends BaseAnimation {
  type: "fade_in";
}

export interface FadeOutAnimation extends BaseAnimation {
  type: "fade_out";
}

export interface ZoomOutAnimation extends BaseAnimation {
  type: "zoom_out";
}

export interface TranslateToAnimation extends BaseAnimation {
  type: "translate_to";
  destination: Point;
  persist: boolean;
}

export type Animation =
  | SketchAnimation
  | FadeInAnimation
  | FadeOutAnimation
  | ZoomOutAnimation
  | TranslateToAnimation;

export interface SceneConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface AnimationProject {
  name: string;
  scene: SceneConfig;
  definitions: Drawable[];
  timeline: Animation[];
}

export const DRAWABLE_TYPE_LABELS: Record<Drawable["type"], string> = {
  math: "Math (TeX)",
  text: "Text",
  square: "Square",
  rectangle: "Rectangle",
  line: "Line",
  polygon: "Polygon",
  svg: "SVG",
  eraser: "Eraser",
  group: "Group",
  arrow: "Arrow",
  curved_arrow: "Curved Arrow",
  curve: "Curve",
  ellipse: "Ellipse",
  circle: "Circle",
  glow_dot: "Glow Dot",
  ngon: "NGon",
  rounded_rectangle: "Rounded Rectangle",
  rounded_square: "Rounded Square",
};

export const ANIMATION_TYPE_LABELS: Record<Animation["type"], string> = {
  sketch: "Sketch",
  fade_in: "Fade In",
  fade_out: "Fade Out",
  zoom_out: "Zoom Out",
  translate_to: "Translate To",
};
