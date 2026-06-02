"use client";

import { useAppStore } from "@/lib/store";
import { TimetableView } from "@/components/timetable/TimetableView";

export default function TimetablePage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return <TimetableView institutionId={institutionId} />;
}
