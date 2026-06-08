"use client";

import { useAppStore } from "@/lib/store";
import { SubjectsView } from "@/components/subjects/SubjectsView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function SubjectsPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return (
    <AppShell>
      <ErrorBoundary section="Matières">
        <SubjectsView institutionId={institutionId} />
      </ErrorBoundary>
    </AppShell>
  );
}
