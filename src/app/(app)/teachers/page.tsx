"use client";

import { useAppStore } from "@/lib/store";
import { TeachersView } from "@/components/teachers/TeachersView";

export default function TeachersPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return <TeachersView institutionId={institutionId} />;
}
