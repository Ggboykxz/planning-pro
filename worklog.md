# PlanningPro Worklog — Remove Mock Data & Add Student Authentication

**Date:** 2026-06-03

## Summary

Removed all mock/demo data infrastructure and implemented proper student authentication with institution joining flow.

---

## Task 1: DELETE the seed API route

- **Deleted:** `src/app/api/seed/route.ts`
- This file created 15 fake teachers, 20 rooms, 15 subjects, 8 classes, and various link records with hardcoded demo data

## Task 2: Remove demo data card from DashboardView

- **Modified:** `src/components/dashboard/DashboardView.tsx`
- Removed `handleSeedData` function and `seeding` state
- Removed the "DEMO DATA CARD" section (Données de démonstration with "Charger les données" button)
- Removed `Loader2` from imports (no longer used)
- Kept `Database` import (still used in quick actions)
- Added `RefreshCw` import for auto-refresh indicator
- **Added auto-refresh:** useEffect with setInterval that calls `loadDashboard` every 30 seconds with a subtle "Actualisation..." indicator

## Task 3: Remove demo data section from SettingsView

- **Modified:** `src/components/settings/SettingsView.tsx`
- Removed `handleSeedData` function
- Removed the "Seed demo data" UI section (Données de démonstration with "Remplir" button)
- Kept `Sparkles` import (still used for holiday prefill button in Holidays tab)

## Task 4: Add StudentInstitution model and student auth flow

### a) Prisma Schema
- **Modified:** `prisma/schema.prisma`
- Added `StudentInstitution` model with fields: `id`, `userId`, `institutionId`, `classId?`, `studentNumber?`, `createdAt`, `updatedAt`
- Added `@@unique([userId, institutionId])` constraint
- Added `studentInstitutions StudentInstitution[]` relation to `User` model
- Added `studentInstitutions StudentInstitution[]` relation to `Institution` model
- Updated User role comment to include "student"
- Ran `npx prisma generate` and `npx prisma db push` successfully

### b) Data Store
- **Modified:** `src/lib/data-store.ts`
- Added `StudentInstitutionRecord` interface
- Added `studentInstitutions` to the in-memory store
- Updated `loadFromDisk()` and `saveToDisk()` to include studentInstitutions in the extra data file
- Added full CRUD methods: `studentInstitution.findMany()`, `findUnique()`, `create()`, `update()`, `delete()`
- All methods support both Prisma and in-memory fallback

### c) API Route: /api/student/join
- **Created:** `src/app/api/student/join/route.ts`
- POST handler accepts `{ userId, institutionId, classId?, studentNumber? }`
- Validates user is a student and institution exists
- Checks for duplicate joins (409 if already joined)
- Creates StudentInstitution link
- Updates user's primary institutionId
- Creates audit log entry

### d) API Route: /api/student/institutions
- **Created:** `src/app/api/student/institutions/route.ts`
- GET handler accepts `?userId=xxx`
- Returns all institutions the student has joined with enriched data (institution name, class info, student number)

### e) API Route: /api/institutions/search
- **Created:** `src/app/api/institutions/search/route.ts`
- GET handler accepts `?q=searchTerm`
- Returns matching institutions (id, name, type, country, academieYear) for public search
- Case-insensitive name matching, limited to 50 results

### f) Student Portal Page
- **Modified:** `src/app/(student)/student/page.tsx`
- Complete rewrite with two modes:
  1. **No institution flow:** Shows a search form to find and join institutions
     - Optional matricule/student number input
     - Search field with real-time filtering
     - List of available institutions with "Rejoindre" button
     - Already-joined indicators
  2. **Has institution flow:** Shows the existing timetable view
     - Auto-loads classes and timetable when institutionId is available
     - Preserves all existing timetable viewing functionality
- On join, updates both Zustand store and localStorage
- Checks student institution status on mount

## Task 5: Improve auth state management

- **Modified:** `src/lib/auth.ts`
- Added role-based redirect for auth routes:
  - Students on auth routes → `/student`
  - Non-students on auth routes → `/dashboard`
- Added explicit redirect: students on `/dashboard` → `/student`
- Added explicit redirect: non-students on `/student` → `/dashboard`
- Preserved existing student route access control via `canAccess()`

## Task 6: Add auto-refresh to dashboard

- **Modified:** `src/components/dashboard/DashboardView.tsx`
- Added `refreshing` state
- Added useEffect with `setInterval` calling `loadDashboard()` every 30 seconds
- Shows a subtle "Actualisation..." indicator with spinning RefreshCw icon during refresh
- Does NOT show full loading state during background refresh

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/api/seed/route.ts` | DELETED |
| `src/components/dashboard/DashboardView.tsx` | MODIFIED |
| `src/components/settings/SettingsView.tsx` | MODIFIED |
| `prisma/schema.prisma` | MODIFIED |
| `src/lib/data-store.ts` | MODIFIED |
| `src/app/api/student/join/route.ts` | CREATED |
| `src/app/api/student/institutions/route.ts` | CREATED |
| `src/app/api/institutions/search/route.ts` | CREATED |
| `src/app/(student)/student/page.tsx` | MODIFIED (rewrite) |
| `src/lib/auth.ts` | MODIFIED |

## No changes to:
- Landing page (`src/app/(marketing)/page.tsx`)
- StudentPortalShell (`src/components/layout/StudentPortalShell.tsx`)
- Student layout (`src/app/(student)/layout.tsx`)
