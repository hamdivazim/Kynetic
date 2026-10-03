"use client";


import { useState } from "react";
import { useEditor } from "@/lib/state";
import { ANIMATION_TYPE_LABELS, type Animation } from "@/lib/types";
import { createAnimation } from "@/lib/project";
import { projectDuration } from "@/lib/preview";
import { Button, Checkbox, Field, NumberInput, PointInput, SelectInput } from "./fields";

export default function TimelinePanel() {
  const {
    project,
    selectedId,
    addAnimation,
    updateAnimation,
    updateProject,
    removeAnimation,
    duplicateAnimation,
  } = useEditor();
  const [newType, setNewType] = useState<Animation["type"]>("sketch");

  const typeOptions = (Object.keys(ANIMATION_TYPE_LABELS) as Animation["type"][]).map((type) => ({
    value: type,
    label: ANIMATION_TYPE_LABELS[type],
  }));

  const targetOptions = project.definitions.map((d) => ({ value: d.id, label: d.id }));

  function handleAdd() {
    const targetId =
      selectedId && project.definitions.some((d) => d.id === selectedId)
        ? selectedId
        : project.definitions[0]?.id;
    if (!targetId) return;
    addAnimation(createAnimation(targetId, newType));
  }

  function changeType(index: number, type: Animation["type"]) {
    const current = project.timeline[index];
    if (!current) return;
    const base = {
      targetId: current.targetId,
      startTime: current.startTime,
      duration: current.duration,
    };
    const next: Animation =
      type === "translate_to"
        ? { ...base, type, destination: { x: 0, y: 0 }, persist: true }
        : ({ ...base, type } as Animation);
    updateProject((draft) => {
      if (index >= 0 && index < draft.timeline.length) draft.timeline[index] = next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Timeline</h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {project.timeline.length} transition{project.timeline.length === 1 ? "" : "s"} ·{" "}
            {projectDuration(project).toFixed(1)}s total
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {project.timeline.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No transitions yet. Add one below to animate a node.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {project.timeline.map((event, index) => (
              <li
                key={index}
                className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <SelectInput
                    value={event.type}
                    onChange={(v) => changeType(index, v as Animation["type"])}
                    options={typeOptions}
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      className="px-1.5 py-0.5 text-xs"
                      title="Duplicate"
                      onClick={() => duplicateAnimation(index)}
                    >
                      ⧉
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-1.5 py-0.5 text-xs text-red-500"
                      title="Delete"
                      onClick={() => removeAnimation(index)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Target node">
                    <SelectInput
                      value={event.targetId}
                      onChange={(v) => updateAnimation(index, { targetId: v })}
                      options={
                        targetOptions.length > 0
                          ? targetOptions
                          : [{ value: event.targetId, label: event.targetId }]
                      }
                    />
                  </Field>
                  <Field label="Start (s)">
                    <NumberInput
                      value={event.startTime}
                      onChange={(v) => updateAnimation(index, { startTime: Math.max(0, v) })}
                      step={0.1}
                      min={0}
                    />
                  </Field>
                  <Field label="Duration (s)">
                    <NumberInput
                      value={event.duration}
                      onChange={(v) => updateAnimation(index, { duration: Math.max(0.05, v) })}
                      step={0.1}
                      min={0.05}
                    />
                  </Field>
                  {event.type === "translate_to" ? (
                    <Field label="Persist after moving">
                      <Checkbox
                        label="Stay at destination"
                        checked={event.persist}
                        onChange={(v) => updateAnimation(index, { persist: v })}
                      />
                    </Field>
                  ) : null}
                </div>

                {event.type === "translate_to" ? (
                  <div className="mt-2">
                    <PointInput
                      label="Destination (the node's center moves here)"
                      value={event.destination}
                      onChange={(v) => updateAnimation(index, { destination: v })}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex-1">
          <SelectInput value={newType} onChange={(v) => setNewType(v as Animation["type"])} options={typeOptions} />
        </div>
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={project.definitions.length === 0}
          title={project.definitions.length === 0 ? "Add a node first" : undefined}
        >
          + Add
        </Button>
      </div>
    </div>
  );
}

