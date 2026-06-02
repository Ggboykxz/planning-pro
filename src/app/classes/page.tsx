"use client";

import { useAppStore } from "@/lib/store";
import { ClassesView } from "@/components/classes/ClassesView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function ClassesPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return (
    <AppShell>
      <ErrorBoundary section="Classes">
        <ClassesView institutionId={institutionId} />
      </ErrorBoundary>
    </AppShell>
  );
}
