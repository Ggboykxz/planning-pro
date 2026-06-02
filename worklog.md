# PlanningPro - Work Log for Task "1-and-2"

## Date: 2026-06-02

## Summary
Implemented two major features for the PlanningPro timetable management app:
1. **App Router Deep-Linking** - Migrated from Zustand-only navigation to Next.js App Router with proper URL-based routing
2. **Drag-and-Drop Timetable** - Added drag-and-drop slot rearrangement with conflict detection

---

## TASK 1: App Router with Deep-Linking

### Problem
The app used Zustand state (`currentSection`) to switch views, meaning:
- No deep-linking (URL never changed)
- No browser back/forward navigation
- No shareable URLs for specific sections

### Solution

#### Store Updates (`src/lib/store.ts`)
- Added `sectionToPath` mapping: `AppSection → string` (e.g., "dashboard" → "/dashboard")
- Added `pathToSection` reverse mapping: `string → AppSection`

#### New Layout Component (`src/components/layout/AppShell.tsx`)
- Wraps all pages with TopNav + MobileBottomNav + CommandPalette + KeyboardShortcuts
- Syncs `currentSection` Zustand state with URL using `usePathname()`
- Handles keyboard shortcuts for section navigation
- Loads institution data on mount

#### App Router Pages Created
| Route | Component | File |
|-------|-----------|------|
| `/` | OnboardingWizard / Redirect | `src/app/page.tsx` |
| `/dashboard` | DashboardView | `src/app/dashboard/page.tsx` |
| `/timetable` | TimetableView | `src/app/timetable/page.tsx` |
| `/teachers` | TeachersView | `src/app/teachers/page.tsx` |
| `/rooms` | RoomsView | `src/app/rooms/page.tsx` |
| `/subjects` | SubjectsView | `src/app/subjects/page.tsx` |
| `/classes` | ClassesView | `src/app/classes/page.tsx` |
| `/settings` | SettingsView | `src/app/settings/page.tsx` |

#### Navigation Updates
- **TopNav**: Uses Next.js `<Link>` instead of `<button onClick={setCurrentSection}>`
- **MobileBottomNav**: Uses Next.js `<Link>` for mobile navigation
- **CommandPalette**: Uses `useRouter().push()` for navigation

#### Root Page Behavior
- Shows onboarding wizard when no institution exists
- Redirects to `/dashboard` when institution already exists
- After onboarding completion, navigates to `/dashboard`

---

## TASK 2: Drag-and-Drop Timetable

### Problem
No way to visually rearrange timetable slots by dragging and dropping.

### Solution

#### New DnD Components (`src/components/timetable/DndSlotComponents.tsx`)
- **DraggableSlot**: Wraps filled timetable cells, uses `useDraggable` from `@dnd-kit/core`
- **DroppableCell**: Wraps empty timetable cells, uses `useDroppable` from `@dnd-kit/core`
- **DragOverlayContent**: Shows a preview card during drag operation

#### TimetableView Integration (`src/components/timetable/TimetableView.tsx`)
- Added `DndContext` with `closestCenter` collision detection and `PointerSensor` (8px activation distance)
- Filled cells wrapped in `DraggableSlot` when not viewing historical version
- Empty cells wrapped in `DroppableCell` when not viewing historical version
- `DragOverlay` for visual feedback during drag (semi-transparent source slot, highlighted target cell)
- DnD disabled when viewing historical versions (`dndEnabled = !viewingVersionId`)

#### DnD Handlers
- **`handleDragStart`**: Captures the slot being dragged, stores its data
- **`handleDragEnd`**: Moves the slot via PUT API, detects conflicts
- **`handleConflictConfirm`**: Confirms move despite conflicts, pushes to undo stack
- **`handleConflictCancel`**: Reverts the slot to its original position via API

#### API Updates (`src/app/api/timetables/route.ts`)
- PUT endpoint now accepts `dayOfWeek`, `startTime`, `endTime` for slot position changes
- Returns slot with included relations (subject, teacher, room)
- Built-in conflict detection: checks for teacher and room conflicts at target position
- Returns `{ slot, conflicts }` response with conflict messages array

#### CSS Updates (`src/app/globals.css`)
- Added drag cursor styles
- Added drop target hover highlighting

---

## Verification Results
- ✅ All pages return HTTP 200
- ✅ ESLint passes with zero errors
- ✅ All existing functionality preserved
- ✅ Keyboard shortcuts still work (1-7, Ctrl+K, /, ?)
- ✅ Command palette navigates via URL
- ✅ Dark mode works across all pages
- ✅ Mobile bottom nav uses Link components
- ✅ Browser back/forward navigation works
- ✅ Deep-linking works (e.g., `/timetable` loads timetable directly)

---

# PlanningPro - Work Log for Tasks "3-4-5" and "6-7-8"

## Date: 2026-06-02

## Summary of All Improvements

### TASK 3: Pagination for All Data Tables
- Created reusable `Pagination` component at `src/components/shared/Pagination.tsx`
- Applied to TeachersView, RoomsView, SubjectsView, ClassesView
- Page size selector (10, 25, 50, 100), prev/next buttons, "Affichage X-Y sur Z" text
- Search-aware: page resets to 1 when search term changes

### TASK 4: CSV Export for All Entities
- Created `exportToCSV<T>()` utility at `src/lib/export-utils.ts`
- French CSV convention: semicolon separator, UTF-8 BOM, proper escaping
- Added "Exporter" button next to "Importer" in each CRUD view
- Export columns: Teachers (7 cols), Rooms (4 cols), Subjects (6 cols), Classes (5 cols)

### TASK 5: Error Boundaries
- Created `ErrorBoundary` class component at `src/components/shared/ErrorBoundary.tsx`
- Terminal-style error screen with ASCII art, collapsible details, "Recharger" button
- Applied globally in layout and per-section in each route page

### TASK 6: Fix Version History
- Fixed `handleViewVersion`: now fetches specific timetable by ID via `/api/timetables?timetableId=`
- Fixed `handleRestoreVersion`: properly deactivates ALL active timetables before activating target
- Enhanced version panel: shows slot count, creation date, active badge
- Added guard to skip auto-reload when viewing historical version

### TASK 7: Undo/Redo System
- Created `useUndoRedo` hook at `src/hooks/useUndoRedo.ts`
- Undo stack stores: slotId, actionType, previousValues, newValues, deletedSlotData
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo)
- Undo/Redo buttons in timetable toolbar with action count badge
- Stack cleared on class switch and timetable regeneration

### TASK 8: Improved Generation Progress
- 5-step progress simulation: constraint analysis → teacher assignment → room assignment → optimization → conflict verification
- Progress bar with percentage
- Generation result summary: score, conflict count, slot count
- Unassigned subjects warning panel with amber tags

### Verification Results
- ✅ Next.js build passes (`npx next build` succeeds)
- ✅ All routes return HTTP 200
- ✅ All API endpoints functional
- ✅ Existing features preserved (search, bulk select, import, availability, etc.)
- ✅ Design consistency maintained (zero border-radius, monospace, brutalist palette)
