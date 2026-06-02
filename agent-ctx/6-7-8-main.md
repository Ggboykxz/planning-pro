# Task 6-7-8: PlanningPro Feature Improvements

## Summary

Implemented three feature improvements to the PlanningPro SaaS timetable management app.

## TASK 1: Fix Version History

### Problem
The `handleViewVersion` function was broken - it made circular/incorrect API calls and never actually loaded a version's slots. The `handleRestoreVersion` didn't properly handle deactivating the current active timetable.

### Changes Made

1. **API already supports `timetableId` query parameter** (`/api/timetables?timetableId=...`) - verified this was already working in `src/app/api/timetables/route.ts` (lines 11-30).

2. **Fixed `handleViewVersion`** in `TimetableView.tsx`:
   - Now uses `fetch(/api/timetables?timetableId=${versionId})` to directly fetch a specific timetable with its slots
   - Sets the timetable state to display that version
   - Sets `viewingVersionId` to mark it as read-only
   - Added proper loading state and error handling

3. **Fixed `handleRestoreVersion`** in `TimetableView.tsx`:
   - First fetches all active timetables for the class via the institution API
   - Deactivates ALL currently active timetables (not just the one in state)
   - Then activates the target version
   - Proper error handling with toast notifications

4. **Enhanced version history panel**:
   - Now shows slot count for each version (`v._count?.slots`)
   - Display format: version number, creation date, slot count, active badge

5. **Added `viewingVersionId` guard** in the timetable loading effect to prevent auto-reloading when viewing a historical version.

## TASK 2: Add Undo/Redo System

### Changes Made

1. **Created `/src/hooks/useUndoRedo.ts`**:
   - Custom hook managing undo/redo stacks with `useState`
   - Types: `UndoActionType` (edit, delete, move), `UndoEntry` with `previousValues` and `newValues`
   - `pushUndo()` - pushes entry to undo stack, clears redo stack
   - `undo()` - pops from undo stack, pushes to redo stack, returns the entry
   - `redo()` - pops from redo stack, pushes to undo stack, returns the entry
   - `clearStacks()` - clears both stacks
   - Exposes `canUndo`, `canRedo`, `undoCount` for UI state

2. **Integrated into `TimetableView.tsx`**:
   - **Edit actions**: Before saving a slot edit, pushes previous values to undo stack
   - **Delete actions**: Before deleting, pushes full slot data (including subjectId, timetableId) to undo stack for recreation
   - **Undo handler** (`handleUndo`):
     - For edits: restores previous teacherId/roomId via PUT API
     - For deletes: recreates the slot via PUT API with slots array
     - For moves: restores previous position values
   - **Redo handler** (`handleRedo`):
     - For edits: re-applies the new values
     - For deletes: re-deletes the slot
     - For moves: re-applies the move

3. **UI additions**:
   - Undo/Redo buttons placed next to zoom controls in timetable header
   - Undo button shows badge with action count when undo is available
   - Buttons are disabled when their respective stacks are empty
   - Dividers separate undo/redo from zoom controls
   - Hidden when viewing a historical version (read-only mode)

4. **Keyboard shortcuts**:
   - `Ctrl+Z` / `Cmd+Z` for undo
   - `Ctrl+Shift+Z` / `Cmd+Shift+Z` or `Ctrl+Y` for redo
   - Added via `useEffect` with keydown listener

5. **Stack clearing**:
   - Undo stack is cleared when switching classes (`useEffect` on `selectedClassId`)
   - Undo stack is cleared when regenerating timetable

## TASK 3: Improve Timetable Generation with Better Progress Feedback

### Changes Made

1. **Generation progress steps** (5 steps with simulated durations):
   - "Analyse des contraintes..." (600ms)
   - "Attribution des enseignants..." (800ms)
   - "Attribution des salles..." (700ms)
   - "Optimisation..." (1200ms)
   - "Vérification des conflits..." (500ms)

2. **Progress UI** (shown during generation):
   - Current step label and step number (e.g., "Étape 2/5")
   - Percentage display in monospace font
   - Smooth progress bar with percentage-based width
   - Step indicator dots showing completed/current/upcoming steps
   - All using brutalist design: zero border-radius, #201D1D dark / #FDFCFC light colors

3. **Generation result summary** (shown after completion):
   - Score display (from API response)
   - Conflicts count (color-coded: red if >0, green if 0)
   - Slot count
   - Close button to dismiss

4. **Unassigned subjects warning**:
   - Shown in a warning panel when `unassignedSubjects` array is non-empty
   - Each subject displayed as a tag with amber/orange styling
   - Count displayed in header

5. **Implementation approach**:
   - Progress simulation runs in parallel with actual API call
   - `simulateGenerationProgress()` is called alongside `fetch("/api/generate")`
   - Both promises are awaited before showing results
   - This gives visual feedback during the synchronous API call

## Files Modified
- `src/components/timetable/TimetableView.tsx` - All three tasks integrated here
- `src/hooks/useUndoRedo.ts` - New file for undo/redo hook

## Files Verified (No Changes Needed)
- `src/app/api/timetables/route.ts` - Already supports `timetableId` query parameter
- `prisma/schema.prisma` - No schema changes needed
- `src/lib/schedule-utils.ts` - No changes needed
- `src/lib/store.ts` - No changes needed

## Lint Status
- Pre-existing lint errors in `AppShell.tsx` and `settings/page.tsx` (not related to these changes)
- No new lint errors introduced by this task
