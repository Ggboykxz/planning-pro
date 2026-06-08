"use client";

import { useAppStore } from "@/lib/store";
import { TeachersView } from "@/components/teachers/TeachersView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function TeachersPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return (
    <AppShell>
      <ErrorBoundary section="Enseignants">
        <TeachersView institutionId={institutionId} />
      </ErrorBoundary>
    </AppShell>
  );
}
