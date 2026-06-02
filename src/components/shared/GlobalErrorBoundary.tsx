"use client";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary section="PlanningPro">
      {children}
    </ErrorBoundary>
  );
}
