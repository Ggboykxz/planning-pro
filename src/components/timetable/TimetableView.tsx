"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Printer, AlertTriangle } from "lucide-react";
import { dayNames } from "@/lib/countries";
import { useAppStore, type TimetableViewMode } from "@/lib/store";
import { ContextBar } from "@/components/layout/ContextBar";
import { ConflictPanel } from "./ConflictPanel";
import { toast } from "sonner";

// Subject color palette - subtle tints with colored left border
const subjectColorPalette = [
  { border: "border-l-emerald-500", bg: "bg-emerald-50/50 dark:bg-emerald-950/20" },
  { border: "border-l-amber-500", bg: "bg-amber-50/50 dark:bg-amber-950/20" },
  { border: "border-l-rose-500", bg: "bg-rose-50/50 dark:bg-rose-950/20" },
  { border: "border-l-violet-500", bg: "bg-violet-50/50 dark:bg-violet-950/20" },
  { border: "border-l-cyan-500", bg: "bg-cyan-50/50 dark:bg-cyan-950/20" },
  { border: "border-l-orange-500", bg: "bg-orange-50/50 dark:bg-orange-950/20" },
  { border: "border-l-teal-500", bg: "bg-teal-50/50 dark:bg-teal-950/20" },
  { border: "border-l-pink-500", bg: "bg-pink-50/50 dark:bg-pink-950/20" },
  { border: "border-l-indigo-500", bg: "bg-indigo-50/50 dark:bg-indigo-950/20" },
  { border: "border-l-lime-500", bg: "bg-lime-50/50 dark:bg-lime-950/20" },
];

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

