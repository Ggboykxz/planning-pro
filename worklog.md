# PlanningPro Bug Fix Worklog

## Date: 2024-03-04

### Summary
Fixed 12 critical bugs across the PlanningPro application. All fixes are minimal and targeted.

---

### Bug 1: `/api/billing/route.ts` — Prisma-style query fixes
**Fix:** Wrapped `dataStore.auditLog.create()` call with `{ data: { ... } }` wrapper to match Prisma API signature.
- The other fixes (findUnique, findMany with where, update with where/data) were already applied in the codebase.

### Bug 2: `/api/team/route.ts` — Prisma-style query fixes
**Fixes:**
- `dataStore.user.findUnique({ id: ... })` → `dataStore.user.findUnique({ where: { id: ... } })` (1 place)
- `dataStore.user.findUnique({ email })` → `dataStore.user.findUnique({ where: { email } })` (1 place)
- `dataStore.user.create({ email, ... })` → `dataStore.user.create({ data: { email, ... } })` (1 place)
- `dataStore.userInstitution.create({ userId, ... })` → `dataStore.userInstitution.create({ data: { userId, ... } })` (1 place)
- `dataStore.userInstitution.update(record.id, { role })` → `dataStore.userInstitution.update({ where: { id: record.id }, data: { role } })` (1 place)
- `dataStore.userInstitution.delete(record.id)` → `dataStore.userInstitution.delete({ where: { id: record.id } })` (1 place)
- All 3 `dataStore.auditLog.create()` calls wrapped with `{ data: { ... } }`
- `member.joinedAt` → `member.createdAt` (UserInstitutionRecord has no `joinedAt` field)

### Bug 3: `/api/auth/register/route.ts` — Type annotation
**Fix:** `let institutionId = null` → `let institutionId: string | null = null` to avoid implicit `null` type.

### Bug 4: `/api/absences/route.ts` — Type issues
**Fix:** `let substituteTeacher = null` → `let substituteTeacher: { firstName: string; lastName: string } | null = null` to allow assignment of TeacherRecord objects.

### Bug 5: `/api/holidays/route.ts` — Year parameter
**Fix:** Removed `year` from the `findMany` where clause. The Holiday model has no `year` field — only `startDate`/`endDate`. Passing `year` to Prisma would cause a runtime error. The `year` searchParam is still parsed but no longer passed to the query.

### Bug 6: Delete duplicate student page
**Fix:** Deleted `src/app/(app)/student/page.tsx` — students should use the `(student)` route group only.

### Bug 7: Delete duplicate top-level pages
**Fix:** Deleted 7 top-level page files that duplicated `(app)` group pages (rendering without AppShell):
- `src/app/dashboard/page.tsx`
- `src/app/timetable/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/teachers/page.tsx`
- `src/app/rooms/page.tsx`
- `src/app/subjects/page.tsx`
- `src/app/classes/page.tsx`

### Bug 8: Fix Sidebar — Hide student link for non-students
**Fix:** Added `studentOnly?: boolean` property to secondary nav items type. Marked "Portail étudiant" with `studentOnly: true`. Added filter in the render: `.filter((item) => !item.studentOnly || currentUser?.role === "student")`.

### Bug 9: Fix `/api/institutions/route.ts` — undefined to null
**Fix:** Changed `userRole: ui.role` to `userRole: ui.role ?? null` in the GET handler results to ensure `null` instead of `undefined`.

### Bug 10: Fix `cuid.ts` — Counter pattern
**Fix:** Replaced `createId._counter` pattern (which required `(createId as any)._counter = 0` hack) with a module-level `let _counter = 0` variable. This avoids attaching properties to functions, which is fragile and doesn't work well with TypeScript strict mode.

### Bug 11: Fix data-store Date serialization
**Fix:** Added `serializeDates<T>(result: T): T` helper that runs `JSON.parse(JSON.stringify(result))` to convert Prisma `Date` objects to ISO strings. Applied to all 64 Prisma query return paths in the data store (findMany, findUnique, create, update, delete, etc.). This ensures `createdAt`/`updatedAt` fields are strings matching the interface types.

### Bug 12: Fix `/api/dashboard/route.ts` — null userId guard
**Fix:** Replaced `dataStore.userInstitution?.findMany?.({ where: { userId } }) || []` with `dataStore.userInstitution.findMany({ where: { userId } })` inside the existing `if (userId)` guard. The optional chaining was unnecessary since the guard already ensures `userId` is not null.

---

### Build Verification
- `npx next build` completed successfully with no errors
- All routes compile and generate static pages
