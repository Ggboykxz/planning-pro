"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Search,
  Plus,
  Trash2,
  Edit3,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sun,
  Palmtree,
  Calendar,
  List,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────

interface Holiday {
  id: string;
  institutionId: string;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Holiday type config ─────────────────────────────────────────

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  jour_férié: {
    label: "Jour férié",
    color: "#DC2626",
    bgColor: "bg-[#DC2626]/10 dark:bg-[#DC2626]/20",
    icon: Sun,
  },
  vacances_scolaires: {
    label: "Vacances scolaires",
    color: "#2563EB",
    bgColor: "bg-[#2563EB]/10 dark:bg-[#2563EB]/20",
    icon: Palmtree,
  },
  pont: {
    label: "Pont",
    color: "#D97706",
    bgColor: "bg-[#D97706]/10 dark:bg-[#D97706]/20",
    icon: AlertTriangle,
  },
  autre: {
    label: "Autre",
    color: "#9A9898",
    bgColor: "bg-[#9A9898]/10 dark:bg-[#9A9898]/20",
    icon: CalendarDays,
  },
};

// ─── French public holidays data ─────────────────────────────────

const FRENCH_PUBLIC_HOLIDAYS_2025: Omit<Holiday, "id" | "institutionId" | "createdAt" | "updatedAt">[] = [
  { name: "Jour de l'An", startDate: "2025-01-01", endDate: "2025-01-01", type: "jour_férié" },
  { name: "Lundi de Pâques", startDate: "2025-04-21", endDate: "2025-04-21", type: "jour_férié" },
  { name: "Fête du Travail", startDate: "2025-05-01", endDate: "2025-05-01", type: "jour_férié" },
  { name: "Victoire 1945", startDate: "2025-05-08", endDate: "2025-05-08", type: "jour_férié" },
  { name: "Ascension", startDate: "2025-05-29", endDate: "2025-05-29", type: "jour_férié" },
  { name: "Lundi de Pentecôte", startDate: "2025-06-09", endDate: "2025-06-09", type: "jour_férié" },
  { name: "Fête nationale", startDate: "2025-07-14", endDate: "2025-07-14", type: "jour_férié" },
  { name: "Assomption", startDate: "2025-08-15", endDate: "2025-08-15", type: "jour_férié" },
  { name: "Toussaint", startDate: "2025-11-01", endDate: "2025-11-01", type: "jour_férié" },
  { name: "Armistice 1918", startDate: "2025-11-11", endDate: "2025-11-11", type: "jour_férié" },
  { name: "Noël", startDate: "2025-12-25", endDate: "2025-12-25", type: "jour_férié" },
  // School holidays (Zone C - Paris)
  { name: "Vacances d'hiver", startDate: "2025-02-15", endDate: "2025-03-03", type: "vacances_scolaires" },
  { name: "Vacances de printemps", startDate: "2025-04-12", endDate: "2025-04-28", type: "vacances_scolaires" },
  { name: "Vacances d'été", startDate: "2025-07-05", endDate: "2025-09-01", type: "vacances_scolaires" },
  { name: "Vacances de la Toussaint", startDate: "2025-10-18", endDate: "2025-11-03", type: "vacances_scolaires" },
  { name: "Vacances de Noël", startDate: "2025-12-20", endDate: "2026-01-05", type: "vacances_scolaires" },
];

