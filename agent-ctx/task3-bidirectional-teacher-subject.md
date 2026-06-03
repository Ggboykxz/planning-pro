# Task 3: Bidirectional Teacher ↔ Subject Assignment

## Summary
Added teacher assignment capability from the subject form, making the TeacherSubject relationship bidirectional.

## Files Modified
- `src/app/api/subjects/route.ts`
- `src/components/subjects/SubjectsView.tsx`

## Changes Made

### API (`src/app/api/subjects/route.ts`)
1. Updated `POST` handler: After creating a subject, if `teacherIds` is provided, create TeacherSubject records for each teacher (mirrors the teachers API's `subjectIds` pattern)
2. Updated `PUT` handler: Destructure `teacherIds` from body. If provided, delete all existing TeacherSubject records for this subject, then recreate them with the new teacherIds (mirrors the teachers API's approach)

### Frontend (`src/components/subjects/SubjectsView.tsx`)
1. Added `Users` icon import from lucide-react
2. Added `TeacherData` interface for the teachers list
3. Added `teachers` state to store the teachers list
4. Added `teacherIds: [] as string[]` to form state
5. Updated `loadSubjects` to also fetch teachers from `/api/teachers`
6. Updated `openCreate` to initialize teacherIds as empty array
7. Updated `openEdit` to populate teacherIds from `subject.teacherAssignments`
8. Updated `handleSave` to include `teacherIds` in the request body
9. Added `toggleTeacher(teacherId)` function for toggling teacher selection
10. Added teacher assignment section in the create/edit dialog:
    - `Users` icon label "Enseignants"
    - Teachers shown as clickable toggle buttons (same pattern as subject selection in TeachersView)
    - Selected teachers shown in bold black style, unselected in subtle border style
    - Fallback message "Créez d'abord des enseignants" when no teachers exist

## Bidirectional Consistency
Assigning teachers from either direction (teacher form → subjects, or subject form → teachers) produces the same TeacherSubject records in the database. Both use the same `db.teacherSubject.create/deleteMany` pattern.
