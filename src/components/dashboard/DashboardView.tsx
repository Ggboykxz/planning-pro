"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatBlock } from "./StatBlock";
import { QuickActions } from "./QuickActions";
import { DashboardCharts } from "./DashboardCharts";
import { dayNames } from "@/lib/countries";
import { useAppStore, type AppSection } from "@/lib/store";
import { UserPlus, DoorOpen, BookOpen, Sparkles, CheckCircle2, Circle, ChevronRight, Database, Loader2, Calendar, Clock, MapPin, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getSubjectColor } from "@/lib/subject-colors";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DashboardData {
  teacherCount: number;
  roomCount: number;
  subjectCount: number;
  classCount: number;
  timetableCount: number;
  conflictCount: number;
  teacherConflicts: Array<{ teacherName: string; dayOfWeek: number; time: string; classes: string[] }>;
  roomConflicts: Array<{ roomName: string; dayOfWeek: number; time: string; classes: string[] }>;
  completionRate: number;
  teacherWorkload: Array<{ id: string; name: string; assignedHours: number; maxHours: number; percentage: number }>;
  roomUtilization: Array<{ id: string; name: string; usedSlots: number; capacity: number | null }>;
  recentTimetables: Array<{ id: string; name: string; class: { name: string }; createdAt: string }>;
  weeklyStats: { totalSlots: number; totalHours: number; fillRate: number; conflictCount: number };
  upcomingSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string; subjectName: string; teacherName: string; roomName: string; className: string }>;
  roomSlotsByDay: Array<{ dayOfWeek: number; roomId: string; roomName: string; count: number }>;
}

interface DashboardViewProps {
  institutionId: string;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  section: AppSection;
  count: number;
}

