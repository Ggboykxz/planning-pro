# Task 2: Add Room Equipment UI

## Summary
Added equipment management UI to the Rooms page, using the existing `equipment` JSON field in the database.

## Files Modified
- `src/components/rooms/RoomsView.tsx`

## Changes Made
1. Added `equipment` field to `RoomData` interface (`string | null`)
2. Added `predefinedEquipment` array with 20 common equipment items (Projecteur, Tableau blanc, PCs, etc.)
3. Added `equipment: [] as string[]` to form state
4. Updated `openCreate` to initialize equipment as empty array
5. Updated `openEdit` to parse `room.equipment` from JSON string to array
6. Updated `handleSave` to include equipment in the request body (null if empty)
7. Added helper functions:
   - `toggleEquipment(item)` - toggle equipment item in form
   - `removeEquipment(item)` - remove equipment item from form
   - `getEquipmentList(equipment)` - parse JSON equipment string to array
8. Added "Équipement" column to the rooms table with equipment tags
9. Added equipment section in the create/edit dialog:
   - `Wrench` icon label "Équipement"
   - Selected equipment shown as black tags with X button to remove
   - Available predefined equipment shown as clickable "+ Item" buttons
   - Already-selected items filtered out from suggestions
   - Scrollable suggestions area with `max-h-32`

## API already supported equipment (JSON.stringify in POST and PUT routes). No API changes needed.
