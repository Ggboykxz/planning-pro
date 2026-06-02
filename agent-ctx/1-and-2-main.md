# Work Log - Task "1-and-2"

## Task Summary
Implemented two major feature improvements to the PlanningPro timetable management app:

### TASK 1: Migrate to Next.js App Router with Deep-Linking

**Changes Made:**

1. **`src/lib/store.ts`** - Added URL path mapping:
   - `sectionToPath`: Maps `AppSection` to URL paths (e.g., `"dashboard" → "/dashboard"`)
   - `pathToSection`: Reverse mapping from paths to sections

2. **`src/components/layout/AppShell.tsx`** (NEW) - Shared layout component:
   - Wraps all pages with TopNav + MobileBottomNav + CommandPalette + KeyboardShortcuts
   - Syncs `currentSection` Zustand state with URL using `usePathname()`
   - Handles keyboard shortcuts for section navigation
   - Loads institution data on mount

3. **`src/app/page.tsx`** - Updated root page:
   - Shows onboarding wizard when no institution exists
   - Redirects to `/dashboard` when institution exists
   - After onboarding completion, navigates to `/dashboard`
   - Preserves keyboard shortcuts

4. **Created App Router pages:**
   - `/src/app/dashboard/page.tsx` → DashboardView
   - `/src/app/timetable/page.tsx` → TimetableView
   - `/src/app/teachers/page.tsx` → TeachersView
   - `/src/app/rooms/page.tsx` → RoomsView
   - `/src/app/subjects/page.tsx` → SubjectsView
   - `/src/app/classes/page.tsx` → ClassesView
   - `/src/app/settings/page.tsx` → SettingsView

5. **`src/components/layout/TopNav.tsx`** - Updated navigation:
   - Replaced `<button onClick={setCurrentSection}>` with Next.js `<Link href={path}>`
   - Uses `usePathname()` for active state detection instead of `currentSection`
   - Mobile menu items also use `<Link>`

6. **`src/components/layout/MobileBottomNav.tsx`** - Updated navigation:
   - Replaced buttons with Next.js `<Link>` components
   - Uses `usePathname()` for active state detection

7. **`src/components/shared/CommandPalette.tsx`** - Updated:
   - Uses `useRouter().push()` for navigation instead of `setCurrentSection()`
   - All items now have path properties for URL-based navigation

### TASK 2: Drag-and-Drop Timetable Slot Rearrangement

**Changes Made:**

1. **`src/components/timetable/DndSlotComponents.tsx`** (NEW) - DnD helper components:
   - `DraggableSlot`: Wraps filled timetable cells, makes them draggable
   - `DroppableCell`: Wraps empty timetable cells, makes them droppable targets
   - `DragOverlayContent`: Shows a preview of the slot being dragged

2. **`src/components/timetable/TimetableView.tsx`** - Major DnD integration:
   - Added `DndContext` wrapper around the timetable grid with `closestCenter` collision detection
   - `DragOverlay` for visual feedback during drag (semi-transparent source, highlighted target)
   - Filled cells wrapped in `DraggableSlot` when not viewing historical version
   - Empty cells wrapped in `DroppableCell` when not viewing historical version
   - `handleDragStart`: Captures the slot being dragged
   - `handleDragEnd`: Moves the slot via API, detects conflicts
   - Conflict confirmation dialog: Shows when move creates teacher/room conflicts
   - "Annuler le déplacement" button reverts the move
   - "Conserver le déplacement" button confirms despite conflicts
   - DnD is disabled when viewing a historical version (`dndEnabled = !viewingVersionId`)
   - PointerSensor with 8px activation distance to prevent accidental drags

3. **`src/app/api/timetables/route.ts`** - Updated PUT endpoint:
   - Now accepts `dayOfWeek`, `startTime`, `endTime` for slot moves
   - Returns slot with included relations (subject, teacher, room)
   - Built-in conflict detection: checks for teacher and room conflicts at the target position
   - Returns `{ slot, conflicts }` with conflict messages

4. **`src/app/globals.css`** - Added DnD styles:
   - Cursor styles for drag operations
   - Drop target hover highlighting

## Verification
- All pages return HTTP 200
- Lint passes with zero errors
- All existing functionality preserved (keyboard shortcuts, command palette, dark mode, etc.)
- Root page (`/`) shows onboarding when no institution, redirects to `/dashboard` otherwise
