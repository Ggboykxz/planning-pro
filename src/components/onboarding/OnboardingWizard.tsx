"use client";

import { useState } from "react";
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
import { countries, institutionTypes, educationSystems, gradingSystems, semesterSystems, type CountryPreset } from "@/lib/countries";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}

const allDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function OnboardingWizard({ onComplete, isLoading }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<CountryPreset | null>(null);
  const [formData, setFormData] = useState({
    country: "",
    name: "",
    type: "universite",
    address: "",
    phone: "",
    email: "",
    academieYear: "2025-2026",
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

  const handleCountrySelect = (country: CountryPreset) => {
    setSelectedCountry(country);
    setFormData((prev) => ({
      ...prev,
      country: country.code,
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
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSubmit = () => {
    onComplete(formData);
  };

  const steps = [
    { number: 1, title: "Pays" },
    { number: 2, title: "Etablissement" },
    { number: 3, title: "Horaires" },
    { number: 4, title: "Systeme" },
    { number: 5, title: "Confirmation" },
  ];

  // Terminal preview for step 5
  const terminalPreview = `
┌─ Configuration ──────────────────────────┐
│ pays:           "${formData.country || "..."}"                     │
│ etablissement:  "${formData.name || "..."}"                     │
│ type:           "${institutionTypes.find(t => t.value === formData.type)?.label || "..."}"     │
│ horaires:       "${formData.dayStartTime} — ${formData.dayEndTime}"          │
│ pause:          "${formData.breakStartTime} — ${formData.breakEndTime}"             │
│ jours:          "${formData.workingDays.join(", ")}"   │
│ systeme:        "${educationSystems.find(s => s.value === formData.educationSystem)?.label || "..."}"  │
│ notation:       "/${formData.gradingSystem}"                     │
│ rythme:         "${semesterSystems.find(s => s.value === formData.semesterSystem)?.label || "..."}"     │
└──────────────────────────────────────────┘`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A] p-4">
      <div className="w-full max-w-[640px]">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">PlanningPro_</p>
          <p className="text-xs text-[#9A9898] mt-1">Configuration initiale</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => {
            const isActive = step === s.number;
            const isCompleted = step > s.number;
            return (
              <div key={s.number} className="flex items-center">
                <button
                  onClick={() => isCompleted && setStep(s.number)}
                  className={`text-xs px-2 py-1 transition-colors ${
                    isActive
                      ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                      : isCompleted
                      ? "text-[#201D1D] dark:text-[#FDFCFC] border border-[#201D1D] dark:border-[#FDFCFC]"
                      : "text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A]"
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : s.title}
                </button>
                {i < steps.length - 1 && (
                  <div className="w-4 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A] mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Country */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Dans quel pays se trouve votre etablissement ?
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`flex items-center gap-2 p-2.5 border text-left text-xs transition-colors ${
                    formData.country === country.code
                      ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] font-bold"
                      : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] text-[#646262]"
                  }`}
                >
                  <span className="text-sm">{country.flag}</span>
                  <span className="truncate">{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Institution Info */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Informations de l&apos;etablissement
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Nom de l&apos;etablissement *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Universite Cheikh Anta Diop"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Type d&apos;etablissement</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v }))}
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
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Annee academique</Label>
                <Input
                  value={formData.academieYear}
                  onChange={(e) => setFormData((prev) => ({ ...prev, academieYear: e.target.value }))}
                  placeholder="2025-2026"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Adresse de l'etablissement"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Telephone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+221 33 800 0000"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@etablissement.edu"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Configuration des horaires
            </h3>
            <div>
              <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Jours ouvrés</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {allDays.map((day) => (
                  <label key={day} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.workingDays.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <span className="text-xs text-[#646262]">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Debut de journee</Label>
                <Input
                  type="time"
                  value={formData.dayStartTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dayStartTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Fin de journee</Label>
                <Input
                  type="time"
                  value={formData.dayEndTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dayEndTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Debut de pause</Label>
                <Input
                  type="time"
                  value={formData.breakStartTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, breakStartTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Fin de pause</Label>
                <Input
                  type="time"
                  value={formData.breakEndTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, breakEndTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Duree d&apos;un creneau (min)</Label>
                <Select
                  value={String(formData.slotDuration)}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, slotDuration: parseInt(v) }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Education System */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Systeme educatif
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Systeme d&apos;enseignement</Label>
                <Select
                  value={formData.educationSystem}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, educationSystem: v }))}
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
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Systeme de notation</Label>
                <Select
                  value={formData.gradingSystem}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, gradingSystem: v }))}
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
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Rythme scolaire</Label>
                <Select
                  value={formData.semesterSystem}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, semesterSystem: v }))}
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
          </div>
        )}

        {/* Step 5: Review (Terminal style) */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Recapitulatif
            </h3>
            <pre className="text-xs text-[#646262] dark:text-[#9A9898] bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 overflow-x-auto leading-relaxed">
              {terminalPreview}
            </pre>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Precedent
          </Button>
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.country}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              Suivant
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.name}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0"
            >
              {isLoading ? "Creation en cours..." : "Creer l'etablissement"}
              <Check className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
