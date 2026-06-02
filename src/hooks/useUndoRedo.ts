"use client";

import { useCallback, useState } from "react";

export type UndoActionType = "edit" | "delete" | "move";

export interface UndoEntry {
  slotId: string;
  actionType: UndoActionType;
  previousValues: {
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
  /** For redo: the values that were applied after the undo entry was pushed */
  newValues: {
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
  /** For delete actions, store the full slot data so we can recreate it */
  deletedSlotData?: {
    timetableId: string;
    subjectId: string | null;
    timeSlotId: string | null;
  } | null;
}

export interface UseUndoRedoReturn {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  pushUndo: (entry: UndoEntry) => void;
  undo: () => UndoEntry | null;
  redo: () => UndoEntry | null;
  clearStacks: () => void;
}

export function useUndoRedo(): UseUndoRedoReturn {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const pushUndo = useCallback((entry: UndoEntry) => {
    setUndoStack((prev) => [...prev, entry]);
    // Clear redo stack when a new action is pushed
    setRedoStack([]);
  }, []);

  const undo = useCallback((): UndoEntry | null => {
    let entry: UndoEntry | null = null;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      entry = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (entry) {
      setRedoStack((prev) => [...prev, entry!]);
    }
    return entry;
  }, []);

  const redo = useCallback((): UndoEntry | null => {
    let entry: UndoEntry | null = null;
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      entry = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (entry) {
      setUndoStack((prev) => [...prev, entry!]);
    }
    return entry;
  }, []);

  const clearStacks = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    undoStack,
    redoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    pushUndo,
    undo,
    redo,
    clearStacks,
  };
}
