"""
renderer.main

Main renderer
"""

import argparse
from pydantic import ValidationError
from renderer.schema import AnimationProject
from pathlib import Path
from renderer.render import render_project

def render():
    """
    Entrypoint to renderer.render.render_project
    """
    parser = argparse.ArgumentParser(description="Render a handanim project from JSON.")
    parser.add_argument("path", help="Path to the .json project file")
    parser.add_argument("--out", help="Optional output path for mp4", default=None)
    
    args = parser.parse_args()
    
    if args.out is None:
        input_path = Path(args.path)
        args.out = Path("/output") / f"{input_path.stem}.mp4"

    render_project(args.path, args.out)

if __name__ == "__main__":
    render()