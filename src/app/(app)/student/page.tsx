"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { dayNames } from "@/lib/countries";
import { getSubjectColor } from "@/lib/subject-colors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GraduationCap, Printer, Clock } from "lucide-react";

interface ClassData {
  id: string;
  name: string;
}

interface TimetableSlotData {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string; code: string | null; type: string | null } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  room: { id: string; name: string; type: string | null } | null;
}

interface TimetableData {
  id: string;
  name: string;
  slots: TimetableSlotData[];
  class: { id: string; name: string };
}

export default function StudentPortalPage() {
  const { institutionId } = useAppStore();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Get current day of week (1=Monday, 7=Sunday)
  const currentDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();

  useEffect(() => {
    if (!institutionId) return;
    loadClasses();
  }, [institutionId]);

  const loadClasses = async () => {
    try {
      const res = await fetch(`/api/classes?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClassId) return;
    loadTimetable();
  }, [selectedClassId]);

  const loadTimetable = async () => {
    try {
      const res = await fetch(`/api/timetables?classId=${selectedClassId}`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
      } else {
        setTimetable(null);
      }
    } catch {
      setTimetable(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group slots by day
  const slotsByDay: Record<number, TimetableSlotData[]> = {};
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
      slotsByDay[slot.dayOfWeek].push(slot);
    }
  }

  const days = Object.keys(slotsByDay).map(Number).sort((a, b) => a - b);
  const allTimes = timetable?.slots
    ? [...new Set(timetable.slots.map((s) => `${s.startTime}-${s.endTime}`))].sort()
    : [];

  const isBreakTime = (startTime: string) => {
    const hour = parseInt(startTime.split(":")[0]);
    return hour >= 12 && hour < 14;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Portail étudiant</h1>
          <p className="text-xs text-[#9A9898] mt-1">Chargement...</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <div className="h-8 w-8 border-2 border-[#201D1D] dark:border-[#FDFCFC] border-t-transparent animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print title */}
      <div className="hidden print-title">
        <h1>Emploi du temps — {timetable?.class?.name || "Classe"}</h1>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
            <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Portail étudiant</h1>
          </div>
          <p className="text-xs text-[#9A9898] mt-1">
            Consultez votre emploi du temps
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[200px] text-xs">
              <GraduationCap className="h-3 w-3 mr-1 text-[#9A9898]" />
              <SelectValue placeholder="Choisir une classe" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={handlePrint}
            disabled={!timetable}
            className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
          >
            <Printer className="h-3 w-3 mr-1" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* No class selected */}
      {classes.length === 0 ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <GraduationCap className="h-8 w-8 text-[#9A9898] mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">Aucune classe disponible</p>
          <p className="text-xs text-[#9A9898] mt-1">Les classes seront affichées ici une fois créées</p>
        </div>
      ) : !timetable ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <Clock className="h-8 w-8 text-[#9A9898] mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">Aucun emploi du temps</p>
          <p className="text-xs text-[#9A9898] mt-1">L&apos;emploi du temps de cette classe n&apos;a pas encore été généré</p>
        </div>
      ) : (
        <div className="space-y-4" ref={printRef}>
          {/* Class name */}
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
            {timetable.name} — {timetable.class.name}
          </p>

          {/* Timetable Grid (read-only) */}
          <div className="overflow-x-auto border border-[#E5E5E5] dark:border-[#2A2A2A] timetable-grid">
            <table className="w-full border-collapse min-w-[700px]" style={{ fontSize: "12px" }}>
              <thead>
                <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                  <th className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-left w-24 text-[#201D1D] dark:text-[#FDFCFC]">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Horaire
                    </div>
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-center text-[#201D1D] dark:text-[#FDFCFC] ${
                        day === currentDayOfWeek ? "bg-[#201D1D]/5 dark:bg-[#FDFCFC]/5" : ""
                      }`}
                    >
                      <span className={day === currentDayOfWeek ? "underline" : ""}>
                        {dayNames[day] || `Jour ${day}`}
                      </span>
                      {day === currentDayOfWeek && (
                        <span className="text-[8px] text-[#D97706] ml-1">•</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimes.map((time) => {
                  const [start, end] = time.split("-");
                  const isBreak = isBreakTime(start);
                  return (
                    <tr key={time} className={isBreak ? "break-row" : ""}>
                      <td className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-[10px] text-[#9A9898] whitespace-nowrap ${isBreak ? "bg-[#F8F7F7]/50 dark:bg-[#1A1A1A]/50" : ""}`}>
                        <div className="flex items-center gap-1">
                          {start} — {end}
                          {isBreak && <span className="text-[8px] font-bold text-[#D97706] ml-1">PAUSE</span>}
                        </div>
                      </td>
                      {days.map((day) => {
                        const slot = slotsByDay[day]?.find(
                          (s) => `${s.startTime}-${s.endTime}` === time
                        );
                        const isCurrentDay = day === currentDayOfWeek;
                        if (!slot || !slot.subject) {
                          return (
                            <td
                              key={day}
                              className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 ${
                                isBreak ? "break-row" : ""
                              } ${isCurrentDay ? "bg-[#201D1D]/[0.02] dark:bg-[#FDFCFC]/[0.02]" : ""}`}
                            >
                              <div className="h-full min-h-[50px]" />
                            </td>
                          );
                        }
                        const slotColor = getSubjectColor(slot.subject.name, document.documentElement.classList.contains("dark"));
                        return (
                          <td
                            key={day}
                            className={`border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 ${
                              isBreak ? "break-row" : ""
                            } ${isCurrentDay ? "bg-[#201D1D]/[0.02] dark:bg-[#FDFCFC]/[0.02]" : ""}`}
                          >
                            <div
                              style={{
                                backgroundColor: slotColor.bg,
                                borderLeftColor: slotColor.text,
                                color: slotColor.text,
                              }}
                              className="border-l-[3px] p-2 min-h-[50px]"
                            >
                              <p className="text-xs font-bold truncate">
                                {slot.subject.name}
                              </p>
                              {slot.subject.type && (
                                <span className="text-[9px] opacity-70 uppercase">
                                  {slot.subject.type}
                                </span>
                              )}
                              <div className="mt-1">
                                {slot.teacher && (
                                  <p className="text-[10px] opacity-70 truncate">
                                    {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                  </p>
                                )}
                                {slot.room && (
                                  <p className="text-[10px] opacity-70 truncate">
                                    {slot.room.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subject color legend */}
          {timetable.slots.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {(() => {
                const seenSubjects = new Map<string, string>();
                for (const slot of timetable.slots) {
                  if (slot.subject && !seenSubjects.has(slot.subject.id)) {
                    seenSubjects.set(slot.subject.id, slot.subject.name);
                  }
                }
                return Array.from(seenSubjects.entries()).map(([id, name]) => {
                  const subjectColor = getSubjectColor(name, document.documentElement.classList.contains("dark"));
                  return (
                    <div key={id} className="flex items-center gap-1.5">
                      <div
                        className="h-3 w-3 border-l-[3px]"
                        style={{ backgroundColor: subjectColor.bg, borderLeftColor: subjectColor.text }}
                      />
                      <span className="text-[10px] text-[#646262]">{name}</span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
