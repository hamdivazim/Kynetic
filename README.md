<div align="center">
  <img src="kynetic.png" width="80%">
</div>

<div align="center">
  <h1>Kynetic</h1>
</div>

<div align="center">

  <a href="https://hub.docker.com/r/hamdivazim/kynetic-renderer">
      <img alt="Docker Image Version" src="https://img.shields.io/docker/v/hamdivazim/kynetic-renderer?style=flat-square&label=Docker&color=%230575ED">
  </a>

  <a href="https://github.com/hamdivazim/Kynetic">
      <img alt="GitHub stars" src="https://img.shields.io/github/stars/hamdivazim/Kynetic?style=flat-square&label=GitHub Stars&color=%230575ED">
  </a>

  <a href="https://hub.docker.com/r/hamdivazim/kynetic-renderer">
      <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/hamdivazim/kynetic-renderer?style=flat-square&label=Docker Pulls&color=%230575ED">
  </a>

</div>

<div align="center">

  A full-stack, BYOC engine for hand-drawn style animations.

</div>

Kynetic is a tool for making whiteboard-style animations. You build a scene in the
browser (shapes, text, LaTeX, SVGs) arrange the pieces on a timeline, export a JSON
project file, and the renderer draws it out as a video using the
[handanim](https://github.com/subroy13/handanim) engine.

Everything runs on your own infrastructure. The editor is a plain Next.js app with no
backend. Rendering happens locally on Docker, and SVG assets can
optionally live in an S3 bucket in your own AWS account.

## Repository layout

| Path | Contents |
| --- | --- |
| [`editor/kynetic-editor`](editor/kynetic-editor) | The editor UI (Next.js, TypeScript, Tailwind) |
| [`editor/cdk`](editor/cdk) | AWS CDK stack: API Gateway + Lambda + S3 presigned-URL API |
| [`editor/aws-architecture`](editor/aws-architecture) | Architecture notes and diagrams for that stack |
| [`renderer`](renderer) | The renderer. Python, distributed as a Docker image |

## Running the editor

```bash
cd editor/kynetic-editor
npm install
npm run dev        # http://localhost:3000
```

Requires Node.js 20 or newer. The app has no backend: projects stay in the browser
tab until you export them, and nothing is uploaded anywhere unless you point the editor
at your own AWS API (the AWS Setup dialog in the header).

The editor has a built-in guide at `/instructions` covering self-hosting, the node and
transition reference, deploying the AWS stack, and rendering with Docker. See
[editor/README.md](editor/README.md) for features, shortcuts, and the API surface.

## Rendering a project

Export JSON from the editor, then hand it to the renderer:

```bash
docker pull hamdivazim/kynetic-renderer:latest

docker run --rm \
  -v "$(pwd)/:/input" \
  -v "$(pwd)/:/output" \
  hamdivazim/kynetic-renderer:latest /input/my_project.json
```

The video lands beside the project file. [renderer/README.md](renderer/README.md) has
the full guide: building the image, fetching S3 assets, and running without Docker.

## AWS setup (optional)

Only needed if you want SVG nodes stored in S3. [editor/cdk/README.md](editor/cdk/README.md)
walks through deploying the stack into your own account;
[editor/aws-architecture/ARCHITECTURE.md](editor/aws-architecture/ARCHITECTURE.md)
explains how it fits together. The editor keeps your API URL and key in the browser;
every route requires an API key and is throttled by a usage plan.

## Documentation

- [editor/README.md](editor/README.md): editor features, shortcuts, API routes
- [editor/kynetic-editor/README.md](editor/kynetic-editor/README.md): working on the editor codebase
- [editor/cdk/README.md](editor/cdk/README.md): deploying the AWS stack
- [editor/aws-architecture/ARCHITECTURE.md](editor/aws-architecture/ARCHITECTURE.md): architecture and data flow
- [renderer/README.md](renderer/README.md): rendering projects with Docker or poetry

## License

The editor is licensed under the GNU Affero General Public License v3.0 - see
[LICENSE](LICENSE). The renderer under [`renderer/`](renderer/LICENSE) is
MIT-licensed, so it can be reused freely alongside handanim and the wider animation
ecosystem.
