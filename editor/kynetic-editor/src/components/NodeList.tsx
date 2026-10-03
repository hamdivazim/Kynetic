"use client";

import { useState } from "react";
import { useEditor } from "@/lib/state";
import { DRAWABLE_TYPE_LABELS, type Drawable } from "@/lib/types";
import { createDrawable } from "@/lib/project";
import { Button, SelectInput } from "./fields";

export default function NodeList() {
  const {
    project,
    selectedIds,
    setSelectedId,
    selectNode,
    addDrawable,
    removeDrawable,
    duplicateDrawable,
  } = useEditor();
  const [newType, setNewType] = useState<Drawable["type"]>("rectangle");

  const typeOptions = (Object.keys(DRAWABLE_TYPE_LABELS) as Drawable["type"][]).map((type) => ({
    value: type,
    label: DRAWABLE_TYPE_LABELS[type],
  }));

  function handleAdd() {
    const drawable = createDrawable(newType, project.definitions.map((d) => d.id));
    addDrawable(drawable);
    setSelectedId(drawable.id);
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nodes</h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {project.definitions.length} node{project.definitions.length === 1 ? "" : "s"} in this scene
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {project.definitions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No nodes yet.
            <br />
            Add one below to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {project.definitions.map((drawable) => {
              const selected = selectedIds.includes(drawable.id);
              return (
                <li key={drawable.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => selectNode(drawable.id, e.shiftKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") selectNode(drawable.id, e.shiftKey);
                    }}
                    className={`group flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                      selected
                        ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{drawable.id}</span>
                      <span className="block text-[10px] uppercase tracking-wide opacity-60">
                        {DRAWABLE_TYPE_LABELS[drawable.type]}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        className="px-1.5 py-0.5 text-xs"
                        title="Duplicate"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateDrawable(drawable.id);
                        }}
                      >
                        ⧉
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-1.5 py-0.5 text-xs text-red-500"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDrawable(drawable.id);
                        }}
                      >
                        ✕
                      </Button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <SelectInput value={newType} onChange={(v) => setNewType(v as Drawable["type"])} options={typeOptions} />
        <Button variant="primary" onClick={handleAdd}>
          + Add node
        </Button>
      </div>
    </div>
  );
}
