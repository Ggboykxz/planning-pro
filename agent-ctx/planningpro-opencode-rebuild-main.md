# PlanningPro SaaS Rebuild - opencode.ai Design

## Task ID: planningpro-opencode-rebuild

## Summary
Complete rebuild of PlanningPro SaaS timetable management app with opencode.ai brutalist/terminal aesthetic.

## Changes Made

### Design System (globals.css)
- Complete rewrite with opencode.ai color palette: #201D1D, #FDFCFC, #F8F7F7, #E5E5E5, #646262, #9A9898
- All border-radius set to 0px (sharp corners)
- Monospace font family throughout
- No shadows - flat design
- Dark mode support

### Layout (layout.tsx + page.tsx)
- Removed sidebar layout, replaced with top navigation bar
- Max content width: 1080px
- Mobile hamburger menu support
- Clean, minimal structure

### New Components
- `TopNav.tsx` - Top navigation bar with bottom-border active states
- `ContextBar.tsx` - Secondary navigation for sub-tabs (timetable view mode)
- `StatBlock.tsx` - Minimal number display replacing StatCard
- `QuickActions.tsx` - Quick action buttons
- `SearchInput.tsx` - Reusable search input with brutalist styling
- `ConflictPanel.tsx` - Conflict detection panel in timetable view

### Rewritten Components
- `OnboardingWizard.tsx` - Terminal-style config preview, brutalist steps
- `DashboardView.tsx` - StatBlocks, QuickActions, completion rate, workload
- `TimetableView.tsx` - Multi-view (class/teacher/room), ContextBar, conflict panel, subtle color tints
- `TeachersView.tsx` - Search, bulk select/delete, minimal table
- `RoomsView.tsx` - Same pattern
- `SubjectsView.tsx` - Same pattern
- `ClassesView.tsx` - Same pattern
- `SettingsView.tsx` - Config preview, brutalist forms
- `EmptyState.tsx` - Minimal empty state

### Store Updates (store.ts)
- Added `timetableViewMode` (class/teacher/room)
- Added `selectedTeacherId`, `selectedRoomId`
- Added `mobileMenuOpen`
- Removed `sidebarOpen`

### API Updates
- `/api/timetables/route.ts` - Added `teacherId` and `roomId` query params for multi-view
- `/api/teachers/route.ts` - Added `timetableSlots` to GET response
- `/api/rooms/route.ts` - Added `timetableSlots` to GET response

### Removed Components
- `AppSidebar.tsx` (replaced by TopNav)
- `TopBar.tsx` (integrated into TopNav)
- `StatCard.tsx` (replaced by StatBlock)

## Design Rules Applied
1. ALL text is monospace
2. NO border-radius anywhere
3. NO box-shadow anywhere
4. NO colored backgrounds for cards
5. Borders: 1px solid #E5E5E5
6. Primary buttons: bg #201D1D, text #FDFCFC
7. Inputs: bg #F8F7F7, border #E5E5E5
8. Tables: hover bg #F8F7F7, borders between rows
9. Tabs: bottom border style (2px solid for active)
10. Subject colors: subtle bg tints with colored left border

## Verification
- `bun run lint` passes with no errors
- App serves on localhost:3000 with 200 status
- Dev server logs show no compilation errors
