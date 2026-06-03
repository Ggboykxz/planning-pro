# Task 15 - Absences Page, Holiday Calendar, Seed Data Button

## Agent: Main Agent
## Date: 2026-06-03

## Work Completed

### 1. Absences Page
- Created `/home/z/my-project/src/app/(app)/absences/page.tsx`
- Full absence management: stats bar (3 cards), filter bar (search + status + period), data table, create dialog
- Color-coded reasons and status badges
- CRUD via `/api/absences` endpoints

### 2. Navigation Updates
- Updated `src/lib/store.ts`: Added "absences" to AppSection, sectionToPath, pathToSection
- Updated `src/components/layout/Sidebar.tsx`: Added Absences nav item (UserX icon, /absences) after Classes
- Updated `src/components/layout/MobileBottomNav.tsx`: Added Absences tab
- Updated `src/components/layout/AppShell.tsx`: Added "8": "absences" shortcut
- Updated `src/components/shared/CommandPalette.tsx`: Added Absences section + "Signaler une absence" quick action

### 3. Holiday Calendar in Settings
- Updated `src/components/settings/SettingsView.tsx`: Added "Calendrier scolaire" collapsible section
- Visual timeline (Sept-June) with colored blocks for vacances (blue), jours fériés (red), ponts (yellow)
- Holiday list with type badges and delete buttons
- Add dialog with name, date range, type select
- "Préremplir" button creates 14 French holidays (vacances + jours fériés + Easter-based)

### 4. Demo Data Seed Button
- Updated `src/components/dashboard/DashboardView.tsx`: Added "Données de démonstration" card
- Button POSTs to /api/seed, shows loading state, success toast, reloads page

## Lint Results
- Only pre-existing errors (serve.js, page.tsx, cuid.ts)
- No new errors introduced

## Page Status
- /absences → 200
- /dashboard → 200
- /settings → 200
