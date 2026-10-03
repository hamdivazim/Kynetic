import Link from "next/link";

export const metadata = {
  title: "Kynetic Editor: Instructions",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3 border-t border-zinc-200 py-8 dark:border-zinc-800">
      <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="max-w-3xl overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      {children}
    </pre>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="max-w-3xl overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-zinc-100 px-3 py-2 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InstructionsPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col px-6 pb-20">
      <header className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kynetic Editor: Instructions
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Created by <span className="font-semibold text-zinc-700 dark:text-zinc-300">Hamd Waseem</span> &bull;{" "}
            <a
              href="https://github.com/hamdivazim/Kynetic"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              hamdivazim/Kynetic
            </a>
          </p>
        </div>
        <Link
          href="/"
          className="self-start rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:self-auto"
        >
          ← Back to editor
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        {[
          ["self-hosting", "Self-hosting"],
          ["projects", "Projects: nodes & transitions"],
          ["aws", "AWS setup with CDK"],
          ["rendering", "Rendering with Docker"],
          ["shortcuts", "Keyboard shortcuts"],
          ["troubleshooting", "Troubleshooting"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section id="self-hosting" title="Self-hosting the editor website">
        <P>
          The editor is a standard Next.js (App Router, client-heavy) application in{" "}
          <Code>editor/kynetic-editor</Code>. It stores projects in your browser and talks only to
          your own AWS API. There is no backend to deploy beyond the CDK stack below.
        </P>
        <H3>Requirements</H3>
        <P>Node.js 20 or newer and npm.</P>
        <H3>Run locally</H3>
        <Pre>{`cd editor/kynetic-editor
npm install
npm run dev        # development server on http://localhost:3000`}</Pre>
        <H3>Build for production</H3>
        <Pre>{`npm run build
npm start          # serves the production build on port 3000`}</Pre>
        <H3>Deploy anywhere Node runs</H3>
        <P>
          The production build is self-contained. Run <Code>npm run build && npm start</Code> behind
          any reverse proxy, or deploy to a Node host such as a VPS, Railway, Render, Fly.io, or
          Vercel (import the repo and set the root directory to{" "}
          <Code>editor/kynetic-editor</Code>). No environment variables are required; the AWS API
          URL and API key are entered in the editor&apos;s AWS setup popup and stored in the
          browser&apos;s localStorage only.
        </P>
      </Section>

      <Section id="projects" title="Projects: nodes & transitions">
        <P>
          A project is a JSON file (matching <Code>renderer/renderer/schema.py</Code>) with three
          parts: a scene (width, height, background color), definitions (the nodes), and a timeline (the
          transitions that animate them). The exported JSON is what the Docker renderer consumes.
        </P>
        <H3>Coordinates</H3>
        <P>
          The editor works in the renderer&apos;s world coordinates: the default 1920&times;1080 scene
          maps the world rectangle <Code>(0..1778, 0..1000)</Code> onto the video frame with a
          small margin, so the numbers you see in the inspector are exactly the numbers written to
          the JSON. Text/math nodes are positioned at their top-left, rectangle/square at their
          top-left corner, and circle/ellipse/ngon/glow-dot at their center.
        </P>
        <H3>Node types</H3>
        <Table
          head={["Node", "Key fields", "Info"]}
          rows={[
            ["math", "tex_expression, font_size, font_name", "LaTeX expression, e.g. $x^2$"],
            ["text", "text, font_size", "Plain text"],
            ["square", "side_length", "position = top-left"],
            ["rectangle", "width, height", "position = top-left"],
            ["rounded_square / rounded_rectangle", "side_length / width+height, border_radius", "corner radius as a fraction of the short side"],
            ["line", "end_point", "position = start point"],
            ["polygon / curve / curved_arrow / arrow", "points / start_point+end_point, arrow head style", "arrows support ->, <-, <-> heads"],
            ["ellipse", "center, width, height", ""],
            ["circle / glow_dot / ngon", "center, radius / +n", "glow_dot renders as a glowing dot"],
            ["svg", "src, scale_x, scale_y", "src is s3://key.svg (uploaded) or a path relative to the JSON"],
            ["group", "children_ids", "children are defined before the group; the group's transition animates them together"],
            ["eraser", "objects_to_erase", "whitens over previously defined nodes"],
          ].map((r) => r.map((c) => <span key={String(c)}>{c}</span>))}
        />
        <H3>Styles</H3>
        <P>
          Every node can carry a <Code>stroke_style</Code> (color, width), an optional{" "}
          <Code>fill_style</Code> (hachured fill), an optional <Code>sketch_style</Code>{" "}
          (roughness/bowing/stroke multiplier) and a <Code>glow_dot_hint</Code> (a glowing dot that
          follows the pen while the node is drawn).
        </P>
        <H3>Transitions</H3>
        <Table
          head={["Transition", "What it does", "Best use cases"]}
          rows={[
            ["sketch", "Draws the node on stroke-by-stroke (entrance)", "Shapes, text, math, SVGs"],
            ["fade_in", "Fades the node in (entrance)", "Labels and dots"],
            ["fade_out", "Fades the node out (exit)", "Removing things"],
            ["zoom_out", "Shrinks the node to nothing (exit)", "Animated exits"],
            ["translate_to", 'Moves the node\'s center to the destination point; "stay at destination" keeps it there', "Rearranging the scene"],
          ].map((r) => r.map((c) => <span key={String(c)}>{c}</span>))}
        />
        <H3>Timeline rules</H3>
        <P>
          The renderer only shows a node once it has an entrance transition ({" "}
          <Code>sketch</Code> or <Code>fade_in</Code>). The editor adds a default entrance whenever
          you create a node and fills in any missing ones on export, so nothing disappears.
          Transitions are exported sorted by start time; the video length is the end of the last
          transition plus one second (five seconds for a scene with no transitions). Each transition
          has a target node, a start time and a duration.
        </P>
        <H3>Preview, import and export</H3>
        <P>
          Preview plays the timeline in the browser using the same semantics as the renderer
          (entrance/exit visibility, translate-to-center, eraser whitening). Export JSON downloads
          the renderer-ready project; Import loads any project JSON back into the editor.
        </P>
      </Section>

      <Section id="aws" title="AWS setup with CDK (your own S3 bucket)">
        <P>
          The AWS stack is optional: it gives you a private S3 bucket for SVG assets plus an
          API-Gateway/Lambda API that hands out presigned URLs. Everything runs in your own AWS account
          (BYOC); the editor stores the API URL and key only in your browser.
        </P>
        <H3>Deploy</H3>
        <Pre>{`# prerequisites: AWS CLI configured (aws configure), Node.js, Python 3.11+
npm install -g aws-cdk

cd editor/cdk
python -m venv .venv
# Windows: .venv\\Scripts\\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cdk bootstrap     # once per account/region
cdk deploy`}</Pre>
        <P>
          Full step-by-step detail (credentials, console navigation) is in{" "}
          <Code>editor/cdk/README.md</Code>. After deploying, note the API&apos;s invoke URL (API
          Gateway console → <Code>Kynetic-PresignedURL-API</Code> → Stages → <Code>prod</Code>) and the
          API key value (API Keys → <Code>ClientApiKey</Code> → Show).
        </P>
        <H3>Configure the editor</H3>
        <P>
          Open AWS setup in the editor header, paste the API URL (with or without the <Code>/prod</Code>{" "}
          stage - both work) and the API key, then use Test connection. SVG nodes can then upload to
          your bucket; the exported JSON references them as <Code>s3://filename.svg</Code> and the
          renderer fetches them at render time.
        </P>
        <H3>API routes</H3>
        <Table
          head={["Route", "Consumer", "Use"]}
          rows={[
            ["/get-url-frontend, /put-url-frontend", "This editor", "Get presigned URLs to upload/fetch remote SVGs from S3 from within the editor"],
            ["/get-url, /put-url", "The local renderer", "Use by renderer to fetch SVGs from S3"],
          ].map((r) => r.map((c) => <span key={String(c)}>{c}</span>))}
        />
        <P>
          All routes require the <Code>X-Api-Key</Code> header and are throttled by the usage plan;
          uploads and downloads go directly between the browser/renderer and S3 via short-lived
          presigned URLs.
        </P>
      </Section>

      <Section id="rendering" title="Rendering with Docker">
        <P>
          The renderer lives in <Code>renderer/</Code> and is distributed as a Docker image (see{" "}
          <Code>renderer/README.md</Code> for the full guide). Export your project from the editor,
          then:
        </P>
        <Pre>{`docker pull hamdivazim/kynetic-renderer:latest

# project without remote assets
docker run --rm \\
  -v "$(pwd)/<project_dir>:/input" -v "$(pwd)/<output_dir>:/output" \\
  hamdivazim/kynetic-renderer:latest /input/<project_file>.json

# project using s3:// SVGs, pass your CDK API URL and key
docker run --rm \\
  -e KYNETIC_API_URL="https://your-api-id.execute-api.region.amazonaws.com" \\
  -e KYNETIC_API_KEY="your-api-key" \\
  -v "$(pwd)/<project_dir>:/input" -v "$(pwd)/<output_dir>:/output" \\
  hamdivazim/kynetic-renderer:latest /input/<project_file>.json`}</Pre>
        <P>
          <Code>KYNETIC_API_URL</Code> may be the bare API URL or the one ending in{" "}
          <Code>/prod</Code>; if the variables are omitted the container prompts for them. The video
          is written to the output directory next to the project file.
        </P>
      </Section>

      <Section id="shortcuts" title="Keyboard shortcuts">
        <Table
          head={["Shortcut", "Action"]}
          rows={[
            ["Ctrl/⌘ + Z", "Undo"],
            ["Ctrl/⌘ + Shift + Z or Ctrl/⌘ + Y", "Redo"],
            ["Ctrl/⌘ + D", "Duplicate the selected node(s)"],
            ["Ctrl/⌘ + S", "Export JSON"],
            ["Delete / Backspace", "Delete the selected node(s)"],
            ["Escape", "Deselect (or leave the focused field)"],
            ["Shift + click", "Add/remove a node from the selection; drag moves the whole selection"],
            ["Mouse wheel", "Zoom in/out around the cursor"],
            ["Drag the canvas background", "Pan the view"],
            ["0 or Home", "Recenter to the original view"],
            ["+ / −", "Zoom in/out around the view center"],
          ].map((r) => r.map((c) => <span key={String(c)}>{c}</span>))}
        />
      </Section>

      <Section id="troubleshooting" title="Troubleshooting">
        <H3>SVG upload or preview fails with 403 / &quot;Failed to fetch&quot;</H3>
        <P>
          That is a CORS or authentication failure against your API. Check the API URL and key in AWS
          setup, make sure the key is the current <Code>ClientApiKey</Code> value (redeploying creates a
          new one), and redeploy the stack if it predates the current <Code>cdk_stack.py</Code> — the
          gateway now returns readable errors instead of opaque fetch failures. The editor uses the{" "}
          <Code>get-url-frontend</Code> / <Code>put-url-frontend</Code> routes.
        </P>
        <H3>The renderer cannot fetch an s3:// SVG</H3>
        <P>
          Confirm the file was uploaded (its name must match the <Code>src</Code> in the JSON exactly),
          and pass the same API URL/key via <Code>KYNETIC_API_URL</Code> /{" "}
          <Code>KYNETIC_API_KEY</Code>. The renderer uses the legacy <Code>get-url</Code> route; both
          URL forms (with and without <Code>/prod</Code>) are supported.
        </P>
        <H3>A node is missing from the rendered video</H3>
        <P>
          The renderer only shows nodes with an entrance transition. The editor guarantees one per node
          on export. If you hand-edit JSON, give every node at least one <Code>sketch</Code> or{" "}
          <Code>fade_in</Code> event.
        </P>
      </Section>

      <footer className="border-t border-zinc-200 py-8 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        Kynetic: Built by Hamd Waseem. Whiteboard-style animation authoring. The renderer engine is
        MIT-licensed in <Code>renderer/</Code>; the editor is AGPL-3.0.
        <br />
        <strong className="mt-1 inline-block">
          <a
            href="https://github.com/hamdivazim/Kynetic"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            https://github.com/hamdivazim/Kynetic
          </a>
        </strong>
      </footer>
    </main>
  );
}