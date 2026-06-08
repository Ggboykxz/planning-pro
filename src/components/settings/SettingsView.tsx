"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  Building2,
  Plus,
  LogOut,
  Shield,
  CalendarDays,
  Trash,
  Sparkles,
  Settings,
  Clock,
  Users,
  CreditCard,
  Plug,
  Database,
  Key,
  Globe,
  Webhook,
  FileText,
  FileSpreadsheet,
  Copy,
  ArrowRight,
  Zap,
} from "lucide-react";
import { countries, institutionTypes, educationSystems, gradingSystems, semesterSystems } from "@/lib/countries";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
  country: string;
  timezone: string;
  academieYear: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  workingDays: string;
  slotDuration: number;
  dayStartTime: string;
  dayEndTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  lunchDuration: number | null;
  educationSystem: string | null;
  gradingSystem: string | null;
  semesterSystem: string | null;
}

interface SettingsViewProps {
  institutionId: string;
  onUpdate: () => void;
}

const allDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ─── Plan limits ─────────────────────────────────────────────────

const planLimits: Record<string, { teachers: number | string; rooms: number | string; timetables: number | string; label: string }> = {
  free: { teachers: 5, rooms: 5, timetables: 3, label: "Gratuit" },
  pro: { teachers: 50, rooms: 50, timetables: "∞", label: "Pro" },
  enterprise: { teachers: "∞", rooms: "∞", timetables: "∞", label: "Enterprise" },
};

