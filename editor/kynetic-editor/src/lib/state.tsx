"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { AnimationProject, Drawable, Animation } from "./types";
import {
  loadStoredAwsConfig,
  saveStoredAwsConfig,
  clearStoredAwsConfig,
  type StoredAwsConfig,
} from "./storage";
import { createProject, generateId, cloneDrawable, cloneAnimation } from "./project";
import { entranceAnimationFor, fromSchemaProject } from "./serialise";


interface AwsContextValue {
  config: StoredAwsConfig | null;
  setConfig: (config: StoredAwsConfig | null) => void;
  clearConfig: () => void;
}

const AwsContext = createContext<AwsContextValue | null>(null);

export function AwsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoredAwsConfig | null>(() => {
    if (typeof window === "undefined") return null;
    return loadStoredAwsConfig();
  });

  useEffect(() => {
    if (config) {
      saveStoredAwsConfig(config);
    } else {
      clearStoredAwsConfig();
    }
  }, [config]);

  const clearConfig = useCallback(() => {
    setConfig(null);
  }, []);

  return (
    <AwsContext.Provider value={{ config, setConfig, clearConfig }}>
      {children}
    </AwsContext.Provider>
  );
}

export function useAwsConfig() {
  const ctx = useContext(AwsContext);
  if (!ctx) throw new Error("useAwsConfig must be used within AwsProvider");
  return ctx;
}


interface EditorContextValue {
  project: AnimationProject;
  setProject: (project: AnimationProject) => void;
  updateProject: (update: (draft: AnimationProject) => void) => void;
  selectedId: string | null;
  selectedIds: string[];
  setSelectedId: (id: string | null) => void;
  selectNode: (id: string | null, additive?: boolean) => void;
  addDrawable: (drawable: Drawable) => void;
  updateDrawable: (id: string, patch: Partial<Drawable>) => void;
  removeDrawable: (id: string) => void;
  removeDrawables: (ids: string[]) => void;
  addAnimation: (animation: Animation) => void;
  updateAnimation: (index: number, patch: Partial<Animation>) => void;
  removeAnimation: (index: number) => void;
  reorderDrawables: (fromIndex: number, toIndex: number) => void;
  reorderAnimations: (fromIndex: number, toIndex: number) => void;
  duplicateDrawable: (id: string) => Drawable | null;
  duplicateDrawables: (ids: string[]) => string[];
  duplicateAnimation: (index: number) => Animation | null;
  resetProject: (name?: string) => void;
  importProjectJson: (json: string) => AnimationProject;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

const HISTORY_COALESCE_MS = 600;
const HISTORY_LIMIT = 100;

export function EditorProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<AnimationProject>(() => createProject("Untitled Project"));
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const selectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;

  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const historyRef = useRef<{ past: AnimationProject[]; future: AnimationProject[] }>(
    { past: [], future: [] },
  );
  const lastEditRef = useRef(0);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const syncHistoryState = useCallback(() => {
    const h = historyRef.current;
    const canUndo = h.past.length > 0;
    const canRedo = h.future.length > 0;
    setHistoryState((prev) =>
      prev.canUndo === canUndo && prev.canRedo === canRedo ? prev : { canUndo, canRedo },
    );
  }, []);

  const applyProject = useCallback((next: AnimationProject) => {
    projectRef.current = next;
    setProject(next);
    setSelectedIdsState((prev) => prev.filter((id) => next.definitions.some((d) => d.id === id)));
  }, []);

  const recordHistory = useCallback(
    (prev: AnimationProject) => {
      const h = historyRef.current;
      const now = Date.now();
      h.future = [];
      if (now - lastEditRef.current >= HISTORY_COALESCE_MS || h.past.length === 0) {
        h.past.push(prev);
        if (h.past.length > HISTORY_LIMIT) h.past.shift();
      }
      lastEditRef.current = now;
      syncHistoryState();
    },
    [syncHistoryState],
  );

  const setProjectState = useCallback(
    (next: AnimationProject) => {
      recordHistory(projectRef.current);
      applyProject(next);
    },
    [recordHistory, applyProject],
  );

