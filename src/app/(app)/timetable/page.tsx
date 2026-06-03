"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { TimetableView } from "@/components/timetable/TimetableView";

export default function TimetablePage() {
  const { institutionId } = useAppStore();
  const [institutionName, setInstitutionName] = useState<string>("");

  useEffect(() => {
    if (institutionId) {
      fetch("/api/institution")
        .then((res) => res.ok ? res.json() : [])
        .then((data) => {
          const inst = data.find((i: { id: string }) => i.id === institutionId);
          if (inst) setInstitutionName(inst.name);
        })
        .catch(() => {});
    }
  }, [institutionId]);

  if (!institutionId) return null;

  return <TimetableView institutionId={institutionId} institutionName={institutionName} />;
}
