"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAwsConfig, useEditor, usePreview } from "@/lib/state";
import { downloadJson } from "@/lib/project";
import { validateProject } from "@/lib/serialise";
import { getPresignedGetUrl, type AwsConfig } from "@/lib/aws";
import NodeList from "./NodeList";
import Stage from "./Stage";
import Inspector from "./Inspector";
import TimelinePanel from "./TimelinePanel";
import PreviewModal from "./PreviewModal";
import SettingsModal from "./SettingsModal";
import { Button, ColorInput, Field, NumberInput, Section, TextInput } from "./fields";

type Tab = "node" | "timeline" | "project";

function subscribeNoop() {
  return () => {};
}

const assetCache = new Map<string, { url: string | null; expiresAt: number }>();

async function resolveSvgAsset(src: string, config: AwsConfig | null): Promise<string | null> {
  if (!src.startsWith("s3://")) return null;
  const cached = assetCache.get(src);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (!config) return null;
  try {
    const url = await getPresignedGetUrl(config, src.slice("s3://".length));
    assetCache.set(src, { url, expiresAt: Date.now() + 4 * 60 * 1000 });
    return url;
  } catch {
    assetCache.set(src, { url: null, expiresAt: Date.now() + 30 * 1000 });
    return null;
  }
}

export default function EditorShell() {
  const {
    project,
    setProject,
    importProjectJson,
    resetProject,
    selectedIds,
    setSelectedId,
    removeDrawables,
    duplicateDrawables,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditor();
  const { config } = useAwsConfig();
  const { open: previewOpen, openPreview } = usePreview();
  const [tab, setTab] = useState<Tab>("node");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, string | null>>({});

  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const localPreviews = useRef(new Map<string, string>());

  useEffect(() => {
    let cancelled = false;
    const svgNodes = project.definitions.filter((d) => d.type === "svg");
    void (async () => {
      const next: Record<string, string | null> = {};
      for (const node of svgNodes) {
        const local = localPreviews.current.get(node.id);
        if (local) {
          next[node.id] = local;
        } else {
          next[node.id] = await resolveSvgAsset(node.src, config);
        }
      }
      if (!cancelled) setAssets(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [project.definitions, config]);

  function handleLoadLocalPreview(id: string, file: File) {
    const url = URL.createObjectURL(file);
    localPreviews.current.set(id, url);
    setAssets((prev) => ({ ...prev, [id]: url }));
    setMessage(`Previewing "${file.name}" locally. The exported src is unchanged.`);
  }

  function handleImportFile(file: File) {
    void file
      .text()
      .then((text) => {
        const parsed = importProjectJson(text);
        setMessage(`Imported "${parsed.name}".`);
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        setTab("project");
        setMessage(`Import failed: ${msg}`);
      });
  }

  function handleExport() {
    try {
      downloadJson(project, `${project.name || "kynetic_project"}.json`);
      setMessage("Project exported! Run it locally with the Kynetic renderer.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setTab("project");
      setMessage(msg);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;

      if (typing) {
        if (e.key === "Escape") target.blur();
        return;
      }

      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
      } else if (mod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedIds.length > 0) duplicateDrawables(selectedIds);
      } else if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleExport();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          removeDrawables(selectedIds);
        }
      } else if (e.key === "Escape") {
        if (!settingsOpen && !previewOpen) setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, settingsOpen, previewOpen, undo, redo, removeDrawables, duplicateDrawables]);

  const validationErrors = validateProject(project);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-baseline gap-2 shrink-0">
          <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kynetic
          </h1>
          <a
            href="https://github.com/hamdivazim/Kynetic"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            title="Kynetic on GitHub by Hamd Waseem"
          >
            by Hamd Waseem
          </a>
        </div>

        <input
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-300 focus:border-blue-500 dark:text-zinc-200 dark:hover:border-zinc-700"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          aria-label="Project name"
        />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            className="px-2 py-1.5"
            title="Undo (Ctrl+Z)"
            onClick={undo}
            disabled={!canUndo}
          >
            ↶
          </Button>
          <Button
            variant="ghost"
            className="px-2 py-1.5"
            title="Redo (Ctrl+Shift+Z)"
            onClick={redo}
            disabled={!canRedo}
          >
            ↷
          </Button>
        </div>

        <a
          href="https://github.com/hamdivazim/Kynetic"
          target="_blank"
          rel="noopener noreferrer"
          title="View GitHub Repository"
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </a>

        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
          {isMounted && config ? "AWS Config" : "AWS Setup"}
        </Button>
        <a
          href="/instructions"
          target="_blank"
          rel="noopener"
          title="Instructions, node & transition reference, self-hosting guide"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Instructions
        </a>
        <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
          Import
        </Button>
        <Button variant="primary" onClick={handleExport}>
          Export JSON
        </Button>
        <Button variant="primary" onClick={openPreview}>
          ▶ Preview
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
      </header>

      {message ? (
        <div
          role="status"
          className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-100 px-4 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <span className="min-w-0 truncate">{message}</span>
          <button
            type="button"
            className="shrink-0 text-zinc-400 hover:text-zinc-600"
            onClick={() => setMessage(null)}
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <NodeList />
        <Stage assets={assets} />

        <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {(["node", "timeline", "project"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t}
                {t === "project" && validationErrors.length > 0 ? (
                  <span className="ml-1 text-red-500">•</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            {tab === "node" ? (
              <Inspector
                onOpenSettings={() => setSettingsOpen(true)}
                onLoadLocalPreview={handleLoadLocalPreview}
              />
            ) : null}
            {tab === "timeline" ? <TimelinePanel /> : null}
            {tab === "project" ? (
              <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
                <Section title="Project">
                  <Field label="Name">
                    <TextInput value={project.name} onChange={(name) => setProject({ ...project, name })} />
                  </Field>
                </Section>

                <Section title="Scene">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Width">
                      <NumberInput
                        value={project.scene.width}
                        onChange={(width) =>
                          setProject({ ...project, scene: { ...project.scene, width } })
                        }
                        min={1}
                      />
                    </Field>
                    <Field label="Height">
                      <NumberInput
                        value={project.scene.height}
                        onChange={(height) =>
                          setProject({ ...project, scene: { ...project.scene, height } })
                        }
                        min={1}
                      />
                    </Field>
                  </div>
                  <ColorInput
                    label="Background color"
                    value={project.scene.backgroundColor}
                    onChange={(backgroundColor) =>
                      setProject({ ...project, scene: { ...project.scene, backgroundColor } })
                    }
                  />
                </Section>

                <Section title="Validation">
                  {validationErrors.length === 0 ? (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Project matches renderer schema.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {validationErrors.map((error, i) => (
                        <li key={i} className="text-xs text-red-500">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title="File">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={handleExport} disabled={validationErrors.length > 0}>
                      Export JSON
                    </Button>
                    <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
                      Import JSON
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (window.confirm("Start a new empty project? Unsaved changes are lost.")) {
                          resetProject();
                          setMessage("Started a new project.");
                        }
                      }}
                    >
                      New project
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    The exported file validates against renderer/renderer/schema.py and can be
                    rendered locally with the Kynetic Docker container.
                  </p>
                </Section>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <PreviewModal assets={assets} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}