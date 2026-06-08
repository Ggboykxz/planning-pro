# Task: Dramatically Improve Module/Subject Views for Presentation

## Agent: Main Agent
## Task ID: subjects-redesign-001

## Summary of Changes

### 1. Updated `src/lib/subject-colors.ts`
- Expanded color palette from 15 to 25 distinct colors
- Added: Emerald, Mint, Rose, Violet, Purple2, Orange3, Red2, Teal2, Sky, Fuchsia
- Now supports 20+ subjects with unique color assignments

### 2. Added `color` field to Prisma Schema
- Added `color String?` field to Subject model in `prisma/schema.prisma`
- Ran `bun run db:push` to sync database
- Comment: "Hex color for timetable display"

### 3. Updated Subjects API (`src/app/api/subjects/route.ts`)
- POST: Now handles `color` field and `classIds` array for class-subject associations
- PUT: Now handles `color` field via spread data, plus `classIds` for updating class-subject associations
- Class associations support `hoursPerWeek` per class-subject link

### 4. Complete Rewrite of `src/components/subjects/SubjectsView.tsx`

#### New Features:
- **View Toggle**: Cards/Table toggle with LayoutGrid/List icons, auto-selects based on subject count (<10=cards, >=10=table)
- **Card View**: Responsive grid (1-3 columns), each card shows:
  - Subject name (prominent, bold)
  - Type badge with color coding (cours=amber, td=emerald, tp=blue, projet=purple, examen=red)
  - Code in mono font tag
  - Hours/week with visual bar indicator
  - Coefficient display
  - Semester tag
  - Teacher avatars (initials in squares, max 3 shown with "+N" overflow)
  - Class assignments count with GraduationCap icon
  - Edit/delete actions on hover
  - Checkbox for bulk selection on hover
  - Color strip at top if custom color is set
  - Brutalist aesthetic: sharp borders (borderRadius: 0), monochrome with amber accents
  - Hover effect: border changes to amber (#D97706)
- **Improved Table View**:
  - Color-coded type badges instead of plain text
  - Teacher count with Users icon
  - Class count with GraduationCap icon
  - Color dot indicator next to subject name
  - Row click opens detail dialog
  - Better visual hierarchy with bold names
- **Stats Summary Bar**: Shows at top:
  - Total subjects count (BookOpen icon)
  - Total hours/week (Clock icon)
  - Average coefficient (BarChart3 icon)
  - Teacher coverage % (UserCheck icon)
  - All with amber accent icons and mono font numbers
- **Filter Bar**:
  - Filter by type (cours, td, tp, projet) - toggle buttons
  - Filter by semester (dynamically from data) - toggle buttons
  - Filter by teacher - dropdown select
  - Reset button when filters active
  - All in brutalist style with sharp borders
- **Subject Detail Panel (Dialog)**:
  - Full subject details in a dialog
  - 2-column grid for Type, Semester, Hours, Coefficient
  - Code display if present
  - Teacher list with initials avatars
  - Class list with hours per class
  - Quick edit button in footer
- **Improved Create/Edit Dialog**:
  - Wider (sm:max-w-2xl)
  - Preview card at top showing how subject will look
  - Grouped into sections with section headers:
    - "Informations" (name, code, type, semester)
    - "Horaires & Coefficients" (hours, coefficient)
    - "Couleur" (color picker with 20 color swatches)
    - "Enseignants" (teacher toggle buttons)
    - "Classes" (class assignment with hours per class input)
  - All inputs have borderRadius: 0 for brutalist aesthetic
  - Scrollable dialog body

#### Preserved Features:
- Search functionality
- Pagination
- Bulk delete
- CSV export
- Import dialog
- Confirm dialog for deletions
- All existing API integration

#### Design Rules Applied:
- All borderRadius: 0 (brutalist)
- Font-mono for data values
- Monochrome palette (#201D1D, #FDFCFC, #9A9898, #E5E5E5, #2A2A2A)
- Amber accent (#D97706)
- All UI text in French
- Dark mode support throughout

## Build Status
- Next.js build: SUCCESS
- Prisma migration: SUCCESS
- No new lint errors introduced (existing lint errors in serve.js and page.tsx are pre-existing)
