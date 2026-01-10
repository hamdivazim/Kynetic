"""
renderer.main

Main renderer
"""

import argparse
from pydantic import ValidationError
from renderer.schema import AnimationProject
from renderer.render import render_project

def render():
    """
    Entrypoint to renderer.render.render_project
    """
    parser = argparse.ArgumentParser(description="Render a handanim project from JSON.")
    parser.add_argument("path", help="Path to the .json project file")
    parser.add_argument("--out", help="Optional output path for mp4", default=None)
    
    args = parser.parse_args()
    render_project(args.path, args.out)