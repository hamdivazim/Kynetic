# kynetic-editor

The Next.js app behind the Kynetic editor: a node-based scene builder with a
transition timeline, in-browser preview, and JSON import/export to use with the renderer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (npm start to serve it)
npm run lint       # ESLint
npx tsc --noEmit   # type check
```

For the user-facing feature guide and keyboard shortcuts, see the `/instructions`
page in the running app, or [../README.md](../README.md) for the shorter version.

## How it fits together

The app is client-heavy: project state lives in React context, and there is no
server-side data layer. The only network calls go to your own API Gateway when SVG
uploads are configured (AWS Setup in the header). The URL and key are kept in
localStorage and never leave the browser otherwise.

## Source layout

### `src/app`

- `page.tsx`: renders `EditorShell`.
- `instructions/page.tsx`: the built-in guide (self-hosting, node/transition
  reference, AWS setup, Docker rendering, shortcuts, troubleshooting).
- `layout.tsx`: fonts, metadata, and the `AwsProvider` / `EditorProvider` /
  `PreviewProvider` wrappers.

### `src/components`

- `EditorShell.tsx`: the page shell: header (project name, undo/redo, import,
  export, preview, AWS setup), global keyboard shortcuts, and the three-panel layout.
- `NodeList.tsx`: left panel; add, select, duplicate, and delete nodes.
- `Stage.tsx`: centre panel; wraps `SceneSvg` and moves the selected nodes.
- `SceneSvg.tsx`: the canvas itself: world-coordinate rendering, wheel zoom to
  cursor, background-drag panning, shift-click multi-select, and dragging nodes.
- `Inspector.tsx`: right panel; property editors for the selected node (fields vary
  by drawable type).
- `TimelinePanel.tsx`: right panel tab; add and edit transitions (type, target,
  start time, duration, destination).
- `PreviewModal.tsx`: plays the timeline in-browser using the renderer's visibility
  rules, with scrubbing and the same pan/zoom.
- `SettingsModal.tsx`: AWS Setup dialog (API URL + key, test connection).
- `fields.tsx`: shared form controls (text, number, select, colour, point inputs).

### `src/lib`

- `types.ts`: the project model: `Drawable` union (9 supported types), `Animation` union (5
  types), scene config, and display labels.
- `state.tsx`: `EditorProvider` (project state, coalesced undo/redo history,
  multi-selection) and `AwsProvider` (localStorage-backed API config).
- `project.ts`: constructors and helpers: new projects, default drawables, cloning,
  duration calculation, JSON download.
- `serialise.ts`: export/import: camelCase ↔ snake_case key mapping, validation
  against the renderer schema's rules, and `ensureEntranceEvents`, which injects
  missing `sketch`/`fade_in` entrances so no node is invisible in the render.
- `preview.ts`: the preview engine: world-coordinate viewport mapping, per-frame
  render state for each drawable (visibility, opacity, scale, draw progress), and
  timeline evaluation that mirrors the renderer.
- `aws.ts`: presigned-URL requests against the `*-frontend` routes: normalises the
  base URL, sends `X-Api-Key`, signs `Content-Type` into PUTs, and turns CORS/network
  failures into readable error messages.
- `storage.ts`: load/save/clear the AWS config in localStorage (`kynetic_editor_aws_config`).

## Conventions

- The renderer maps the scene (default 1920×1080) onto a world
  rectangle of `(0..1778, 0..1000)` with a small margin. The editor works in those
  world coordinates everywhere, so inspector values are the values written to JSON:
  no conversion at export time.
- A node is only rendered once a `sketch` or
  `fade_in` event targets it. The editor adds one per node at creation and fills any
  gaps during export (`ensureEntranceEvents`), and the preview applies the same rule.
- `serialise.ts` converts to the snake_case keys in
  `renderer/renderer/schema.py`; the Project tab validates against those rules before
  export and surfaces any errors.

## Related documentation

- [../README.md](../README.md): editor features and API routes
- [../cdk/README.md](../cdk/README.md): deploying the AWS stack
- [../../renderer/README.md](../../renderer/README.md): rendering exported projects
