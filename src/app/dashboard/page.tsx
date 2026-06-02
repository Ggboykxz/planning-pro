"use client";

import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function DashboardPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return (
    <AppShell>
      <ErrorBoundary section="Tableau de bord">
        <DashboardView institutionId={institutionId} />
      </ErrorBoundary>
    </AppShell>
  );
}
