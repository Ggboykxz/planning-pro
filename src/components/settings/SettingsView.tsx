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
import { Save, Trash2, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
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
