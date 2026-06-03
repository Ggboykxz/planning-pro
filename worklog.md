# PlanningPro - Work Log for Task "16"

## Date: 2026-06-03

## Summary
Implemented 4 features for the PlanningPro SaaS timetable management app:
1. **Subject Color Coding System** — Deterministic color utility + timetable slot rendering with color
2. **Enhanced Dashboard with Analytics** — Weekly stats, upcoming schedule, workload chart, room heatmap
3. **Student Portal / Public View** — Read-only student timetable view with class selector
4. **Timetable Templates** — API + onboarding wizard template selector

---

### 1. Subject Color Coding System

#### New: `src/lib/subject-colors.ts`
- 15-color palette with light and dark mode support
- `getSubjectColor(subjectName, isDark)` — deterministic color assignment via name hashing
- Each color has: bg, text, and dark variants (dark.bg, dark.text)
- Colors: Amber, Blue, Green, Pink, Indigo, Red, Teal, Yellow, Purple, Orange, Green2, Orange2, Light Green, Blue2, Pink2
- `getAllSubjectColors()` export for legend rendering

#### Updated: `src/components/timetable/TimetableView.tsx`
- Replaced old `subjectColorPalette` (Tailwind class-based) with `getSubjectColor()` from `subject-colors.ts`
- Removed `subjectColorMap` Map (colors are now derived from subject name directly)
- Slot rendering uses inline styles: `backgroundColor`, `borderLeftColor`, `color` from `getSubjectColor()`
- Subject text uses `opacity-70` for teacher/room info instead of fixed gray
- Subject Hours Summary uses new color system with inline styles
- DragOverlay passes `bgColor`/`textColor` props instead of Tailwind classes

#### Updated: `src/components/timetable/DndSlotComponents.tsx`
- `DragOverlayContent` now accepts `bgColor` and `textColor` props (replaces `colorClass`/`bgClass`)
- Renders with inline `style={{ backgroundColor, borderLeftColor, color }}`
- Text elements use `opacity-70` for secondary info

---

### 2. Enhanced Dashboard with Analytics

#### Updated: `src/app/api/dashboard/route.ts`
- Added `weeklyStats`: { totalSlots, totalHours, fillRate, conflictCount }
  - totalSlots: count of all timetable slots
  - totalHours: sum of slot durations in hours
  - fillRate: 100% if slots exist, 0% otherwise
  - conflictCount: same as top-level conflictCount
- Added `upcomingSlots`: next 5 slots from current day/time
  - Filters slots where dayOfWeek >= current day AND startTime >= current time
  - Sorted by dayOfWeek then startTime
  - Each entry: dayOfWeek, startTime, endTime, subjectName, teacherName, roomName, className
- Added `roomSlotsByDay`: room utilization by day of week
  - Groups slots by roomId+dayOfWeek, counts per group
  - Each entry: dayOfWeek, roomId, roomName, count

#### Updated: `src/components/dashboard/DashboardView.tsx`
- New imports: Calendar, Clock, MapPin, Users, AlertTriangle, useRouter, getSubjectColor, recharts (BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell)
- Updated `DashboardData` interface with weeklyStats, upcomingSlots, roomSlotsByDay
- **Weekly Statistics Cards** (4 cards in a row):
  - Cours cette semaine (totalSlots count)
  - Heures enseignées (totalHours + "h")
  - Taux de remplissage (fillRate + "%")
  - Conflits détectés (conflictCount, red if >0)
- **Upcoming Schedule** (next 5 slots):
  - Each slot shows: subject color indicator, subject name, class name
  - Time/day, teacher name, room name
  - Clickable to navigate to timetable section
  - Empty state: "Aucun cours à venir cette semaine"
- **Teacher Workload Distribution Chart** (recharts horizontal BarChart):
  - Two bars: "maximum" (gray) and "assignées" (color-coded)
  - Color coding: green (<80%), yellow (80-100%), red (>100%)
  - Uses `Cell` component for per-bar coloring
  - French tooltip formatter
- **Room Utilization Heatmap** (div-based grid):
  - Rooms as rows, days (Lun-Sam) as columns
  - Heatmap colors: empty=light gray, 1-2=emerald, 3-4=amber, 5+=red
  - Supports dark mode with dark variants
  - Legend showing color meaning
  - Max 10 rooms displayed

---

### 3. Student Portal / Public View

#### New: `src/app/(app)/student/page.tsx`
- Read-only student timetable view
- **Header**: "Portail étudiant" with GraduationCap icon
- **Class selector**: Dropdown fetched from `/api/classes?institutionId=xxx`
- **Timetable grid**: Same layout as TimetableView but:
  - No drag-and-drop, no editing
  - Subject color coding via `getSubjectColor()`
  - Current day highlighted (underline + yellow dot in header, subtle bg tint in cells)
  - Break time rows marked with "PAUSE" label
- **Subject color legend**: Below the grid, auto-generated from timetable data
- **Print button**: Uses `window.print()`
- **Empty states**: No classes, no timetable generated
- All text in French

#### Updated: `src/lib/store.ts`
- Added `"student"` to `AppSection` type union
- Added `student: "/student"` to `sectionToPath`
- Added `"/student": "student"` to `pathToSection`

#### Updated: `src/components/layout/Sidebar.tsx`
- Added "Portail étudiant" with GraduationCap icon as first secondary nav item (after divider, before Profil)

