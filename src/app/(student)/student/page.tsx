"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  GraduationCap, Printer, Clock, Calendar, Bell,
  Search, Building2, ArrowRight, Loader2, Users, MapPin,
} from "lucide-react";
import { toast } from "sonner";

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

interface SearchInstitution {
  id: string;
  name: string;
  type: string;
  country: string;
  academieYear: string;
}

interface JoinedInstitution {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionType: string;
  institutionCountry: string;
  classId: string | null;
  className: string | null;
  classLevel: string | null;
  studentNumber: string | null;
  joinedAt: string;
}

export default function StudentPortalPage() {
  const { institutionId, currentUser, setInstitutionId, setCurrentUser } = useAppStore();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Institution joining state
  const [hasInstitution, setHasInstitution] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchInstitution[]>([]);
  const [joinedInstitutions, setJoinedInstitutions] = useState<JoinedInstitution[]>([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [studentNumber, setStudentNumber] = useState("");

  // Get current day of week (1=Monday, 7=Sunday)
  const currentDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();

  // Check if student has an institution
  useEffect(() => {
    if (!currentUser?.id) return;
    checkStudentInstitution();
  }, [currentUser?.id]);

  const checkStudentInstitution = async () => {
    try {
      const res = await fetch(`/api/student/institutions`);
      if (res.ok) {
        const data: JoinedInstitution[] = await res.json();
        setJoinedInstitutions(data);
        if (data.length > 0) {
          setHasInstitution(true);
          // If user doesn't have institutionId set, set it from first joined institution
          if (!institutionId && data.length > 0) {
            setInstitutionId(data[0].institutionId);
            // Also update the user in localStorage
            if (currentUser) {
              const updatedUser = { ...currentUser, institutionId: data[0].institutionId };
              setCurrentUser(updatedUser);
              localStorage.setItem("planningpro_user", JSON.stringify(updatedUser));
            }
          }
        } else {
          setHasInstitution(false);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Search institutions
  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      const res = await fetch(`/api/institutions/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Search on mount (empty query = all institutions)
  useEffect(() => {
    if (hasInstitution === false) {
      handleSearch();
    }
  }, [hasInstitution, handleSearch]);

  // Join an institution
  const handleJoin = async (inst: SearchInstitution) => {
    if (!currentUser?.id) return;
    setJoining(inst.id);
    try {
      const res = await fetch("/api/student/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          institutionId: inst.id,
          studentNumber: studentNumber || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Établissement « ${inst.name} » rejoint ✓`);
        setInstitutionId(inst.id);
        // Update user in localStorage
        if (currentUser) {
          const updatedUser = { ...currentUser, institutionId: inst.id };
          setCurrentUser(updatedUser);
          localStorage.setItem("planningpro_user", JSON.stringify(updatedUser));
        }
        setHasInstitution(true);
        // Refresh joined institutions
        await checkStudentInstitution();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la rejoindre");
      }
    } catch {
      toast.error("Erreur lors de la rejoindre");
    } finally {
      setJoining(null);
    }
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!selectedClassId || !hasInstitution) return;
    const interval = setInterval(() => {
      loadTimetable(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedClassId, hasInstitution]);

  useEffect(() => {
    if (!institutionId || !hasInstitution) return;
    loadClasses();
  }, [institutionId, hasInstitution]);

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

  const loadTimetable = async (silent = false) => {
    try {
      const res = await fetch(`/api/timetables?classId=${selectedClassId}`);
      if (res.ok) {
        const data = await res.json();
        setTimetable(data);
        if (silent && data) {
          const prevSlots = timetable?.slots?.length || 0;
          if (data.slots?.length !== prevSlots) {
            toast.info("Emploi du temps mis à jour");
          }
        }
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

  // Get today's courses
  const todaySlots = timetable?.slots?.filter((s) => s.dayOfWeek === currentDayOfWeek) || [];
  const upcomingToday = todaySlots
    .filter((s) => {
      const now = new Date();
      const [h, m] = s.startTime.split(":").map(Number);
      return h * 60 + m >= now.getHours() * 60 + now.getMinutes();
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
          <h1 className="text-2xl font-bold text-[#D97706]">Mon emploi du temps</h1>
          <p className="text-xs text-[#9A9898] mt-1">Chargement...</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <div className="h-8 w-8 border-2 border-[#D97706] border-t-transparent animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ═══ NO INSTITUTION — Show joining flow ═══
  if (hasInstitution === false) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center bg-[#D97706]/10">
            <GraduationCap className="h-4 w-4 text-[#D97706]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Bienvenue, {currentUser?.name || "étudiant"}</h1>
            <p className="text-[10px] text-[#9A9898]">Rejoignez un établissement pour accéder à votre emploi du temps</p>
          </div>
        </div>

        {/* Search section */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
          <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Rechercher un établissement
            </p>
          </div>
          <div className="p-6 space-y-4">
            {/* Student number field */}
            <div>
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] block mb-1">
                Matricule (optionnel)
              </label>
              <Input
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="Ex: 2025-INFO-001"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-[#9A9898] mt-1">
                Votre numéro d&apos;étudiant sera associé à l&apos;établissement
              </p>
            </div>

            {/* Search field */}
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Nom de l'établissement..."
                className="font-mono text-xs flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="text-xs bg-[#D97706] text-white hover:bg-[#B45309] border-0 gap-1 shrink-0"
              >
                {searching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
                Rechercher
              </Button>
            </div>

            {/* Results */}
            {searchResults.length > 0 ? (
              <div className="space-y-0 max-h-96 overflow-y-auto scrollbar-thin">
                {searchResults.map((inst) => {
                  const alreadyJoined = joinedInstitutions.some(
                    (j) => j.institutionId === inst.id
                  );
                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between gap-3 py-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 flex items-center justify-center bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-[#9A9898]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
                            {inst.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#9A9898] font-mono">
                              {inst.type}
                            </span>
                            <span className="text-[10px] text-[#9A9898]">·</span>
                            <span className="text-[10px] text-[#9A9898]">
                              {inst.academieYear}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoin(inst)}
                        disabled={joining === inst.id || alreadyJoined}
                        className={`text-xs gap-1 shrink-0 border-0 ${
                          alreadyJoined
                            ? "bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#9A9898]"
                            : "bg-[#D97706] text-white hover:bg-[#B45309]"
                        }`}
                      >
                        {alreadyJoined ? (
                          "Déjà rejoint"
                        ) : joining === inst.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            En cours...
                          </>
                        ) : (
                          <>
                            Rejoindre
                            <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : !searching && searchQuery ? (
              <div className="py-8 text-center">
                <Building2 className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
                <p className="text-xs text-[#9A9898]">Aucun établissement trouvé</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ═══ HAS INSTITUTION — Show timetable ═══
  return (
    <div className="space-y-6">
      {/* Print title */}
      <div className="hidden print-title">
        <h1>Emploi du temps — {timetable?.class?.name || "Classe"}</h1>
      </div>

      {/* Header - Student Portal Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center bg-[#D97706]/10">
              <GraduationCap className="h-4 w-4 text-[#D97706]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Mon emploi du temps</h1>
              <p className="text-[10px] text-[#9A9898]">
                {dayNames[currentDayOfWeek]} — Semaine en cours
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[200px] text-xs border-[#D97706]/30 focus:ring-0 focus:border-[#D97706]">
              <GraduationCap className="h-3 w-3 mr-1 text-[#D97706]" />
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
            className="text-xs text-[#646262] hover:text-[#D97706]"
          >
            <Printer className="h-3 w-3 mr-1" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Today's Quick View */}
      {upcomingToday.length > 0 && (
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-3.5 w-3.5 text-[#D97706]" />
            <p className="text-xs font-bold text-[#D97706]">Prochains cours aujourd&apos;hui</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcomingToday.slice(0, 3).map((slot) => {
              const slotColor = getSubjectColor(slot.subject?.name || "", document.documentElement.classList.contains("dark"));
              return (
                <div
                  key={slot.id}
                  className="bg-[#FDFCFC] dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#2A2A2A] p-3"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-[#9A9898]" />
                    <span className="text-[10px] text-[#9A9898] font-mono">
                      {slot.startTime} — {slot.endTime}
                    </span>
                  </div>
                  <p className="text-xs font-bold" style={{ color: slotColor.text }}>
                    {slot.subject?.name || "—"}
                  </p>
                  {slot.teacher && (
                    <p className="text-[10px] text-[#9A9898] mt-0.5">
                      {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                    </p>
                  )}
                  {slot.room && (
                    <p className="text-[10px] text-[#9A9898]">
                      Salle {slot.room.name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No class selected */}
      {classes.length === 0 ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <GraduationCap className="h-8 w-8 text-[#9A9898] mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">Aucune classe disponible</p>
          <p className="text-xs text-[#9A9898] mt-1">Les classes seront affichées ici une fois créées par l&apos;administration</p>
        </div>
      ) : !timetable ? (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-16 text-center">
          <Calendar className="h-8 w-8 text-[#9A9898] mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">Aucun emploi du temps</p>
          <p className="text-xs text-[#9A9898] mt-1">L&apos;emploi du temps de cette classe n&apos;a pas encore été généré</p>
        </div>
      ) : (
        <div className="space-y-4" ref={printRef}>
          {/* Class name */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-[#D97706]" />
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {timetable.name} — {timetable.class.name}
            </p>
          </div>

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
                        day === currentDayOfWeek ? "bg-[#D97706]/5" : ""
                      }`}
                    >
                      <span className={day === currentDayOfWeek ? "underline decoration-[#D97706]" : ""}>
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
                              } ${isCurrentDay ? "bg-[#D97706]/[0.02]" : ""}`}
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
                            } ${isCurrentDay ? "bg-[#D97706]/[0.02]" : ""}`}
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

          {/* Auto-refresh notice */}
          <p className="text-[9px] text-[#9A9898] text-center font-mono">
            Données mises à jour automatiquement toutes les 60 secondes
          </p>
        </div>
      )}
    </div>
  );
}
