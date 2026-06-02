"use client";

import { useAppStore } from "@/lib/store";
import { SubjectsView } from "@/components/subjects/SubjectsView";

export default function SubjectsPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return <SubjectsView institutionId={institutionId} />;
}
