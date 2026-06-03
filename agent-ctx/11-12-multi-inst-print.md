# Task 11-12: Multi-Institution Support & Print-Optimized View

## Summary
Implemented 2 major features for PlanningPro:
1. **Multi-Institution Support** - Users can switch between institutions, create new ones, and manage their institution memberships
2. **Print-Optimized View** - Enhanced print CSS for clean timetable printing with proper headers

---

## Feature 1: Multi-Institution Support

### New API Route: `src/app/api/institutions/route.ts`

- **GET** `/api/institutions?userId=xxx`: List all institutions the user has access to
  - Queries `dataStore.userInstitution.findMany({ where: { userId } })`
  - Enriches each result with full institution data + userRole
  - Returns array of institutions with userRole field

- **POST** `/api/institutions`: Create a new institution and link to user
  - Validates userId and name are required
  - Creates institution with provided data (or sensible defaults)
  - Creates UserInstitution record with role "admin"
  - Generates default time slots using `generateTimeSlots` from `@/lib/schedule-utils`
  - Returns created institution with userRole, status 201

- **DELETE** `/api/institutions?institutionId=xxx&userId=xxx`: Leave/remove an institution
  - Validates both institutionId and userId required
  - Checks user has more than one institution (prevents leaving last one)
  - Finds the UserInstitution record by composite key, deletes by id
  - Returns success or appropriate error

### Updated: `src/components/layout/Sidebar.tsx`

- Added institution switcher dropdown at the top of the sidebar (below logo)
- Shows current institution name with Building2 icon
- Clicking opens a dropdown with:
  - List of all user's institutions (fetched from `/api/institutions?userId=xxx`)
  - Current institution highlighted with Check icon
  - Role label shown for each institution (Administrateur/Gestionnaire/Observateur)
  - "+ Nouvel établissement" option at the bottom (navigates to /settings)
- When user selects a different institution:
  - Updates store's institutionId via `setInstitutionId`
  - Redirects to /dashboard to refresh data
- Derives `currentInstName` from fetched institutions list (no extra state)
- Collapsed sidebar shows Building2 icon button that expands sidebar
- Uses click-outside detection to close dropdown
- All text in French
- Brutalist aesthetic maintained (zero border-radius, monospace font)

### Updated: `src/components/settings/SettingsView.tsx`

- Added "Gérer les établissements" collapsible section (defaultOpen=false)
- Shows list of all user's institutions with:
  - Institution name and type icon (Building2)
  - User role with Shield icon
  - "(actif)" label for current institution (highlighted)
  - "Basculer" button for non-active institutions
  - "Quitter" button (red, with AlertTriangle confirmation dialog) if more than one institution
- "Ajouter un établissement" button with dashed border style
- New institution dialog (Dialog component):
  - Name input field
  - Type select (institutionTypes)
  - Country select (countries with flags)
  - Creates institution via POST `/api/institutions`
  - Auto-switches to new institution after creation
- All text in French
- Dark mode supported
- Mobile responsive

---

## Feature 2: Print-Optimized View

### Updated: `src/app/globals.css`

Enhanced `@media print` block with:
- Hide all UI chrome: `.no-print`, `nav`, `aside`, `.sidebar`, `header`, `footer`, `button`, `.mobile-bottom-nav`, `[role="dialog"]`, `.ai-assistant`
- Full-width main content: `main { margin: 0; padding: 0; max-width: 100%; }`
- White background, black text for print
- Dark mode override in print (force white background)
- Timetable grid print protection: `.timetable-grid`, `table` with `break-inside: avoid`
- New `.print-title` class for print-only headers:
  - `display: block !important` in print
  - Centered, with bottom border separator
  - h1: 14pt bold, black
  - p: 9pt, gray (for class name, institution name)
- Legacy `.print-header` support preserved
- Print color adjustment: `-webkit-print-color-adjust: exact; print-color-adjust: exact`
- Page setup: `@page { margin: 1cm; size: landscape; }`

### Updated: `src/components/timetable/TimetableView.tsx`

- Changed print header from `.print-header` to `.print-title` class
- Added institution name to print title: `{institutionName} — {className}`
- Added `institutionName` prop to component interface
- Added `timetable-grid` class to timetable container div for print CSS targeting
- Added `no-print` class to the header toolbar section
- Printer button already existed (was added previously)

### Updated: `src/app/(app)/timetable/page.tsx`

- Added institution name fetching on mount
- Passes `institutionName` prop to `TimetableView`

---

## Verification Results

- ✅ All pages return HTTP 200: /, /dashboard, /timetable, /settings
- ✅ API endpoints: GET /api/institutions?userId=xxx returns 200, POST creates correctly, DELETE validates
- ✅ ESLint: no new errors (only pre-existing serve.js, page.tsx, cuid.ts errors)
- ✅ Dark mode supported across all new components
- ✅ Mobile responsive (institution switcher, settings institution list)
- ✅ Brutalist aesthetic maintained (zero border-radius, monospace, correct colors)
- ✅ All text in French
