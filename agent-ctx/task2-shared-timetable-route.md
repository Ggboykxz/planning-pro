# Task 2: Add Shared Timetable Route

## Problem
The `SharedTimetable` component existed at `src/components/timetable/SharedTimetable.tsx` and the share API at `/api/share` was functional, but there was no route to render the shared timetable page. The share feature generated a URL pointing to `/?shareId=XXX` which didn't actually render the shared view.

## Solution
1. Created the route at `src/app/share/[shareId]/page.tsx` — a standalone page (outside the `(app)` route group, so no AppShell/sidebar).
2. The page extracts `shareId` from the async `params` (Next.js 16 pattern), then renders the `SharedTimetable` component which handles all data fetching, loading, and error states internally.
3. Updated the share URL in `TimetableView.tsx` from `/?shareId=XXX` to `/share/XXX` to point to the new route.

## Files Created
- `src/app/share/[shareId]/page.tsx` — Server component that awaits params and renders SharedTimetable

## Files Modified
- `src/components/timetable/TimetableView.tsx` — Updated `handleShare` to generate URL `/share/{shareId}` instead of `/?shareId={shareId}`
