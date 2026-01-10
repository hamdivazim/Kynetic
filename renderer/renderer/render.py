import argparse, logging, os, sys
from typing import Dict, Any
from tqdm import tqdm

from pydantic import ValidationError
from renderer.schema import AnimationProject, Point

from handanim.core import (
    Scene, 
    SketchStyle, 
    StrokeStyle, 
    FillStyle, 
    DrawableGroup
)
from handanim.animations import (
    SketchAnimation,
    FadeInAnimation,
    FadeOutAnimation,
    ZoomOutAnimation,
    TranslateToAnimation,
    TranslateToPersistAnimation
)
from handanim.primitives import (
    Math, 
    Text, 
    Square, 
    Rectangle, 
    Line, 
    Polygon,
    Eraser
)
from handanim.primitives.vector_svg import VectorSVG
from handanim.stylings import color as h_color

from handanim.stylings.fonts import FONT_PATHS, get_font_path

# map font paths
FONT_PATHS["feasibly"] = os.path.abspath("renderer/fonts/FeasiblySingleLine-z8D90.ttf")
FONT_PATHS["headstay"] = os.path.abspath("renderer/fonts/HeadstayRegular.ttf")
FONT_PATHS["backstay"] = os.path.abspath("renderer/fonts/BackstaySingleLine-rgOw8.ttf")
FONT_PATHS["caveat"] = os.path.abspath("renderer/fonts/Caveat-VariableFont_wght.ttf")
FONT_PATHS["permanent_marker"] = os.path.abspath("renderer/fonts/PermanentMarker-Regular.ttf")
FONT_PATHS["notosans_math"] = os.path.abspath("renderer/fonts/NotoSansMath-Regular.ttf")
FONT_PATHS["handanimtype1"] = os.path.abspath("renderer/fonts/handanimtype1.json")

# logging settings
class TqdmLoggingHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            tqdm.write(msg)
            self.flush()
        except Exception:
            self.handleError(record)
tqdm_handler = TqdmLoggingHandler()
tqdm_handler.setFormatter(logging.Formatter("%(levelname)-8s | %(message)s"))
logging.basicConfig(
    level=logging.INFO,
    handlers=[tqdm_handler]
)
log = logging.getLogger()

# map colours
COLOR_MAP = {
    "blue": h_color.BLUE,
    "red": h_color.RED,
    "black": h_color.BLACK,
    "orange": h_color.ORANGE,
    "white": h_color.WHITE,
    "eraser_hint": h_color.ERASER_HINT_COLOR
}

def resolve_color(color_str: str):
    return COLOR_MAP.get(color_str.lower(), color_str)

def point_to_tuple(p: Point):
    if p is None: return None
    return (p.x, p.y)

def create_stroke_style(style_data):
    if not style_data: return None
    return StrokeStyle(
        color=resolve_color(style_data.color),
        width=style_data.width
    )

def create_fill_style(style_data):
    if not style_data: return None
    return FillStyle(
        color=resolve_color(style_data.color),
        hachure_gap=style_data.hachure_gap,
        hachure_angle=style_data.hachure_angle or -45.0
    )

def create_sketch_style(style_data):
    if not style_data: return None
    return SketchStyle(
        roughness=style_data.roughness,
        bowing=style_data.bowing,
        stroke_width=style_data.stroke_width
    )

def create_glow_hint(hint_data):
    if not hint_data: return None
    return {
        "color": resolve_color(hint_data.color),
        "radius": hint_data.radius
    }

