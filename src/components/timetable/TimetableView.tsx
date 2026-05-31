"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Sparkles, Printer, AlertTriangle } from "lucide-react";
import { dayNames, subjectColors } from "@/lib/countries";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

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

interface TimetableViewProps {
  institutionId: string;
}

export function TimetableView({ institutionId }: TimetableViewProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { setSelectedClassId: setStoreClassId } = useAppStore();

  useEffect(() => {
    loadClasses();
  }, [institutionId]);

  useEffect(() => {
    if (selectedClassId) {
      loadTimetable();
    }
  }, [selectedClassId]);

  const loadClasses = async () => {
    try {
      const res = await fetch(`/api/classes?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadTimetable = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

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
        toast.success("Emploi du temps généré avec succès !");
        setTimetable(data);
      } else {
        toast.error(data.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur lors de la génération");
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
  const subjectColorMap = new Map<string, string>();
  let colorIndex = 0;
  if (timetable?.slots) {
    for (const slot of timetable.slots) {
      if (slot.subject && !subjectColorMap.has(slot.subject.id)) {
        subjectColorMap.set(slot.subject.id, subjectColors[colorIndex % subjectColors.length]);
        colorIndex++;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Emploi du temps</h1>
          <p className="text-muted-foreground">
            Consultez et générez les emplois du temps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setStoreClassId(v); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choisir une classe" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedClassId}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? "Génération..." : "Générer"}
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!timetable}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucune classe configurée</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Créez d&apos;abord des classes dans la section Classes
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="animate-pulse text-muted-foreground">
              Chargement de l&apos;emploi du temps...
            </div>
          </CardContent>
        </Card>
      ) : !timetable ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium">Aucun emploi du temps</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cliquez sur &quot;Générer&quot; pour créer automatiquement l&apos;emploi du temps de cette classe
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="print:shadow-none print:border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {timetable.name} — {timetable.class.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted text-sm font-medium text-left w-24">
                      Horaire
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="border p-2 bg-muted text-sm font-medium text-center"
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
                        <td className="border p-2 text-xs text-muted-foreground whitespace-nowrap">
                          {start} - {end}
                        </td>
                        {days.map((day) => {
                          const slot = slotsByDay[day]?.find(
                            (s) => `${s.startTime}-${s.endTime}` === time
                          );
                          if (!slot || !slot.subject) {
                            return (
                              <td key={day} className="border p-1">
                                <div className="h-full min-h-[60px]" />
                              </td>
                            );
                          }
                          const color = subjectColorMap.get(slot.subject.id) || "#10b981";
                          return (
                            <td key={day} className="border p-1">
                              <div
                                className="rounded-lg p-2 text-white text-xs min-h-[60px] flex flex-col justify-between"
                                style={{ backgroundColor: color }}
                              >
                                <div>
                                  <p className="font-semibold truncate">
                                    {slot.subject.name}
                                  </p>
                                  {slot.subject.type && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4 mt-0.5 bg-white/20 text-white border-0"
                                    >
                                      {slot.subject.type.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-1 opacity-90">
                                  {slot.teacher && (
                                    <p className="truncate">
                                      {slot.teacher.firstName} {slot.teacher.lastName}
                                    </p>
                                  )}
                                  {slot.room && (
                                    <p className="truncate">
                                      📍 {slot.room.name}
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
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                {Array.from(subjectColorMap.entries()).map(([subjectId, color]) => {
                  const slot = timetable.slots.find(
                    (s) => s.subject?.id === subjectId
                  );
                  return (
                    <div key={subjectId} className="flex items-center gap-1.5">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs">{slot?.subject?.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
