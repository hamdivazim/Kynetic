"use client";


import { useRef, useState } from "react";
import { useAwsConfig, useEditor } from "@/lib/state";
import type { Drawable, Point, StrokeStyle, FillStyle, SketchStyle, GlowDotHint } from "@/lib/types";
import {
  defaultStrokeStyle,
  defaultFillStyle,
  defaultSketchStyle,
  defaultGlowDotHint,
} from "@/lib/project";
import { uploadToS3 } from "@/lib/aws";
import {
  Button,
  Checkbox,
  ColorInput,
  Field,
  NumberInput,
  PointInput,
  Section,
  SelectInput,
  TextInput,
} from "./fields";

const FONT_OPTIONS = [
  "feasibly",
  "headstay",
  "backstay",
  "caveat",
  "permanent_marker",
  "notosans_math",
  "handanimtype1",
].map((value) => ({ value, label: value }));

const ARROW_HEAD_OPTIONS = [
  { value: "->", label: "-> (forward)" },
  { value: "<-", label: "<- (backward)" },
  { value: "<->", label: "<-> (both)" },
];

interface InspectorProps {
  onOpenSettings: () => void;
  onLoadLocalPreview: (id: string, file: File) => void;
}

export default function Inspector({ onOpenSettings, onLoadLocalPreview }: InspectorProps) {
  const { project, selectedId, setSelectedId, updateDrawable, updateProject, removeDrawable } =
    useEditor();
  const { config } = useAwsConfig();
  const [status, setStatus] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  const drawable = project.definitions.find((d) => d.id === selectedId) ?? null;

  if (!drawable) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No node selected.</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Pick a node from the list on the left, or click one on the stage.
        </p>
      </div>
    );
  }

  const d: Drawable = drawable;
  const patch = (fields: Partial<Drawable>) => updateDrawable(d.id, fields);

  function renameId(newId: string) {
    const trimmed = newId.trim();
    if (!trimmed || trimmed === d.id) return;
    if (project.definitions.some((x) => x.id === trimmed)) {
      setStatus(`A node with id "${trimmed}" already exists.`);
      return;
    }
    const oldId = d.id;
    updateProject((draft) => {
      const def = draft.definitions.find((x) => x.id === oldId);
      if (def) def.id = trimmed;
      for (const event of draft.timeline) {
        if (event.targetId === oldId) event.targetId = trimmed;
      }
      for (const def of draft.definitions) {
        if (def.type === "group") {
          def.childrenIds = def.childrenIds.map((c) => (c === oldId ? trimmed : c));
        }
        if (def.type === "eraser") {
          def.objectsToErase = def.objectsToErase.map((c) => (c === oldId ? trimmed : c));
        }
      }
    });
    setSelectedId(trimmed);
    setStatus(null);
  }

  function updateStrokeStyle(fields: Partial<StrokeStyle>) {
    const base = d.strokeStyle ?? defaultStrokeStyle();
    patch({
      strokeStyle: { color: fields.color ?? base.color, width: fields.width ?? base.width },
    });
  }

  function updateFillStyle(fields: Partial<FillStyle>) {
    const base = d.fillStyle ?? defaultFillStyle();
    patch({
      fillStyle: {
        color: fields.color ?? base.color,
        hachureGap: fields.hachureGap ?? base.hachureGap,
        hachureAngle: fields.hachureAngle ?? base.hachureAngle,
      },
    });
  }

  function updateSketchStyle(fields: Partial<SketchStyle>) {
    const base = d.sketchStyle ?? defaultSketchStyle();
    patch({
      sketchStyle: {
        roughness: fields.roughness ?? base.roughness,
        bowing: fields.bowing ?? base.bowing,
        strokeWidth: fields.strokeWidth ?? base.strokeWidth,
      },
    });
  }

  function updateGlowDotHint(fields: Partial<GlowDotHint>) {
    const base = d.glowDotHint ?? defaultGlowDotHint();
    patch({
      glowDotHint: { color: fields.color ?? base.color, radius: fields.radius ?? base.radius },
    });
  }

  async function handleUpload(file: File) {
    if (!config) {
      onOpenSettings();
      return;
    }
    const key = file.name;
    setStatus(`Uploading ${key} to S3...`);
    try {
      await uploadToS3(config, key, file, file.type || "application/octet-stream");
      patch({ src: `s3://${key}` });
      setStatus(`Uploaded to s3://${key} and set as this node's src.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Upload failed: ${message}`);
    }
  }

  function renderPointList(label: string, points: Point[], onChange: (points: Point[]) => void) {
    return (
      <Section title={label}>
        <div className="flex flex-col gap-2">
          {points.map((point, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <PointInput
                  label={`Point ${i + 1}`}
                  value={point}
                  onChange={(next) => onChange(points.map((p, j) => (j === i ? next : p)))}
                />
              </div>
              <Button
                variant="danger"
                className="px-2 py-1.5"
                onClick={() => onChange(points.filter((_, j) => j !== i))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => onChange([...points, { x: 0, y: 0 }])}>
            + Add point
          </Button>
        </div>
      </Section>
    );
  }

  function renderIdChecklist(title: string, selectedIds: string[], onChange: (ids: string[]) => void) {
    return (
      <Section title={title}>
        <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {project.definitions
            .filter((x) => x.id !== d.id)
            .map((x) => (
              <Checkbox
                key={x.id}
                label={x.id}
                checked={selectedIds.includes(x.id)}
                onChange={(checked) =>
                  onChange(checked ? [...selectedIds, x.id] : selectedIds.filter((s) => s !== x.id))
                }
              />
            ))}
          {project.definitions.length <= 1 ? (
            <p className="text-xs text-zinc-400">Add more nodes first.</p>
          ) : null}
        </div>
      </Section>
    );
  }

  function renderTypeFields(node: Drawable) {
    switch (node.type) {
      case "math":
        return (
          <>
            <Field label="TeX expression">
              <TextInput
                value={node.texExpression}
                onChange={(v) => patch({ texExpression: v })}
                mono
                placeholder="$a + b = c$"
              />
            </Field>
            <Field label="Font size">
              <NumberInput value={node.fontSize} onChange={(v) => patch({ fontSize: v })} min={1} />
            </Field>
            <Field label="Font">
              <SelectInput
                value={node.fontName}
                onChange={(v) => patch({ fontName: v })}
                options={FONT_OPTIONS}
              />
            </Field>
          </>
        );
      case "text":
        return (
          <>
            <Field label="Text">
              <TextInput value={node.text} onChange={(v) => patch({ text: v })} />
            </Field>
            <Field label="Font size">
              <NumberInput value={node.fontSize} onChange={(v) => patch({ fontSize: v })} min={1} />
            </Field>
            <Field label="Font" hint="The renderer's Text primitive currently draws with one font only">
              <SelectInput
                value={node.fontName}
                onChange={(v) => patch({ fontName: v })}
                options={FONT_OPTIONS}
              />
            </Field>
          </>
        );
      case "square":
        return (
          <Field label="Side length">
            <NumberInput value={node.sideLength} onChange={(v) => patch({ sideLength: v })} min={1} />
          </Field>
        );
      case "rectangle":
        return (
          <>
            <Field label="Width">
              <NumberInput value={node.width} onChange={(v) => patch({ width: v })} min={1} />
            </Field>
            <Field label="Height">
              <NumberInput value={node.height} onChange={(v) => patch({ height: v })} min={1} />
            </Field>
          </>
        );
      case "rounded_rectangle":
        return (
          <>
            <Field label="Width">
              <NumberInput value={node.width} onChange={(v) => patch({ width: v })} min={1} />
            </Field>
            <Field label="Height">
              <NumberInput value={node.height} onChange={(v) => patch({ height: v })} min={1} />
            </Field>
            <Field label="Border radius" hint="Fraction of the shorter side">
              <NumberInput
                value={node.borderRadius}
                onChange={(v) => patch({ borderRadius: v })}
                step={0.05}
                min={0}
              />
            </Field>
          </>
        );
      case "rounded_square":
        return (
          <>
            <Field label="Side length">
              <NumberInput value={node.sideLength} onChange={(v) => patch({ sideLength: v })} min={1} />
            </Field>
            <Field label="Border radius" hint="Fraction of the side length">
              <NumberInput
                value={node.borderRadius}
                onChange={(v) => patch({ borderRadius: v })}
                step={0.05}
                min={0}
              />
            </Field>
          </>
        );
      case "line":
        return (
          <PointInput
            label="End point"
            value={node.endPoint}
            onChange={(v) => patch({ endPoint: v })}
          />
        );
      case "arrow":
        return (
          <>
            <PointInput
              label="Start point"
              value={node.startPoint}
              onChange={(v) => patch({ startPoint: v })}
            />
            <PointInput
              label="End point"
              value={node.endPoint}
              onChange={(v) => patch({ endPoint: v })}
            />
            <Field label="Arrow head">
              <SelectInput
                value={node.arrowHeadType}
                onChange={(v) => patch({ arrowHeadType: v })}
                options={ARROW_HEAD_OPTIONS}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Head size">
                <NumberInput
                  value={node.arrowHeadSize}
                  onChange={(v) => patch({ arrowHeadSize: v })}
                  min={1}
                />
              </Field>
              <Field label="Head angle (°)">
                <NumberInput
                  value={node.arrowHeadAngle}
                  onChange={(v) => patch({ arrowHeadAngle: v })}
                  min={1}
                />
              </Field>
            </div>
          </>
        );
      case "curved_arrow":
        return (
          <>
            {renderPointList("Points", node.points, (points) => patch({ points }))}
            <Field label="Arrow head">
              <SelectInput
                value={node.arrowHeadType}
                onChange={(v) => patch({ arrowHeadType: v })}
                options={ARROW_HEAD_OPTIONS}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Head size">
                <NumberInput
                  value={node.arrowHeadSize}
                  onChange={(v) => patch({ arrowHeadSize: v })}
                  min={1}
                />
              </Field>
              <Field label="Head angle (°)">
                <NumberInput
                  value={node.arrowHeadAngle}
                  onChange={(v) => patch({ arrowHeadAngle: v })}
                  min={1}
                />
              </Field>
            </div>
          </>
        );
      case "polygon":
      case "curve":
        return renderPointList("Points", node.points, (points) => patch({ points }));
      case "ellipse":
        return (
          <>
            <Field label="Width">
              <NumberInput value={node.width} onChange={(v) => patch({ width: v })} min={1} />
            </Field>
            <Field label="Height">
              <NumberInput value={node.height} onChange={(v) => patch({ height: v })} min={1} />
            </Field>
          </>
        );
      case "circle":
        return (
          <Field label="Radius">
            <NumberInput value={node.radius} onChange={(v) => patch({ radius: v })} min={1} />
          </Field>
        );
      case "glow_dot":
        return (
          <Field label="Radius">
            <NumberInput value={node.radius} onChange={(v) => patch({ radius: v })} min={1} />
          </Field>
        );
      case "ngon":
        return (
          <>
            <Field label="Radius">
              <NumberInput value={node.radius} onChange={(v) => patch({ radius: v })} min={1} />
            </Field>
            <Field label="Sides (n)">
              <NumberInput value={node.n} onChange={(v) => patch({ n: Math.round(v) })} min={3} />
            </Field>
          </>
        );
      case "svg":
        return (
          <>
            <Field
              label="Source"
              hint="s3://key.svg fetches through your API; a plain path is resolved relative to the JSON at render time"
            >
              <TextInput value={node.src} onChange={(v) => patch({ src: v })} mono />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => uploadInputRef.current?.click()}>
                {config ? "Upload SVG to S3" : "Connect AWS to upload"}
              </Button>
              <Button variant="secondary" onClick={() => localInputRef.current?.click()}>
                Load local preview file
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Scale X">
                <NumberInput value={node.scaleX} onChange={(v) => patch({ scaleX: v })} step={0.1} min={0.05} />
              </Field>
              <Field label="Scale Y">
                <NumberInput value={node.scaleY} onChange={(v) => patch({ scaleY: v })} step={0.1} min={0.05} />
              </Field>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              The preview estimates SVG size at 300×300 before scaling; the renderer uses the file&apos;s
              real size.
            </p>
          </>
        );
      case "eraser":
        return renderIdChecklist("Nodes to erase", node.objectsToErase, (ids) =>
          patch({ objectsToErase: ids }),
        );
      case "group":
        return renderIdChecklist("Child nodes", node.childrenIds, (ids) =>
          patch({ childrenIds: ids }),
        );
    }
  }

  function renderAnchorField(node: Drawable) {
    switch (node.type) {
      case "circle":
      case "ellipse":
      case "glow_dot":
      case "ngon":
        return <PointInput label="Center" value={node.center} onChange={(v) => patch({ center: v })} />;
      case "rounded_rectangle":
      case "rounded_square":
        return (
          <PointInput label="Top-left" value={node.topLeft} onChange={(v) => patch({ topLeft: v })} />
        );
      case "line":
        return (
          <PointInput
            label="Start point"
            value={node.position ?? { x: 0, y: 0 }}
            onChange={(v) => patch({ position: v })}
          />
        );
      case "polygon":
      case "curve":
      case "curved_arrow":
      case "arrow":
        return null;
      default:
        return (
          <PointInput
            label="Position"
            value={node.position ?? { x: 0, y: 0 }}
            onChange={(v) => patch({ position: v })}
          />
        );
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {d.type.replace(/_/g, " ")}
          </p>
          <IdEditor key={d.id} value={d.id} onCommit={renameId} />
        </div>
        <Button
          variant="danger"
          onClick={() => {
            setSelectedId(null);
            removeDrawable(d.id);
          }}
        >
          Delete
        </Button>
      </div>

      {status ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {status}
        </p>
      ) : null}

      <Section title="Geometry">
        {renderAnchorField(d)}
        {renderTypeFields(d)}
      </Section>

      <Section
        title="Stroke style"
        action={
          <Checkbox
            label="Enabled"
            checked={!!d.strokeStyle}
            onChange={(on) => patch({ strokeStyle: on ? defaultStrokeStyle() : null })}
          />
        }
      >
        {d.strokeStyle ? (
          <>
            <ColorInput value={d.strokeStyle.color} onChange={(color) => updateStrokeStyle({ color })} />
            <Field label="Width">
              <NumberInput
                value={d.strokeStyle.width}
                onChange={(width) => updateStrokeStyle({ width })}
                step={0.5}
                min={0}
              />
            </Field>
          </>
        ) : (
          <p className="text-xs text-zinc-400">The renderer uses its default stroke.</p>
        )}
      </Section>

      <Section
        title="Fill style"
        action={
          <Checkbox
            label="Enabled"
            checked={!!d.fillStyle}
            onChange={(on) => patch({ fillStyle: on ? defaultFillStyle() : null })}
          />
        }
      >
        {d.fillStyle ? (
          <>
            <ColorInput value={d.fillStyle.color} onChange={(color) => updateFillStyle({ color })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Hachure gap">
                <NumberInput
                  value={d.fillStyle.hachureGap ?? 10}
                  onChange={(hachureGap) => updateFillStyle({ hachureGap })}
                  min={1}
                />
              </Field>
              <Field label="Hachure angle (°)">
                <NumberInput
                  value={d.fillStyle.hachureAngle ?? -45}
                  onChange={(hachureAngle) => updateFillStyle({ hachureAngle })}
                  step={5}
                />
              </Field>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-400">Shapes render without fill.</p>
        )}
      </Section>

      <Section
        title="Sketch style"
        action={
          <Checkbox
            label="Enabled"
            checked={!!d.sketchStyle}
            onChange={(on) => patch({ sketchStyle: on ? defaultSketchStyle() : null })}
          />
        }
      >
        {d.sketchStyle ? (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Roughness">
              <NumberInput
                value={d.sketchStyle.roughness}
                onChange={(roughness) => updateSketchStyle({ roughness })}
                step={0.1}
                min={0}
              />
            </Field>
            <Field label="Bowing">
              <NumberInput
                value={d.sketchStyle.bowing}
                onChange={(bowing) => updateSketchStyle({ bowing })}
                step={0.1}
                min={0}
              />
            </Field>
            <Field label="Stroke mult.">
              <NumberInput
                value={d.sketchStyle.strokeWidth}
                onChange={(strokeWidth) => updateSketchStyle({ strokeWidth })}
                step={0.1}
                min={0}
              />
            </Field>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">The renderer uses its default sketch style.</p>
        )}
      </Section>

      <Section
        title="Glow dot hint"
        action={
          <Checkbox
            label="Enabled"
            checked={!!d.glowDotHint}
            onChange={(on) => patch({ glowDotHint: on ? defaultGlowDotHint() : null })}
          />
        }
      >
        {d.glowDotHint ? (
          <>
            <ColorInput
              label="Dot color"
              value={d.glowDotHint.color}
              onChange={(color) => updateGlowDotHint({ color })}
            />
            <Field label="Radius">
              <NumberInput
                value={d.glowDotHint.radius}
                onChange={(radius) => updateGlowDotHint({ radius })}
                min={1}
              />
            </Field>
          </>
        ) : (
          <p className="text-xs text-zinc-400">No glow dot follows this node while it is drawn.</p>
        )}
      </Section>

      {/* hidden file inputs for svg nodes */}
      <input
        ref={uploadInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />
      <input
        ref={localInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onLoadLocalPreview(d.id, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function IdEditor({ value, onCommit }: { value: string; onCommit: (id: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className="w-full rounded-md border border-transparent bg-transparent font-mono text-lg font-semibold text-zinc-900 outline-none hover:border-zinc-300 focus:border-blue-500 dark:text-zinc-100 dark:hover:border-zinc-700"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
