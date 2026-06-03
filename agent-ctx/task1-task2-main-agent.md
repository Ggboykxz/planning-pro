# Task 1 & 2: Manual Slot Creation + Semester Filter

## Summary

Implemented two features for the PlanningPro timetable page:

### Task 1: Manual Slot Creation

**Files modified:**
- `src/app/api/timetables/route.ts` - Added `addSlot` support to PUT handler
- `src/components/timetable/DndSlotComponents.tsx` - Added `onClick` prop to `DroppableCell`
- `src/components/timetable/TimetableView.tsx` - Added AddSlotDialog, subjects loading, empty cell click handler

**Changes:**
1. **API**: Extended the PUT `/api/timetables` endpoint to support `addSlot` + `timetableId` params. When `addSlot` is provided, it creates a single TimetableSlot without replacing existing ones. Includes conflict detection for teacher/room overlaps.
2. **DroppableCell**: Added optional `onClick` prop. When provided, the cell gets cursor-pointer and hover background styles.
3. **TimetableView**:
   - Added `subjects` state and loads subjects via `/api/subjects` in `loadData()`
   - Added `addSlotOpen` and `addSlotData` state for the dialog
   - Added `handleOpenAddSlot(dayOfWeek, startTime, endTime)` - opens dialog pre-filled with clicked cell info
   - Added `handleSaveAddSlot()` - POSTs to PUT `/api/timetables` with `addSlot` body
   - Empty cells now show a `+` icon on hover and are clickable (only in class view, not historical versions)
   - AddSlotDialog shows: day/time info (read-only), subject selector (required), teacher selector, room selector
   - Dialog uses brutalist aesthetic: monospace fonts, `>` prompt-style placeholders, terminal-style inputs

### Task 2: Semester/Period Filter

**Files modified:**
- `src/components/timetable/TimetableView.tsx` - Added semester selector and filtering logic
- `src/lib/store.ts` - Already had `currentSemester`/`setSemester` fields, now used

**Changes:**
1. **Store integration**: Added `currentSemester`, `currentAcademicYear`, `setSemester`, `setAcademicYear` to the destructured store values
2. **Semester selector**: Added a `Select` dropdown in the header (before the class/teacher/room selectors) with a Calendar icon
   - Options: "Tous" (all), plus dynamically extracted unique semesters from subjects
3. **Filtering logic**: When `currentSemester` is set, slots are filtered by matching `subject.semester`. The grid structure (days, times) is preserved using `allSlotsByDay` for layout, while `slotsByDay` contains only filtered slots for display.
4. **Subject hours summary** also reflects the filtered view

## Build & Lint Status
- `bun next build` - PASS
- `eslint` on modified files - PASS (no new errors)
