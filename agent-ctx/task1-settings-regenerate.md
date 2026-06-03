# Task 1: Regenerate Time Slots When Schedule Config Changes in Settings

## Summary
Added detection of schedule-related config changes in the Settings page and a UI to regenerate time slots.

## Files Modified
- `src/components/settings/SettingsView.tsx`

## Changes Made
1. Added `RefreshCw` icon import from lucide-react
2. Added `hasScheduleChanges` computed value that detects changes to: workingDays, slotDuration, dayStartTime, dayEndTime, breakStartTime, breakEndTime
3. Added `regenerating` state and `handleRegenerateSlots` function that:
   - Saves the current institution config first
   - DELETEs all existing time slots via `/api/timeslots?institutionId=XXX`
   - POSTs to `/api/timeslots` with `generateFromConfig: true` to regenerate
   - Shows success toast with count of generated slots
4. Added warning banner that appears when schedule config has changed from saved values:
   - Amber/terminal-styled border with `AlertTriangle` icon
   - "Créneaux horaires obsolètes" title
   - "Les créneaux horaires doivent être régénérés pour refléter ces changements" description
   - "Régénérer les créneaux" button with spinning animation while regenerating
   - Banner only shows when schedule config has actually changed

## No new API endpoints needed - existing `/api/timeslots` DELETE and POST (generateFromConfig) were sufficient.
