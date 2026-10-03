"use client";

import { useCallback } from "react";
import { useEditor } from "@/lib/state";
import { translateDrawable } from "@/lib/project";
import SceneSvg from "./SceneSvg";

interface StageProps {
  assets: Record<string, string | null>;
}

export default function Stage({ assets }: StageProps) {
  const { project, selectedIds, selectNode, updateProject } = useEditor();

  const handleMove = useCallback(
    (id: string, dx: number, dy: number) => {
      updateProject((draft) => {
        const ids = selectedIds.includes(id) ? selectedIds : [id];
        for (const nodeId of ids) {
          const drawable = draft.definitions.find((d) => d.id === nodeId);
          if (drawable) translateDrawable(drawable, dx, dy);
        }
      });
    },
    [updateProject, selectedIds],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-zinc-200 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Stage</h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {project.scene.width} × {project.scene.height} · drag nodes to move · shift-click to
          multi-select · wheel to zoom · drag the background to pan · 0 to recenter
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-6 select-none">
        <SceneSvg
          project={project}
          assets={assets}
          selectedIds={selectedIds}
          onSelect={selectNode}
          onMove={handleMove}
          panZoom
          className="max-h-full max-w-full rounded-lg shadow-lg ring-1 ring-black/10"
        />
      </div>
    </div>
  );
}
