"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { StatBlock } from "./StatBlock";
import { QuickActions } from "./QuickActions";
import { DashboardCharts } from "./DashboardCharts";
import { dayNames } from "@/lib/countries";
import { useAppStore, type AppSection } from "@/lib/store";
import {
  UserPlus, DoorOpen, BookOpen, Sparkles, CheckCircle2, Circle, ChevronRight,
  Database, Calendar, Clock, MapPin, Users, AlertTriangle,
  Activity, Umbrella, Shield, Zap, ArrowRight, TrendingUp, RefreshCw,
  Terminal
} from "lucide-react";
import { getSubjectColor } from "@/lib/subject-colors";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  createdAt: string;
  userName: string;
}

interface HolidayItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
}

interface AlertItem {
  type: "conflict" | "overwork" | "capacity";
  severity: "error" | "warning" | "info";
  message: string;
}

interface PlanUsageItem {
  current: number;
  limit: number;
}

interface PlanUsage {
  plan: string;
  teachers: PlanUsageItem;
  rooms: PlanUsageItem;
  timetables: PlanUsageItem;
  institutions: PlanUsageItem;
}

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
  recentActivity: ActivityItem[];
  upcomingHolidays: HolidayItem[];
  subjectTypeBreakdown: Array<{ name: string; value: number }>;
  weeklyHoursDistribution: Array<{ name: string; value: number }>;
  alerts: AlertItem[];
  planUsage: PlanUsage;
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

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const stepTime = Math.max(Math.floor(duration / target), 30);
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= target) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [target, duration]);
  return target === 0 ? 0 : count;
}

// Animated stat block
function AnimatedStatBlock({ label, value, sublabel, onClick }: { label: string; value: number; sublabel?: string; onClick?: () => void }) {
  const animatedValue = useAnimatedCounter(value);
  return <StatBlock label={label} value={animatedValue} sublabel={sublabel} onClick={onClick} />;
}

// Activity icon mapper
function getActivityIcon(action: string, entity: string) {
  if (action === "create" || action === "CREATE") return <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5">+</span>;
  if (action === "update" || action === "UPDATE") return <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5">~</span>;
  if (action === "delete" || action === "DELETE") return <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5">-</span>;
  if (action === "generate" || action === "GENERATE") return <Sparkles className="h-3 w-3 text-[#D97706]" />;
  return <Activity className="h-3 w-3 text-[#9A9898]" />;
}

// Entity name mapper
function getEntityLabel(entity: string): string {
  const labels: Record<string, string> = {
    teacher: "Enseignant",
    room: "Salle",
    subject: "Matière",
    class: "Classe",
    timetable: "Emploi du temps",
    institution: "Établissement",
    timeslot: "Créneau",
    user: "Utilisateur",
    absence: "Absence",
    holiday: "Vacance",
  };
  return labels[entity] || entity;
}

// Action name mapper
function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: "Créé",
    CREATE: "Créé",
    update: "Modifié",
    UPDATE: "Modifié",
    delete: "Supprimé",
    DELETE: "Supprimé",
    generate: "Généré",
    GENERATE: "Généré",
    login: "Connexion",
    LOGIN: "Connexion",
    import: "Importé",
    IMPORT: "Importé",
    export: "Exporté",
    EXPORT: "Exporté",
  };
  return labels[action] || action;
}

// Severity icon
function getSeverityIcon(severity: string) {
  if (severity === "error") return <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626] shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-3.5 w-3.5 text-[#D97706] shrink-0" />;
  return <Shield className="h-3.5 w-3.5 text-[#9A9898] shrink-0" />;
}