interface ClassData {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface RoomOption {
  id: string;
  name: string;
}

interface ConflictData {
  teacherConflicts: Array<{ teacherName: string; dayOfWeek: number; time: string; classes: string[] }>;
  roomConflicts: Array<{ roomName: string; dayOfWeek: number; time: string; classes: string[] }>;
}

interface TimetableViewProps {
  institutionId: string;
}

export function TimetableView({ institutionId }: TimetableViewProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictData | null>(null);

  const {
    timetableViewMode,
    setTimetableViewMode,
    selectedClassId,
    setSelectedClassId,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedRoomId,
    setSelectedRoomId,
  } = useAppStore();

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const loadData = async () => {
    try {
      const [cRes, tRes, rRes] = await Promise.all([
        fetch(`/api/classes?institutionId=${institutionId}`),
        fetch(`/api/teachers?institutionId=${institutionId}`),
        fetch(`/api/rooms?institutionId=${institutionId}`),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(cData);
        if (cData.length > 0 && !selectedClassId) {
          setSelectedClassId(cData[0].id);
        }
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeachers(tData.map((t: TeacherOption) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName })));
        if (tData.length > 0 && !selectedTeacherId) {
          setSelectedTeacherId(tData[0].id);
        }
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRooms(rData.map((r: RoomOption) => ({ id: r.id, name: r.name })));
        if (rData.length > 0 && !selectedRoomId) {
          setSelectedRoomId(rData[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Load timetable based on view mode
  useEffect(() => {
    if (timetableViewMode === "class" && selectedClassId) {
      loadTimetable();
    } else if (timetableViewMode === "teacher" && selectedTeacherId) {
      loadTimetable();
    } else if (timetableViewMode === "room" && selectedRoomId) {
      loadTimetable();
    }
  }, [timetableViewMode, selectedClassId, selectedTeacherId, selectedRoomId]);

  // Load conflicts
  useEffect(() => {
    loadConflicts();
  }, [institutionId]);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/timetables?";
      if (timetableViewMode === "class" && selectedClassId) {
        url += `classId=${selectedClassId}`;
      } else if (timetableViewMode === "teacher" && selectedTeacherId) {
        url += `teacherId=${selectedTeacherId}`;
      } else if (timetableViewMode === "room" && selectedRoomId) {
        url += `roomId=${selectedRoomId}`;
      } else {
        setLoading(false);
        return;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
      } else {
        setTimetable(null);
      }
    } catch {
      setTimetable(null);
    } finally {
      setLoading(false);
    }
  }, [timetableViewMode, selectedClassId, selectedTeacherId, selectedRoomId]);

  const loadConflicts = async () => {
    try {
      const res = await fetch(`/api/dashboard?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setConflicts({
          teacherConflicts: data.teacherConflicts || [],
          roomConflicts: data.roomConflicts || [],
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClassId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, classId: selectedClassId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Emploi du temps genere avec succes !");
        setTimetable(data);
        loadConflicts();
      } else {
        toast.error(data.error || "Erreur lors de la generation");
      }
    } catch {
      toast.error("Erreur lors de la generation");
    } finally {
      setGenerating(false);
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

  // Get unique days and time slots
  const days = Object.keys(slotsByDay)
    .map(Number)
    .sort((a, b) => a - b);
  const allTimes = timetable?.slots
    ? [...new Set(timetable.slots.map((s) => `${s.startTime}-${s.endTime}`))].sort()
    : [];

  // Color assignment for subjects
  const subjectColorMap = new Map<string, number>();
  let colorIndex = 0;
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (slot.subject && !subjectColorMap.has(slot.subject.id)) {
        subjectColorMap.set(slot.subject.id, colorIndex % subjectColorPalette.length);
        colorIndex++;
      }
    }
  }

  const viewModeTabs = [
    { id: "class", label: "Par classe" },
    { id: "teacher", label: "Par enseignant" },
    { id: "room", label: "Par salle" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Emploi du temps</h1>
          <p className="text-xs text-[#9A9898] mt-1">
            Consultez et genez les emplois du temps
          </p>
        </div>
        <div className="flex items-center gap-2">
          {timetableViewMode === "class" && (
            <Select value={selectedClassId || ""} onValueChange={(v) => setSelectedClassId(v)}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {timetableViewMode === "teacher" && (
            <Select value={selectedTeacherId || ""} onValueChange={(v) => setSelectedTeacherId(v)}>
              <SelectTrigger className="w-[200px] text-xs">
                <SelectValue placeholder="Choisir un enseignant" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {timetableViewMode === "room" && (
            <Select value={selectedRoomId || ""} onValueChange={(v) => setSelectedRoomId(v)}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Choisir une salle" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {timetableViewMode === "class" && (
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedClassId}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {generating ? "Generation..." : "Generer"}
            </Button>
          )}
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

      {/* View mode tabs */}
      <ContextBar
        items={viewModeTabs}
        activeId={timetableViewMode}
        onSelect={(id) => setTimetableViewMode(id as TimetableViewMode)}
      />

      {/* Content */}
      {classes.length === 0 && timetableViewMode === "class" ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <p className="text-xs text-[#9A9898]">Aucune classe configuree. Creez d&apos;abord des classes.</p>
        </div>
      ) : loading ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <p className="text-xs text-[#9A9898]">Chargement...</p>
        </div>
      ) : !timetable ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[#D97706] mx-auto mb-3" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">Aucun emploi du temps</p>
          <p className="text-xs text-[#9A9898] mt-1">
            Cliquez sur &quot;Generer&quot; pour creer automatiquement l&apos;emploi du temps
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timetable title */}
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
            {timetable.name} — {timetable.class.name}
          </p>

          {/* Timetable Grid */}
          <div className="overflow-x-auto border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                  <th className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-2 text-xs font-bold text-left w-24 text-[#201D1D] dark:text-[#FDFCFC]">
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
                        if (!slot || !slot.subject) {
                          return (
                            <td key={day} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-1">
                              <div className="h-full min-h-[60px]" />
                            </td>
                          );
                        }
                        const colorIdx = subjectColorMap.get(slot.subject.id) || 0;
                        const color = subjectColorPalette[colorIdx];
                        return (
                          <td key={day} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-1">
                            <div className={`border-l-[3px] ${color.border} ${color.bg} p-2 min-h-[60px]`}>
                              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
                                {slot.subject.name}
                              </p>
                              {slot.subject.type && (
                                <span className="text-[9px] text-[#9A9898] uppercase">
                                  {slot.subject.type}
                                </span>
                              )}
                              <div className="mt-1">
                                {slot.teacher && (
                                  <p className="text-[10px] text-[#646262] dark:text-[#9A9898] truncate">
                                    {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                  </p>
                                )}
                                {slot.room && (
                                  <p className="text-[10px] text-[#646262] dark:text-[#9A9898] truncate">
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

          {/* Legend */}
          {subjectColorMap.size > 0 && (
            <div className="flex flex-wrap gap-4 pt-2">
              {Array.from(subjectColorMap.entries()).map(([subjectId, colorIdx]) => {
                const slot = timetable.slots.find((s) => s.subject?.id === subjectId);
                const color = subjectColorPalette[colorIdx];
                return (
                  <div key={subjectId} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 border-l-[3px] ${color.border} ${color.bg}`} />
                    <span className="text-[10px] text-[#646262]">{slot?.subject?.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Conflict Panel */}
          {conflicts && (
            <ConflictPanel
              teacherConflicts={conflicts.teacherConflicts}
              roomConflicts={conflicts.roomConflicts}
            />
          )}
        </div>
      )}
    </div>
  );
}
