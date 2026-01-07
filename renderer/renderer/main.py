"""
renderer.main

Main renderer
"""

import argparse
from pydantic import ValidationError
from renderer.schema import AnimationProject

if __name__ == '__main__':
    # currently testing json validation

    parser = argparse.ArgumentParser(description="Render a handanim project from JSON.")
    parser.add_argument("path", help="Path to the .json project file")
    
    args = parser.parse_args()

    try:
        with open(args.path, 'r') as f:
            raw_data = f.read()
        
        project = AnimationProject.model_validate_json(raw_data)
        print(f"Schema validation successful for project: '{project.name}'")

    except ValidationError as e:
        print("JSON validation error:")
        print(e.json())
    except FileNotFoundError:
        print(f"File not found: {args.path}")
