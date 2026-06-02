"use client";

import { useAppStore } from "@/lib/store";
import { RoomsView } from "@/components/rooms/RoomsView";

export default function RoomsPage() {
  const { institutionId } = useAppStore();

  if (!institutionId) return null;

  return <RoomsView institutionId={institutionId} />;
}