#### Updated: `src/components/layout/AppShell.tsx`
- Added `"9": "student"` to `sectionShortcuts` map
- Added `student: "/student"` to local `sectionToPath` map

#### Updated: `src/components/shared/CommandPalette.tsx`
- Added "Portail étudiant" section item with GraduationCap icon and shortcut "9"
- Added "Portail étudiant" quick action with GraduationCap icon

---

### 4. Timetable Templates

#### New: `src/app/api/templates/route.ts`
- **GET**: Returns 6 predefined templates:
  - Université LMD (90min, 12h-14h30 break, 6 days)
  - Lycée Français (60min, 12h-14h break, 5 days)
  - Collège Français (55min, 12h-13h30 break, 5 days)
  - École Primaire (45min, 11h30-13h30 break, 5 days)
  - Université Anglophone (60min, 12h-13h break, 5 days)
  - Personnalisé (null config)
- **POST**: Apply template to institution
  - Updates institution config (slotDuration, times, workingDays)
  - Deletes existing time slots and regenerates based on template config
  - Creates break time slots for each working day
  - Returns success message with slots generated count

#### Updated: `src/components/onboarding/OnboardingWizard.tsx`
- Added template selector at top of Step 3 (Schedule Configuration)
- Grid of template cards (2 columns) with:
  - Name (bold if selected)
  - Description
  - Key stats: slot duration (Clock icon) + days count (Calendar icon)
  - Selected state: bold border + bg highlight
- Clicking a template auto-fills the schedule form (slotDuration, times, workingDays)
- "Personnalisé" option leaves form for manual configuration
- Form section label changes: "Configuration manuelle" or "Ajuster la configuration"
- Added `useEffect` to fetch templates on mount
- Added `selectedTemplateId` and `templates` state
- Added 55min option to slot duration dropdown (for Collège Français)

---

### Verification Results
- ✅ `bun run lint` — Only pre-existing errors (serve.js, page.tsx, cuid.ts)
- ✅ All routes return HTTP 200: /, /dashboard, /timetable, /student, /teachers, /rooms, /subjects, /classes, /settings, /profile, /pricing, /audit, /absences
- ✅ GET /api/templates returns 200 with 6 templates
- ✅ GET /api/dashboard returns new fields (weeklyStats, upcomingSlots, roomSlotsByDay)
- ✅ Student portal renders with class selector and print button
- ✅ Keyboard shortcut "9" navigates to /student
- ✅ Sidebar shows "Portail étudiant" in secondary nav
- ✅ Command palette includes "Portail étudiant" section and action
- ✅ All text in French
- ✅ Brutalist aesthetic maintained (zero border-radius, monospace, dark mode)

---

# PlanningPro - Work Log for Task "15"

## Date: 2026-06-03

## Summary
Implemented 4 UI features for the PlanningPro SaaS timetable management app:
1. **Absences Page** - Full absence management page with stats, filters, table, and create dialog
2. **Navigation Updates** - Added Absences to sidebar, mobile nav, keyboard shortcuts, and command palette
3. **Holiday Calendar in Settings** - Visual timeline, holiday list, create dialog, and French holiday pre-fill
4. **Demo Data Seed Button on Dashboard** - Quick-start card to load demo data

---

### 1. Absences Page

#### New: `src/app/(app)/absences/page.tsx`
- **Header**: "Gestion des absences" with UserX icon and "Signaler une absence" button
- **Stats bar** (3 cards):
  - Absences en cours (pending count)
  - Approuvées ce mois (approved count this month)
  - Taux de remplacement (% of absences with substitute teacher)
- **Filter bar**:
  - Search input by teacher name
  - Status filter: Toutes, En attente, Approuvées, Rejetées
  - Period filter: Toutes, Ce mois, Cette semaine
- **Table** with columns: Enseignant, Dates, Raison, Remplaçant, Statut, Actions
  - Color-coded reason dots: maladie=red, formation=blue, personnel=yellow, autre=gray
  - Status badges: En attente (amber), Approuvée (green), Rejetée (red)
  - Action buttons: Approuver/Rejeter/Supprimer for pending; Supprimer for others
  - Loading spinner during actions
- **Create dialog**: Teacher select, date range, reason select, substitute teacher (optional), notes textarea
- **Empty state**: UserX icon with "Aucune absence signalée"
- Data flow: GET/POST/PUT/DELETE `/api/absences?institutionId=xxx`

---

### 2. Navigation Updates

#### Updated: `src/lib/store.ts`
- Added `"absences"` to `AppSection` type union
- Added `absences: "/absences"` to `sectionToPath` mapping
- Added `"/absences": "absences"` to `pathToSection` mapping

#### Updated: `src/components/layout/Sidebar.tsx`
- Added "Absences" nav item with UserX icon after "Classes" (before "Paramètres")
- Path: /absences

#### Updated: `src/components/layout/MobileBottomNav.tsx`
- Added Absences tab with UserX icon (label: "Abs.", path: /absences)

#### Updated: `src/components/layout/AppShell.tsx`
- Added `"8": "absences"` to `sectionShortcuts` map
- Added `absences: "/absences"` to local `sectionToPath` map

#### Updated: `src/components/shared/CommandPalette.tsx`
- Added "Absences" section item with UserX icon and shortcut "8"
- Added "Signaler une absence" quick action with UserX icon

---

### 3. Holiday Calendar in Settings

