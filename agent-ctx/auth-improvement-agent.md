# Auth System Improvement - Task Summary

## What was done

### 1. Created JWT-like session token system (`src/lib/auth-server.ts`)
- HMAC-SHA256 signed session tokens with format `{userId}:{timestamp}:{signature}`
- `generateSessionToken(userId)` - creates signed token
- `verifySessionToken(token)` - verifies and returns `{ userId, expiresAt }` or null
- 7-day token expiration
- SECRET_KEY from `AUTH_SECRET` env var with fallback dev key
- Cookie configuration helpers (`SESSION_COOKIE_NAME`, `SESSION_COOKIE_MAX_AGE`, `getCookieOptions()`)

### 2. Created auth helpers for API routes (`src/lib/auth-helpers.ts`)
- `getAuthenticatedUser(request)` - reads session cookie, verifies token, returns user data without passwordHash
- `AuthUser` interface exported for use across routes
- Returns null if not authenticated

### 3. Updated login API route (`src/app/api/auth/login/route.ts`)
- Generates session token after successful login
- Sets `planningpro_session` HTTP-only cookie with proper security options
- Returns user data as before

### 4. Updated register API route (`src/app/api/auth/register/route.ts`)
- Generates session token after successful registration
- Sets the same secure cookie
- Returns user data as before

### 5. Updated /api/auth/me route (`src/app/api/auth/me/route.ts`)
- Uses `getAuthenticatedUser` from auth helpers
- Reads session cookie instead of userId query param or header
- Returns 401 if not authenticated

### 6. Created logout API route (`src/app/api/auth/logout/route.ts`)
- Clears the session cookie by setting maxAge to 0
- Returns success response

### 7. Updated client-side auth hook (`src/lib/auth.ts`)
- Removed `?userId=` query param from /api/auth/me call
- Now calls `/api/auth/me` and relies on automatic cookie sending
- Clears localStorage on invalid session (401 response)
- Updated `logout` to call `/api/auth/logout` to clear server cookie

### 8. Updated login page (`src/app/(auth)/login/page.tsx`)
- Added show/hide password toggle with Eye/EyeOff icons
- Added "Se souvenir de moi" (Remember me) checkbox
- Added loading spinner (Loader2 icon) on submit button
- Added inline form validation with field-level error messages
- Added AlertCircle icons for error states
- Maintained brutalist/terminal aesthetic (font-mono, rounded-none, monochrome palette)

### 9. Updated register page (`src/app/(auth)/register/page.tsx`)
- Added show/hide password toggle for both password fields
- Added password strength indicator (weak/medium/strong) with animated progress bar
- Added password requirement checklist (6+ chars, uppercase, lowercase, digit, special char)
- Added confirm password match indicator with green/red borders
- Added loading spinners on submit buttons
- Added inline field-level validation errors
- Polished step indicator with animated numbered circles and check marks
- Maintained brutalist/terminal aesthetic

### 10. Updated other API routes with auth helpers
- `/api/institutions` - all methods (GET, POST, DELETE) now use cookie auth
- `/api/dashboard` - uses cookie auth
- `/api/team` - all methods use cookie auth
- `/api/student/institutions` - uses cookie auth
- `/api/users` - uses cookie auth
- `/api/billing` - uses cookie auth
- `/api/audit` - uses cookie auth

### 11. Updated client-side API calls to remove userId params
- `Sidebar.tsx` - removed `?userId=` from institutions fetch
- `SettingsView.tsx` - removed `?userId=` from institutions fetch, DELETE, and POST body
- `DashboardView.tsx` - removed `&userId=` from dashboard fetch
- `student/page.tsx` - removed `?userId=` from student institutions fetch
- `pricing/page.tsx` - removed `?userId=` from billing fetch

## Files changed
- NEW: `src/lib/auth-server.ts`
- NEW: `src/lib/auth-helpers.ts`
- NEW: `src/app/api/auth/logout/route.ts`
- MODIFIED: `src/lib/auth.ts`
- MODIFIED: `src/app/api/auth/login/route.ts`
- MODIFIED: `src/app/api/auth/register/route.ts`
- MODIFIED: `src/app/api/auth/me/route.ts`
- MODIFIED: `src/app/(auth)/login/page.tsx`
- MODIFIED: `src/app/(auth)/register/page.tsx`
- MODIFIED: `src/app/api/institutions/route.ts`
- MODIFIED: `src/app/api/dashboard/route.ts`
- MODIFIED: `src/app/api/team/route.ts`
- MODIFIED: `src/app/api/student/institutions/route.ts`
- MODIFIED: `src/app/api/users/route.ts`
- MODIFIED: `src/app/api/billing/route.ts`
- MODIFIED: `src/app/api/audit/route.ts`
- MODIFIED: `src/components/layout/Sidebar.tsx`
- MODIFIED: `src/components/settings/SettingsView.tsx`
- MODIFIED: `src/components/dashboard/DashboardView.tsx`
- MODIFIED: `src/app/(student)/student/page.tsx`
- MODIFIED: `src/app/(app)/pricing/page.tsx`

## Build verification
- `next build` completed successfully with no errors
- All API routes compile correctly
- All pages compile correctly