// ─── Setup step card for first-use experience ───
function SetupStepCard({
  step,
  icon,
  title,
  description,
  estimatedTime,
  onClick,
  done,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  estimatedTime: string;
  onClick: () => void;
  done: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-4 p-5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] hover:border-[#D97706] dark:hover:border-[#D97706] transition-all duration-200 group"
    >
      <div className="flex items-center gap-3 shrink-0">
        <div className={`h-10 w-10 flex items-center justify-center border font-bold font-mono text-lg transition-all duration-200 ${
          done
            ? "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]"
            : "border-[#D97706] bg-[#D97706]/10 text-[#D97706]"
        }`}>
          {done ? <CheckCircle2 className="h-5 w-5" /> : step}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-[#9A9898] uppercase tracking-wider">Étape {step}</span>
          <span className="text-[9px] text-[#D97706] font-mono">{estimatedTime}</span>
          {done && <span className="text-[9px] font-bold text-[#16A34A]">COMPLÉTÉ</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-bold ${done ? "text-[#646262] dark:text-[#9A9898] line-through" : "text-[#201D1D] dark:text-[#FDFCFC]"}`}>
            {title}
          </span>
          {!done && <span className="shrink-0">{icon}</span>}
        </div>
        <p className="text-[10px] text-[#9A9898] mt-0.5 leading-relaxed">{description}</p>
      </div>
      {!done && (
        <ChevronRight className="h-4 w-4 text-[#9A9898] group-hover:text-[#D97706] transition-colors shrink-0 mt-1" />
      )}
    </button>
  );
}

export function DashboardView({ institutionId }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [subjectData, setSubjectData] = useState<Array<{ name: string; hours: number }>>([]);
  const { currentUser, setCurrentSection } = useAppStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(false);
      const [dRes, sRes] = await Promise.all([
        fetch(`/api/dashboard?institutionId=${institutionId}`, { signal }),
        fetch(`/api/subjects?institutionId=${institutionId}`, { signal }),
      ]);
      if (dRes.ok) {
        const d = await dRes.json();
        setData(d);
      } else {
        setError(true);
      }
      if (sRes.ok) {
        const subjects = await sRes.json();
        setSubjectData(
          subjects.map((s: { name: string; hoursPerWeek: number | null }) => ({
            name: s.name,
            hours: s.hoursPerWeek || 0,
          }))
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUser?.id]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const quickActions = [
    { label: "Ajouter un enseignant", onClick: () => setCurrentSection("teachers"), icon: <UserPlus className="h-3.5 w-3.5" /> },
    { label: "Créer une salle", onClick: () => setCurrentSection("rooms"), icon: <DoorOpen className="h-3.5 w-3.5" /> },
    { label: "Nouvelle matière", onClick: () => setCurrentSection("subjects"), icon: <BookOpen className="h-3.5 w-3.5" /> },
    { label: "Générer emploi du temps", onClick: () => setCurrentSection("timetable"), icon: <Sparkles className="h-3.5 w-3.5" /> },
    { label: "Voir les conflits", onClick: () => setCurrentSection("timetable"), icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    { label: "Exporter les données", onClick: () => setCurrentSection("settings"), icon: <Database className="h-3.5 w-3.5" /> },
  ];

  // Auto-refresh every 30 seconds
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setRefreshing(true);
      await loadDashboard(controller.signal);
      setRefreshing(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

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
  const isFirstUse = data
    ? data.teacherCount === 0 && data.roomCount === 0 && data.subjectCount === 0 && data.classCount === 0 && data.timetableCount === 0
    : false;

  // Current date
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Plan label
  const planLabels: Record<string, string> = { free: "Gratuit", pro: "Pro", enterprise: "Enterprise" };
  const currentPlan = data?.planUsage?.plan || currentUser?.plan || "free";

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Tableau de bord</h1>
          <p className="text-xs text-[#9A9898] mt-1">Chargement...</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <div className="h-8 skeleton-shimmer w-12 mb-2" />
              <div className="h-3 skeleton-shimmer w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
              <div className="h-3 skeleton-shimmer w-40 mb-4" />
              <div className="h-4 skeleton-shimmer w-24 mb-2" />
              <div className="h-1 skeleton-shimmer w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Tableau de bord</h1>
          <p className="text-xs text-[#9A9898] mt-1">Erreur de chargement</p>
        </div>
        <div className="border border-[#DC2626] p-6 flex flex-col items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-[#DC2626]" />
          <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] text-center">
            Impossible de charger les données du tableau de bord.
          </p>
          <button
            onClick={() => { setLoading(true); loadDashboard(); }}
            className="text-xs px-4 py-2 border border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] transition-colors"
          >
            <RefreshCw className="h-3 w-3 mr-1.5 inline" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ═══ FIRST-USE EXPERIENCE ═══
  if (isFirstUse) {
    return (
      <div className="space-y-8">
        {/* Welcome banner */}
        <div className="border border-[#D97706]/30 bg-[#D97706]/5 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 flex items-center justify-center border border-[#D97706]/30 bg-[#D97706]/10 shrink-0">
              <Terminal className="h-6 w-6 text-[#D97706]" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                Bienvenue sur PlanningPro, {currentUser?.name || "Utilisateur"}
              </h1>
              <p className="text-xs text-[#646262] dark:text-[#9A9898] mt-1 leading-relaxed">
                Votre espace est prêt. Suivez les étapes ci-dessous pour configurer votre établissement et générer votre premier emploi du temps.
              </p>
            </div>
          </div>
        </div>

        {/* Setup steps */}
        <div>
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-3">Configuration initiale</p>
          <div className="space-y-2">
            <SetupStepCard
              step={1}
              icon={<UserPlus className="h-4 w-4" />}
              title="Ajouter des enseignants"
              description="Renseignez les enseignants de votre établissement avec leurs disponibilités et spécialités."
              estimatedTime="~2 min"
              onClick={() => setCurrentSection("teachers")}
              done={data.teacherCount > 0}
            />
            <SetupStepCard
              step={2}
              icon={<DoorOpen className="h-4 w-4" />}
              title="Créer des salles"
              description="Définissez les salles disponibles avec leur capacité et leur type (amphi, TD, labo...)."
              estimatedTime="~1 min"
              onClick={() => setCurrentSection("rooms")}
              done={data.roomCount > 0}
            />
            <SetupStepCard
              step={3}
              icon={<BookOpen className="h-4 w-4" />}
              title="Configurer les matières"
              description="Ajoutez les matières enseignées avec leurs volumes horaires et coefficients."
              estimatedTime="~2 min"
              onClick={() => setCurrentSection("subjects")}
              done={data.subjectCount > 0}
            />
            <SetupStepCard
              step={4}
              icon={<Users className="h-4 w-4" />}
              title="Créer les classes"
              description="Définissez les classes ou groupes d'étudiants et associez-leur des matières."
              estimatedTime="~2 min"
              onClick={() => setCurrentSection("classes")}
              done={data.classCount > 0}
            />
            <SetupStepCard
              step={5}
              icon={<Sparkles className="h-4 w-4" />}
              title="Générer l'emploi du temps"
              description="Lancez la génération automatique par IA ou créez manuellement votre emploi du temps."
              estimatedTime="~1 min"
              onClick={() => setCurrentSection("timetable")}
              done={data.timetableCount > 0}
            />
          </div>
        </div>

        {/* Quick actions for first use */}
        <div>
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-3">Actions rapides</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.slice(0, 4).map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className="flex flex-col items-center gap-2 p-4 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] hover:border-[#D97706] dark:hover:border-[#D97706] transition-all duration-200 group"
              >
                <div className="h-8 w-8 flex items-center justify-center border border-[#D97706]/30 bg-[#D97706]/5 text-[#D97706] group-hover:border-[#D97706] group-hover:bg-[#D97706]/10 transition-all">
                  {action.icon}
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Progression</p>
            <span className="text-xs text-[#9A9898] font-mono">
              {checklist.filter((c) => c.done).length}/{checklist.length}
            </span>
          </div>
          <div className="h-1.5 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
            <div
              className="h-full bg-[#D97706] transition-all duration-500"
              style={{ width: `${(checklist.filter((c) => c.done).length / checklist.length) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[#9A9898] mt-2">
            {incompleteCount === 0
              ? "Toutes les étapes sont complétées !"
              : `${incompleteCount} étape${incompleteCount > 1 ? "s" : ""} restante${incompleteCount > 1 ? "s" : ""} avant de pouvoir générer un emploi du temps`
            }
          </p>
        </div>

        {/* Auto-refresh indicator */}
        {refreshing && (
          <div className="flex items-center gap-2 text-[10px] text-[#9A9898] font-mono">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Actualisation...
          </div>
        )}
      </div>
    );
  }

  // ═══ FULL DASHBOARD (has data) ═══
  return (
    <div className="space-y-8">
      {/* ═══ WELCOME BANNER ═══ */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Bonjour, {currentUser?.name || "Utilisateur"}
            </h1>
            <p className="text-xs text-[#9A9898] mt-1 capitalize">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-[#9A9898]">Plan actuel</p>
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                {planLabels[currentPlan] || "Gratuit"}
              </p>
            </div>
            <div className={`h-8 w-8 flex items-center justify-center border ${
              currentPlan === "pro"
                ? "border-[#D97706] text-[#D97706]"
                : currentPlan === "enterprise"
                ? "border-[#8B5CF6] text-[#8B5CF6]"
                : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898]"
            }`}>
              {currentPlan === "enterprise" ? <Zap className="h-4 w-4" /> : currentPlan === "pro" ? <TrendingUp className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ALERTS / WARNINGS ═══ */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#9A9898]">Alertes</p>
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 border ${
                alert.severity === "error"
                  ? "border-[#DC2626] bg-red-50 dark:bg-red-950/20"
                  : alert.severity === "warning"
                  ? "border-[#D97706] bg-amber-50 dark:bg-amber-950/20"
                  : "border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]"
              }`}
            >
              {getSeverityIcon(alert.severity)}
              <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] flex-1">{alert.message}</p>
              {alert.type === "conflict" && (
                <button
                  onClick={() => setCurrentSection("timetable")}
                  className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] flex items-center gap-1"
                >
                  Voir <ArrowRight className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ SETUP CHECKLIST (shown when incomplete) ═══ */}
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
                <span className="text-[10px] text-[#9A9898]">{item.count > 0 ? `${item.count}` : "—"}</span>
                <ChevronRight className="h-3 w-3 text-[#9A9898] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div>
        <p className="text-xs font-bold text-[#9A9898] mb-2">Actions rapides</p>
        <QuickActions actions={quickActions} />
      </div>

      {/* ═══ AUTO-REFRESH INDICATOR ═══ */}
      {refreshing && (
        <div className="flex items-center gap-2 text-[10px] text-[#9A9898] font-mono">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Actualisation...
        </div>
      )}

      {/* ═══ STATS ROW ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <AnimatedStatBlock
          label="Enseignants"
          value={data.teacherCount}
          sublabel={data.teacherCount > 0 ? `${data.teacherWorkload.filter((t) => t.percentage > 80).length} avec charge élevée` : undefined}
          onClick={() => setCurrentSection("teachers")}
        />
        <AnimatedStatBlock
          label="Salles"
          value={data.roomCount}
          sublabel={data.roomCount > 0 ? `${data.roomUtilization.filter((r) => r.usedSlots > 0).length} utilisées` : undefined}
          onClick={() => setCurrentSection("rooms")}
        />
        <AnimatedStatBlock
          label="Matières"
          value={data.subjectCount}
          onClick={() => setCurrentSection("subjects")}
        />
        <AnimatedStatBlock
          label="Classes"
          value={data.classCount}
          onClick={() => setCurrentSection("classes")}
        />
        <AnimatedStatBlock
          label="Emplois du temps"
          value={data.timetableCount}
          onClick={() => setCurrentSection("timetable")}
        />
        <AnimatedStatBlock
          label="Conflits"
          value={data.conflictCount}
          sublabel={data.conflictCount === 0 ? "Aucun conflit" : "À résoudre"}
        />
      </div>

      {/* ═══ COMPLETION & CONFLICTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Taux de complétion</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{data.completionRate}%</span>
            <span className="text-xs text-[#9A9898]">{data.completionRate === 100 ? "complété" : "en cours"}</span>
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
                    <p className="text-[#9A9898]">{dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}</p>
                  </div>
                </div>
              ))}
              {data.roomConflicts.map((c, i) => (
                <div key={`room-${i}`} className="flex items-start gap-2 p-2 border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <span className="text-[10px] font-bold bg-[#D97706] text-white px-1.5 py-0.5 shrink-0">SALLE</span>
                  <div className="text-xs">
                    <p className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{c.roomName}</p>
                    <p className="text-[#9A9898]">{dayNames[c.dayOfWeek]} {c.time} — {c.classes.join(" vs ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ACTIVITY FEED & HOLIDAYS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Activité récente</p>
            <button
              onClick={() => setCurrentSection("audit")}
              className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] flex items-center gap-1"
            >
              Tout voir <ChevronRight className="h-2.5 w-2.5" />
            </button>
          </div>
          {(!data.recentActivity || data.recentActivity.length === 0) ? (
            <div className="py-8 text-center">
              <Activity className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
              <p className="text-xs text-[#9A9898]">Aucune activité enregistrée</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-64 overflow-y-auto scrollbar-thin">
              {data.recentActivity.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                >
                  <div className="shrink-0 w-6 flex items-center justify-center">
                    {getActivityIcon(item.action, item.entity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC] truncate">
                      <span className="font-bold">{getActionLabel(item.action)}</span>{" "}
                      {getEntityLabel(item.entity)}
                      {item.details ? <span className="text-[#9A9898]"> — {item.details}</span> : ""}
                    </p>
                    <p className="text-[10px] text-[#9A9898]">
                      {item.userName} · {new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Holidays */}
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Prochaines vacances</p>
            <button
              onClick={() => setCurrentSection("holidays")}
              className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] flex items-center gap-1"
            >
              Gérer <ChevronRight className="h-2.5 w-2.5" />
            </button>
          </div>
          {(!data.upcomingHolidays || data.upcomingHolidays.length === 0) ? (
            <div className="py-8 text-center">
              <Umbrella className="h-6 w-6 text-[#9A9898] mx-auto mb-2 opacity-30" />
              <p className="text-xs text-[#9A9898]">Aucune vacances à venir</p>
              <button
                onClick={() => setCurrentSection("holidays")}
                className="text-[10px] text-[#D97706] hover:underline mt-2"
              >
                Ajouter des vacances
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {data.upcomingHolidays.map((holiday) => {
                const start = new Date(holiday.startDate);
                const end = new Date(holiday.endDate);
                const daysUntil = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={holiday.id}
                    className="flex items-center gap-3 py-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                  >
                    <div className="h-8 w-8 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
                      <Umbrella className="h-3.5 w-3.5 text-[#9A9898]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">{holiday.name}</p>
                      <p className="text-[10px] text-[#9A9898]">
                        {start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — {end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                        {daysUntil > 0 ? `J-${daysUntil}` : "En cours"}
                      </p>
                      <p className="text-[10px] text-[#9A9898]">
                        {holiday.type === "vacances" ? "Vacances" : holiday.type === "jour_ferie" ? "Férié" : holiday.type}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ PLAN USAGE ═══ */}
      {data.planUsage && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Utilisation du plan</p>
            <button
              onClick={() => setCurrentSection("pricing")}
              className="text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] flex items-center gap-1"
            >
              Voir les plans <ChevronRight className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["teachers", "rooms", "timetables", "institutions"] as const).map((type) => {
              const usage = data.planUsage[type];
              const labels: Record<string, string> = {
                teachers: "Enseignants",
                rooms: "Salles",
                timetables: "Emplois du temps",
                institutions: "Établissements",
              };
              const isUnlimited = usage.limit === -1;
              const percentage = isUnlimited ? 0 : usage.limit > 0 ? Math.round((usage.current / usage.limit) * 100) : 0;
              const isNearLimit = !isUnlimited && percentage >= 80;
              const isOverLimit = !isUnlimited && percentage >= 100;
              return (
                <div key={type} className="border border-[#F8F7F7] dark:border-[#1A1A1A] p-3">
                  <p className="text-xs text-[#9A9898] mb-1">{labels[type]}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold ${isOverLimit ? "text-[#DC2626]" : isNearLimit ? "text-[#D97706]" : "text-[#201D1D] dark:text-[#FDFCFC]"}`}>
                      {usage.current}
                    </span>
                    <span className="text-xs text-[#9A9898]">/ {isUnlimited ? "∞" : usage.limit}</span>
                  </div>
                  {!isUnlimited && (
                    <div className="mt-2 h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isOverLimit ? "bg-[#DC2626]" : isNearLimit ? "bg-[#D97706]" : "bg-[#201D1D] dark:bg-[#FDFCFC]"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                  {isUnlimited && (
                    <p className="text-[10px] text-[#9A9898] mt-1">Illimité</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TEACHER WORKLOAD ═══ */}
      {data.teacherWorkload.length > 0 && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Charge des enseignants</p>
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
        </div>
      )}

      {/* ═══ RECENT TIMETABLES ═══ */}
      {data.recentTimetables.length > 0 && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Emplois du temps récents</p>
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
        </div>
      )}

      {/* ═══ ANALYTICS CHARTS ═══ */}
      <DashboardCharts
        roomUtilization={data.roomUtilization}
        teacherWorkload={data.teacherWorkload}
        subjectData={subjectData}
        completionRate={data.completionRate}
        roomSlotsByDay={data.roomSlotsByDay}
        subjectTypeBreakdown={data.subjectTypeBreakdown}
        weeklyHoursDistribution={data.weeklyHoursDistribution}
      />

      {/* ═══ WEEKLY STATISTICS ═══ */}
      {(data.weeklyStats?.totalSlots ?? 0) > 0 && (
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
      )}

      {/* ═══ UPCOMING SCHEDULE ═══ */}
      {(data.upcomingSlots ?? []).length > 0 && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Prochains cours</p>
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
        </div>
      )}

      {/* ═══ TEACHER WORKLOAD DISTRIBUTION CHART ═══ */}
      {data.teacherWorkload.length > 0 && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Répartition de la charge enseignante</p>
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
        </div>
      )}

      {/* ═══ ROOM UTILIZATION HEATMAP ═══ */}
      {data.roomUtilization.length > 0 && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Utilisation des salles</p>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `120px repeat(${Math.min(6, data.roomUtilization.length)}, 1fr)` }}>
                <div className="text-[10px] text-[#9A9898] font-bold flex items-center">Salle</div>
                {[1, 2, 3, 4, 5, 6].map((day) => (
                  <div key={day} className="text-[10px] text-[#9A9898] font-bold text-center">
                    {(dayNames[day] || "").slice(0, 3)}
                  </div>
                ))}
              </div>
              {data.roomUtilization.slice(0, 10).map((room) => {
                const roomDays = (data.roomSlotsByDay || []).filter((d) => d.roomId === room.id || d.roomName === room.name);
                return (
                  <div key={room.name} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `120px repeat(${Math.min(6, data.roomUtilization.length)}, 1fr)` }}>
                    <div className="text-[10px] text-[#201D1D] dark:text-[#FDFCFC] truncate flex items-center">{room.name}</div>
                    {[1, 2, 3, 4, 5, 6].map((day) => {
                      const dayData = roomDays.find((d) => d.dayOfWeek === day);
                      const count = dayData?.count || 0;
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
        </div>
      )}
    </div>
  );
}
