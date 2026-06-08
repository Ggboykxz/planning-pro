"use client";

import { useAppStore } from "@/lib/store";
import { TimetableView } from "@/components/timetable/TimetableView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function TimetablePage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return (
    <AppShell>
      <ErrorBoundary section="Emploi du temps">
        <TimetableView institutionId={institutionId} />
      </ErrorBoundary>
    </AppShell>
  );
}
