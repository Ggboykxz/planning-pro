"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { dayNames } from "@/lib/countries";

interface TimeSlotData {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
  isBreak: boolean;
}

interface AvailabilityEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
  institutionId: string;
  currentUnavailable: Array<{ day: number; startTime: string }>;
  onSave: (unavailable: Array<{ day: number; startTime: string }>) => void;
}

export function AvailabilityEditor({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  institutionId,
  currentUnavailable,
  onSave,
}: AvailabilityEditorProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlotData[]>([]);
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadTimeSlots();
      // Initialize unavailable from current
      const unavailSet = new Set<string>();
      for (const u of currentUnavailable) {
        unavailSet.add(`${u.day}-${u.startTime}`);
      }
      setUnavailable(unavailSet);
    }
  }, [open, currentUnavailable]);

  const loadTimeSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timeslots?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data.filter((s: TimeSlotData) => !s.isBreak));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCell = (dayOfWeek: number, startTime: string) => {
    const key = `${dayOfWeek}-${startTime}`;
    setUnavailable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const unavailArray = Array.from(unavailable).map((key) => {
        const [day, startTime] = key.split("-");
        return { day: parseInt(day), startTime };
      });

      const res = await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: teacherId,
          unavailableSlots: unavailArray,
          institutionId,
        }),
      });

      if (res.ok) {
        toast.success("Disponibilité mise à jour ✓");
        onSave(unavailArray);
        onOpenChange(false);
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Group time slots by day and time
  const days = [...new Set(timeSlots.map((s) => s.dayOfWeek))].sort((a, b) => a - b);
  const times = [...new Set(timeSlots.map((s) => s.startTime))].sort();

  const isUnavailable = (dayOfWeek: number, startTime: string) => {
    return unavailable.has(`${dayOfWeek}-${startTime}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Disponibilité — {teacherName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#9A9898]">Chargement des créneaux...</p>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#9A9898]">Aucun créneau horaire configuré. Configurez d&apos;abord les paramètres de l&apos;établissement.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-[10px] text-[#9A9898]">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A]" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-[#DC2626]/15 dark:bg-[#DC2626]/25 border border-[#DC2626]/40" />
                <span>Indisponible</span>
              </div>
            </div>

            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <th className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-1.5 text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] text-left w-16">
                      Horaire
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-1.5 text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] text-center"
                      >
                        {dayNames[day]?.slice(0, 3) || `J${day}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((time) => {
                    const slot = timeSlots.find((s) => s.startTime === time);
                    const endTime = slot?.endTime || "";
                    return (
                      <tr key={time}>
                        <td className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-1 text-[9px] text-[#9A9898] whitespace-nowrap">
                          {time}-{endTime.slice(0, 5)}
                        </td>
                        {days.map((day) => {
                          const isUnavail = isUnavailable(day, time);
                          return (
                            <td
                              key={day}
                              className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-0"
                            >
                              <button
                                onClick={() => toggleCell(day, time)}
                                className={`w-full h-8 transition-all duration-100 ${
                                  isUnavail
                                    ? "bg-[#DC2626]/15 dark:bg-[#DC2626]/25 hover:bg-[#DC2626]/25 dark:hover:bg-[#DC2626]/35"
                                    : "bg-[#F8F7F7] dark:bg-[#1A1A1A] hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A]"
                                }`}
                                title={isUnavail ? "Cliquez pour marquer disponible" : "Cliquez pour marquer indisponible"}
                              >
                                {isUnavail && (
                                  <span className="text-[8px] text-[#DC2626] font-bold">✕</span>
                                )}
                              </button>
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
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
