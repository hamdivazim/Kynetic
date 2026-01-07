"""
renderer.schema
Defines expected schema for project JSON.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional, Union, Literal, Annotated
from pydantic import BaseModel, Field

# basic types

class Point(BaseModel):
    x: float
    y: float

class Color(str, Enum):
    BLUE = "#0000FF"
    RED = "#FF0000"
    BLACK = "#000000"
    ORANGE = "#FFA500"
    WHITE = "#FFFFFF"
    ERASER_HINT = "#FFD700"

# stylings

class GlowDotHint(BaseModel):
    color: str = "blue"
    radius: float = 5.0

class StrokeStyle(BaseModel):
    color: str = "black"
    width: float = 2.0

class FillStyle(BaseModel):
    color: str = "white"
    hachure_gap: Optional[float] = None
    hachure_angle: Optional[float] = -45.0

class SketchStyle(BaseModel):
    roughness: float = 1.0
    bowing: float = 1.0
    stroke_width: float = 1.0

# drawables

class BaseDrawable(BaseModel):
    id: str = Field(..., description="ID to reference this object in animations")
    position: Optional[Point] = None
    stroke_style: Optional[StrokeStyle] = None
    fill_style: Optional[FillStyle] = None
    sketch_style: Optional[SketchStyle] = None
    glow_dot_hint: Optional[GlowDotHint] = None

class MathDrawable(BaseDrawable):
    type: Literal["math"] = "math"
    tex_expression: str
    font_size: int = 96
    font_name: str = "feasibly"

class TextDrawable(BaseDrawable):
    type: Literal["text"] = "text"
    text: str
    font_size: int = 96
    font_name: str = "feasibly"

class SquareDrawable(BaseDrawable):
    type: Literal["square"] = "square"
    side_length: float

class RectangleDrawable(BaseDrawable):
    type: Literal["rectangle"] = "rectangle"
    width: float
    height: float

class LineDrawable(BaseDrawable):
    type: Literal["line"] = "line"
    end_point: Point 

class PolygonDrawable(BaseDrawable):
    type: Literal["polygon"] = "polygon"
    points: List[Point]

class SVGDrawable(BaseDrawable):
    type: Literal["svg"] = "svg"
    src: str 
    scale_x: float = 1.0
    scale_y: float = 1.0

class EraserDrawable(BaseDrawable):
    type: Literal["eraser"] = "eraser"
    objects_to_erase: List[str]

class GroupDrawable(BaseDrawable):
    type: Literal["group"] = "group"
    children_ids: List[str] = [] 

class ArrowDrawable(BaseDrawable):
    type: Literal["arrow"] = "arrow"
    start_point: Point
    end_point: Point
    arrow_head_type: str = "->"
    arrow_head_size: float = 10.0
    arrow_head_angle: float = 45.0

class CurvedArrowDrawable(BaseDrawable):
    type: Literal["curved_arrow"] = "curved_arrow"
    points: List[Point]
    arrow_head_type: str = "->"
    arrow_head_size: float = 10.0
    arrow_head_angle: float = 45.0

class CurveDrawable(BaseDrawable):
    type: Literal["curve"] = "curve"
    points: List[Point]

class EllipseDrawable(BaseDrawable):
    type: Literal["ellipse"] = "ellipse"
    center: Point
    width: float
    height: float

class CircleDrawable(BaseDrawable):
    type: Literal["circle"] = "circle"
    center: Point
    radius: float

class GlowDotDrawable(BaseDrawable):
    type: Literal["glow_dot"] = "glow_dot"
    center: Point
    radius: float = 1.0

class NGonDrawable(BaseDrawable):
    type: Literal["ngon"] = "ngon"
    center: Point
    radius: float
    n: int

class RoundedRectangleDrawable(BaseDrawable):
    type: Literal["rounded_rectangle"] = "rounded_rectangle"
    top_left: Point
    width: float
    height: float
    border_radius: float = 0.1

class RoundedSquareDrawable(BaseDrawable):
    type: Literal["rounded_square"] = "rounded_square"
    top_left: Point
    side_length: float
    border_radius: float = 0.1

# drawable union
DrawableType = Union[
    MathDrawable, TextDrawable, SquareDrawable, RectangleDrawable, 
    LineDrawable, PolygonDrawable, SVGDrawable, GroupDrawable, EraserDrawable,
    ArrowDrawable, CurvedArrowDrawable, CurveDrawable, EllipseDrawable,
    CircleDrawable, GlowDotDrawable, NGonDrawable, RoundedRectangleDrawable,
    RoundedSquareDrawable
]

# animations

class BaseAnimation(BaseModel):
    target_id: str = Field(..., description="ID of the drawable to animate")
    start_time: float
    duration: float

class SketchAnimation(BaseAnimation):
    type: Literal["sketch"] = "sketch"

class FadeInAnimation(BaseAnimation):
    type: Literal["fade_in"] = "fade_in"

class FadeOutAnimation(BaseAnimation):
    type: Literal["fade_out"] = "fade_out"

class ZoomOutAnimation(BaseAnimation):
    type: Literal["zoom_out"] = "zoom_out"

class TranslateToAnimation(BaseAnimation):
    type: Literal["translate_to"] = "translate_to"
    destination: Point
    persist: bool = False 

# animation union
AnimationType = Union[
    SketchAnimation, FadeInAnimation, FadeOutAnimation, 
    ZoomOutAnimation, TranslateToAnimation
]

# project

class SceneConfig(BaseModel):
    width: int = 1920
    height: int = 1080
    background_color: str = "white"

class AnimationProject(BaseModel):
    name: str
    scene: SceneConfig
    
    definitions: List[Annotated[DrawableType, Field(discriminator="type")]]
    timeline: List[Annotated[AnimationType, Field(discriminator="type")]]