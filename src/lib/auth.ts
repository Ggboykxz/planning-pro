"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/register"];

// Routes accessible by student role (read-only)
const STUDENT_ROUTES = ["/student", "/timetable", "/profile"];

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  avatar?: string | null;
  institutionId?: string | null;
}

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, setCurrentUser, setInstitutionId, institutionId } = useAppStore();
  const authChecked = useRef(false);
  const isChecking = useRef(false);

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith("/share/")
  );

  // Check if current route is an auth route
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // Check if current route is an app route (requires auth)
  const isAppRoute = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/timetable") ||
    pathname.startsWith("/teachers") ||
    pathname.startsWith("/rooms") ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/absences") ||
    pathname.startsWith("/holidays") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/audit");

  // Restore session from cookie (via /api/auth/me) on mount
  const restoreSession = useCallback(async () => {
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      // First try localStorage for immediate UI hydration
      const storedUser = localStorage.getItem("planningpro_user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as AuthUser;
          setCurrentUser(user);
          if (user.institutionId) {
            setInstitutionId(user.institutionId);
          }
        } catch {
          localStorage.removeItem("planningpro_user");
          setCurrentUser(null);
          setInstitutionId(null);
        }
      }

      // Verify session is still valid by hitting /api/auth/me
      // Cookie is sent automatically by the browser
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const freshUser = data.user as AuthUser;
            setCurrentUser(freshUser);
            if (freshUser.institutionId) {
              setInstitutionId(freshUser.institutionId);
            }
            // Update localStorage with fresh data
            localStorage.setItem("planningpro_user", JSON.stringify(freshUser));
            return freshUser;
          }
        } else {
          // Session invalid - clear stored data
          localStorage.removeItem("planningpro_user");
          setCurrentUser(null);
          setInstitutionId(null);
        }
      } catch {
        // Network error - use cached user data if available
        if (storedUser) {
          return JSON.parse(storedUser) as AuthUser;
        }
        return null;
      }

      // No stored user - clear state
      setCurrentUser(null);
      setInstitutionId(null);
      return null;
    } finally {
      isChecking.current = false;
      authChecked.current = true;
    }
  }, [setCurrentUser, setInstitutionId]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout API to clear the session cookie
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue with local cleanup even if API call fails
    }
    localStorage.removeItem("planningpro_user");
    setCurrentUser(null);
    setInstitutionId(null);
    authChecked.current = false;
    router.push("/login");
  }, [router, setCurrentUser, setInstitutionId]);

  // Check if user is a student
  const isStudent = currentUser?.role === "student";

  // Check if user can access a specific route
  const canAccess = useCallback((path: string) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" || currentUser.role === "manager") return true;
    if (currentUser.role === "student") {
      return STUDENT_ROUTES.some((route) => path.startsWith(route));
    }
    if (currentUser.role === "teacher") {
      // Teachers can access most routes except settings
      return !path.startsWith("/settings") && !path.startsWith("/audit") && !path.startsWith("/team");
    }
    return false;
  }, [currentUser]);

  // Auth guard - redirect based on auth state
  useEffect(() => {
    if (!authChecked.current) return;

    // If on app route but not authenticated, redirect to login
    if (isAppRoute && !currentUser) {
      router.replace("/login");
      return;
    }

    // If on auth route but already authenticated, redirect based on role
    if (isAuthRoute && currentUser) {
      if (currentUser.role === "student") {
        router.replace("/student");
      } else {
        router.replace("/dashboard");
      }
      return;
    }

    // If student is on /dashboard or any admin-only route, redirect to /student
    if (currentUser?.role === "student" && pathname.startsWith("/dashboard")) {
      router.replace("/student");
      return;
    }

    // If student tries to access admin-only route, redirect to student portal
    if (currentUser?.role === "student" && isAppRoute && !canAccess(pathname)) {
      router.replace("/student");
      return;
    }

    // If non-student is on /student, redirect to /dashboard
    if (currentUser && currentUser.role !== "student" && pathname.startsWith("/student")) {
      router.replace("/dashboard");
      return;
    }
  }, [pathname, currentUser, isAppRoute, isAuthRoute, canAccess, router]);

  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    isStudent,
    isLoading: !authChecked.current,
    isPublicRoute,
    isAuthRoute,
    isAppRoute,
    restoreSession,
    logout,
    canAccess,
  };
}