def render_project(json_path: str, output_file: str = None):
    
    """
    Renders a project from a JSON.
    
    :param json_path: Path to the JSON file.
    :type json_path: str
    :param output_file: Path for the output video file.
    :type output_file: str
    """

    log.info(f"Loading project from {json_path}...")
    try:
        with open(json_path, 'r') as f:
            raw_data = f.read()
        
        project = AnimationProject.model_validate_json(raw_data)

    except ValidationError as e:
        log.critical(f"JSON Validation Error - try exporting the project again. \n\n{e.json}")
        sys.exit(1)
    except FileNotFoundError:
        log.critical(f"File not found: {json_path}")
        sys.exit(1)

    # setup scene
    scene = Scene(
        width=project.scene.width, 
        height=project.scene.height
    )

    # create drawables
    drawable_map: Dict[str, Any] = {}

    log.info(f"Creating {len(project.definitions)} drawables...")
    
    for definition in project.definitions:
        common_kwargs = {}
        if definition.stroke_style:
            common_kwargs['stroke_style'] = create_stroke_style(definition.stroke_style)
        if definition.fill_style:
            common_kwargs['fill_style'] = create_fill_style(definition.fill_style)
        if definition.sketch_style:
            common_kwargs['sketch_style'] = create_sketch_style(definition.sketch_style)
        if definition.glow_dot_hint:
            common_kwargs['glow_dot_hint'] = create_glow_hint(definition.glow_dot_hint)

        obj = None

        if definition.type == "math":
            font_name = definition.font_name or "feasibly"
            obj = Math(
                tex_expression=definition.tex_expression,
                position=point_to_tuple(definition.position),
                font_size=definition.font_size,
                font_name=font_name,
                **common_kwargs
            )

        elif definition.type == "text":
            font_name = definition.font_name or "feasibly"
            obj = Text(
                text=definition.text,
                position=point_to_tuple(definition.position),
                font_size=definition.font_size,
                #font_name=font_name, -->not implemented as Text doesnt support font name (yet)
                **common_kwargs
            )

        elif definition.type == "square":
            obj = Square(
                top_left=point_to_tuple(definition.position),
                side_length=definition.side_length,
                **common_kwargs
            )

        elif definition.type == "rectangle":
            obj = Rectangle(
                top_left=point_to_tuple(definition.position),
                width=definition.width,
                height=definition.height,
                **common_kwargs
            )
        
        elif definition.type == "line":
            start = point_to_tuple(definition.position)
            end = point_to_tuple(definition.end_point) 
            obj = Line(
                start=start,
                end=end,
                **common_kwargs
            )

        elif definition.type == "polygon":
            points = [point_to_tuple(p) for p in definition.points]
            obj = Polygon(
                points=points,
                **common_kwargs
            )

        elif definition.type == "svg":
            json_dir = os.path.dirname(os.path.abspath(json_path))
            svg_path = os.path.join(json_dir, definition.src)
            
            obj = VectorSVG.from_svg_file(
                svg_path,
                position=point_to_tuple(definition.position),
                glow_dot_hint=common_kwargs.get('glow_dot_hint')
            )
            if definition.scale_x != 1.0 or definition.scale_y != 1.0:
                obj.scale(definition.scale_x, definition.scale_y)

        elif definition.type == "eraser":
            to_erase = [
                drawable_map[oid] 
                for oid in definition.objects_to_erase 
                if oid in drawable_map
            ]
            
            obj = Eraser(
                objects_to_erase=to_erase,
                drawable_cache=scene.drawable_cache,
                glow_dot_hint=create_glow_hint(definition.glow_dot_hint)
            )

        elif definition.type == "group":
            children = []
            for child_id in definition.children_ids:
                if child_id in drawable_map:
                    children.append(drawable_map[child_id])
                else:
                    log.warning(f"Group '{definition.id}' references unknown child '{child_id}'")
            obj = DrawableGroup(elements=children)

        if obj:
            drawable_map[definition.id] = obj
        else:
            log.warning(f"Unsupported drawable type '{definition.type}'")

    # create events
    log.info(f"Processing {len(project.timeline)} animation events...")

    for event in project.timeline:
        target = drawable_map.get(event.target_id)
        if not target:
            log.warning(f"Animation references unknown ID '{event.target_id}'. Skipping.")
            continue

        anim = None

        if event.type == "sketch":
            anim = SketchAnimation(
                start_time=event.start_time,
                duration=event.duration
            )
        
        elif event.type == "fade_in":
            anim = FadeInAnimation(
                start_time=event.start_time,
                duration=event.duration
            )

        elif event.type == "fade_out":
            anim = FadeOutAnimation(
                start_time=event.start_time,
                duration=event.duration
            )

        elif event.type == "zoom_out":
            anim = ZoomOutAnimation(
                start_time=event.start_time,
                duration=event.duration
            )

        elif event.type == "translate_to":
            dest_tuple = point_to_tuple(event.destination)
            data = {"point": dest_tuple}
            
            if event.persist:
                anim = TranslateToPersistAnimation(
                    start_time=event.start_time,
                    duration=event.duration,
                    data=data
                )
            else:
                anim = TranslateToAnimation(
                    start_time=event.start_time,
                    duration=event.duration,
                    data=data
                )

        if anim:
            scene.add(event=anim, drawable=target)

    # render
    if not output_file:
        output_file = os.path.join(
            os.path.dirname(os.path.realpath(__file__)), 
            "output", 
            f"{project.name.replace(' ', '_').lower()}.mp4"
        )
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    log.info(f"Rendering to {output_file}...")

    if not project.timeline:
        last_event_end = 5.0
    else:
        last_event_end = max([e.start_time + e.duration for e in project.timeline]) + 1.0
    
    scene.render(output_file, max_length=last_event_end)
    log.info("Render complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render a handanim project from JSON.")
    parser.add_argument("path", help="Path to the .json project file")
    parser.add_argument("--out", help="Optional output path for mp4", default=None)
    
    args = parser.parse_args()
    render_project(args.path, args.out)