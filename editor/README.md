# Editor

Everything under `editor/` is the authoring side of Kynetic: the web app you build
scenes in, the AWS CDK stack behind optional SVG uploads, and the architecture notes
for that stack. The renderer that turns exported JSON into video lives in
[`../renderer`](../renderer).

## Layout

- `kynetic-editor/`: the Next.js app ([its README](kynetic-editor/README.md) is a
  tour of the code)
- `cdk/`: CDK app that deploys the presigned-URL API and a private S3 bucket
  ([deployment guide](cdk/README.md))
- `aws-architecture/`: architecture write-up and diagram
  ([ARCHITECTURE.md](aws-architecture/ARCHITECTURE.md))

## Running the editor

```bash
cd editor/kynetic-editor
npm install
npm run dev        # http://localhost:3000
```

`npm run build && npm start` serves the production build on the same port. Node.js 20
or newer is required.

The app has a built-in guide at `/instructions` that covers self-hosting, the node and
transition reference, deploying the AWS stack, rendering with Docker, and the full
shortcut list. Everything below is the shorter version.

## What it does

### Scene building

The node list offers nine supported drawable types: math (TeX), text, square, rectangle, line, polygon, SVG, eraser, group. More to be added soon. Each node carries a stroke style, an optional
hachured fill, an optional sketch style (roughness, bowing, stroke multiplier), and an
optional glow-dot hint that follows the pen while it draws.

Five transitions animate them: `sketch` (draws the node on, stroke by stroke),
`fade_in`, `fade_out`, `zoom_out`, and `translate_to` (moves the node's centre to a
destination, optionally staying there). Every timeline event targets one node with a
start time and a duration.

### Renderer semantics

The canvas and preview work in the renderer's world coordinates. The default
1920×1080 scene maps to the world rectangle `(0..1778, 0..1000)` with a small margin,
so the numbers in the inspector are exactly the numbers written to the JSON.

Two rules the editor handles for you:

- The renderer only shows a node once it has an entrance event (`sketch` or
  `fade_in`). The editor adds one when you create a node and fills in any missing ones
  on export, so nothing silently disappears from the video.
- The exported timeline is sorted by start time, and the video length is the end of
  the last transition plus one second (five seconds for an empty timeline).

Exported files validate against
[`../renderer/renderer/schema.py`](../renderer/renderer/schema.py) as-is, and the
Project tab shows any validation errors before you export.

### Preview, import, export

Preview plays the timeline in the browser using the renderer's visibility and movement
rules. Import loads any project JSON back into the editor; Export downloads the
renderer-ready file (`Ctrl/⌘+S`).

### Editing

- Undo/redo with history steps, so a drag or a burst of typing is one undo.
- Pan and zoom: the wheel zooms around the cursor, dragging the background pans,
  `0`/`Home` recentres, `+`/`-` steps the zoom.
- Multi-select with shift-click (on the canvas or in the node list); dragging moves
  the whole selection.

| Shortcut | Action |
| --- | --- |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z` or `Ctrl/⌘ + Y` | Redo |
| `Ctrl/⌘ + D` | Duplicate selection |
| `Ctrl/⌘ + S` | Export JSON |
| `Delete` / `Backspace` | Remove selection |
| `Escape` | Deselect (or leave the focused field) |
| `Shift + click` | Add to / remove from selection |
| Mouse wheel | Zoom around the cursor |
| Drag the background | Pan |
| `0` / `Home` | Recentre the view |

### Cloud assets (optional)

The AWS Setup dialog in the header takes an API Gateway URL and API key (stored in the
browser's localStorage only). With it configured, SVG nodes can be uploaded to your own
S3 bucket and referenced as `s3://name.svg` in projects; the renderer fetches them at
render time.

## AWS architecture

The stack is optional and runs entirely in your own account (BYOC): API Gateway in
front of four Lambda functions that mint presigned URLs, a private S3 bucket with
least-privilege IAM access, and a single API key under a usage plan. Data flow,
security notes, and cost notes are in
[aws-architecture/ARCHITECTURE.md](aws-architecture/ARCHITECTURE.md).

![AWS architecture diagram](aws-architecture/Kynetic-AWS-Architecture.png)
