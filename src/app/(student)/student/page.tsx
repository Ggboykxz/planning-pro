"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { dayNames } from "@/lib/countries";
import { getSubjectColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Printer, Clock, Calendar, Bell,
  Search, Building2, ArrowRight, Loader2, Users, MapPin,
  ChevronLeft, ChevronRight, BookOpen, Landmark, School,
  Castle, Library, User, Hash, RefreshCw, type LucideIcon,
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

// Subject type badge configuration
const subjectTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
  cours: { label: "Cours", color: "text-[#D97706]", bg: "bg-[#D97706]/10 border-[#D97706]/30" },
  td: { label: "TD", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  tp: { label: "TP", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
  projet: { label: "Projet", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
};

// Get institution type icon
function getInstitutionTypeIcon(type: string): LucideIcon {
  switch (type) {
    case "universite": return Landmark;
    case "lycee": return School;
    case "college": return Castle;
    case "ecole_primaire": return Library;
    default: return Building2;
  }
}

// Get week dates from a reference date
function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(referenceDate);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Format date in French
function formatDateFR(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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

  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentWeekDate] = useState(() => new Date());

  // Auto-refresh state
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Active tab for the view
  const [activeTab, setActiveTab] = useState("timetable");

  // Mobile day view
  const [mobileDay, setMobileDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d; // 1=Monday, 7=Sunday
  });

  // Swipe state for mobile
  const touchStartX = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Compute the current reference date based on week offset
  const referenceDate = new Date(currentWeekDate);
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(referenceDate);

  // Get current day of week (1=Monday, 7=Sunday)
  const currentDayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const isCurrentWeek = weekOffset === 0;

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
          if (!institutionId && data.length > 0) {
            setInstitutionId(data[0].institutionId);
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
    } catch {
      // Silently fail - hasInstitution stays null = loading state
    }
  };

  // Search institutions with debounce
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (query?: string) => {
    setSearching(true);
    try {
      const q = query ?? searchQuery;
      const res = await fetch(`/api/institutions/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // Silently fail - search results will be empty
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Debounced search as user types
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  }, [handleSearch]);

  // Search on mount (empty query = all institutions)
  useEffect(() => {
    if (hasInstitution === false) {
      handleSearch();
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
        toast.success(`Établissement « ${inst.name} » rejoint ✓`);
        setInstitutionId(inst.id);
        if (currentUser) {
          const updatedUser = { ...currentUser, institutionId: inst.id };
          setCurrentUser(updatedUser);
          localStorage.setItem("planningpro_user", JSON.stringify(updatedUser));
        }
        setHasInstitution(true);
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
        if (Array.isArray(data)) {
          setClasses(data);
          if (data.length > 0) {
            setSelectedClassId(data[0].id);
          }
        }
      }
    } catch {
      // Silently fail - classes will be empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClassId) return;
    loadTimetable();
  }, [selectedClassId]);

  const loadTimetable = async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/timetables?classId=${selectedClassId}`);
      if (res.ok) {
        const data = await res.json();
        if (silent && timetable) {
          const prevSlots = timetable?.slots?.length || 0;
          if (data?.slots?.length !== prevSlots) {
            toast.info("Emploi du temps mis à jour", {
              description: "Des modifications ont été détectées",
            });
          }
        }
        setTimetable(data);
        setLastRefresh(new Date());
      } else {
        setTimetable(null);
      }
    } catch {
      setTimetable(null);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Week navigation
  const goToPreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const goToNextWeek = () => setWeekOffset((prev) => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  // Mobile swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      if (diff > 0) {
        // Swipe right - previous day
        setMobileDay((prev) => Math.max(1, prev - 1));
      } else {
        // Swipe left - next day
        setMobileDay((prev) => Math.min(6, prev + 1)); // Max Friday (6) for typical schedule
      }
    }
    touchStartX.current = null;
  }, []);

  // Get today's courses
  const todaySlots = timetable?.slots?.filter((s) => s.dayOfWeek === currentDayOfWeek) || [];
  const upcomingToday = todaySlots
    .filter((s) => {
      if (!isCurrentWeek) return false;
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

  // Group slots for "My Courses" summary
  const courseSummary = useCallback(() => {
    if (!timetable?.slots) return { cours: [], td: [], tp: [], autre: [] };
    const grouped: Record<string, { subject: string; subjectCode: string | null; type: string; teacher: string; hoursPerWeek: number }[]> = {
      cours: [],
      td: [],
      tp: [],
      autre: [],
    };

    const subjectMap = new Map<string, { subject: string; subjectCode: string | null; type: string; teacher: string; totalMinutes: number }>();

    for (const slot of timetable.slots) {
      if (!slot.subject) continue;
      const key = `${slot.subject.id}-${slot.subject.type || "autre"}`;
      const existing = subjectMap.get(key);
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      const duration = (endH * 60 + endM) - (startH * 60 + startM);

      if (existing) {
        existing.totalMinutes += duration;
      } else {
        subjectMap.set(key, {
          subject: slot.subject.name,
          subjectCode: slot.subject.code,
          type: slot.subject.type || "autre",
          teacher: slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : "—",
          totalMinutes: duration,
        });
      }
    }

    for (const [, value] of subjectMap) {
      const type = value.type === "cours" ? "cours" : value.type === "td" ? "td" : value.type === "tp" ? "tp" : "autre";
      grouped[type].push({
        subject: value.subject,
        subjectCode: value.subjectCode,
        type: value.type,
        teacher: value.teacher,
        hoursPerWeek: value.totalMinutes / 60,
      });
    }

    return grouped;
  }, [timetable]);

  const days = Object.keys(slotsByDay).map(Number).sort((a, b) => a - b);
  const allTimes = timetable?.slots
    ? [...new Set(timetable.slots.map((s) => `${s.startTime}-${s.endTime}`))].sort()
    : [];

  const isBreakTime = (startTime: string) => {
    const hour = parseInt(startTime.split(":")[0]);
    return hour >= 12 && hour < 14;
  };

  // Get current institution info
  const currentJoinedInst = joinedInstitutions.find((j) => j.institutionId === institutionId);

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
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Welcome header */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 flex items-center justify-center bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] font-bold text-lg font-mono">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Bienvenue, {currentUser?.name || "étudiant"}
            </h1>
            <p className="text-xs text-[#9A9898] mt-1">
              Rejoignez un établissement pour accéder à votre emploi du temps
            </p>
          </div>
        </div>

        {/* Empty state illustration */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-8 text-center bg-[#F8F7F7] dark:bg-[#1A1A1A]">
          <div className="h-20 w-20 mx-auto mb-4 border-2 border-[#9A9898] flex items-center justify-center">
            <Building2 className="h-10 w-10 text-[#9A9898] opacity-40" />
          </div>
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
            Aucun établissement rejoint
          </p>
          <p className="text-xs text-[#9A9898] mt-1 max-w-sm mx-auto">
            Recherchez votre université ou école ci-dessous pour accéder à votre emploi du temps
          </p>
        </div>

        {/* Search section */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
          <div className="p-4 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Rechercher un établissement
            </p>
          </div>
          <div className="p-6 space-y-5">
            {/* Student number field */}
            <div>
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] block mb-1.5">
                Matricule (optionnel)
              </label>
              <Input
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="Ex: 2025-INFO-001"
                className="font-mono text-sm h-10 rounded-none border-[#E5E5E5] dark:border-[#2A2A2A]"
              />
              <p className="text-[10px] text-[#9A9898] mt-1">
                Votre numéro d&apos;étudiant sera associé à l&apos;établissement
              </p>
            </div>

            {/* Search field — larger */}
            <div>
              <label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] block mb-1.5">
                Nom de l&apos;établissement
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9898]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Université Cheikh Anta Diop..."
                    className="font-mono text-sm h-11 pl-10 rounded-none border-[#E5E5E5] dark:border-[#2A2A2A]"
                  />
                </div>
                <Button
                  onClick={() => handleSearch()}
                  disabled={searching}
                  className="text-xs bg-[#D97706] text-white hover:bg-[#B45309] border-0 gap-1 shrink-0 h-11 px-5 rounded-none"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Rechercher</span>
                </Button>
              </div>
              {/* Search suggestions hint */}
              {searchQuery.length > 0 && searchQuery.length < 3 && (
                <p className="text-[10px] text-[#9A9898] mt-1">
                  Tapez au moins 3 caractères pour affiner la recherche
                </p>
              )}
            </div>

            {/* Results */}
            {searchResults.length > 0 ? (
              <div className="space-y-0 max-h-96 overflow-y-auto scrollbar-thin border border-[#E5E5E5] dark:border-[#2A2A2A]">
                {searchResults.map((inst) => {
                  const alreadyJoined = joinedInstitutions.some(
                    (j) => j.institutionId === inst.id
                  );
                  const InstIcon = getInstitutionTypeIcon(inst.type);
                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between gap-3 py-3 px-4 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 flex items-center justify-center bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
                          <InstIcon className="h-4 w-4 text-[#9A9898]" />
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
                        className={`text-xs gap-1 shrink-0 border-0 h-9 rounded-none ${
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
            ) : !searching && searchQuery.length >= 3 ? (
              <div className="py-8 text-center">
                <Building2 className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
                <p className="text-xs text-[#9A9898]">Aucun établissement trouvé pour « {searchQuery} »</p>
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

      {/* Header — Student Portal Style with Profile */}
      <div className="flex flex-col gap-4">
        {/* Profile & Welcome section */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] font-bold text-base font-mono">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Bonjour, {currentUser?.name?.split(" ")[0] || "étudiant"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {currentJoinedInst?.studentNumber && (
                <span className="flex items-center gap-1 text-[10px] text-[#9A9898] font-mono">
                  <Hash className="h-3 w-3" />
                  {currentJoinedInst.studentNumber}
                </span>
              )}
              {currentJoinedInst && (
                <span className="flex items-center gap-1 text-[10px] text-[#9A9898]">
                  {(() => {
                    const InstIcon = getInstitutionTypeIcon(currentJoinedInst.institutionType);
                    return <InstIcon className="h-3 w-3" />;
                  })()}
                  {currentJoinedInst.institutionName}
                </span>
              )}
              {currentJoinedInst?.className && (
                <span className="flex items-center gap-1 text-[10px] text-[#9A9898]">
                  <GraduationCap className="h-3 w-3" />
                  {currentJoinedInst.className}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Class selector + Print + Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[200px] text-xs border-[#D97706]/30 focus:ring-0 focus:border-[#D97706] h-9 rounded-none">
                <GraduationCap className="h-3 w-3 mr-1 text-[#D97706]" />
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Auto-refresh indicator */}
            <div className="flex items-center gap-1 text-[9px] text-[#9A9898] font-mono">
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              {lastRefresh ? (
                <span>Mis à jour {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              ) : (
                <span>Auto-rafraîchissement</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button
              variant="ghost"
              onClick={handlePrint}
              disabled={!timetable}
              className="text-xs text-[#646262] hover:text-[#D97706] rounded-none"
            >
              <Printer className="h-3 w-3 mr-1" />
              Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Today's Quick View */}
      {upcomingToday.length > 0 && isCurrentWeek && (
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-3.5 w-3.5 text-[#D97706]" />
            <p className="text-xs font-bold text-[#D97706]">Prochains cours aujourd&apos;hui</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcomingToday.slice(0, 3).map((slot) => {
              const slotColor = getSubjectColor(slot.subject?.name || "", document.documentElement.classList.contains("dark"));
              const typeConf = slot.subject?.type ? subjectTypeConfig[slot.subject.type] : null;
              return (
                <div
                  key={slot.id}
                  className="bg-[#FDFCFC] dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#2A2A2A] p-3"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="h-3 w-3 text-[#9A9898]" />
                    <span className="text-[10px] text-[#9A9898] font-mono">
                      {slot.startTime} — {slot.endTime}
                    </span>
                    {typeConf && (
                      <span className={cn("text-[8px] font-mono px-1 py-0.5 border", typeConf.bg, typeConf.color)}>
                        {typeConf.label}
                      </span>
                    )}
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
                    <p className="text-[10px] text-[#9A9898] flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
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

          {/* Tabs: Timetable / My Courses */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] h-9 p-0.5 rounded-none">
              <TabsTrigger
                value="timetable"
                className="text-xs font-mono rounded-none data-[state=active]:bg-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-none h-8 px-3"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Emploi du temps
              </TabsTrigger>
              <TabsTrigger
                value="courses"
                className="text-xs font-mono rounded-none data-[state=active]:bg-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-none h-8 px-3"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Mes matières
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timetable" className="mt-4 space-y-4">
              {/* Week Navigation */}
              <div className="flex items-center justify-between border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] no-print">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousWeek}
                    className="h-8 w-8 p-0 rounded-none text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center min-w-[160px]">
                    <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
                      {formatDateShort(weekDates[0])} — {formatDateShort(weekDates[4])}
                    </p>
                    <p className="text-[10px] text-[#9A9898]">
                      {isCurrentWeek ? "Semaine actuelle" : `Semaine ${weekOffset > 0 ? "+" : ""}${weekOffset}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextWeek}
                    className="h-8 w-8 p-0 rounded-none text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {!isCurrentWeek && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="text-[10px] font-mono h-7 gap-1 border-[#D97706]/30 text-[#D97706] hover:bg-[#D97706]/5 rounded-none"
                  >
                    <Calendar className="h-3 w-3" />
                    Aujourd&apos;hui
                  </Button>
                )}
              </div>

              {/* Mobile day selector */}
              {isMobile && (
                <div
                  className="flex gap-1 overflow-x-auto no-print scrollbar-none"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => setMobileDay(day)}
                      className={cn(
                        "flex-1 min-w-[56px] py-2 px-1 text-center text-[10px] font-mono transition-colors border",
                        mobileDay === day
                          ? "bg-[#D97706] text-white border-[#D97706]"
                          : "bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#9A9898] border-[#E5E5E5] dark:border-[#2A2A2A]",
                        isCurrentWeek && day === currentDayOfWeek && mobileDay !== day && "bg-[#D97706]/10 border-[#D97706]/30"
                      )}
                    >
                      <div className="font-bold">{dayNames[day]?.slice(0, 3)}</div>
                      <div className="text-[9px] mt-0.5">
                        {isCurrentWeek ? weekDates[day - 1]?.getDate() : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Timetable Grid */}
              {isMobile ? (
                /* Mobile: Single day view */
                <div className="space-y-2">
                  {(slotsByDay[mobileDay] || [])
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((slot) => {
                      const slotColor = getSubjectColor(slot.subject?.name || "", document.documentElement.classList.contains("dark"));
                      const typeConf = slot.subject?.type ? subjectTypeConfig[slot.subject.type] : null;
                      return (
                        <div
                          key={slot.id}
                          className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4"
                          style={{
                            borderRadius: 0,
                            borderLeftWidth: "4px",
                            borderLeftColor: slotColor.text,
                            backgroundColor: slotColor.bg,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-[#9A9898]" />
                              <span className="text-[10px] text-[#9A9898] font-mono">
                                {slot.startTime} — {slot.endTime}
                              </span>
                            </div>
                            {typeConf && (
                              <span className={cn("text-[8px] font-mono px-1.5 py-0.5 border", typeConf.bg, typeConf.color)}>
                                {typeConf.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold" style={{ color: slotColor.text }}>
                            {slot.subject?.name || "—"}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {slot.teacher && (
                              <span className="flex items-center gap-1 text-[10px] text-[#9A9898]">
                                <User className="h-2.5 w-2.5" />
                                {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                              </span>
                            )}
                            {slot.room && (
                              <span className="flex items-center gap-1 text-[10px] text-[#9A9898]">
                                <MapPin className="h-2.5 w-2.5" />
                                Salle {slot.room.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {(!slotsByDay[mobileDay] || slotsByDay[mobileDay].length === 0) && (
                    <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-8 text-center">
                      <Calendar className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
                      <p className="text-xs text-[#9A9898]">Aucun cours ce jour</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop: Full timetable grid */
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
                              isCurrentWeek && day === currentDayOfWeek ? "bg-[#D97706]/5" : ""
                            }`}
                          >
                            <div>
                              <span className={isCurrentWeek && day === currentDayOfWeek ? "underline decoration-[#D97706]" : ""}>
                                {dayNames[day] || `Jour ${day}`}
                              </span>
                              {isCurrentWeek && day === currentDayOfWeek && (
                                <span className="text-[8px] text-[#D97706] ml-1">•</span>
                              )}
                            </div>
                            {isCurrentWeek && (
                              <div className="text-[9px] font-normal text-[#9A9898] mt-0.5">
                                {weekDates[day - 1]?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </div>
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
                              const isCurrentDay = isCurrentWeek && day === currentDayOfWeek;
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
                              const typeConf = slot.subject.type ? subjectTypeConfig[slot.subject.type] : null;
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
                                    <div className="flex items-center justify-between gap-1">
                                      <p className="text-xs font-bold truncate">
                                        {slot.subject.name}
                                      </p>
                                      {typeConf && (
                                        <span className={cn("text-[7px] font-mono px-1 py-0.5 border shrink-0", typeConf.bg, typeConf.color)} style={{ borderRadius: 0 }}>
                                          {typeConf.label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1">
                                      {slot.teacher && (
                                        <p className="text-[10px] opacity-70 truncate">
                                          {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
                                        </p>
                                      )}
                                      {slot.room && (
                                        <p className="text-[10px] opacity-70 truncate flex items-center gap-0.5">
                                          <MapPin className="h-2 w-2" />
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
              )}

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
              <p className="text-[9px] text-[#9A9898] text-center font-mono no-print">
                Données mises à jour automatiquement toutes les 60 secondes
              </p>
            </TabsContent>

            <TabsContent value="courses" className="mt-4">
              <MyCoursesSummary summary={courseSummary()} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// ═══ My Courses Summary Component ═══
function MyCoursesSummary({ summary }: {
  summary: Record<string, { subject: string; subjectCode: string | null; type: string; teacher: string; hoursPerWeek: number }[]>;
}) {
  const sections = [
    { key: "cours", label: "Cours magistraux", icon: BookOpen, color: "text-[#D97706]", bg: "bg-[#D97706]/10", border: "border-[#D97706]/30" },
    { key: "td", label: "Travaux dirigés", icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { key: "tp", label: "Travaux pratiques", icon: Landmark, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    { key: "autre", label: "Autres", icon: BookOpen, color: "text-[#9A9898]", bg: "bg-[#9A9898]/10", border: "border-[#9A9898]/30" },
  ];

  const totalHours = Object.values(summary).flat().reduce((acc, s) => acc + s.hoursPerWeek, 0);

  return (
    <div className="space-y-4">
      {/* Total hours summary */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Total hebdomadaire</p>
            <p className="text-[10px] text-[#9A9898]">Toutes matières confondues</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#D97706] font-mono">{totalHours.toFixed(1)}h</p>
            <p className="text-[9px] text-[#9A9898]">par semaine</p>
          </div>
        </div>
      </div>

      {/* Sections by type */}
      {sections.map((section) => {
        const items = summary[section.key];
        if (!items || items.length === 0) return null;
        const SectionIcon = section.icon;
        return (
          <div key={section.key} className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className={cn("px-4 py-2.5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between", section.bg)}>
              <div className="flex items-center gap-2">
                <SectionIcon className={cn("h-3.5 w-3.5", section.color)} />
                <span className={cn("text-xs font-bold", section.color)}>
                  {section.label}
                </span>
                <span className="text-[9px] text-[#9A9898] font-mono">
                  ({items.length})
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#9A9898]">
                {items.reduce((acc, s) => acc + s.hoursPerWeek, 0).toFixed(1)}h/sem
              </span>
            </div>
            <div className="divide-y divide-[#E5E5E5] dark:divide-[#2A2A2A]">
              {items.map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
                        {item.subject}
                      </p>
                      {item.subjectCode && (
                        <span className="text-[9px] font-mono text-[#9A9898] shrink-0">
                          [{item.subjectCode}]
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#9A9898] mt-0.5 flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      {item.teacher}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                      {item.hoursPerWeek.toFixed(1)}h
                    </p>
                    <p className="text-[8px] text-[#9A9898]">par semaine</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {totalHours === 0 && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-8 text-center">
          <BookOpen className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
          <p className="text-xs text-[#9A9898]">Aucune matière dans l&apos;emploi du temps</p>
        </div>
      )}
    </div>
  );
}
