"use client";

import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return <DashboardView institutionId={institutionId} />;
}
