"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPortalShell } from "@/components/layout/StudentPortalShell";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isStudent, restoreSession } = useAuth();
  const { currentUser } = useAppStore();
  const router = useRouter();

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // If not a student, redirect to appropriate dashboard
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Non-students accessing /student should go to dashboard
    // Students can access /student freely
  }, [isAuthenticated, isLoading, isStudent, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFC] dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#D97706] skeleton-shimmer inline-block px-2 font-mono">
            PlanningPro_
          </p>
          <p className="text-xs text-[#9A9898] mt-1 font-mono">Chargement du portail étudiant...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <StudentPortalShell>{children}</StudentPortalShell>;
}