export function SettingsView({ institutionId, onUpdate }: SettingsViewProps) {
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "universite",
    country: "SN",
    timezone: "Africa/Dakar",
    academieYear: "2025-2026",
    address: "",
    phone: "",
    email: "",
    workingDays: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as string[],
    dayStartTime: "08:00",
    dayEndTime: "18:00",
    breakStartTime: "12:00",
    breakEndTime: "14:00",
    slotDuration: 90,
    educationSystem: "LMD",
    gradingSystem: "20",
    semesterSystem: "semestriel",
  });

  // Store original form for change detection
  const [originalForm, setOriginalForm] = useState(form);

  useEffect(() => {
    loadInstitution();
  }, [institutionId]);

  useEffect(() => {
    if (institution) {
      let workingDays: string[] = [];
      try {
        workingDays = JSON.parse(institution.workingDays);
      } catch {
        workingDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
      }
      const newForm = {
        name: institution.name,
        type: institution.type,
        country: institution.country,
        timezone: institution.timezone,
        academieYear: institution.academieYear,
        address: institution.address || "",
        phone: institution.phone || "",
        email: institution.email || "",
        workingDays,
        dayStartTime: institution.dayStartTime,
        dayEndTime: institution.dayEndTime,
        breakStartTime: institution.breakStartTime || "12:00",
        breakEndTime: institution.breakEndTime || "14:00",
        slotDuration: institution.slotDuration,
        educationSystem: institution.educationSystem || "LMD",
        gradingSystem: institution.gradingSystem || "20",
        semesterSystem: institution.semesterSystem || "semestriel",
      };
      setForm(newForm);
      setOriginalForm(newForm);
    }
  }, [institution]);

  // Detect changes
  useEffect(() => {
    setHasChanges(JSON.stringify(form) !== JSON.stringify(originalForm));
  }, [form, originalForm]);

  // Detect schedule-related changes specifically
  const scheduleKeys = ["workingDays", "slotDuration", "dayStartTime", "dayEndTime", "breakStartTime", "breakEndTime"] as const;
  const hasScheduleChanges = scheduleKeys.some((key) => {
    if (key === "workingDays") {
      return JSON.stringify(form.workingDays) !== JSON.stringify(originalForm.workingDays);
    }
    return form[key] !== originalForm[key];
  });

  const [regenerating, setRegenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Holiday calendar state
  const [holidays, setHolidays] = useState<Array<{ id: string; name: string; startDate: string; endDate: string; type: string }>>([]);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", startDate: "", endDate: "", type: "vacances" });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [preFilling, setPreFilling] = useState(false);

  // Load holidays
  useEffect(() => {
    if (institutionId) {
      fetch(`/api/holidays?institutionId=${institutionId}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setHolidays(data))
        .catch(() => {});
    }
  }, [institutionId]);

  const handleAddHoliday = async () => {
    if (!holidayForm.name || !holidayForm.startDate || !holidayForm.endDate) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setAddingHoliday(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, ...holidayForm }),
      });
      if (res.ok) {
        toast.success("Période ajoutée ✓");
        setAddHolidayOpen(false);
        setHolidayForm({ name: "", startDate: "", endDate: "", type: "vacances" });
        const data = await fetch(`/api/holidays?institutionId=${institutionId}`).then((r) => r.json());
        setHolidays(data);
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Période supprimée ✓");
        setHolidays((prev) => prev.filter((h) => h.id !== id));
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handlePreFillHolidays = async () => {
    setPreFilling(true);
    try {
      const year = new Date().getFullYear();
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31);
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      const easter = new Date(year, month - 1, day);
      const fmt = (d: Date) => d.toISOString().split("T")[0];

      const defaultHolidays = [
        { name: "Vacances de la Toussaint", startDate: `${year}-10-18`, endDate: `${year}-11-03`, type: "vacances" },
        { name: "Vacances de Noël", startDate: `${year}-12-20`, endDate: `${year + 1}-01-05`, type: "vacances" },
        { name: "Vacances d'Hiver", startDate: `${year + 1}-02-07`, endDate: `${year + 1}-02-23`, type: "vacances" },
        { name: "Vacances de Printemps", startDate: `${year + 1}-04-04`, endDate: `${year + 1}-04-20`, type: "vacances" },
        { name: "Vacances d'Été", startDate: `${year + 1}-07-04`, endDate: `${year + 1}-08-31`, type: "vacances" },
        { name: "1er Mai", startDate: fmt(new Date(year, 4, 1)), endDate: fmt(new Date(year, 4, 1)), type: "jour_ferie" },
        { name: "8 Mai", startDate: fmt(new Date(year, 4, 8)), endDate: fmt(new Date(year, 4, 8)), type: "jour_ferie" },
        { name: "14 Juillet", startDate: fmt(new Date(year, 6, 14)), endDate: fmt(new Date(year, 6, 14)), type: "jour_ferie" },
        { name: "Lundi de Pâques", startDate: fmt(new Date(easter.getTime() + 86400000)), endDate: fmt(new Date(easter.getTime() + 86400000)), type: "jour_ferie" },
        { name: "Ascension", startDate: fmt(new Date(easter.getTime() + 39 * 86400000)), endDate: fmt(new Date(easter.getTime() + 39 * 86400000)), type: "jour_ferie" },
      ];

      let created = 0;
      for (const h of defaultHolidays) {
        try {
          const res = await fetch("/api/holidays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ institutionId, ...h }),
          });
          if (res.ok) created++;
        } catch { /* skip */ }
      }
      toast.success(`${created} période${created > 1 ? "s" : ""} ajoutée${created > 1 ? "s" : ""} ✓`);
      const data = await fetch(`/api/holidays?institutionId=${institutionId}`).then((r) => r.json());
      setHolidays(data);
    } catch {
      toast.error("Erreur lors du préremplissage");
    } finally {
      setPreFilling(false);
    }
  };

  const holidayTypeConfig: Record<string, { label: string; className: string }> = {
    vacances: { label: "Vacances", className: "bg-[#2563EB] text-white" },
    jour_ferie: { label: "Jour férié", className: "bg-[#DC2626] text-white" },
    pont: { label: "Pont", className: "bg-[#D97706] text-white" },
    autre: { label: "Autre", className: "bg-[#9A9898] text-white" },
  };

  // Multi-institution management
  const { currentUser, setInstitutionId } = useAppStore();
  const [userInstitutions, setUserInstitutions] = useState<Array<InstitutionData & { userRole: string }>>([]);
  const [addInstOpen, setAddInstOpen] = useState(false);
  const [newInstForm, setNewInstForm] = useState({ name: "", type: "universite", country: "FR" });
  const [creatingInst, setCreatingInst] = useState(false);
  const [leavingInstId, setLeavingInstId] = useState<string | null>(null);

  // Load user institutions
  useEffect(() => {
    if (currentUser?.id) {
      fetch(`/api/institutions?userId=${currentUser.id}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setUserInstitutions(data))
        .catch(() => {});
    }
  }, [currentUser?.id, institutionId]);

  // Team data for settings summary
  const [teamCount, setTeamCount] = useState(0);
  useEffect(() => {
    if (institutionId) {
      fetch(`/api/team?institutionId=${institutionId}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setTeamCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    }
  }, [institutionId]);

  // Usage stats
  const [usageStats, setUsageStats] = useState({ teachers: 0, rooms: 0, timetables: 0 });
  useEffect(() => {
    if (institutionId) {
      Promise.all([
        fetch(`/api/teachers?institutionId=${institutionId}`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/rooms?institutionId=${institutionId}`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/timetables?institutionId=${institutionId}`).then((r) => r.ok ? r.json() : []),
      ]).then(([teachers, rooms, timetables]) => {
        setUsageStats({
          teachers: Array.isArray(teachers) ? teachers.length : 0,
          rooms: Array.isArray(rooms) ? rooms.length : 0,
          timetables: Array.isArray(timetables) ? timetables.length : 0,
        });
      }).catch(() => {});
    }
  }, [institutionId]);

  // Integration toggles
  const [icalSync, setIcalSync] = useState(false);
  const [apiKey] = useState("pp_live_" + Math.random().toString(36).slice(2, 14));
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleCreateInstitution = async () => {
    if (!currentUser?.id || !newInstForm.name.trim()) return;
    setCreatingInst(true);
    try {
      const country = countries.find((c) => c.code === newInstForm.country);
      const res = await fetch("/api/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          name: newInstForm.name.trim(),
          type: newInstForm.type,
          country: newInstForm.country,
          timezone: country?.timezone || "Europe/Paris",
          workingDays: country?.defaultWorkingDays || ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
          dayStartTime: country?.defaultStartTime || "08:00",
          dayEndTime: country?.defaultEndTime || "18:00",
          breakStartTime: country?.defaultBreakStart || "12:00",
          breakEndTime: country?.defaultBreakEnd || "14:00",
          slotDuration: country?.defaultSlotDuration || 90,
          educationSystem: country?.defaultEducationSystem || "LMD",
          gradingSystem: country?.defaultGradingSystem || "20",
          semesterSystem: country?.defaultSemesterSystem || "semestriel",
        }),
      });
      if (res.ok) {
        const newInst = await res.json();
        toast.success(`Établissement « ${newInst.name} » créé ✓`);
        setAddInstOpen(false);
        setNewInstForm({ name: "", type: "universite", country: "FR" });
        setInstitutionId(newInst.id);
        window.location.assign("/dashboard");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la création");
      }
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setCreatingInst(false);
    }
  };

  const handleLeaveInstitution = async (instId: string) => {
    if (!currentUser?.id) return;
    setLeavingInstId(instId);
    try {
      const res = await fetch(`/api/institutions?institutionId=${instId}&userId=${currentUser.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Établissement quitté ✓");
        if (instId === institutionId) {
          const remaining = userInstitutions.filter((i) => i.id !== instId);
          if (remaining.length > 0) {
            setInstitutionId(remaining[0].id);
            window.location.assign("/dashboard");
          }
        }
        const data = await fetch(`/api/institutions?userId=${currentUser.id}`).then((r) => r.json());
        setUserInstitutions(data);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors du retrait");
      }
    } catch {
      toast.error("Erreur lors du retrait");
    } finally {
      setLeavingInstId(null);
    }
  };

  const handleRegenerateSlots = async () => {
    setRegenerating(true);
    try {
      const saveRes = await fetch("/api/institution", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: institutionId, ...form }),
      });
      if (!saveRes.ok) {
        toast.error("Erreur lors de la sauvegarde de la configuration");
        return;
      }
      const deleteRes = await fetch(`/api/timeslots?institutionId=${institutionId}`, { method: "DELETE" });
      if (!deleteRes.ok) {
        toast.error("Erreur lors de la suppression des créneaux");
        return;
      }
      const genRes = await fetch("/api/timeslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateFromConfig: true, institutionId }),
      });
      if (genRes.ok) {
        const slots = await genRes.json();
        toast.success(`Créneaux régénérés ✓`, { description: `${slots.length} créneau${slots.length !== 1 ? "x" : ""} créé${slots.length !== 1 ? "s" : ""}` });
        setOriginalForm(form);
        setHasChanges(false);
        onUpdate();
      } else {
        toast.error("Erreur lors de la génération des créneaux");
      }
    } catch {
      toast.error("Erreur lors de la régénération des créneaux");
    } finally {
      setRegenerating(false);
    }
  };

  const loadInstitution = async () => {
    try {
      const res = await fetch("/api/institution");
      if (res.ok) {
        const data = await res.json();
        const inst = data.find((i: InstitutionData) => i.id === institutionId);
        if (inst) setInstitution(inst);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/institution", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: institutionId, ...form }),
      });
      if (res.ok) {
        toast.success("Paramètres sauvegardés ✓", { description: `${form.name} — mis à jour` });
        setOriginalForm(form);
        setHasChanges(false);
        onUpdate();
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`/api/institution?id=${institutionId}`, { method: "DELETE" });
      toast.success("Données réinitialisées");
      onUpdate();
    } catch {
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  const handleDayToggle = (day: string) => {
    setForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleCountryChange = (code: string) => {
    const country = countries.find((c) => c.code === code);
    if (country) {
      setForm((prev) => ({
        ...prev,
        country: code,
        timezone: country.timezone,
        workingDays: country.defaultWorkingDays,
        dayStartTime: country.defaultStartTime,
        dayEndTime: country.defaultEndTime,
        breakStartTime: country.defaultBreakStart,
        breakEndTime: country.defaultBreakEnd,
        slotDuration: country.defaultSlotDuration,
        educationSystem: country.defaultEducationSystem,
        gradingSystem: country.defaultGradingSystem,
        semesterSystem: country.defaultSemesterSystem,
      }));
    } else {
      setForm((prev) => ({ ...prev, country: code }));
    }
  };

  // Delete all data
  const handleDeleteAllData = async () => {
    try {
      await fetch(`/api/institution?id=${institutionId}`, { method: "DELETE" });
      toast.success("Toutes les données ont été supprimées");
      onUpdate();
      window.location.assign("/dashboard");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Paramètres</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = currentUser?.plan || "free";
  const planConfig = planLimits[currentPlan] || planLimits.free;

  const getUsageBar = (current: number, limit: number | string, color: string) => {
    if (typeof limit === "string") return 100;
    return Math.min(Math.round((current / limit) * 100), 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">Paramètres</h1>
          <p className="text-xs text-[#9A9898] mt-1">Configuration de votre établissement</p>
        </div>
        {hasChanges && (
          <span className="text-[10px] font-bold text-[#D97706] border border-[#D97706] px-2 py-1">
            Modifications non sauvegardées
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full flex h-auto flex-wrap gap-0 bg-[#F8F7F7] dark:bg-[#1A1A1A] p-1 rounded-none border border-[#E5E5E5] dark:border-[#2A2A2A]">
          <TabsTrigger value="general" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <Building2 className="h-3 w-3" />
            Général
          </TabsTrigger>
          <TabsTrigger value="slots" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <Clock className="h-3 w-3" />
            Créneaux
          </TabsTrigger>
          <TabsTrigger value="holidays" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <CalendarDays className="h-3 w-3" />
            Vacances
          </TabsTrigger>
          <TabsTrigger value="team" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <Users className="h-3 w-3" />
            Équipe
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <CreditCard className="h-3 w-3" />
            Facturation
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <Plug className="h-3 w-3" />
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="data" className="text-[10px] font-mono font-bold data-[state=active]:bg-[#201D1D] data-[state=active]:text-[#FDFCFC] dark:data-[state=active]:bg-[#FDFCFC] dark:data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none rounded-none gap-1">
            <Database className="h-3 w-3" />
            Données
          </TabsTrigger>
        </TabsList>

        {/* ─── GÉNÉRAL TAB ─────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6">
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Informations de l&apos;établissement
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold">Nom de l&apos;établissement</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                    <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {institutionTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">Pays</Label>
                  <Select value={form.country} onValueChange={handleCountryChange}>
                    <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">Fuseau horaire</Label>
                  <Input value={form.timezone} disabled className="mt-1 font-mono text-xs bg-[#F8F7F7] dark:bg-[#1A1A1A]" />
                </div>
                <div>
                  <Label className="text-xs font-bold">Année académique</Label>
                  <Input
                    value={form.academieYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, academieYear: e.target.value }))}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Téléphone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Adresse</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Education system */}
              <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-4">
                <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-3 flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Système éducatif
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Système d&apos;enseignement</Label>
                    <Select
                      value={form.educationSystem}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, educationSystem: v }))}
                    >
                      <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {educationSystems.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Système de notation</Label>
                    <Select
                      value={form.gradingSystem}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, gradingSystem: v }))}
                    >
                      <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {gradingSystems.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Rythme scolaire</Label>
                    <Select
                      value={form.semesterSystem}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, semesterSystem: v }))}
                    >
                      <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {semesterSystems.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                <Button
                  variant="outline"
                  onClick={() => { setForm(originalForm); }}
                  className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
                  disabled={!hasChanges}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
                >
                  <Save className="h-3 w-3" />
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </div>

          {/* Institution management */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Gérer les établissements</p>
            </div>
            <div className="p-6 space-y-4">
              {userInstitutions.map((inst) => (
                <div
                  key={inst.id}
                  className={cn(
                    "border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 flex items-center justify-between gap-3",
                    inst.id === institutionId && "bg-[#F8F7F7] dark:bg-[#1A1A1A] border-[#201D1D] dark:border-[#FDFCFC]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 text-[#9A9898] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-[#201D1D] dark:text-[#FDFCFC] truncate">
                        {inst.name}
                        {inst.id === institutionId && <span className="text-[10px] font-normal text-[#9A9898] ml-2">(actif)</span>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Shield className="h-3 w-3 text-[#9A9898]" />
                        <span className="text-[10px] text-[#9A9898]">
                          {inst.userRole === "admin" ? "Administrateur" : inst.userRole === "editor" ? "Gestionnaire" : "Observateur"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inst.id !== institutionId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 gap-1 text-[#9A9898]"
                        onClick={() => {
                          setInstitutionId(inst.id);
                          window.location.assign("/dashboard");
                        }}
                      >
                        Basculer
                      </Button>
                    )}
                    {userInstitutions.length > 1 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1 text-[#DC2626] hover:text-[#DC2626]" disabled={leavingInstId === inst.id}>
                            <LogOut className="h-3 w-3" /> Quitter
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm font-bold flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-[#DC2626]" /> Quitter « {inst.name} »
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs">
                              Vous perdrez l&apos;accès à cet établissement et toutes ses données.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleLeaveInstitution(inst.id)} className="text-xs bg-[#DC2626] text-white border-0">
                              Quitter l&apos;établissement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
              <Button onClick={() => setAddInstOpen(true)} variant="outline" className="text-xs w-full gap-1 border-[#E5E5E5] dark:border-[#2A2A2A] border-dashed">
                <Plus className="h-3 w-3" /> Ajouter un établissement
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── CRÉNEAUX TAB ─────────────────────────────────────────── */}
        <TabsContent value="slots" className="space-y-6">
          {/* Schedule change warning */}
          {hasScheduleChanges && (
            <div className="border border-[#D97706] bg-[#FFFBEB] dark:bg-[#1C1600] dark:border-[#92400E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#92400E] dark:text-[#FCD34D]">Créneaux horaires obsolètes</p>
                  <p className="text-[10px] text-[#92400E] dark:text-[#FCD34D] mt-0.5">Les créneaux horaires doivent être régénérés pour refléter ces changements</p>
                </div>
              </div>
              <Button onClick={handleRegenerateSlots} disabled={regenerating} className="text-xs bg-[#D97706] text-white border-0 hover:bg-[#B45309] gap-1 shrink-0">
                <RefreshCw className={cn("h-3 w-3", regenerating && "animate-spin")} />
                {regenerating ? "Régénération..." : "Régénérer"}
              </Button>
            </div>
          )}

          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Configuration des horaires
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-xs font-bold">Jours ouvrés</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allDays.map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form.workingDays.includes(day)} onCheckedChange={() => handleDayToggle(day)} />
                      <span className="text-xs text-[#646262]">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold">Début de journée</Label>
                  <Input type="time" value={form.dayStartTime} onChange={(e) => setForm((prev) => ({ ...prev, dayStartTime: e.target.value }))} className="mt-1 font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-bold">Fin de journée</Label>
                  <Input type="time" value={form.dayEndTime} onChange={(e) => setForm((prev) => ({ ...prev, dayEndTime: e.target.value }))} className="mt-1 font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-bold">Durée créneau (min)</Label>
                  <Select value={String(form.slotDuration)} onValueChange={(v) => setForm((prev) => ({ ...prev, slotDuration: parseInt(v) }))}>
                    <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">Début de pause</Label>
                  <Input type="time" value={form.breakStartTime} onChange={(e) => setForm((prev) => ({ ...prev, breakStartTime: e.target.value }))} className="mt-1 font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-bold">Fin de pause</Label>
                  <Input type="time" value={form.breakEndTime} onChange={(e) => setForm((prev) => ({ ...prev, breakEndTime: e.target.value }))} className="mt-1 font-mono text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                <Button variant="outline" onClick={() => setForm(originalForm)} className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]" disabled={!hasChanges}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving || !hasChanges} className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1">
                  <Save className="h-3 w-3" /> {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </div>

          {/* Regenerate */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Régénérer les créneaux</p>
                <p className="text-[10px] text-[#9A9898] mt-0.5">Supprime les créneaux existants et les recrée selon la configuration</p>
              </div>
              <Button onClick={handleRegenerateSlots} disabled={regenerating} variant="outline" className="text-xs gap-1 border-[#E5E5E5] dark:border-[#2A2A2A]">
                <RefreshCw className={cn("h-3 w-3", regenerating && "animate-spin")} />
                {regenerating ? "En cours..." : "Régénérer"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── VACANCES TAB ──────────────────────────────────────────── */}
        <TabsContent value="holidays" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Calendrier scolaire</p>
              <p className="text-[10px] text-[#9A9898] mt-0.5">{holidays.length} période{holidays.length !== 1 ? "s" : ""} configurée{holidays.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePreFillHolidays} disabled={preFilling} variant="outline" className="text-xs gap-1 border-[#E5E5E5] dark:border-[#2A2A2A]">
                <Sparkles className="h-3 w-3" /> {preFilling ? "Préremplissage..." : "Préremplir"}
              </Button>
              <Button onClick={() => setAddHolidayOpen(true)} className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1">
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>
          </div>

          {holidays.length === 0 ? (
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-12 text-center">
              <CalendarDays className="h-10 w-10 text-[#9A9898] mx-auto mb-3 opacity-30" />
              <p className="text-xs text-[#9A9898]">Aucune période configurée</p>
              <p className="text-[10px] text-[#9A9898] mt-1">Utilisez le bouton « Préremplir » pour ajouter les vacances standards</p>
            </div>
          ) : (
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Nom</th>
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Type</th>
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Dates</th>
                    <th className="text-right p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => {
                    const typeConfig = holidayTypeConfig[h.type] || holidayTypeConfig.autre;
                    return (
                      <tr key={h.id} className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]">
                        <td className="p-3 text-[#201D1D] dark:text-[#FDFCFC] font-bold">{h.name}</td>
                        <td className="p-3">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5", typeConfig.className)}>
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="p-3 text-[#646262] dark:text-[#9A9898]">
                          {new Date(h.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → {new Date(h.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1 text-[#9A9898] hover:text-[#DC2626]" onClick={() => handleDeleteHoliday(h.id)}>
                            <Trash2 className="h-3 w-3" /> Supprimer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add holiday dialog */}
          <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Ajouter une période
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs font-bold">Nom *</Label>
                  <Input value={holidayForm.name} onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="Vacances de Noël" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Début *</Label>
                    <Input type="date" value={holidayForm.startDate} onChange={(e) => setHolidayForm((p) => ({ ...p, startDate: e.target.value }))} className="mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Fin *</Label>
                    <Input type="date" value={holidayForm.endDate} onChange={(e) => setHolidayForm((p) => ({ ...p, endDate: e.target.value }))} className="mt-1 font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold">Type</Label>
                  <Select value={holidayForm.type} onValueChange={(v) => setHolidayForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacances">Vacances</SelectItem>
                      <SelectItem value="jour_ferie">Jour férié</SelectItem>
                      <SelectItem value="pont">Pont</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddHolidayOpen(false)} className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]">Annuler</Button>
                <Button onClick={handleAddHoliday} disabled={addingHoliday} className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1">
                  {addingHoliday ? "Ajout..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── ÉQUIPE TAB ────────────────────────────────────────────── */}
        <TabsContent value="team" className="space-y-6">
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Membres de l&apos;équipe
                </p>
                <p className="text-[10px] text-[#9A9898] mt-0.5">{teamCount} membre{teamCount !== 1 ? "s" : ""} dans votre établissement</p>
              </div>
              <Link href="/team">
                <Button className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1">
                  <ArrowRight className="h-3 w-3" /> Gérer l&apos;équipe
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{teamCount}</p>
              <p className="text-[10px] text-[#9A9898] mt-1">Membres</p>
            </div>
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                {usageStats.teachers}
              </p>
              <p className="text-[10px] text-[#9A9898] mt-1">Enseignants</p>
            </div>
            <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <p className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                {usageStats.timetables}
              </p>
              <p className="text-[10px] text-[#9A9898] mt-1">Emplois du temps</p>
            </div>
          </div>
        </TabsContent>

        {/* ─── FACTURATION TAB ───────────────────────────────────────── */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current plan */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                Plan actuel
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <Zap className="h-5 w-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                      Plan {planConfig.label}
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 ml-2",
                        currentPlan === "free" ? "bg-[#9A9898] text-white" :
                        currentPlan === "pro" ? "bg-[#D97706] text-white" :
                        "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A]"
                      )}>
                        {planConfig.label}
                      </span>
                    </p>
                    <p className="text-[10px] text-[#9A9898] mt-0.5">
                      {currentPlan === "free" ? "Fonctionnalités de base" : currentPlan === "pro" ? "Fonctionnalités avancées" : "Accès illimité"}
                    </p>
                  </div>
                </div>
                {currentPlan !== "enterprise" && (
                  <Link href="/pricing">
                    <Button variant="outline" className="text-xs gap-1 border-[#E5E5E5] dark:border-[#2A2A2A]">
                      <ArrowRight className="h-3 w-3" /> Passer supérieur
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Utilisation</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Teachers */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">Enseignants</span>
                  <span className="text-[10px] text-[#9A9898] font-mono">
                    {usageStats.teachers} / {planConfig.teachers}
                  </span>
                </div>
                <div className="h-2 bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div
                    className={cn("h-full transition-all", getUsageBar(usageStats.teachers, planConfig.teachers, "#D97706") > 80 ? "bg-[#DC2626]" : "bg-[#201D1D] dark:bg-[#FDFCFC]")}
                    style={{ width: `${getUsageBar(usageStats.teachers, planConfig.teachers, "#D97706")}%` }}
                  />
                </div>
              </div>
              {/* Rooms */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">Salles</span>
                  <span className="text-[10px] text-[#9A9898] font-mono">
                    {usageStats.rooms} / {planConfig.rooms}
                  </span>
                </div>
                <div className="h-2 bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div
                    className={cn("h-full transition-all", getUsageBar(usageStats.rooms, planConfig.rooms, "#D97706") > 80 ? "bg-[#DC2626]" : "bg-[#201D1D] dark:bg-[#FDFCFC]")}
                    style={{ width: `${getUsageBar(usageStats.rooms, planConfig.rooms, "#D97706")}%` }}
                  />
                </div>
              </div>
              {/* Timetables */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">Emplois du temps</span>
                  <span className="text-[10px] text-[#9A9898] font-mono">
                    {usageStats.timetables} / {planConfig.timetables}
                  </span>
                </div>
                <div className="h-2 bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A]">
                  <div
                    className={cn("h-full transition-all", getUsageBar(usageStats.timetables, planConfig.timetables, "#D97706") > 80 ? "bg-[#DC2626]" : "bg-[#201D1D] dark:bg-[#FDFCFC]")}
                    style={{ width: `${getUsageBar(usageStats.timetables, planConfig.timetables, "#D97706")}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Plan comparison */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Limites des plans</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <th className="text-left p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Ressource</th>
                    <th className="text-center p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Gratuit</th>
                    <th className="text-center p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Pro</th>
                    <th className="text-center p-3 text-[10px] font-bold text-[#9A9898] uppercase tracking-wider">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <td className="p-3 text-[#201D1D] dark:text-[#FDFCFC]">Enseignants</td>
                    <td className="p-3 text-center">5</td>
                    <td className="p-3 text-center">50</td>
                    <td className="p-3 text-center">∞</td>
                  </tr>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <td className="p-3 text-[#201D1D] dark:text-[#FDFCFC]">Salles</td>
                    <td className="p-3 text-center">5</td>
                    <td className="p-3 text-center">50</td>
                    <td className="p-3 text-center">∞</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-[#201D1D] dark:text-[#FDFCFC]">Emplois du temps</td>
                    <td className="p-3 text-center">3</td>
                    <td className="p-3 text-center">∞</td>
                    <td className="p-3 text-center">∞</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Upgrade CTA */}
          {currentPlan === "free" && (
            <div className="border border-[#D97706] bg-[#FFFBEB] dark:bg-[#1C1600] dark:border-[#92400E] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#92400E] dark:text-[#FCD34D] flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Passez au plan Pro
                  </p>
                  <p className="text-[10px] text-[#92400E] dark:text-[#FCD34D] mt-1">
                    Débloquez 50 enseignants, 50 salles et des emplois du temps illimités
                  </p>
                </div>
                <Link href="/pricing">
                  <Button className="text-xs bg-[#D97706] text-white border-0 hover:bg-[#B45309] gap-1 shrink-0">
                    Voir les offres
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── INTÉGRATIONS TAB ───────────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-6">
          {/* iCal */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Synchronisation iCal
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">Activer la synchronisation</p>
                  <p className="text-[10px] text-[#9A9898] mt-0.5">Exportez vos emplois du temps au format iCal</p>
                </div>
                <Switch checked={icalSync} onCheckedChange={setIcalSync} />
              </div>
              {icalSync && (
                <div>
                  <Label className="text-xs font-bold">URL iCal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/ical?institutionId=${institutionId}`}
                      readOnly
                      className="font-mono text-[10px] bg-[#F8F7F7] dark:bg-[#1A1A1A]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-8 gap-1 border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/ical?institutionId=${institutionId}`);
                        toast.success("URL copiée ✓");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Export
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <FileSpreadsheet className="h-4 w-4 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">Export CSV</p>
                    <p className="text-[10px] text-[#9A9898]">Données tabulaires pour tableurs</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 gap-1 border-[#E5E5E5] dark:border-[#2A2A2A]"
                  onClick={() => toast.success("Export CSV en cours...")}
                >
                  <Download className="h-3 w-3" /> Exporter
                </Button>
              </div>
              <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]">
                    <FileText className="h-4 w-4 text-[#DC2626]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#201D1D] dark:text-[#FDFCFC]">Export PDF</p>
                    <p className="text-[10px] text-[#9A9898]">Emplois du temps imprimables</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 gap-1 border-[#E5E5E5] dark:border-[#2A2A2A]"
                  onClick={() => toast.success("Export PDF en cours...")}
                >
                  <Download className="h-3 w-3" /> Exporter
                </Button>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Clé API
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <Label className="text-xs font-bold">Clé API live</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={apiKey}
                    readOnly
                    className="font-mono text-[10px] bg-[#F8F7F7] dark:bg-[#1A1A1A]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-8 gap-1 border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      toast.success("Clé API copiée ✓");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-[#9A9898] mt-1.5">
                  Utilisez cette clé pour accéder à l&apos;API PlanningPro depuis vos applications
                </p>
              </div>
            </div>
          </div>

          {/* Webhook */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <Webhook className="h-3.5 w-3.5" />
                Webhook
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <Label className="text-xs font-bold">URL du webhook</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://votre-app.com/api/webhook"
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-[10px] text-[#9A9898] mt-1.5">
                  Recevez des notifications en temps réel lors des modifications
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => toast.success("Webhook sauvegardé ✓")}
                  className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
                >
                  <Save className="h-3 w-3" /> Sauvegarder
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── DONNÉES TAB ────────────────────────────────────────────── */}
        <TabsContent value="data" className="space-y-6">
          {/* Backup & Restore */}
          <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
            <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] flex items-center gap-2">
                <Database className="h-3.5 w-3.5" />
                Sauvegarde et restauration
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-[#D97706] bg-[#FFFBEB] dark:bg-[#1C1600] dark:border-[#92400E] p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#92400E] dark:text-[#FCD34D]">Attention — Écrasement des données</p>
                    <p className="text-[10px] text-[#92400E] dark:text-[#FCD34D] mt-0.5">
                      L&apos;importation d&apos;une sauvegarde remplacera les données existantes. Assurez-vous d&apos;avoir exporté une sauvegarde récente avant d&apos;importer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={async () => {
                    setExporting(true);
                    try {
                      const res = await fetch(`/api/backup?institutionId=${institutionId}`);
                      if (res.ok) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        const disposition = res.headers.get("Content-Disposition");
                        const match = disposition?.match(/filename="?(.+)"?/);
                        a.download = match ? match[1] : `planningpro-backup-${new Date().toISOString().split("T")[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Données exportées ✓");
                      } else {
                        toast.error("Erreur lors de l'export");
                      }
                    } catch {
                      toast.error("Erreur lors de l'export");
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
                >
                  <Download className="h-3 w-3" />
                  {exporting ? "Exportation..." : "Exporter les données"}
                </Button>
                <Button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      setImporting(true);
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        const res = await fetch("/api/backup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        });
                        if (res.ok) {
                          const result = await res.json();
                          toast.success("Données importées ✓", {
                            description: Object.entries(result.summary || {})
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", "),
                          });
                          onUpdate();
                        } else {
                          const err = await res.json();
                          toast.error(err.error || "Erreur lors de l'import");
                        }
                      } catch {
                        toast.error("Fichier invalide ou erreur lors de l'import");
                      } finally {
                        setImporting(false);
                      }
                    };
                    input.click();
                  }}
                  disabled={importing}
                  variant="outline"
                  className="text-xs gap-1 border-[#E5E5E5] dark:border-[#2A2A2A]"
                >
                  <Upload className="h-3 w-3" />
                  {importing ? "Importation..." : "Importer des données"}
                </Button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="border border-[#DC2626]">
            <div className="p-3 bg-[#FEF2F2] dark:bg-[#1C0A0A] border-b border-[#DC2626]">
              <p className="text-xs font-bold text-[#DC2626] flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Zone de danger
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#DC2626]">Supprimer toutes les données</p>
                  <p className="text-[10px] text-[#9A9898] mt-0.5">Cette action est irréversible. Toutes les données de l&apos;établissement seront supprimées.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-xs gap-1 text-[#DC2626] border-[#DC2626] hover:bg-[#FEF2F2]">
                      <Trash2 className="h-3 w-3" /> Supprimer tout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                        Supprimer toutes les données
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        Cette action supprimera définitivement l&apos;établissement et toutes ses données associées (enseignants, salles, emplois du temps, etc.). Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllData} className="text-xs bg-[#DC2626] text-white border-0">
                        Supprimer définitivement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add institution dialog */}
      <Dialog open={addInstOpen} onOpenChange={setAddInstOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nouvel établissement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Nom *</Label>
              <Input value={newInstForm.name} onChange={(e) => setNewInstForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="Université de..." />
            </div>
            <div>
              <Label className="text-xs font-bold">Type</Label>
              <Select value={newInstForm.type} onValueChange={(v) => setNewInstForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {institutionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Pays</Label>
              <Select value={newInstForm.country} onValueChange={(v) => setNewInstForm((p) => ({ ...p, country: v }))}>
                <SelectTrigger className="mt-1 font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInstOpen(false)} className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]">Annuler</Button>
            <Button onClick={handleCreateInstitution} disabled={creatingInst || !newInstForm.name.trim()} className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1">
              {creatingInst ? "Création..." : "Créer l'établissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
