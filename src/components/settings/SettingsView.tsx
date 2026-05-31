"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Settings, Save, Trash2, AlertTriangle } from "lucide-react";
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

export function SettingsView({ institutionId, onUpdate }: SettingsViewProps) {
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setForm({
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
      });
    }
  }, [institution]);

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
        toast.success("Paramètres sauvegardés");
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
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de votre établissement
        </p>
      </div>

      {/* Institution Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nom de l&apos;établissement</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {institutionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pays</Label>
              <Select value={form.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fuseau horaire</Label>
              <Input value={form.timezone} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Année académique</Label>
              <Input
                value={form.academieYear}
                onChange={(e) => setForm((prev) => ({ ...prev, academieYear: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration des horaires</CardTitle>
          <CardDescription>Définissez les créneaux horaires de votre établissement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Jours ouvrés</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allDays.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.workingDays.includes(day)}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label>Début de journée</Label>
              <Input
                type="time"
                value={form.dayStartTime}
                onChange={(e) => setForm((prev) => ({ ...prev, dayStartTime: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fin de journée</Label>
              <Input
                type="time"
                value={form.dayEndTime}
                onChange={(e) => setForm((prev) => ({ ...prev, dayEndTime: e.target.value }))}
              />
            </div>
            <div>
              <Label>Durée créneau (min)</Label>
              <Select
                value={String(form.slotDuration)}
                onValueChange={(v) => setForm((prev) => ({ ...prev, slotDuration: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Début de pause</Label>
              <Input
                type="time"
                value={form.breakStartTime}
                onChange={(e) => setForm((prev) => ({ ...prev, breakStartTime: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fin de pause</Label>
              <Input
                type="time"
                value={form.breakEndTime}
                onChange={(e) => setForm((prev) => ({ ...prev, breakEndTime: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Système éducatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Système d&apos;enseignement</Label>
              <Select
                value={form.educationSystem}
                onValueChange={(v) => setForm((prev) => ({ ...prev, educationSystem: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {educationSystems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Système de notation</Label>
              <Select
                value={form.gradingSystem}
                onValueChange={(v) => setForm((prev) => ({ ...prev, gradingSystem: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradingSystems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rythme scolaire</Label>
              <Select
                value={form.semesterSystem}
                onValueChange={(v) => setForm((prev) => ({ ...prev, semesterSystem: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semesterSystems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Réinitialiser toutes les données
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmer la réinitialisation
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera toutes les données de votre établissement
                (enseignants, salles, matières, classes, emplois du temps). Cette
                action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
                Supprimer tout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
        </Button>
      </div>
    </div>
  );
}