  const updateProject = useCallback(
    (update: (draft: AnimationProject) => void) => {
      const prev = projectRef.current;
      const next = JSON.parse(JSON.stringify(prev)) as AnimationProject;
      update(next);
      recordHistory(prev);
      applyProject(next);
    },
    [recordHistory, applyProject],
  );

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdsState(id ? [id] : []);
  }, []);

  const selectNode = useCallback((id: string | null, additive = false) => {
    if (id === null) {
      if (!additive) setSelectedIdsState([]);
      return;
    }
    setSelectedIdsState((prev) => {
      if (!additive) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }, []);

  const addDrawable = useCallback(
    (drawable: Drawable) => {
      updateProject((draft) => {
        draft.definitions.push(drawable);
        draft.timeline.push(entranceAnimationFor(drawable));
      });
    },
    [updateProject],
  );

  const updateDrawable = useCallback(
    (id: string, patch: Partial<Drawable>) => {
      updateProject((draft) => {
        const index = draft.definitions.findIndex((d) => d.id === id);
        if (index === -1) return;
        draft.definitions[index] = { ...draft.definitions[index], ...patch } as Drawable;
      });
    },
    [updateProject],
  );

  const removeDrawables = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const set = new Set(ids);
      updateProject((draft) => {
        draft.definitions = draft.definitions.filter((d) => !set.has(d.id));
        draft.timeline = draft.timeline.filter((a) => !set.has(a.targetId));
        for (const def of draft.definitions) {
          if (def.type === "group") {
            def.childrenIds = def.childrenIds.filter((c) => !set.has(c));
          }
          if (def.type === "eraser") {
            def.objectsToErase = def.objectsToErase.filter((c) => !set.has(c));
          }
        }
      });
      setSelectedIdsState((prev) => prev.filter((id) => !set.has(id)));
    },
    [updateProject],
  );

  const removeDrawable = useCallback(
    (id: string) => {
      removeDrawables([id]);
    },
    [removeDrawables],
  );

  const addAnimation = useCallback(
    (animation: Animation) => {
      updateProject((draft) => {
        draft.timeline.push(animation);
      });
    },
    [updateProject],
  );

  const updateAnimation = useCallback(
    (index: number, patch: Partial<Animation>) => {
      updateProject((draft) => {
        if (index < 0 || index >= draft.timeline.length) return;
        draft.timeline[index] = { ...draft.timeline[index], ...patch } as Animation;
      });
    },
    [updateProject],
  );

  const removeAnimation = useCallback(
    (index: number) => {
      updateProject((draft) => {
        draft.timeline.splice(index, 1);
      });
    },
    [updateProject],
  );

  const reorderDrawables = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateProject((draft) => {
        const item = draft.definitions.splice(fromIndex, 1)[0];
        if (!item) return;
        draft.definitions.splice(toIndex, 0, item);
      });
    },
    [updateProject],
  );

  const reorderAnimations = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateProject((draft) => {
        const item = draft.timeline.splice(fromIndex, 1)[0];
        if (!item) return;
        draft.timeline.splice(toIndex, 0, item);
      });
    },
    [updateProject],
  );

  const duplicateDrawables = useCallback(
    (ids: string[]): string[] => {
      const taken = new Set(projectRef.current.definitions.map((d) => d.id));
      const newIds: string[] = [];
      updateProject((draft) => {
        for (const id of ids) {
          const original = draft.definitions.find((d) => d.id === id);
          if (!original) continue;
          const candidate = cloneDrawable(original);
          let attempt = 0;
          do {
            candidate.id = generateId(`dup_${original.type}`);
            attempt++;
          } while (taken.has(candidate.id) && attempt < 10);
          taken.add(candidate.id);
          newIds.push(candidate.id);
          draft.definitions.push(candidate);
          draft.timeline.push(entranceAnimationFor(candidate));
        }
      });
      if (newIds.length > 0) setSelectedIdsState(newIds);
      return newIds;
    },
    [updateProject],
  );

  const duplicateDrawable = useCallback(
    (id: string): Drawable | null => {
      const [newId] = duplicateDrawables([id]);
      return newId ? (projectRef.current.definitions.find((d) => d.id === newId) ?? null) : null;
    },
    [duplicateDrawables],
  );

  const duplicateAnimation = useCallback(
    (index: number): Animation | null => {
      if (index < 0 || index >= projectRef.current.timeline.length) return null;
      const original = projectRef.current.timeline[index];
      const next = cloneAnimation(original);
      addAnimation(next);
      return next;
    },
    [addAnimation],
  );

  const resetProject = useCallback(
    (name?: string) => {
      setProjectState(createProject(name ?? "Untitled Project"));
      setSelectedIdsState([]);
    },
    [setProjectState],
  );

  const importProjectJson = useCallback(
    (json: string): AnimationProject => {
      const parsed = fromSchemaProject(json);
      setProjectState(parsed);
      setSelectedIdsState([]);
      return parsed;
    },
    [setProjectState],
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    const previous = h.past.pop();
    if (!previous) return;
    h.future.push(projectRef.current);
    applyProject(previous);
    syncHistoryState();
  }, [applyProject, syncHistoryState]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(projectRef.current);
    applyProject(next);
    syncHistoryState();
  }, [applyProject, syncHistoryState]);

  return (
    <EditorContext.Provider
      value={{
        selectedId,
        selectedIds,
        setSelectedId,
        selectNode,
        project,
        setProject: setProjectState,
        updateProject,
        addDrawable,
        updateDrawable,
        removeDrawable,
        removeDrawables,
        addAnimation,
        updateAnimation,
        removeAnimation,
        reorderDrawables,
        reorderAnimations,
        duplicateDrawable,
        duplicateDrawables,
        duplicateAnimation,
        resetProject,
        importProjectJson,
        undo,
        redo,
        canUndo: historyState.canUndo,
        canRedo: historyState.canRedo,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}


interface PreviewContextValue {
  open: boolean;
  openPreview: () => void;
  closePreview: () => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPreview = useCallback(() => setOpen(true), []);
  const closePreview = useCallback(() => setOpen(false), []);

  return (
    <PreviewContext.Provider value={{ open, openPreview, closePreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be used within PreviewProvider");
  return ctx;
}
