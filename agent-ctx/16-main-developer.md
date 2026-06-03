# Task 16 - Enhanced Dashboard, Student Portal, Subject Colors, Templates

## Agent: Main Developer
## Date: 2026-06-03

### Summary
Implemented 4 features for PlanningPro:

### 1. Subject Color Coding System
- **Created** `/src/lib/subject-colors.ts` — Utility with 15 color palette (light + dark mode support)
- `getSubjectColor(subjectName, isDark)` returns deterministic colors via name hashing
- **Updated** `/src/components/timetable/TimetableView.tsx`:
  - Replaced old `subjectColorPalette` (Tailwind classes) with `getSubjectColor()` inline styles
  - Slot backgrounds now use subject color bg/text from the utility
  - Subject Hours Summary uses new color system
  - DragOverlay uses `bgColor`/`textColor` props instead of Tailwind classes
- **Updated** `/src/components/timetable/DndSlotComponents.tsx`:
  - `DragOverlayContent` now accepts `bgColor`/`textColor` props with inline styles

### 2. Enhanced Dashboard with Analytics
- **Updated** `/src/app/api/dashboard/route.ts`:
  - Added `weeklyStats` (totalSlots, totalHours, fillRate, conflictCount)
  - Added `upcomingSlots` (next 5 slots from current time/day)
  - Added `roomSlotsByDay` (room utilization by day of week)
- **Updated** `/src/components/dashboard/DashboardView.tsx`:
  - Added 4 Weekly Statistics Cards (Cours cette semaine, Heures enseignées, Taux de remplissage, Conflits détectés)
  - Added Upcoming Schedule section (next 5 courses with subject color indicators, time/teacher/room info, clickable to navigate)
  - Added Teacher Workload Distribution Chart (recharts horizontal BarChart with color-coded bars: green <80%, yellow 80-100%, red >100%)
  - Added Room Utilization Heatmap (div-based grid: rooms x days Mon-Sat, colored by utilization level)

### 3. Student Portal / Public View
- **Created** `/src/app/(app)/student/page.tsx`:
  - Read-only student view with class selector dropdown
  - Timetable displayed as a grid with subject color coding
  - Current day highlighted in the grid header with underline + dot indicator
  - Print button
  - Subject color legend below the grid
  - No editing, no drag-and-drop
  - All text in French
- **Updated** `/src/lib/store.ts` — Added `student` to AppSection, sectionToPath, pathToSection
- **Updated** `/src/components/layout/Sidebar.tsx` — Added "Portail étudiant" with GraduationCap icon as first secondary nav item
- **Updated** `/src/components/layout/AppShell.tsx` — Added "9": "student" shortcut and path mapping
- **Updated** `/src/components/shared/CommandPalette.tsx` — Added student section item (shortcut "9") and quick action

### 4. Timetable Templates
- **Created** `/src/app/api/templates/route.ts`:
  - GET: Returns 6 predefined templates (Université LMD, Lycée Français, Collège Français, École Primaire, Université Anglophone, Personnalisé)
  - POST: Applies template to institution (updates config + regenerates time slots)
- **Updated** `/src/components/onboarding/OnboardingWizard.tsx`:
  - Added template selector grid (2 columns) at top of Step 3
  - Each template card shows: name, description, key stats (slot duration, days)
  - Clicking a template fills in the schedule configuration form
  - "Personnalisé" option leaves form for manual configuration
  - Added `useEffect` import and `useEffect` to fetch templates on mount
  - Added 55min slot duration option for Collège Français template

### Verification Results
- ✅ All routes return HTTP 200: /, /dashboard, /timetable, /student, /teachers, /rooms, /subjects, /classes, /settings, /profile, /pricing, /audit, /absences
- ✅ API: GET /api/templates returns 200 with 6 templates
- ✅ API: GET /api/dashboard returns new fields (weeklyStats, upcomingSlots, roomSlotsByDay)
- ✅ Lint: Only pre-existing errors (serve.js, page.tsx, cuid.ts)
- ✅ All text in French
- ✅ Brutalist aesthetic maintained (zero border-radius, monospace)
- ✅ Keyboard shortcut "9" navigates to /student
- ✅ Sidebar shows "Portail étudiant" as first secondary item