const FRENCH_PUBLIC_HOLIDAYS_2026: Omit<Holiday, "id" | "institutionId" | "createdAt" | "updatedAt">[] = [
  { name: "Jour de l'An", startDate: "2026-01-01", endDate: "2026-01-01", type: "jour_férié" },
  { name: "Lundi de Pâques", startDate: "2026-04-06", endDate: "2026-04-06", type: "jour_férié" },
  { name: "Fête du Travail", startDate: "2026-05-01", endDate: "2026-05-01", type: "jour_férié" },
  { name: "Victoire 1945", startDate: "2026-05-08", endDate: "2026-05-08", type: "jour_férié" },
  { name: "Ascension", startDate: "2026-05-14", endDate: "2026-05-14", type: "jour_férié" },
  { name: "Lundi de Pentecôte", startDate: "2026-05-25", endDate: "2026-05-25", type: "jour_férié" },
  { name: "Fête nationale", startDate: "2026-07-14", endDate: "2026-07-14", type: "jour_férié" },
  { name: "Assomption", startDate: "2026-08-15", endDate: "2026-08-15", type: "jour_férié" },
  { name: "Toussaint", startDate: "2026-11-01", endDate: "2026-11-01", type: "jour_férié" },
  { name: "Armistice 1918", startDate: "2026-11-11", endDate: "2026-11-11", type: "jour_férié" },
  { name: "Noël", startDate: "2026-12-25", endDate: "2026-12-25", type: "jour_férié" },
  // School holidays (Zone C - Paris)
  { name: "Vacances d'hiver", startDate: "2026-02-14", endDate: "2026-03-02", type: "vacances_scolaires" },
  { name: "Vacances de printemps", startDate: "2026-04-11", endDate: "2026-04-27", type: "vacances_scolaires" },
  { name: "Vacances d'été", startDate: "2026-07-04", endDate: "2026-09-01", type: "vacances_scolaires" },
  { name: "Vacances de la Toussaint", startDate: "2026-10-17", endDate: "2026-11-02", type: "vacances_scolaires" },
  { name: "Vacances de Noël", startDate: "2026-12-19", endDate: "2027-01-04", type: "vacances_scolaires" },
];

// ─── Helper functions ────────────────────────────────────────────

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function getDaysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const d = date.getTime();
  const s = new Date(startStr + "T00:00:00").getTime();
  const e = new Date(endStr + "T00:00:00").getTime();
  return d >= s && d <= e;
}

function getHolidaysForDate(date: Date, holidays: Holiday[]): Holiday[] {
  return holidays.filter((h) => isDateInRange(date, h.startDate, h.endDate));
}

// ─── Calendar month component ────────────────────────────────────