#### Updated: `src/components/settings/SettingsView.tsx`
- New imports: CalendarDays, Trash, Sparkles from lucide-react
- New state: holidays, addHolidayOpen, holidayForm, addingHoliday, preFilling
- New collapsible section "Calendrier scolaire" (defaultOpen=false):
  - **Visual timeline**: Horizontal bar showing Sept-June school year with colored blocks
    - Blue blocks for vacances scolaires
    - Red markers for jours fériés
    - Yellow markers for ponts
    - Color legend below
    - Dynamic positioning based on date calculation
  - **Holiday list**: Scrollable list (max-h-64) with each entry showing:
    - CalendarDays icon, name, date range
    - Type badge (Vacances=blue, Jour férié=red, Pont=yellow, Autre=gray)
    - Delete button
  - **Action buttons**: "Ajouter une période" and "Préremplir"
- **Add holiday dialog**: Name, start/end date, type select (Vacances scolaires, Jour férié, Pont, Autre)
- **Préremplir feature**: Creates 14 default French holidays for the current year:
  - Vacances: Toussaint, Noël, Hiver, Printemps, Été
  - Jours fériés: 1er Mai, 8 Mai, 14 Juillet, 15 Août, 1er Novembre, 11 Novembre
  - Easter-based: Lundi de Pâques, Ascension, Lundi de Pentecôte (computed with Butcher's algorithm)
- Data flow: GET/POST/DELETE `/api/holidays?institutionId=xxx`

---

### 4. Demo Data Seed Button on Dashboard

#### Updated: `src/components/dashboard/DashboardView.tsx`
- New imports: Database, Loader2 from lucide-react; toast from sonner; Button from ui/button
- New state: seeding (boolean)
- New function: `handleSeedData` — POSTs to `/api/seed` with `{ institutionId }`, shows success toast, reloads page
- New "Données de démonstration" card:
  - Database icon, title "Données de démonstration"
  - Description: "Charger des données d'exemple pour explorer toutes les fonctionnalités de PlanningPro"
  - "Charger les données" button with Database icon
  - Loading state with Loader2 spinner and "Chargement..." text
  - Success toast with teacher/room/subject counts from response
  - Page reloads after 500ms to refresh all data

---

### Verification Results
- ✅ `bun run lint` — Only pre-existing errors (serve.js, page.tsx, cuid.ts)
- ✅ GET /absences returns 200
- ✅ GET /dashboard returns 200
- ✅ GET /settings returns 200
- ✅ GET /timetable returns 200
- ✅ All text in French
- ✅ Brutalist aesthetic maintained (zero border-radius, monospace, dark mode)
- ✅ Keyboard shortcut "8" navigates to /absences
- ✅ Sidebar shows Absences nav item after Classes
- ✅ Command palette includes Absences section and "Signaler une absence" action

---

# PlanningPro - Work Log for Task "14"

## Date: 2026-06-03

## Summary
Implemented 4 major features for the PlanningPro SaaS timetable management app:
1. **Demo Data Seed API** - Comprehensive demo data creation endpoint
2. **Absences API + Data Store Support** - Full CRUD for teacher absences with enrichment
3. **Holidays API + Data Store Support** - Full CRUD for holidays with filtering
4. **TimetableSlot Locking** - Added isLocked field to Prisma schema (already existed in data-store interface)

---

### 1. Demo Data Seed API

#### New API Route: `src/app/api/seed/route.ts`
- **POST** `/api/seed`: Creates comprehensive demo data for an institution
  - Accepts `institutionId` as body param
  - Validates institution exists
  - Creates 15 teachers with realistic French/West African names, emails, specializations, and maxHoursPerWeek (18-22):
    - Dr. Amadou Diallo - Mathématiques, Prof. Marie Dupont - Physique-Chimie, etc.
  - Creates 20 rooms across 5 types:
    - 3 Amphis (capacity 200-300, type amphi)
    - 6 Salles TD 101-106 (capacity 40, type salle_td)
    - 3 Labs (capacity 30, type labo with equipment lists)
    - 3 Salles Info 201-203 (capacity 25, type salle_info with equipment)
    - 5 Salles 301-305 (capacity 35, type salle_normale)
  - Creates 15 subjects with codes (MATH101-MATH301), hoursPerWeek, types, semesters, coefficients
  - Creates 8 classes (L1-L3 levels + Terminale/Première) with student counts and academic year
  - Creates 32 teacher-subject links (each teacher linked to 2-3 subjects)
  - Creates 46 class-subject links (each class with 5-7 subjects and hours per week)
  - Returns summary JSON with all counts and created IDs
  - Status 201 on success

---

### 2. Absences API + Data Store Support

#### Updated: `src/lib/data-store.ts`
- Added `dataStore.absence` with full CRUD methods:
  - `findMany`: Filters by institutionId, teacherId, status; sorted by createdAt desc
  - `findUnique`: Find by id
  - `create`: Create with all absence fields
  - `update`: Update with partial data
  - `delete`: Delete by id
- All methods follow hybrid pattern (Prisma when available, in-memory fallback)

#### New API Route: `src/app/api/absences/route.ts`
- **GET** `/api/absences?institutionId=xxx&teacherId=xxx&status=xxx`: List absences
  - institutionId is required
  - Optional filters: teacherId, status
  - Enriches each absence with `teacherName` and `substituteTeacherName` by looking up teacher records
- **POST** `/api/absences`: Create an absence
  - Required: institutionId, teacherId, startDate, endDate, reason
  - Optional: substituteTeacherId, status (defaults to "pending"), notes
- **PUT** `/api/absences`: Update an absence
  - Required: id
  - Updatable: status, substituteTeacherId, notes
- **DELETE** `/api/absences?id=xxx`: Delete an absence

---

### 3. Holidays API + Data Store Support

#### Updated: `src/lib/data-store.ts`
- Added `dataStore.holiday` with full CRUD methods:
  - `findMany`: Filters by institutionId, year (prefix match on startDate/endDate), type; sorted by startDate asc
  - `findUnique`: Find by id
  - `create`: Create with all holiday fields
  - `update`: Update with partial data
  - `delete`: Delete by id
- All methods follow hybrid pattern (Prisma when available, in-memory fallback)

#### New API Route: `src/app/api/holidays/route.ts`
- **GET** `/api/holidays?institutionId=xxx&year=2026&type=vacances`: List holidays
  - institutionId is required
  - Optional filters: year (matches startDate or endDate starting with year), type
- **POST** `/api/holidays`: Create a holiday
  - Required: institutionId, name, startDate, endDate, type
- **PUT** `/api/holidays`: Update a holiday
  - Required: id
  - Updatable: name, startDate, endDate, type
- **DELETE** `/api/holidays?id=xxx`: Delete a holiday

---

### 4. TimetableSlot Locking

#### Already in Prisma Schema (`prisma/schema.prisma`)
- `isLocked Boolean @default(false)` already exists on the TimetableSlot model
- `isLocked?: boolean` already exists on TimetableSlotRecord interface in data-store.ts
- Ran `bun run db:push` to ensure schema is synced — confirmed "Your database is now in sync"

---

### Verification Results
- ✅ `bun run db:push` — Database synced successfully
- ✅ `bun run lint` — No new errors (only pre-existing serve.js, page.tsx, cuid.ts errors)
- ✅ POST /api/seed — Returns 201 with summary: 15 teachers, 20 rooms, 15 subjects, 8 classes, 32 teacher-subjects, 46 class-subjects
- ✅ GET /api/absences — Returns enriched absences with teacherName and substituteTeacherName
- ✅ POST /api/absences — Creates absence with all fields
- ✅ PUT /api/absences — Updates status, notes, substituteTeacherId
- ✅ DELETE /api/absences — Deletes absence by id
- ✅ GET /api/holidays — Returns holidays with year and type filtering
- ✅ POST /api/holidays — Creates holiday with all fields
- ✅ PUT /api/holidays — Updates name, dates, type
- ✅ DELETE /api/holidays — Deletes holiday by id
- ✅ All error messages in French
- ✅ Absence and holiday data persisted to /tmp/planning-pro-extra.json

---

# PlanningPro - Work Log for Task "11-12"

## Date: 2026-06-03

## Summary
Implemented 2 major features for the PlanningPro SaaS timetable management app:
1. **Multi-Institution Support** - Users can switch between institutions, create new ones, and manage memberships
2. **Print-Optimized View** - Enhanced print CSS for clean timetable printing with proper headers

---

### 1. Multi-Institution Support

#### New API Route: `src/app/api/institutions/route.ts`
- **GET** `/api/institutions?userId=xxx`: List all institutions the user has access to (via UserInstitution)
  - Returns institutions enriched with userRole field
- **POST** `/api/institutions`: Create a new institution and link to user
  - Creates institution, UserInstitution record (role=admin), and generates default time slots
  - Returns created institution with userRole, status 201
- **DELETE** `/api/institutions?institutionId=xxx&userId=xxx`: Leave/remove an institution
  - Prevents leaving the only institution
  - Finds record by composite key, deletes by id

#### Updated: `src/components/layout/Sidebar.tsx`
- Added institution switcher dropdown at the top of the sidebar
- Shows current institution name with Building2 icon
- Dropdown lists all user's institutions (fetched from /api/institutions)
- Current institution highlighted with Check icon
- Role label for each institution (Administrateur/Gestionnaire/Observateur)
- "+ Nouvel établissement" option navigates to /settings
- Switching institution updates store's institutionId and redirects to /dashboard
- Collapsed sidebar shows Building2 icon button to expand
- Click-outside detection to close dropdown
- Derived currentInstName from institutions list (no extra state sync)

#### Updated: `src/components/settings/SettingsView.tsx`
- Added "Gérer les établissements" collapsible section (defaultOpen=false)
- Lists all user's institutions with name, role (Shield icon), and active indicator
- "Basculer" button for non-active institutions
- "Quitter" button (red) with confirmation dialog if more than one institution
- "Ajouter un établissement" button with dashed border
- New institution Dialog with name, type, and country fields
- Auto-switches to newly created institution
- All text in French, dark mode supported, mobile responsive

---

### 2. Print-Optimized View

#### Updated: `src/app/globals.css`
Enhanced `@media print` block:
- Hides all UI chrome: `.no-print`, `nav`, `aside`, `.sidebar`, `header`, `footer`, `button`, `.mobile-bottom-nav`, `[role="dialog"]`, `.ai-assistant`
- Full-width main content
- White background, black text for print
- Dark mode override forced to white in print
- `.timetable-grid` and `table` with `break-inside: avoid`
- New `.print-title` class for print-only headers (centered, with separator)
- `-webkit-print-color-adjust: exact; print-color-adjust: exact`
- `@page { margin: 1cm; size: landscape; }`

#### Updated: `src/components/timetable/TimetableView.tsx`
- Changed print header from `.print-header` to `.print-title` class
- Added institution name to print title: `{institutionName} — {className}`
- Added `institutionName` prop to component interface
- Added `timetable-grid` class to timetable container div
- Added `no-print` class to header toolbar section
- Printer button (Imprimer) already existed

#### Updated: `src/app/(app)/timetable/page.tsx`
- Fetches institution name on mount
- Passes `institutionName` prop to TimetableView

---

### Verification Results
- ✅ All pages return HTTP 200: /, /dashboard, /timetable, /settings
- ✅ API: GET /api/institutions?userId=xxx returns 200, POST creates correctly, DELETE validates
- ✅ ESLint: no new errors (only pre-existing serve.js, page.tsx, cuid.ts errors)
- ✅ Dark mode supported across all new components
- ✅ Mobile responsive
- ✅ Brutalist aesthetic maintained
- ✅ All text in French

---

# PlanningPro - Work Log for Task "7-10"

## Date: 2026-06-03

## Summary
Implemented 4 major features for the PlanningPro SaaS timetable management app:
1. **Backup & Restore (Data Export/Import)** - Full JSON export/import of institution data via API and Settings UI
2. **iCal Export** - Export timetables as .ics calendar files with recurring weekly events
3. **PWA Support** - Manifest, service worker, icons, and meta tags for installable app
4. **AI Assistant** - Floating chat panel with z-ai-web-dev-sdk integration

---

### 1. Backup & Restore

#### New API Route: `src/app/api/backup/route.ts`
- **GET** `/api/backup?institutionId=xxx`: Exports all institution data as JSON
  - Returns complete JSON with: institution, teachers, rooms, subjects, classes, timeSlots, timetables, timetableSlots, teacherSubjects, classSubjects
  - Includes metadata: exportDate, version, institutionName, institutionId
  - Content-Disposition header for automatic file download
  - Filename format: `planningpro-backup-{name}-{date}.json`
- **POST** `/api/backup`: Import/restore data from JSON
  - Validates backup structure (requires metadata.version)
  - For each entity, creates or updates records (findUnique → update or create)
  - Returns import summary with counts per entity type
  - Gracefully skips individual record failures without aborting the whole import

#### Updated: `src/components/settings/SettingsView.tsx`
- Added "Sauvegarde et restauration" collapsible section (defaultOpen=false) at bottom
- "Exporter les données" button → triggers GET /api/backup, downloads JSON file
- "Importer des données" button → opens file picker (.json), reads file, POSTs to /api/backup
- Warning banner about data overwriting (amber AlertTriangle style)
- Loading states for both export and import operations
- Success/error toast notifications with import summary
- New imports: Download, Upload from lucide-react

---

### 2. iCal Export

#### New API Route: `src/app/api/ical/route.ts`
- **GET** `/api/ical?timetableId=xxx`: Exports timetable as iCal (.ics) format
  - Fetches timetable with all slots enriched with subject/teacher/room info
  - Generates proper iCal format:
    - VCALENDAR with PRODID, VERSION, CALSCALE, METHOD
    - VEVENT for each slot with:
      - DTSTART/DTEND (calculated from dayOfWeek + startTime/endTime using next week as reference)
      - SUMMARY (subject name)
      - LOCATION (room name)
      - DESCRIPTION (teacher name, class name)
      - UID (unique per slot: `{slotId}@planningpro.app`)
      - RRULE:FREQ=WEEKLY;BYDAY (recurring weekly on the correct day)
    - TZID from institution timezone
  - Content-Type: text/calendar; charset=utf-8
  - Content-Disposition for .ics download
  - iCal text escaping for special characters
  - Day name mapping: 1=MO (Lundi) through 7=SU (Dimanche)

#### Updated: `src/components/timetable/TimetableView.tsx`
- Added `CalendarSync` icon import from lucide-react
- Added `handleExportICal` function: fetches /api/ical, creates blob download
- Added "iCal" button between PDF and Partager in the export toolbar
- Same brutalist ghost button style as CSV/PNG/PDF buttons

---

### 3. PWA Support

#### New: `public/manifest.json`
- PWA manifest with PlanningPro app info
- name, short_name, description (in French)
- start_url: "/", display: standalone
- background_color: #ffffff, theme_color: #201D1D
- Icon entries for 192x192 and 512x512 PNG
- categories: education, productivity
- lang: fr, dir: ltr

#### New: `public/sw.js`
- Service worker for offline caching
- CACHE_NAME: 'planning-pro-v1'
- Caches: /, /dashboard, /timetable
- Cache-first strategy for fetch events
- Cleans old caches on activate

#### New: `public/icon-192.png` and `public/icon-512.png`
- Generated with z-ai-generate CLI tool
- Minimalist geometric PP logo in monospace, black on white, brutalist style
- Generated at 1024x1024 (largest allowed) for both sizes

#### Updated: `src/app/layout.tsx`
- Added `<link rel="manifest" href="/manifest.json" />` in head
- Added `<meta name="theme-color" content="#201D1D" />`
- Added `<link rel="apple-touch-icon" href="/icon-192.png" />`
- Added service worker registration via dangerouslySetInnerHTML script
- Updated metadata.icons to use /icon-192.png instead of external SVG
- Added metadata.manifest and metadata.appleWebApp
- Added Viewport export with themeColor

---

### 4. AI Assistant

#### New API Route: `src/app/api/ai/route.ts`
- **POST** `/api/ai`: Chat endpoint using z-ai-web-dev-sdk
  - Accepts `{ message, context }` in request body
  - Creates ZAI instance and calls chat.completions.create
  - System prompt: French assistant for PlanningPro timetable management
  - Helps with: timetable creation, conflict resolution, optimization, app usage
  - temperature: 0.7, max_tokens: 500
  - Context includes institutionId when available
  - Error handling: returns friendly French error message on failure

#### New Component: `src/components/shared/AIAssistant.tsx`
- Floating Action Button (FAB) in bottom-right corner
  - 48x48px Bot icon button
  - Dark/light mode compatible (bg-[#201D1D]/bg-[#FDFCFC])
  - Border, shadow, hover opacity transition
- Chat panel (360x480px, max-width responsive)
  - Header: "Assistant IA" with Bot icon and X close button
  - Message list with auto-scroll
    - User messages: right-aligned, dark background
    - AI messages: left-aligned, light background with border
    - Loading state: spinner with "Réflexion..." text
  - Empty state: Bot icon, "Comment puis-je vous aider ?", suggestion chips
  - Quick suggestion chips: "Aide pour emploi du temps", "Résoudre conflit", "Optimiser planning"
  - Input field with send button (Send icon)
  - Enter key to send
  - All messages stored in local state only (not persisted)
  - Brutalist aesthetic: zero border-radius, monospace, correct colors

#### Updated: `src/components/layout/AppShell.tsx`
- Added `AIAssistant` import
- Added `<AIAssistant />` inside the main layout div, after CommandPalette and KeyboardShortcuts
- Available on all pages when logged in

---

### Verification Results
- ✅ All routes return HTTP 200: /, /dashboard, /timetable, /teachers, /rooms, /subjects, /classes, /settings, /profile, /pricing, /audit
- ✅ API endpoints: /api/backup (GET 200, POST), /api/ical (GET), /api/ai (POST 200 with valid response)
- ✅ PWA files accessible: /manifest.json (200), /sw.js (200), /icon-192.png (200), /icon-512.png (200)
- ✅ ESLint: no new errors (only pre-existing serve.js, page.tsx, cuid.ts errors)
- ✅ Dark mode supported across all new components
- ✅ Mobile responsive (AIAssistant panel uses max-width, Settings buttons stack)
- ✅ Brutalist aesthetic maintained (zero border-radius, monospace, correct colors)
- ✅ AI Assistant responds in French with contextual help

---

# PlanningPro - Work Log for Task "3-6"

## Date: 2026-06-03

## Summary
Implemented 4 major features for the PlanningPro SaaS timetable management app:
1. **Modern Sidebar Navigation** - Replaced TopNav-based layout with a collapsible sidebar
2. **Profile Page** - User profile/settings page with editable fields
3. **Pricing Page** - 3-tier pricing page (Gratuit/Pro/Enterprise)
4. **Audit Log Page** - Activity/audit log with filters and pagination

---

### 1. Modern Sidebar Navigation

#### New Component: `src/components/layout/Sidebar.tsx`
- Full sidebar with brutalist/terminal aesthetic (zero border-radius, monospace, dark mode)
- Main navigation items with lucide-react icons:
  - Tableau de bord (LayoutDashboard)
  - Emploi du temps (Calendar)
  - Enseignants (Users)
  - Salles (DoorOpen)
  - Matières (BookOpen)
  - Classes (GraduationCap)
  - Paramètres (Settings)
- Divider
- Secondary navigation:
  - Profil (User) → /profile
  - Abonnement (CreditCard) → /pricing
  - Journal (ScrollText) → /audit
- Bottom section: theme toggle (Sun/Moon), collapse toggle (PanelLeft/PanelLeftClose)
- User section: avatar circle with first letter of name, user name and plan
- Current page highlighted with bold text + left border accent
- Collapsible: toggle between full sidebar (240px/w-60) and icon-only (56px/w-14)
- Mobile: overlay drawer with backdrop, X close button
- All text in French
- Desktop: sticky sidebar, no scroll with page
- Mobile: hidden by default, hamburger menu opens overlay

#### Updated: `src/components/layout/AppShell.tsx`
- Replaced TopNav import with Sidebar component
- New layout: flex row with Sidebar + main content area
- Added a slim top bar with mobile hamburger, institution name, search trigger (⌘K), NotificationCenter
- Main content fills remaining space with overflow-y-auto
- TopNav.tsx kept but no longer rendered by AppShell
- MobileBottomNav no longer rendered (sidebar replaces it)
- All existing keyboard shortcuts preserved (1-7, /)
- All existing features preserved: CommandPalette, KeyboardShortcuts, ErrorBoundary

---

### 2. Profile Page

#### New: `src/app/(app)/profile/page.tsx`
- Avatar display (first letter of name in a bordered circle)
- Name field (editable, with User icon)
- Email field (read-only, with Lock icon, grayed out background)
- Role display (badge: Administrateur/Gestionnaire/Utilisateur)
- Plan display (badge with upgrade link to /pricing for non-Pro users)
- Password change section:
  - Current password (with show/hide toggle)
  - New password (with show/hide toggle)
  - Confirm password
  - Client-side validation (6 char minimum, match check)
- Preferences section: theme (system default), language (French)
- Danger zone: delete account with two-step confirmation
- Success/error messages with brutalist styled banners
- Save button triggers PUT /api/users
- Loads user from Zustand store or fallback /api/auth/me

#### New: `src/app/api/users/route.ts`
- **GET** `/api/users?userId=...`: Returns user info (without passwordHash)
- **PUT** `/api/users`: Updates user name, avatar, password
  - Password change requires currentPassword verification (bcryptjs)
  - Minimum 6 characters for new password
  - Creates audit log entry on update
  - Returns updated user (without passwordHash)
  - Uses Object.fromEntries to safely exclude passwordHash

---

### 3. Pricing Page

#### New: `src/app/(app)/pricing/page.tsx`
- 3 pricing tiers displayed as cards:
  - **Gratuit** (0€/mois): 1 établissement, 10 enseignants, 5 classes, basic timetable, CSV export, email support
  - **Pro** (29€/mois): Unlimited everything, AI generation, PDF/iCal export, link sharing, activity log, priority support - "Populaire" badge
  - **Enterprise** (99€/mois): Everything in Pro + SSO/SAML, dedicated API, multi-sites, 24/7 support, SLA guarantee
- Each feature has Check (included) or X (not included) icons
- Pro card highlighted with darker border and "Populaire" badge
- CTA buttons: "Plan actuel" (disabled for current plan), "Passer au Pro" (primary), "Contacter les ventes" (outline)
- Responsive: 3 cards side-by-side on desktop, stacked on mobile
- FAQ section with 4 common questions
- Contact link in footer
- All text in French, brutalist aesthetic

---

### 4. Audit Log Page

#### New: `src/app/(app)/audit/page.tsx`
- Table view of all recent actions
- Columns: Date, Utilisateur, Action, Entité, Détails
- Filter bar with:
  - Search input (client-side filter across all fields)
  - Action type dropdown: Création, Modification, Suppression, Connexion, Export
  - Entity type dropdown: Utilisateur, Établissement, Enseignant, Salle, Matière, Classe, Emploi du temps, Créneau
- Color-coded action badges:
  - Création = green
  - Modification = blue
  - Suppression = red
  - Connexion = gray
  - Export = purple
- Pagination with page info ("Affichage X–Y sur Z") and prev/next buttons
- Empty state with FileX icon and helpful message
- Fetches from /api/audit with institutionId, action, entity filters
- French entity labels (Enseignant, Matière, etc.)
- Date formatted in French locale

#### New: `src/app/api/audit/route.ts`
- **GET** `/api/audit`: Returns audit logs with optional filters
  - Query params: institutionId, entity, action, limit (default 50), offset (default 0)
  - Enriches each log with userName from user lookup
  - Action filtering done in-memory (dataStore doesn't support action filter directly)
  - Sorted by createdAt descending
  - Returns paginated response: { logs, total, limit, offset }

---

### 5. CommandPalette Updates

#### Updated: `src/components/shared/CommandPalette.tsx`
- Added 3 new section items: Profil (User icon), Abonnement (CreditCard icon), Journal d'activité (ScrollText icon)
- Added 3 new quick actions: "Voir mon profil", "Voir les tarifs", "Journal d'activité"
- New icon imports: User, CreditCard, ScrollText

---

### Verification Results
- ✅ All routes return HTTP 200: /dashboard, /timetable, /teachers, /rooms, /subjects, /classes, /settings, /profile, /pricing, /audit
- ✅ API endpoints: /api/audit returns 200, /api/users returns correct status
- ✅ ESLint: no new errors (only pre-existing serve.js errors)
- ✅ Sidebar layout works with collapsible behavior
- ✅ Dark mode supported across all new components
- ✅ Mobile responsive (sidebar overlay, stacked pricing cards, filter layout)
- ✅ Brutalist aesthetic maintained (zero border-radius, monospace, correct colors)

---

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

---

## TASK 9: Fix Site Loading / Redirect Loop Issue

### Problem
User reported "Le site ne se charge pas correctement" and "redirigé à de trop nombreuses reprises" (too many redirects).

### Root Causes Identified
1. **Cross-origin resource blocking**: Next.js dev server blocked `/_next/*` requests from the preview domain `preview-chat-*.space-z.ai`, preventing JavaScript/CSS from loading
2. **Server instability**: Dev server (Turbopack) was crashing under load during compilation, consuming excessive CPU/memory
3. **Redirect loop potential**: Root page `router.replace("/dashboard")` could trigger multiple navigations without proper guards

### Fixes Applied

#### 1. Updated `next.config.ts` - Cross-Origin Origins
- Added explicit domain entries: `space.chatglm.site`, `space-z.ai` (in addition to `.space.chatglm.site`, `.space-z.ai`)
- Added `localhost:3000`
- Removed `output: "standalone"` to use standard production build

#### 2. Fixed Root Page (`src/app/page.tsx`)
- Added `hasRedirected` ref to prevent multiple `router.replace()` calls
- Added early redirect if `institutionId` already exists in Zustand store
- Prevents double-redirect on re-renders

#### 3. Fixed AppShell (`src/components/layout/AppShell.tsx`)
- Removed `useRouter` dependency (was importing but not using it directly for navigation)
- Used `window.location.href` for keyboard shortcut navigation instead of `router.push()` (avoids potential routing conflicts)
- Fixed institution loading logic to avoid duplicate fetches
- Only fetches institution data on second effect if `institutionLoaded.current` is true

#### 4. Switched to Production Build
- Removed `output: "standalone"` from next.config.ts
- Ran `npx next build` for production build
- Started with `npx next start -p 3000` (no cross-origin blocking in production mode)
- Production server uses less memory and doesn't need per-request compilation
- All routes verified returning HTTP 200 with correct content

### Verification Results
- ✅ All routes return HTTP 200: `/`, `/dashboard`, `/timetable`, `/teachers`, `/rooms`, `/subjects`, `/classes`, `/settings`
- ✅ API endpoint `/api/institution` returns 200 with data
- ✅ No redirect responses from any route
- ✅ CSS and JS static resources load correctly (200 status)
- ✅ Caddy proxy on port 81 forwards correctly to Next.js on port 3000
- ✅ Preview domain requests return correct HTML (200, no redirects)
- ✅ Production server process stable and persistent

---

## TASK 1: Authentication System & Database Schema Updates

## Date: 2026-06-03

### Summary
Implemented the authentication system for PlanningPro to make it a real SaaS application:
1. **Database Schema Updates** - Added User, UserInstitution, and AuditLog models to Prisma schema
2. **Data Store Updates** - Added interfaces, in-memory storage, persistence, and CRUD methods for new models
3. **Auth API Routes** - Created register, login, and me endpoints
4. **Auth Pages** - Created login and register pages with brutalist design
5. **Zustand Store Updates** - Added currentUser, sidebarOpen state and new sections

### Changes Made

#### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `User` model: id, email (unique), name, passwordHash, role, avatar, institutionId, plan, planExpiresAt, lastLoginAt, isActive
- Added `UserInstitution` model: userId, institutionId, role (with unique constraint on [userId, institutionId])
- Added `AuditLog` model: userId, institutionId, action, entity, entityId, details, ipAddress
- Updated `Institution` model: added `users UserInstitution[]` and `primaryUsers User[] @relation("PrimaryInstitution")`
- User→Institution relation uses `@relation("PrimaryInstitution")` to disambiguate

#### 2. Data Store (`src/lib/data-store.ts`)
- Added TypeScript interfaces: `UserRecord`, `UserInstitutionRecord`, `AuditLogRecord`
- Added in-memory store arrays: `users`, `userInstitutions`, `auditLogs`
- Updated `loadFromDisk()` to load from `/tmp/planning-pro-auth.json`
- Updated `saveToDisk()` to save to `/tmp/planning-pro-auth.json`
- Added `dataStore.user` with: `findMany`, `findUnique`, `create`, `update`, `delete`
- Added `dataStore.userInstitution` with: `findMany`, `create`, `delete`
- Added `dataStore.auditLog` with: `findMany`, `create`
- All new methods include defensive checks: `(db as any).user` to handle Prisma client not having new models yet (server restart needed)

#### 3. Auth API Routes
- **POST `/api/auth/register`**: Creates user + optional institution + user-institution link + audit log
  - Validates required fields (email, name, password)
  - Minimum password length: 6 characters
  - Checks for duplicate emails (409)
  - Creates default time slots if institution provided
  - Returns user (without passwordHash) and institutionId
- **POST `/api/auth/login`**: Authenticates user
  - Checks email/password, validates active status
  - Updates lastLoginAt on success
  - Creates audit log entry
  - Returns user (without passwordHash)
- **GET `/api/auth/me`**: Gets current user by userId (header/query param)
  - Returns user data + institutions list

#### 4. Auth Pages
- **`/login`** (`src/app/(auth)/login/page.tsx`):
  - Email + password form
  - "Se connecter" button
  - Error display with red border
  - "Mode démo" button (navigates to /)
  - Links to register and home
  - Brutalist design: monospace font, zero border-radius, dark/light mode
- **`/register`** (`src/app/(auth)/register/page.tsx`):
  - Step 1: Name, Email, Password, Confirm Password
  - Step 2 (optional): Institution name, type (select), country (select)
  - Step progress indicator (two bars)
  - Back/Next navigation
  - Same brutalist design
- **`(auth) layout** (`src/app/(auth)/layout.tsx`): Centered layout without AppShell

#### 5. Zustand Store (`src/lib/store.ts`)
- Added to `AppSection` type: `"profile" | "pricing" | "audit"`
- Added to `sectionToPath`: profile→/profile, pricing→/pricing, audit→/audit
- Added to `pathToSection`: /profile→profile, /pricing→pricing, /audit→audit
- Added to `AppState`: `currentUser`, `setCurrentUser`, `sidebarOpen`, `setSidebarOpen`
- `currentUser` type: `{ id, email, name, role, avatar?, institutionId?, plan }`

### API Testing Results
- ✅ POST /api/auth/register (without institution): 201, user created
- ✅ POST /api/auth/register (with institution): 201, user + institution + time slots created
- ✅ POST /api/auth/login (correct password): 200, user returned
- ✅ POST /api/auth/login (wrong password): 401, error message
- ✅ POST /api/auth/register (duplicate email): 409, error message
- ✅ GET /login: 200
- ✅ GET /register: 200

### Page Verification Results
- ✅ All existing pages still return HTTP 200
- ✅ /login and /register pages render correctly
- ✅ All existing API endpoints still functional
- ✅ ESLint: only pre-existing errors (serve.js, unused directives)

