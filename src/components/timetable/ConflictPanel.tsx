"use client";

import { dayNames } from "@/lib/countries";

interface ConflictPanelProps {
  teacherConflicts: Array<{ teacherName: string; dayOfWeek: number; time: string; classes: string[] }>;
  roomConflicts: Array<{ roomName: string; dayOfWeek: number; time: string; classes: string[] }>;
}

export function ConflictPanel({ teacherConflicts, roomConflicts }: ConflictPanelProps) {
  const totalConflicts = teacherConflicts.length + roomConflicts.length;

  if (totalConflicts === 0) {
    return (
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2">Conflits</p>
        <p className="text-xs text-[#9A9898]">Aucun conflit detecte</p>
      </div>
    );
  }

  return (
    <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-3">
        Conflits detectes ({totalConflicts})
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
        {teacherConflicts.map((c, i) => (
          <div key={`tc-${i}`} className="flex items-start gap-2 p-2 bg-red-50/50 dark:bg-red-950/20 border-l-2 border-l-[#DC2626]">
            <div className="text-xs">
              <p className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.teacherName}</p>
              <p className="text-[#9A9898]">
                {dayNames[c.dayOfWeek]} {c.time}
              </p>
              <p className="text-[#9A9898]">
                {c.classes.join(" vs ")}
              </p>
            </div>
          </div>
        ))}
        {roomConflicts.map((c, i) => (
          <div key={`rc-${i}`} className="flex items-start gap-2 p-2 bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-l-[#D97706]">
            <div className="text-xs">
              <p className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.roomName}</p>
              <p className="text-[#9A9898]">
                {dayNames[c.dayOfWeek]} {c.time}
              </p>
              <p className="text-[#9A9898]">
                {c.classes.join(" vs ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