export function DashboardView({ institutionId }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectData, setSubjectData] = useState<Array<{ name: string; hours: number }>>([]);
  const { setCurrentSection, setTimetableViewMode, setSelectedClassId, addNotification } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, [institutionId]);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`/api/dashboard?institutionId=${institutionId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
      // Load subject hours
      const sRes = await fetch(`/api/subjects?institutionId=${institutionId}`);
      if (sRes.ok) {
        const subjects = await sRes.json();
        setSubjectData(
          subjects.map((s: { name: string; hoursPerWeek: number | null }) => ({
            name: s.name,
            hours: s.hoursPerWeek || 0,
          }))
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Ajouter un enseignant", onClick: () => setCurrentSection("teachers"), icon: <UserPlus className="h-3.5 w-3.5" /> },
    { label: "Créer une salle", onClick: () => setCurrentSection("rooms"), icon: <DoorOpen className="h-3.5 w-3.5" /> },
    { label: "Nouvelle matière", onClick: () => setCurrentSection("subjects"), icon: <BookOpen className="h-3.5 w-3.5" /> },
    { label: "Générer emploi du temps", onClick: () => setCurrentSection("timetable"), icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  const [seeding, setSeeding] = useState(false);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success("Données de démonstration chargées ✓", {
          description: `${result.teacherCount || 0} enseignants, ${result.roomCount || 0} salles, ${result.subjectCount || 0} matières`,
        });
        // Reload the page to refresh all data
        setTimeout(() => window.location.reload(), 500);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors du chargement des données");
      }
    } catch {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setSeeding(false);
    }
  };

  // Setup checklist
  const checklist: ChecklistItem[] = data
    ? [
        { label: "Enseignants configurés", done: data.teacherCount > 0, section: "teachers", count: data.teacherCount },
        { label: "Salles configurées", done: data.roomCount > 0, section: "rooms", count: data.roomCount },
        { label: "Matières configurées", done: data.subjectCount > 0, section: "subjects", count: data.subjectCount },
        { label: "Classes configurées", done: data.classCount > 0, section: "classes", count: data.classCount },
        { label: "Emplois du temps générés", done: data.timetableCount > 0, section: "timetable", count: data.timetableCount },
      ]
    : [];

  const allConfigured = checklist.length > 0 && checklist.every((item) => item.done);
  const incompleteCount = checklist.filter((item) => !item.done).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Tableau de bord</h1>
          <p className="text-xs text-[#9A9898] mt-1">Chargement...</p>
        </div>
        {/* Shimmer stat blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <div className="h-8 skeleton-shimmer w-12 mb-2" />
              <div className="h-3 skeleton-shimmer w-20" />
            </div>
          ))}
        </div>
        {/* Shimmer card outlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
              <div className="h-3 skeleton-shimmer w-40 mb-4" />
              <div className="h-4 skeleton-shimmer w-24 mb-2" />
              <div className="h-1 skeleton-shimmer w-full" />
            </div>
          ))}
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="h-3 skeleton-shimmer w-48 mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className="h-3 skeleton-shimmer w-32" />
              <div className="h-1 skeleton-shimmer flex-1" />
              <div className="h-3 skeleton-shimmer w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Tableau de bord</h1>
        <p className="text-xs text-[#9A9898] mt-1">
          Vue d&apos;ensemble de votre établissement
        </p>
      </div>

      {/* Setup Checklist */}
      {!allConfigured && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Configuration requise</p>
              <p className="text-[10px] text-[#9A9898] mt-0.5">
                {incompleteCount} étape{incompleteCount > 1 ? "s" : ""} restante{incompleteCount > 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-[10px] text-[#9A9898]">
              {checklist.filter((c) => c.done).length}/{checklist.length}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full mb-4">
            <div
              className="h-full bg-[#201D1D] dark:bg-[#FDFCFC] transition-all duration-500"
              style={{ width: `${(checklist.filter((c) => c.done).length / checklist.length) * 100}%` }}
            />
          </div>
          <div className="space-y-0">
            {checklist.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => setCurrentSection(item.section)}
                className="w-full flex items-center gap-3 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors group"
              >
                <span className="text-[10px] text-[#9A9898] w-8 shrink-0">Étape {idx + 1}</span>
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-[#201D1D] dark:text-[#FDFCFC] shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-[#9A9898] shrink-0" />
                )}
                <span className={`text-xs flex-1 ${item.done ? "text-[#646262] dark:text-[#9A9898] line-through" : "text-[#201D1D] dark:text-[#FDFCFC] font-bold"}`}>
                  {item.label}
                </span>
                <span className="text-[10px] text-[#9A9898]">
                  {item.count > 0 ? `${item.count}` : "0"}
                </span>
                <ChevronRight className="h-3 w-3 text-[#9A9898] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-bold text-[#9A9898] mb-2">Actions rapides</p>
        <QuickActions actions={quickActions} />
      </div>

      {/* Demo Data Card */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-[#9A9898] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Données de démonstration</p>
              <p className="text-[10px] text-[#9A9898] mt-0.5">
                Charger des données d&apos;exemple pour explorer toutes les fonctionnalités de PlanningPro
              </p>
            </div>
          </div>
          <Button
            onClick={handleSeedData}
            disabled={seeding}
            className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1 shrink-0"
          >
            {seeding ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Database className="h-3 w-3" />
                Charger les données
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatBlock
          label="Enseignants"
          value={data.teacherCount}
          sublabel={`${data.teacherWorkload.filter((t) => t.percentage > 80).length} avec charge élevée`}
          onClick={() => setCurrentSection("teachers")}
        />
        <StatBlock
          label="Salles"
          value={data.roomCount}
          sublabel={`${data.roomUtilization.filter((r) => r.usedSlots > 0).length} utilisées`}
          onClick={() => setCurrentSection("rooms")}
        />
        <StatBlock
          label="Matières"
          value={data.subjectCount}
          onClick={() => setCurrentSection("subjects")}
        />
        <StatBlock
          label="Classes"
          value={data.classCount}
          onClick={() => setCurrentSection("classes")}
        />
        <StatBlock
          label="Emplois du temps"
          value={data.timetableCount}
          onClick={() => setCurrentSection("timetable")}
        />
        <StatBlock
          label="Conflits"
          value={data.conflictCount}
          sublabel={data.conflictCount === 0 ? "Aucun conflit" : "À résoudre"}
        />
      </div>

      {/* Completion & Conflicts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rate */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Taux de complétion</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{data.completionRate}%</span>
            <span className="text-xs text-[#9A9898]">
              {data.completionRate === 100 ? "complété" : "en cours"}
            </span>
          </div>
          <div className="mt-3 h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
            <div
              className="h-full bg-[#201D1D] dark:bg-[#FDFCFC] transition-all duration-500"
              style={{ width: `${data.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-[#9A9898] mt-2">
            {data.timetableCount} emploi(s) du temps sur {data.classCount} classe(s)
          </p>
        </div>

        {/* Conflicts */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Conflits détectés</p>
          {data.conflictCount === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#201D1D] dark:text-[#FDFCFC] mx-auto mb-2 opacity-20" />
              <p className="text-xs text-[#9A9898]">Aucun conflit détecté</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {data.teacherConflicts.map((c, i) => (
                <div key={`teacher-${i}`} className="flex items-start gap-2 p-2 border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <span className="text-[10px] font-bold bg-[#DC2626] text-white px-1.5 py-0.5 shrink-0">ENSEIGNANT</span>
                  <div className="text-xs">
                    <p className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.teacherName}</p>
                    <p className="text-[#9A9898]">
                      {dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}
                    </p>
                  </div>
                </div>
              ))}
              {data.roomConflicts.map((c, i) => (
                <div key={`room-${i}`} className="flex items-start gap-2 p-2 border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <span className="text-[10px] font-bold bg-[#D97706] text-white px-1.5 py-0.5 shrink-0">SALLE</span>
                  <div className="text-xs">
                    <p className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.roomName}</p>
                    <p className="text-[#9A9898]">
                      {dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teacher Workload */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Charge des enseignants</p>
        {data.teacherWorkload.length === 0 ? (
          <p className="text-xs text-[#9A9898] py-4 text-center">Aucun enseignant configuré</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {data.teacherWorkload.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] w-40 truncate">{t.name}</span>
                <div className="flex-1 h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      t.percentage > 80 ? "bg-[#DC2626]" : t.percentage > 50 ? "bg-[#D97706]" : "bg-[#201D1D] dark:bg-[#FDFCFC]"
                    }`}
                    style={{ width: `${Math.min(t.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[#9A9898] w-20 text-right">
                  {t.assignedHours}h / {t.maxHours}h
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Timetables */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Emplois du temps récents</p>
        {data.recentTimetables.length === 0 ? (
          <p className="text-xs text-[#9A9898] py-4 text-center">Aucun emploi du temps créé</p>
        ) : (
          <div className="space-y-0">
            {data.recentTimetables.map((tt) => (
              <div
                key={tt.id}
                className="flex items-center justify-between py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
              >
                <div>
                  <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">{tt.name}</p>
                  <p className="text-[10px] text-[#9A9898]">{tt.class.name}</p>
                </div>
                <p className="text-[10px] text-[#9A9898]">
                  {new Date(tt.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Charts */}
      <DashboardCharts
        roomUtilization={data.roomUtilization}
        teacherWorkload={data.teacherWorkload}
        subjectData={subjectData}
        completionRate={data.completionRate}
        roomSlotsByDay={data.roomSlotsByDay}
      />

      {/* ═══ NEW: Weekly Statistics Cards ═══ */}
      <div>
        <p className="text-xs font-bold text-[#9A9898] mb-2">Statistiques hebdomadaires</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
            <Calendar className="h-4 w-4 text-[#9A9898] mb-2" />
            <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{data.weeklyStats?.totalSlots ?? 0}</p>
            <p className="text-[10px] text-[#9A9898]">Cours cette semaine</p>
          </div>
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
            <Clock className="h-4 w-4 text-[#9A9898] mb-2" />
            <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{data.weeklyStats?.totalHours ?? 0}h</p>
            <p className="text-[10px] text-[#9A9898]">Heures enseignées</p>
          </div>
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
            <Users className="h-4 w-4 text-[#9A9898] mb-2" />
            <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{data.weeklyStats?.fillRate ?? 0}%</p>
            <p className="text-[10px] text-[#9A9898]">Taux de remplissage</p>
          </div>
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
            <AlertTriangle className="h-4 w-4 text-[#9A9898] mb-2" />
            <p className={`text-2xl font-bold ${(data.weeklyStats?.conflictCount ?? 0) > 0 ? "text-[#DC2626]" : "text-[#201D1D] dark:text-[#FDFCFC]"}`}>{data.weeklyStats?.conflictCount ?? 0}</p>
            <p className="text-[10px] text-[#9A9898]">Conflits détectés</p>
          </div>
        </div>
      </div>

      {/* ═══ NEW: Upcoming Schedule ═══ */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Prochains cours</p>
        {(data.upcomingSlots ?? []).length === 0 ? (
          <div className="py-4 text-center">
            <Clock className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
            <p className="text-xs text-[#9A9898]">Aucun cours à venir cette semaine</p>
          </div>
        ) : (
          <div className="space-y-0">
            {(data.upcomingSlots ?? []).map((slot, i) => {
              const subjectColor = getSubjectColor(slot.subjectName, document.documentElement.classList.contains("dark"));
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentSection("timetable"); }}
                  className="w-full flex items-center gap-3 py-2.5 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors group"
                >
                  <div
                    className="h-8 w-1 shrink-0"
                    style={{ backgroundColor: subjectColor.text }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">{slot.subjectName}</p>
                      <span className="text-[9px] text-[#9A9898]">{slot.className}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-[#9A9898] flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {dayNames[slot.dayOfWeek]} {slot.startTime}–{slot.endTime}
                      </span>
                      {slot.teacherName && (
                        <span className="text-[10px] text-[#9A9898] flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          {slot.teacherName}
                        </span>
                      )}
                      {slot.roomName && (
                        <span className="text-[10px] text-[#9A9898] flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" />
                          {slot.roomName}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-[#9A9898] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ NEW: Teacher Workload Distribution Chart ═══ */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Répartition de la charge enseignante</p>
        {data.teacherWorkload.length === 0 ? (
          <p className="text-xs text-[#9A9898] py-4 text-center">Aucun enseignant configuré</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.teacherWorkload.length * 32)}>
            <BarChart
              data={data.teacherWorkload.map((t) => ({
                name: t.name.length > 20 ? t.name.slice(0, 20) + "…" : t.name,
                assignées: t.assignedHours,
                maximum: t.maxHours,
                percentage: t.percentage,
              }))}
              layout="vertical"
              margin={{ left: 20 }}
              style={{ fontFamily: "'Sarasa Mono SC', 'Liberation Mono', monospace" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis type="number" tick={{ fill: "#9A9898", fontSize: 10 }} axisLine={{ stroke: "#E5E5E5" }} tickLine={{ stroke: "#E5E5E5" }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#9A9898", fontSize: 9 }} axisLine={{ stroke: "#E5E5E5" }} tickLine={{ stroke: "#E5E5E5" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E5E5",
                  fontSize: "11px",
                  fontFamily: "'Sarasa Mono SC', 'Liberation Mono', monospace",
                }}
                formatter={(value: number, name: string) => [`${value}h`, name === "assignées" ? "Heures assignées" : "Maximum"]}
              />
              <Bar dataKey="maximum" fill="#E5E5E5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="assignées" radius={[0, 0, 0, 0]}>
                {data.teacherWorkload.map((t, i) => (
                  <Cell key={i} fill={t.percentage > 100 ? "#DC2626" : t.percentage >= 80 ? "#D97706" : "#16A34A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ═══ NEW: Room Utilization Heatmap ═══ */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Utilisation des salles</p>
        {data.roomUtilization.length === 0 ? (
          <p className="text-xs text-[#9A9898] py-4 text-center">Aucune salle configurée</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Header: days */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `120px repeat(${Math.min(6, data.roomUtilization.length)}, 1fr)` }}>
                <div className="text-[10px] text-[#9A9898] font-bold flex items-center">Salle</div>
                {[1, 2, 3, 4, 5, 6].map((day) => (
                  <div key={day} className="text-[10px] text-[#9A9898] font-bold text-center">
                    {(dayNames[day] || "").slice(0, 3)}
                  </div>
                ))}
              </div>
              {/* Rows: rooms x days */}
              {data.roomUtilization.slice(0, 10).map((room) => {
                const roomDays = (data.roomSlotsByDay || []).filter((d) => d.roomId === room.id || d.roomName === room.name);
                return (
                  <div key={room.name} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `120px repeat(${Math.min(6, data.roomUtilization.length)}, 1fr)` }}>
                    <div className="text-[10px] text-[#201D1D] dark:text-[#FDFCFC] truncate flex items-center">{room.name}</div>
                    {[1, 2, 3, 4, 5, 6].map((day) => {
                      const dayData = roomDays.find((d) => d.dayOfWeek === day);
                      const count = dayData?.count || 0;
                      // Heatmap colors: 0=empty, 1-2=light, 3-4=medium, 5+=full
                      let bgColor = "bg-[#F8F7F7] dark:bg-[#1A1A1A]";
                      let textColor = "text-[#9A9898]";
                      if (count === 0) {
                        bgColor = "bg-[#F8F7F7] dark:bg-[#1A1A1A]";
                        textColor = "text-[#9A9898]";
                      } else if (count <= 2) {
                        bgColor = "bg-emerald-100 dark:bg-emerald-900/30";
                        textColor = "text-emerald-700 dark:text-emerald-300";
                      } else if (count <= 4) {
                        bgColor = "bg-amber-100 dark:bg-amber-900/30";
                        textColor = "text-amber-700 dark:text-amber-300";
                      } else {
                        bgColor = "bg-red-100 dark:bg-red-900/30";
                        textColor = "text-red-700 dark:text-red-300";
                      }
                      return (
                        <div key={day} className={`${bgColor} ${textColor} text-[10px] font-bold text-center py-1.5 border border-[#E5E5E5] dark:border-[#2A2A2A]`}>
                          {count > 0 ? count : "—"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A]" />
                  <span className="text-[9px] text-[#9A9898]">Vide</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-emerald-100 dark:bg-emerald-900/30 border border-[#E5E5E5] dark:border-[#2A2A2A]" />
                  <span className="text-[9px] text-[#9A9898]">1–2 cours</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-amber-100 dark:bg-amber-900/30 border border-[#E5E5E5] dark:border-[#2A2A2A]" />
                  <span className="text-[9px] text-[#9A9898]">3–4 cours</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-red-100 dark:bg-red-900/30 border border-[#E5E5E5] dark:border-[#2A2A2A]" />
                  <span className="text-[9px] text-[#9A9898]">5+ cours</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
