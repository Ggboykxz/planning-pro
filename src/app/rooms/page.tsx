"use client";

import { useAppStore } from "@/lib/store";
import { RoomsView } from "@/components/rooms/RoomsView";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function RoomsPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return (
    <AppShell>
      <ErrorBoundary section="Salles">
        <RoomsView institutionId={institutionId} />
      </ErrorBoundary>
    </AppShell>
  );
}
