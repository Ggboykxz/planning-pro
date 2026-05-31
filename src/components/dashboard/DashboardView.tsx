"use client";

import { useEffect, useState } from "react";
import { StatBlock } from "./StatBlock";
import { QuickActions } from "./QuickActions";
import { dayNames } from "@/lib/countries";
import { useAppStore } from "@/lib/store";
import { UserPlus, DoorOpen, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";

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
}

interface DashboardViewProps {
  institutionId: string;
}

export function DashboardView({ institutionId }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCurrentSection, setTimetableViewMode, setSelectedClassId } = useAppStore();

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

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-bold text-[#9A9898] mb-2">Actions rapides</p>
        <QuickActions actions={quickActions} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatBlock
          label="Enseignants"
          value={data.teacherCount}
          sublabel={`${data.teacherWorkload.filter((t) => t.percentage > 80).length} avec charge élevée`}
        />
        <StatBlock
          label="Salles"
          value={data.roomCount}
          sublabel={`${data.roomUtilization.filter((r) => r.usedSlots > 0).length} utilisées`}
        />
        <StatBlock
          label="Matières"
          value={data.subjectCount}
        />
        <StatBlock
          label="Classes"
          value={data.classCount}
        />
        <StatBlock
          label="Emplois du temps"
          value={data.timetableCount}
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
    </div>
  );
}
