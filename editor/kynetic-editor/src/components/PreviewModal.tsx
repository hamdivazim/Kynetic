"use client";

// src/components/PreviewModal.tsx
// Plays the project timeline in-browser (a lightweight approximation of the
// renderer's output) with playback and scrubbing controls.

import { useEffect, useRef, useState } from "react";
import { useEditor, usePreview } from "@/lib/state";
import { projectDuration } from "@/lib/preview";
import { Button } from "./fields";
import SceneSvg from "./SceneSvg";

interface PreviewModalProps {
  assets: Record<string, string | null>;
}

export default function PreviewModal({ assets }: PreviewModalProps) {
  const { open, closePreview } = usePreview();
  if (!open) return null;
  // Mounted only while open, so playback state resets every time it opens.
  return <PreviewPlayer assets={assets} onClose={closePreview} />;
}

function PreviewPlayer({
  assets,
  onClose,
}: {
  assets: Record<string, string | null>;
  onClose: () => void;
}) {
  const { project } = useEditor();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef<number | null>(null);

  const duration = projectDuration(project);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, duration]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-lg font-semibold text-white">
          Preview: {project.name || "Untitled Project"}
        </h2>
        <Button variant="secondary" onClick={onClose}>
          Close (Esc)
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <SceneSvg
          project={project}
          time={time}
          assets={assets}
          panZoom
          className="max-h-full max-w-full rounded-lg shadow-2xl"
        />
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-zinc-900 px-4 py-3">
        <Button variant="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setTime(0);
            setPlaying(true);
          }}
        >
          ↺ Restart
        </Button>
        <input
          type="range"
          className="flex-1 accent-blue-500"
          min={0}
          max={duration}
          step={0.01}
          value={time}
          onChange={(e) => {
            setPlaying(false);
            setTime(parseFloat(e.target.value));
          }}
        />
        <span className="w-24 text-right font-mono text-sm text-zinc-300">
          {time.toFixed(2)}s / {duration.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
