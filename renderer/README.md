# kynetic-renderer

`kynetic-renderer` is a Python-based renderer for JSON projects created with the Kynetic cloud editor. It converts project definitions into videos using the `handanim` engine.

## Features

* Render JSON project definitions to video with `handanim`
* Supports core drawables: `Text`, `Math`, `Square`, `Rectangle`, `Line`, `Polygon`, `SVG`
* Supports basic animations: `TranslateTo`, `FadeIn`, `FadeOut`, `ZoomOut`, `Sketch`
* Fully Dockerized for easy deployment and consistent environments

## How to Use

### Docker (Recommended)

You can either pull the prebuilt container from Docker Hub or build it locally.

#### Pull from Docker Hub

```bash
docker pull hamdivazim/kynetic-renderer:latest
```

#### Build Locally

* Navigate to the directory containing the `Dockerfile`.
* Build the container:

```bash
docker build --no-cache -t kynetic-renderer:latest .
```

#### Render a Project

* Map your project directory to the container and run:

```bash
docker run --rm -v "$(pwd)/:/input" -v "$(pwd)/:/output" kynetic-renderer:latest /input/<project_file>.json
```

This renders the video in the same directory as the project file.

* Render to a custom output directory:

```bash
docker run --rm -v "$(pwd)/<project_dir>:/input" -v "$(pwd)/<output_dir>:/output" kynetic-renderer:latest /input/<project_file>.json
```

* Using S3 fetching:
  * Provide your API URL and Key (from your CDK Stack) either by directly inputting during runtime, or by providing as an environment variable:

```bash
docker run --rm -e KYNETIC_API_URL="https://your-api-id.execute-api.region.amazonaws.com" -e KYNETIC_API_KEY="your-secret-api-key" -v "$(pwd)/<project_dir>:/input" -v "$(pwd)/<output_dir>:/output" kynetic-renderer:latest /input/<project_file>.json
```


#### Troubleshooting

* **Output file missing:**

  * Ensure the absolute path to your project is correct. `$(pwd)` maps the current terminal directory.
  * On some Windows/macOS systems, Docker may take a few seconds to sync files back to the host.

* **Build errors with `gcc`, `cc`, or `pycairo`:**

  ```bash
  docker build --no-cache -t kynetic-renderer .
  ```

  This clears the cache and ensures all dependencies rebuild correctly.

* **Library not found / `ffmpeg` missing:**
  Use the provided `Dockerfile`. It installs all required system libraries (`Cairo`, `FFmpeg`) that are not included in standard Python environments.


### Local Development via `poetry`

#### Install prerequisites

* **Ubuntu/Debian:**

```bash
sudo apt install ffmpeg libcairo2-dev pkg-config python3-dev
```

* **macOS:**

```bash
brew install ffmpeg cairo pkg-config
```

#### Install dependencies

```bash
poetry install
```

#### Render a project

```bash
poetry run kynetic-render path/to/project.json
```
