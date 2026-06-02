"use client";

import { useEffect, useState } from "react";
import { dayNames } from "@/lib/countries";

interface SharedTimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string; code: string | null; type: string | null } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  room: { id: string; name: string; type: string | null } | null;
}

interface SharedTimetableProps {
  shareId: string;
}

export function SharedTimetable({ shareId }: SharedTimetableProps) {
  const [data, setData] = useState<{
    name: string;
    slots: SharedTimetableSlot[];
    class: { id: string; name: string };
    institution: { name: string };
    semester: string | null;
    academicYear: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimetable();
  }, [shareId]);

  const loadTimetable = async () => {
    try {
      const res = await fetch(`/api/share?shareId=${shareId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        const err = await res.json();
        setError(err.error || "Lien de partage invalide");
      }
    } catch {
      setError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <p className="text-xs text-[#9A9898] font-mono">Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#DC2626] font-mono">{error || "Erreur"}</p>
          <p className="text-xs text-[#9A9898] mt-2 font-mono">Lien de partage invalide ou expiré</p>
        </div>
      </div>
    );
  }

  // Build grid
  const slotsByDay: Record<number, SharedTimetableSlot[]> = {};
  for (const slot of data.slots) {
    if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
    slotsByDay[slot.dayOfWeek].push(slot);
  }
  const days = Object.keys(slotsByDay).map(Number).sort((a, b) => a - b);
  const allTimes = [...new Set(data.slots.map((s) => `${s.startTime}-${s.endTime}`))].sort();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] print-area">
      <div className="max-w-[1080px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 border-b border-[#E5E5E5] dark:border-[#2A2A2A] pb-4">
          <p className="text-lg font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            {data.institution.name}
          </p>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono mt-1">
            {data.name} — {data.class.name}
          </p>
          <div className="flex items-center gap-4 mt-1">
            {data.semester && (
              <p className="text-xs text-[#9A9898] font-mono">{data.semester}</p>
            )}
            {data.academicYear && (
              <p className="text-xs text-[#9A9898] font-mono">{data.academicYear}</p>
            )}
            <p className="text-xs text-[#9A9898] font-mono">
              Généré le {new Date().toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto border border-[#E5E5E5] dark:border-[#2A2A2A]">
          <table className="w-full border-collapse font-mono">
            <thead>
              <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                <th className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-left w-20 text-[#201D1D] dark:text-[#FDFCFC]">
                  Horaire
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-center text-[#201D1D] dark:text-[#FDFCFC]"
                  >
                    {dayNames[day] || `Jour ${day}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allTimes.map((time) => {
                const [start, end] = time.split("-");
                return (
                  <tr key={time}>
                    <td className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-[10px] text-[#9A9898] whitespace-nowrap">
                      {start} — {end}
                    </td>
                    {days.map((day) => {
                      const slot = slotsByDay[day]?.find(
                        (s) => `${s.startTime}-${s.endTime}` === time
                      );
                      return (
                        <td
                          key={day}
                          className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2"
                        >
                          {slot?.subject ? (
                            <div className="min-h-[40px]">
                              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                                {slot.subject.name}
                              </p>
                              {slot.teacher && (
                                <p className="text-[10px] text-[#646262] dark:text-[#9A9898]">
                                  {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                </p>
                              )}
                              {slot.room && (
                                <p className="text-[10px] text-[#646262] dark:text-[#9A9898]">
                                  {slot.room.name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="min-h-[40px]" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
