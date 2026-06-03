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
import { Save, Trash2, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, RefreshCw, Download, Upload, Building2, Plus, LogOut, Shield } from "lucide-react";
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

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A] flex items-center justify-between text-left hover:bg-[#F0F0F0] dark:hover:bg-[#222222] transition-colors"
      >
        <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">{title}</p>
        {open ? <ChevronDown className="h-3 w-3 text-[#9A9898]" /> : <ChevronRight className="h-3 w-3 text-[#9A9898]" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

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
        // Switch to the new institution
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
        // If we left the current institution, switch to another
        if (instId === institutionId) {
          const remaining = userInstitutions.filter((i) => i.id !== instId);
          if (remaining.length > 0) {
            setInstitutionId(remaining[0].id);
            window.location.assign("/dashboard");
          }
        }
        // Refresh the list
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
      // First save the current config
      const saveRes = await fetch("/api/institution", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: institutionId, ...form }),
      });
      if (!saveRes.ok) {
        toast.error("Erreur lors de la sauvegarde de la configuration");
        return;
      }

      // Delete existing time slots
      const deleteRes = await fetch(`/api/timeslots?institutionId=${institutionId}`, { method: "DELETE" });
      if (!deleteRes.ok) {
        toast.error("Erreur lors de la suppression des créneaux");
        return;
      }

      // Regenerate time slots with new config
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

  // Config preview
  const configPreview = `
pays:           "${form.country}"
établissement:  "${form.name}"
type:           "${institutionTypes.find(t => t.value === form.type)?.label || form.type}"
horaires:       "${form.dayStartTime} — ${form.dayEndTime}"
pause:          "${form.breakStartTime} — ${form.breakEndTime}"
jours:          [${form.workingDays.map(d => `"${d}"`).join(", ")}]
système:        "${educationSystems.find(s => s.value === form.educationSystem)?.label || form.educationSystem}"
notation:       "/${form.gradingSystem}"
rythme:         "${semesterSystems.find(s => s.value === form.semesterSystem)?.label || form.semesterSystem}"`;

  return (
    <div className="space-y-6">
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

      {/* Config preview */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A]">
        <div className="p-3 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Aperçu de la configuration</p>
        </div>
        <pre className="p-4 text-xs text-[#646262] dark:text-[#9A9898] overflow-x-auto leading-relaxed">
          {configPreview}
        </pre>
      </div>

      {/* Schedule config change warning */}
      {hasScheduleChanges && (
        <div className="border border-[#D97706] bg-[#FFFBEB] dark:bg-[#1C1600] dark:border-[#92400E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#92400E] dark:text-[#FCD34D]">
                Créneaux horaires obsolètes
              </p>
              <p className="text-[10px] text-[#92400E] dark:text-[#FCD34D] mt-0.5">
                Les créneaux horaires doivent être régénérés pour refléter ces changements
              </p>
            </div>
          </div>
          <Button
            onClick={handleRegenerateSlots}
            disabled={regenerating}
            className="text-xs bg-[#D97706] text-white border-0 hover:bg-[#B45309] gap-1 shrink-0"
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Régénération..." : "Régénérer les créneaux"}
          </Button>
        </div>
      )}

      {/* Institution Info */}
      <CollapsibleSection title="Informations générales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold">Nom de l&apos;établissement</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-bold">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold">Fuseau horaire</Label>
            <Input value={form.timezone} disabled className="mt-1 bg-[#F8F7F7] dark:bg-[#1A1A1A]" />
          </div>
          <div>
            <Label className="text-xs font-bold">Année académique</Label>
            <Input
              value={form.academieYear}
              onChange={(e) => setForm((prev) => ({ ...prev, academieYear: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-bold">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-bold">Téléphone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-bold">Adresse</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Schedule Config */}
      <CollapsibleSection title="Configuration des horaires">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold">Jours ouvrés</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allDays.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.workingDays.includes(day)}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <span className="text-xs text-[#646262]">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold">Début de journée</Label>
              <Input
                type="time"
                value={form.dayStartTime}
                onChange={(e) => setForm((prev) => ({ ...prev, dayStartTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Fin de journée</Label>
              <Input
                type="time"
                value={form.dayEndTime}
                onChange={(e) => setForm((prev) => ({ ...prev, dayEndTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Durée créneau (min)</Label>
              <Select
                value={String(form.slotDuration)}
                onValueChange={(v) => setForm((prev) => ({ ...prev, slotDuration: parseInt(v) }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Input
                type="time"
                value={form.breakStartTime}
                onChange={(e) => setForm((prev) => ({ ...prev, breakStartTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Fin de pause</Label>
              <Input
                type="time"
                value={form.breakEndTime}
                onChange={(e) => setForm((prev) => ({ ...prev, breakEndTime: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Education System */}
      <CollapsibleSection title="Système éducatif">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-bold">Système d&apos;enseignement</Label>
            <Select
              value={form.educationSystem}
              onValueChange={(v) => setForm((prev) => ({ ...prev, educationSystem: v }))}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {semesterSystems.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Institution Management */}
      <CollapsibleSection title="Gérer les établissements" defaultOpen={false}>
        <div className="space-y-4">
          {/* Institution list */}
          <div className="space-y-2">
            {userInstitutions.length === 0 ? (
              <p className="text-xs text-[#9A9898]">Aucun établissement configuré</p>
            ) : (
              userInstitutions.map((inst) => (
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
                        {inst.id === institutionId && (
                          <span className="text-[10px] font-normal text-[#9A9898] ml-2">(actif)</span>
                        )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-7 gap-1 text-[#DC2626] hover:text-[#DC2626]"
                            disabled={leavingInstId === inst.id}
                          >
                            <LogOut className="h-3 w-3" />
                            Quitter
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm font-bold flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                              Quitter « {inst.name} »
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs">
                              Vous perdrez l&apos;accès à cet établissement et toutes ses données. Les autres membres ne seront pas affectés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleLeaveInstitution(inst.id)}
                              className="text-xs bg-[#DC2626] text-white border-0"
                            >
                              Quitter l&apos;établissement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add new institution button */}
          <Button
            onClick={() => setAddInstOpen(true)}
            variant="outline"
            className="text-xs w-full gap-1 border-[#E5E5E5] dark:border-[#2A2A2A] border-dashed"
          >
            <Plus className="h-3 w-3" />
            Ajouter un établissement
          </Button>
        </div>
      </CollapsibleSection>

      {/* Backup & Restore */}
      <CollapsibleSection title="Sauvegarde et restauration" defaultOpen={false}>
        <div className="space-y-4">
          <div className="border border-[#D97706] bg-[#FFFBEB] dark:bg-[#1C1600] dark:border-[#92400E] p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#92400E] dark:text-[#FCD34D]">
                  Attention — Écrasement des données
                </p>
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
                    toast.error("Erreur lors de l&apos;export");
                  }
                } catch {
                  toast.error("Erreur lors de l&apos;export");
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
                      toast.error(err.error || "Erreur lors de l&apos;import");
                    }
                  } catch {
                    toast.error("Fichier invalide ou erreur lors de l&apos;import");
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
      </CollapsibleSection>

      {/* New institution dialog */}
      <Dialog open={addInstOpen} onOpenChange={setAddInstOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nouvel établissement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Nom de l&apos;établissement</Label>
              <Input
                value={newInstForm.name}
                onChange={(e) => setNewInstForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Université Cheikh Anta Diop"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Type</Label>
                <Select
                  value={newInstForm.type}
                  onValueChange={(v) => setNewInstForm((prev) => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {institutionTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Pays</Label>
                <Select
                  value={newInstForm.country}
                  onValueChange={(v) => setNewInstForm((prev) => ({ ...prev, country: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddInstOpen(false)}
              className="text-xs border-[#E5E5E5] dark:border-[#2A2A2A]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateInstitution}
              disabled={creatingInst || !newInstForm.name.trim()}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
            >
              {creatingInst ? "Création..." : "Créer l'établissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-xs text-[#DC2626] hover:text-[#DC2626] gap-1">
              <Trash2 className="h-3 w-3" />
              Réinitialiser toutes les données
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                Confirmer la réinitialisation
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Cette action supprimera toutes les données de votre établissement
                (enseignants, salles, matières, classes, emplois du temps). Cette
                action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} className="text-xs bg-[#DC2626] text-white border-0">
                Supprimer tout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 gap-1"
        >
          {saving ? (
            "Sauvegarde..."
          ) : (
            <>
              <Save className="h-3 w-3" />
              Sauvegarder les paramètres
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
