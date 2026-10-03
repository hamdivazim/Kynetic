# kynetic-renderer

A Dockerised Python renderer for Kynetic project files. Drawing is done internally by the
[`handanim`](https://github.com/subroy13/handanim) engine.

## Project files

A project is a JSON document with three parts, validated against
[`renderer/schema.py`](renderer/schema.py):

- `scene`: width, height, background colour (1920×1080 white by default)
- `definitions`: the nodes (the editor's nine supported drawable types)
- `timeline`: the transitions that animate them

Two timeline rules matter when reading the output:

- A node only appears once it has an entrance event (`sketch` or `fade_in`). The
  editor injects these on export; if you write JSON by hand, add one per node.
- The video runs until the last transition ends, plus one second (five seconds if the
  timeline is empty).

Sample projects live in [`examples/`](examples), start with
`examples/pythagoras.json`.

## Supported content

- **Drawables:** `math`, `text`, `square`, `rectangle`, `line`, `polygon`, `svg`,
  `eraser`, `group`. The schema accepts every type the editor can produce, but the
  renderer only constructs these; anything else is skipped with an
  `Unsupported drawable type` warning in the log.
- **Transitions:** `sketch`, `fade_in`, `fade_out`, `zoom_out`, and `translate_to`
  (with `persist` to leave the node at its destination).
- **Remote assets:** `s3://name.svg` sources are fetched through the Kynetic API at
  render time (see [S3 fetching](#s3-fetching) below). Relative paths resolve against
  the project file's directory.

## Docker (recommended)

The image ships everything that's needed for Kynetic to work immediately: Cairo, FFmpeg, and the
fonts.

```bash
# Pull the published image...
docker pull hamdivazim/kynetic-renderer:latest

# ...or build it from this directory
cd renderer
docker build --no-cache -t kynetic-renderer:latest .
```

Render a project by mounting a directory as `/input` and `/output`:

```bash
docker run --rm \
  -v "$(pwd)/:/input" \
  -v "$(pwd)/:/output" \
  kynetic-renderer:latest /input/my_project.json
```

The video is written to `/output/<name>.mp4`, so with the mounts above it lands next
to the project file. To keep input and output separate:

```bash
docker run --rm \
  -v "$(pwd)/<project_dir>:/input" \
  -v "$(pwd)/<output_dir>:/output" \
  kynetic-renderer:latest /input/my_project.json
```

On PowerShell, replace `$(pwd)` with `${PWD}`.

### S3 fetching

If the project references `s3://` assets, pass your API URL and key (from the CDK
stack) as environment variables:

```bash
docker run --rm \
  -e KYNETIC_API_URL="https://your-api-id.execute-api.region.amazonaws.com" \
  -e KYNETIC_API_KEY="your-api-key" \
  -v "$(pwd)/<project_dir>:/input" \
  -v "$(pwd)/<output_dir>:/output" \
  kynetic-renderer:latest /input/my_project.json
```

| Variable | Meaning |
| --- | --- |
| `KYNETIC_API_URL` | API Gateway URL, with or without the `/prod` stage suffix |
| `KYNETIC_API_KEY` | The `ClientApiKey` value; sent as the `X-Api-Key` header |

Leave them unset and the container prompts for the URL and key at runtime instead (the
key input is hidden).

## Local development with poetry

Install the system libraries first:

```bash
# Ubuntu/Debian
sudo apt install ffmpeg libcairo2-dev pkg-config python3-dev

# macOS
brew install ffmpeg cairo pkg-config
```

Then install and render:

```bash
poetry install
poetry run kynetic-render examples/pythagoras.json --out pythagoras.mp4
```

Two things to keep in mind:

- Run from this `renderer/` directory. The font files are located relative to your
  working directory.
- `--out` chooses where the video goes. Without it the output path defaults to
  `/output/<name>.mp4` (the container's mount point).

## Troubleshooting

**Output file missing.** Check the absolute path to your project. `$(pwd)` maps your
current terminal directory, and on some Windows/macOS setups Docker takes a few
seconds to sync files back to the host.

**A node is missing from the video.** Either it has no entrance event (add a `sketch`
or `fade_in` event for it), or the log warned
`Unsupported drawable type` / `Animation references unknown ID`.

**Build errors mentioning `gcc`, `cc`, or `pycairo`.** Rebuild without the cache so
dependencies compile cleanly:

```bash
docker build --no-cache -t kynetic-renderer:latest .
```

**Library not found, or `ffmpeg` missing.** Use the provided `Dockerfile`. It installs
Cairo, FFmpeg, and the build tools that standard Python images leave out.

**404 while fetching an `s3://` asset.** The object key or API URL is wrong. The key
must match the `src` in the JSON exactly, and the API URL may be given with or without
the `/prod` suffix.

## License

[MIT License](LICENSE). The editor in this repository is AGPL-3.0; this
directory stays permissive so the renderer can be used in other projects, and to respect handanim as the underlying engine.