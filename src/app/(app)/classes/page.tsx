"use client";

import { useAppStore } from "@/lib/store";
import { ClassesView } from "@/components/classes/ClassesView";

export default function ClassesPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return <ClassesView institutionId={institutionId} />;
}
