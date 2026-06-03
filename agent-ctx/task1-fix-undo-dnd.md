# Task 1: Fix Undo for DnD Moves in Timetable

## Problem
The undo handler for drag-and-drop moves (actionType: "move") in the timetable only restored `teacherId` and `roomId`, but NOT the `dayOfWeek`, `startTime`, and `endTime` position fields. This meant that undoing a DnD move would only revert teacher/room assignments but leave the slot in its new position.

## Root Cause
In `src/components/timetable/TimetableView.tsx`:
- **`handleUndo`** (line ~753): The "move" branch only sent `slotId`, `teacherId`, and `roomId` to the PUT API, ignoring the position fields already stored in `entry.previousValues`.
- **`handleRedo`** (line ~801): Same issue — only sent `teacherId` and `roomId` from `entry.newValues`, not the position fields.

The `UndoEntry` interface already correctly stored `dayOfWeek`, `startTime`, `endTime` in both `previousValues` and `newValues` (confirmed in `src/hooks/useUndoRedo.ts`). The bug was purely that these values weren't being sent in the API calls during undo/redo.

The PUT API route at `/api/timetables` already supported these fields (lines 215-217 in route.ts).

## Fix Applied
1. **Undo for "move"**: Added `dayOfWeek`, `startTime`, `endTime` from `entry.previousValues` to the PUT request body.
2. **Redo for "move"**: Added `dayOfWeek`, `startTime`, `endTime` from `entry.newValues` to the PUT request body.

## Files Modified
- `src/components/timetable/TimetableView.tsx` — Fixed both `handleUndo` and `handleRedo` for the "move" action type.