function CalendarMonth({
  year,
  month,
  holidays,
  onDayClick,
}: {
  year: number;
  month: number; // 0-indexed
  holidays: Holiday[];
  onDayClick?: (date: Date, holidays: Holiday[]) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // getDay returns 0 for Sunday, we need Monday=0
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;
  const daysInMonth = lastDay.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return (
    <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]" style={{ borderRadius: 0 }}>
      <div className="bg-[#F8F7F7] dark:bg-[#1A1A1A] px-3 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
        <h3 className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
          {MONTH_NAMES[month]} {year}
        </h3>
      </div>
      <div className="grid grid-cols-7">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="text-center text-[9px] font-bold text-[#9A9898] py-1 border-b border-[#E5E5E5] dark:border-[#2A2A2A]"
          >
            {day}
          </div>
        ))}
        {days.map((date, i) => {
          if (!date) {
            return (
              <div
                key={`empty-${i}`}
                className="h-8 border-b border-r border-[#E5E5E5] dark:border-[#2A2A2A] last:border-r-0"
              />
            );
          }
          const dayHolidays = getHolidaysForDate(date, holidays);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const primaryType = dayHolidays.length > 0 ? dayHolidays[0].type : null;
          const typeConf = primaryType ? typeConfig[primaryType] : null;

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "h-8 border-b border-r border-[#E5E5E5] dark:border-[#2A2A2A] last:border-r-0 flex items-center justify-center relative cursor-pointer hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
                isWeekend && !primaryType && "bg-[#F8F7F7]/50 dark:bg-[#1A1A1A]/50",
                typeConf?.bgColor
              )}
              onClick={() => onDayClick?.(date, dayHolidays)}
              title={dayHolidays.map((h) => h.name).join(", ") || undefined}
            >
              <span
                className={cn(
                  "text-[10px] font-mono",
                  isToday(date)
                    ? "font-bold text-[#201D1D] dark:text-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] h-5 w-5 flex items-center justify-center"
                    : isWeekend && !primaryType
                    ? "text-[#9A9898]"
                    : "text-[#201D1D] dark:text-[#FDFCFC]"
                )}
                style={isToday(date) ? { borderRadius: 0 } : undefined}
              >
                {date.getDate()}
              </span>
              {dayHolidays.length > 1 && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                  {dayHolidays.slice(0, 3).map((h, hi) => (
                    <span
                      key={hi}
                      className="h-1 w-1"
                      style={{ backgroundColor: typeConfig[h.type]?.color || "#9A9898", borderRadius: 0 }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Academic Year Timeline ──────────────────────────────────────

function AcademicTimeline({ holidays, year }: { holidays: Holiday[]; year: number }) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const filteredHolidays = holidays.filter((h) => {
    const startYear = new Date(h.startDate + "T00:00:00").getFullYear();
    const endYear = new Date(h.endDate + "T00:00:00").getFullYear();
    return startYear === year || endYear === year;
  });

  return (
    <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]" style={{ borderRadius: 0 }}>
      <div className="bg-[#F8F7F7] dark:bg-[#1A1A1A] px-4 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
        <h3 className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
          Année scolaire {year}-{year + 1}
        </h3>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Month headers */}
          <div className="grid grid-cols-12 mb-2">
            {months.map((m) => (
              <div key={m} className="text-[9px] font-bold text-[#9A9898] text-center">
                {MONTH_NAMES[m].slice(0, 3)}
              </div>
            ))}
          </div>

          {/* Holiday bars */}
          {filteredHolidays.length === 0 ? (
            <p className="text-[10px] text-[#9A9898] text-center py-4">
              Aucune période définie pour cette année
            </p>
          ) : (
            <div className="space-y-1">
              {filteredHolidays.map((h) => {
                const config = typeConfig[h.type] || typeConfig.autre;
                const startDate = new Date(h.startDate + "T00:00:00");
                const endDate = new Date(h.endDate + "T00:00:00");

                // Calculate start position (month-based)
                const startMonth = startDate.getMonth();
                const startDay = startDate.getDate();
                const startPercent = (startMonth + startDay / 30) / 12 * 100;

                const endMonth = endDate.getMonth();
                const endDay = endDate.getDate();
                const endPercent = (endMonth + endDay / 30) / 12 * 100;

                const width = Math.max(endPercent - startPercent, 2);

                return (
                  <div key={h.id} className="relative h-6">
                    <div
                      className="absolute top-0 h-full flex items-center px-1.5 group cursor-pointer"
                      style={{
                        left: `${startPercent}%`,
                        width: `${width}%`,
                        backgroundColor: config.color,
                        borderRadius: 0,
                        minWidth: "4px",
                      }}
                      title={`${h.name} (${formatDateShort(h.startDate)} → ${formatDateShort(h.endDate)})`}
                    >
                      <span className="text-[8px] font-bold text-white truncate">
                        {width > 8 ? h.name : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
            {Object.entries(typeConfig).map(([key, conf]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5"
                  style={{ backgroundColor: conf.color, borderRadius: 0 }}
                />
                <span className="text-[9px] text-[#9A9898]">{conf.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────

export default function HolidaysPage() {
  const { institutionId } = useAppStore();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "timeline">("calendar");

  // Calendar navigation
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    type: "jour_férié",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    startDate: "",
    endDate: "",
    type: "jour_férié",
  });

  // ─── Data loading ──────────────────────────────────────────────

  const loadHolidays = useCallback(async () => {
    if (!institutionId) return;
    try {
      const res = await fetch(`/api/holidays?institutionId=${institutionId}`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch {
      toast.error("Erreur lors du chargement des vacances");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  // ─── Filtering ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return holidays.filter((h) => {
      if (search) {
        if (!h.name.toLowerCase().includes(search.toLowerCase())) return false;
      }
      if (typeFilter !== "all" && h.type !== typeFilter) return false;
      return true;
    });
  }, [holidays, search, typeFilter]);

  // ─── Stats ─────────────────────────────────────────────────────

  const totalHolidays = holidays.length;
  const joursFeries = holidays.filter((h) => h.type === "jour_férié").length;
  const vacancesScolaires = holidays.filter((h) => h.type === "vacances_scolaires").length;
  const totalDays = holidays.reduce((sum, h) => sum + getDaysBetween(h.startDate, h.endDate), 0);

  // ─── Actions ───────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name || !form.startDate || !form.endDate || !form.type) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          type: form.type,
        }),
      });
      if (res.ok) {
        toast.success("Période ajoutée ✓");
        setDialogOpen(false);
        setForm({ name: "", startDate: "", endDate: "", type: "jour_férié" });
        loadHolidays();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la création");
      }
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name || !editForm.startDate || !editForm.endDate || !editForm.type) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (editForm.endDate < editForm.startDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          type: editForm.type,
        }),
      });
      if (res.ok) {
        toast.success("Période modifiée ✓");
        setEditDialogOpen(false);
        loadHolidays();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la modification");
      }
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Période supprimée ✓");
        loadHolidays();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportFrenchHolidays = async (yearChoice: "2025" | "2026" | "both") => {
    setSubmitting(true);
    let toImport: Omit<Holiday, "id" | "institutionId" | "createdAt" | "updatedAt">[] = [];
    if (yearChoice === "2025") toImport = FRENCH_PUBLIC_HOLIDAYS_2025;
    else if (yearChoice === "2026") toImport = FRENCH_PUBLIC_HOLIDAYS_2026;
    else toImport = [...FRENCH_PUBLIC_HOLIDAYS_2025, ...FRENCH_PUBLIC_HOLIDAYS_2026];

    // Filter out already existing holidays by name
    const existingNames = new Set(holidays.map((h) => h.name));
    const newHolidays = toImport.filter((h) => !existingNames.has(h.name));

    if (newHolidays.length === 0) {
      toast.info("Toutes les périodes sont déjà importées");
      setSubmitting(false);
      setImportDialogOpen(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const holiday of newHolidays) {
      try {
        const res = await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId,
            ...holiday,
          }),
        });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} période(s) importée(s) ✓`);
      loadHolidays();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erreur(s) lors de l'import`);
    }
    setSubmitting(false);
    setImportDialogOpen(false);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditForm({
      id: holiday.id,
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      type: holiday.type,
    });
    setEditDialogOpen(true);
  };

  const handleCalendarDayClick = (date: Date, dayHolidays: Holiday[]) => {
    if (dayHolidays.length === 1) {
      openEditDialog(dayHolidays[0]);
    }
  };

  // ─── Calendar months to display ────────────────────────────────

  const calendarMonths = useMemo(() => {
    const months: { year: number; month: number }[] = [];
    for (let i = 0; i < 12; i++) {
      months.push({ year: calendarYear, month: i });
    }
    return months;
  }, [calendarYear]);

  // ─── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-48 skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <div className="h-8 skeleton-shimmer w-12 mb-2" />
              <div className="h-3 skeleton-shimmer w-24" />
            </div>
          ))}
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <div className="h-64 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
          <div>
            <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Gestion des vacances
            </h1>
            <p className="text-xs text-[#9A9898] mt-0.5">
              Jours fériés, vacances scolaires et ponts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A] gap-1"
          >
            <Download className="h-3 w-3" />
            Importer
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
          >
            <Plus className="h-3 w-3" />
            Ajouter une période
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4" style={{ borderRadius: 0 }}>
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{totalHolidays}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Total périodes</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4" style={{ borderRadius: 0 }}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 bg-[#DC2626]" style={{ borderRadius: 0 }} />
            <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{joursFeries}</p>
          </div>
          <p className="text-[10px] text-[#9A9898] mt-1">Jours fériés</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4" style={{ borderRadius: 0 }}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 bg-[#2563EB]" style={{ borderRadius: 0 }} />
            <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{vacancesScolaires}</p>
          </div>
          <p className="text-[10px] text-[#9A9898] mt-1">Vacances scolaires</p>
        </div>
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4" style={{ borderRadius: 0 }}>
          <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{totalDays}</p>
          <p className="text-[10px] text-[#9A9898] mt-1">Jours non travaillés</p>
        </div>
      </div>

      {/* View mode toggle + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex border border-[#E5E5E5] dark:border-[#2A2A2A]" style={{ borderRadius: 0 }}>
          {[
            { key: "calendar" as const, icon: Calendar, label: "Calendrier" },
            { key: "list" as const, icon: List, label: "Liste" },
            { key: "timeline" as const, icon: Palmtree, label: "Année scolaire" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold transition-colors",
                viewMode === key
                  ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                  : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
              )}
              style={{ borderRadius: 0 }}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom..."
            className="pl-9 text-xs font-mono"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="jour_férié">Jour férié</SelectItem>
            <SelectItem value="vacances_scolaires">Vacances scolaires</SelectItem>
            <SelectItem value="pont">Pont</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Calendar View ───────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalendarYear((y) => y - 1)}
              className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors border border-[#E5E5E5] dark:border-[#2A2A2A]"
              style={{ borderRadius: 0 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {calendarYear}
            </h2>
            <button
              onClick={() => setCalendarYear((y) => y + 1)}
              className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors border border-[#E5E5E5] dark:border-[#2A2A2A]"
              style={{ borderRadius: 0 }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {calendarMonths.map(({ year, month }) => (
              <CalendarMonth
                key={`${year}-${month}`}
                year={year}
                month={month}
                holidays={filtered}
                onDayClick={handleCalendarDayClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── List View ───────────────────────────────────────────── */}
      {viewMode === "list" && (
        <>
          {filtered.length === 0 ? (
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-12 text-center" style={{ borderRadius: 0 }}>
              <CalendarDays className="h-10 w-10 text-[#9A9898] mx-auto mb-3 opacity-30" />
              <p className="text-xs text-[#9A9898]">Aucune période définie</p>
              <p className="text-[10px] text-[#9A9898] mt-1">
                Cliquez sur &quot;Ajouter une période&quot; ou &quot;Importer&quot; pour commencer
              </p>
            </div>
          ) : (
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto" style={{ borderRadius: 0 }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Nom</th>
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Dates</th>
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Jours</th>
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Type</th>
                    <th className="text-right p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                    .map((holiday) => {
                      const config = typeConfig[holiday.type] || typeConfig.autre;
                      const Icon = config.icon;
                      const days = getDaysBetween(holiday.startDate, holiday.endDate);
                      const isLoading = actionLoading === holiday.id;

                      return (
                        <tr
                          key={holiday.id}
                          className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 shrink-0"
                                style={{ backgroundColor: config.color, borderRadius: 0 }}
                              />
                              <span className="text-[#201D1D] dark:text-[#FDFCFC] font-bold">
                                {holiday.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                            {formatDateShort(holiday.startDate)} → {formatDateShort(holiday.endDate)}
                          </td>
                          <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                            {days}j
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3 w-3 shrink-0" style={{ color: config.color }} />
                              <span className="text-[#201D1D] dark:text-[#FDFCFC]">{config.label}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-[#9A9898]" />}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-7 gap-1 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                                disabled={isLoading}
                                onClick={() => openEditDialog(holiday)}
                              >
                                <Edit3 className="h-3 w-3" />
                                Modifier
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-7 gap-1 text-[#9A9898] hover:text-[#DC2626]"
                                disabled={isLoading}
                                onClick={() => handleDelete(holiday.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── Timeline View ───────────────────────────────────────── */}
      {viewMode === "timeline" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalendarYear((y) => y - 1)}
              className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors border border-[#E5E5E5] dark:border-[#2A2A2A]"
              style={{ borderRadius: 0 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              {calendarYear}-{calendarYear + 1}
            </h2>
            <button
              onClick={() => setCalendarYear((y) => y + 1)}
              className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors border border-[#E5E5E5] dark:border-[#2A2A2A]"
              style={{ borderRadius: 0 }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <AcademicTimeline holidays={filtered} year={calendarYear} />
        </div>
      )}

      {/* ─── Add Holiday Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Ajouter une période
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ex: Vacances de Noël"
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Date de début *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Date de fin *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jour_férié">Jour férié</SelectItem>
                  <SelectItem value="vacances_scolaires">Vacances scolaires</SelectItem>
                  <SelectItem value="pont">Pont</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Preview */}
            {form.startDate && form.endDate && (
              <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3" style={{ borderRadius: 0 }}>
                <p className="text-[10px] font-bold text-[#9A9898] uppercase mb-1">Aperçu</p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3"
                    style={{ backgroundColor: typeConfig[form.type]?.color || "#9A9898", borderRadius: 0 }}
                  />
                  <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC] font-bold">
                    {form.name || "Sans nom"}
                  </span>
                  <span className="text-[10px] text-[#9A9898]">
                    ({formatDateShort(form.startDate)} → {formatDateShort(form.endDate)}, {form.endDate >= form.startDate ? getDaysBetween(form.startDate, form.endDate) : 0}j)
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.name || !form.startDate || !form.endDate}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Holiday Dialog ─────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Modifier la période
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Nom *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Date de début *</Label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Date de fin *</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Type *</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger className="mt-1 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jour_férié">Jour férié</SelectItem>
                  <SelectItem value="vacances_scolaires">Vacances scolaires</SelectItem>
                  <SelectItem value="pont">Pont</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={submitting || !editForm.name || !editForm.startDate || !editForm.endDate}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import French Holidays Dialog ───────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Download className="h-4 w-4" />
              Importer les jours fériés français
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[#646262] dark:text-[#9A9898]">
              Importez automatiquement les jours fériés et vacances scolaires français
              (Zone C - Paris). Les périodes déjà existantes ne seront pas dupliquées.
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#9A9898] uppercase">Choisir l&apos;année :</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleImportFrenchHolidays("2025")}
                  disabled={submitting}
                  className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 text-center hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">2025</p>
                  <p className="text-[9px] text-[#9A9898]">{FRENCH_PUBLIC_HOLIDAYS_2025.length} périodes</p>
                </button>
                <button
                  onClick={() => handleImportFrenchHolidays("2026")}
                  disabled={submitting}
                  className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 text-center hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">2026</p>
                  <p className="text-[9px] text-[#9A9898]">{FRENCH_PUBLIC_HOLIDAYS_2026.length} périodes</p>
                </button>
                <button
                  onClick={() => handleImportFrenchHolidays("both")}
                  disabled={submitting}
                  className="border border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] p-3 text-center hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ borderRadius: 0 }}
                >
                  <p className="text-sm font-bold text-[#FDFCFC] dark:text-[#0A0A0A]">Les deux</p>
                  <p className="text-[9px] text-[#FDFCFC]/70 dark:text-[#0A0A0A]/70">
                    {FRENCH_PUBLIC_HOLIDAYS_2025.length + FRENCH_PUBLIC_HOLIDAYS_2026.length} périodes
                  </p>
                </button>
              </div>
            </div>
            {submitting && (
              <div className="flex items-center gap-2 text-xs text-[#9A9898]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Import en cours...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={submitting}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
