"use client";

import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Check, AlertCircle, Clock, Calendar } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}

const allDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function OnboardingWizard({ onComplete, isLoading }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<CountryPreset | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string;
    config: {
      slotDuration: number;
      dayStartTime: string;
      dayEndTime: string;
      breakStartTime: string;
      breakEndTime: string;
      workingDays: string[];
    } | null;
  }>>([]);
  const [formData, setFormData] = useState({
    country: "",
    timezone: "Africa/Dakar",
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
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  // Load templates on mount
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data))
      .catch(() => {});
  }, []);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template?.config) {
      setFormData((prev) => ({
        ...prev,
        slotDuration: template.config!.slotDuration,
        dayStartTime: template.config!.dayStartTime,
        dayEndTime: template.config!.dayEndTime,
        breakStartTime: template.config!.breakStartTime,
        breakEndTime: template.config!.breakEndTime,
        workingDays: [...template.config!.workingDays],
      }));
    }
  };

  const handleSubmit = () => {
    onComplete(formData);
  };

  // Step validation
  const getStepErrors = (stepNum: number): string[] => {
    const errors: string[] = [];
    if (stepNum === 1 && !formData.country) errors.push("Sélectionnez un pays");
    if (stepNum === 2 && !formData.name) errors.push("Le nom de l'établissement est requis");
    if (stepNum === 3 && formData.workingDays.length === 0) errors.push("Sélectionnez au moins un jour");
    return errors;
  };

  const canProceed = (stepNum: number): boolean => {
    return getStepErrors(stepNum).length === 0;
  };

  const steps = [
    { number: 1, title: "Pays" },
    { number: 2, title: "Établissement" },
    { number: 3, title: "Horaires" },
    { number: 4, title: "Système" },
    { number: 5, title: "Confirmation" },
  ];

  // Terminal preview for step 5
  const terminalPreview = `
┌─ Configuration ──────────────────────────┐
│ pays:           "${formData.country || "..."}"                     │
│ établissement:  "${formData.name || "..."}"                     │
│ type:           "${institutionTypes.find(t => t.value === formData.type)?.label || "..."}"     │
│ horaires:       "${formData.dayStartTime} — ${formData.dayEndTime}"          │
│ pause:          "${formData.breakStartTime} — ${formData.breakEndTime}"             │
│ jours:          "${formData.workingDays.join(", ")}"   │
│ système:        "${educationSystems.find(s => s.value === formData.educationSystem)?.label || "..."}"  │
│ notation:       "/${formData.gradingSystem}"                     │
│ rythme:         "${semesterSystems.find(s => s.value === formData.semesterSystem)?.label || "..."}"     │
│ fuseau:         "${formData.timezone}"              │
└──────────────────────────────────────────┘`;

  const progress = (step / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A] p-4">
      <div className="w-full max-w-[640px]">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">PlanningPro_</p>
          <p className="text-xs text-[#9A9898] mt-1">Configuration initiale</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
            <div
              className="h-full bg-[#201D1D] dark:bg-[#FDFCFC] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => {
            const isActive = step === s.number;
            const isCompleted = step > s.number;
            const hasError = !canProceed(s.number) && step > s.number;
            return (
              <div key={s.number} className="flex items-center">
                <button
                  onClick={() => isCompleted && setStep(s.number)}
                  className={`text-xs px-2 py-1 transition-all duration-150 ${
                    isActive
                      ? "bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                      : isCompleted
                      ? hasError
                        ? "text-[#DC2626] border border-[#DC2626]"
                        : "text-[#201D1D] dark:text-[#FDFCFC] border border-[#201D1D] dark:border-[#FDFCFC]"
                      : "text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A]"
                  }`}
                >
                  {isCompleted && !hasError ? <Check className="h-3 w-3" /> : hasError ? <AlertCircle className="h-3 w-3" /> : s.title}
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
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Dans quel pays se trouve votre établissement ?
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`flex items-center gap-2 p-2.5 border text-left text-xs transition-all duration-150 ${
                    formData.country === country.code
                      ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] font-bold"
                      : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] text-[#646262] hover:-translate-y-px"
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
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Informations de l&apos;établissement
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                  Nom de l&apos;établissement <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Université Cheikh Anta Diop"
                  className={`mt-1 ${!formData.name && step > 1 ? "border-[#DC2626] focus:border-[#DC2626]" : ""}`}
                />
                {!formData.name && step > 1 && (
                  <p className="text-[10px] text-[#DC2626] mt-1">Ce champ est requis</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Type d&apos;établissement</Label>
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
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Année académique</Label>
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
                  placeholder="Adresse de l'établissement"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Téléphone</Label>
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
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Configuration des horaires
            </h3>

            {/* Template Selector */}
            <div className="mb-4">
              <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2 block">
                Choisir un modèle horaire
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-3 border text-left transition-all duration-150 ${
                      selectedTemplateId === template.id
                        ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A]"
                        : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    }`}
                  >
                    <p className={`text-xs font-bold ${
                      selectedTemplateId === template.id
                        ? "text-[#201D1D] dark:text-[#FDFCFC]"
                        : "text-[#646262] dark:text-[#9A9898]"
                    }`}>
                      {template.name}
                    </p>
                    <p className="text-[10px] text-[#9A9898] mt-0.5">
                      {template.description}
                    </p>
                    {template.config && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-[#9A9898] flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {template.config.slotDuration}min
                        </span>
                        <span className="text-[9px] text-[#9A9898] flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {template.config.workingDays.length}j
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-4">
              <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2 block">
                {selectedTemplateId === "custom" || !selectedTemplateId ? "Configuration manuelle" : "Ajuster la configuration"}
              </Label>
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
                {formData.workingDays.length === 0 && (
                  <p className="text-[10px] text-[#DC2626] mt-2">Sélectionnez au moins un jour ouvré</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Début de journée</Label>
                  <Input
                    type="time"
                    value={formData.dayStartTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dayStartTime: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Fin de journée</Label>
                  <Input
                    type="time"
                    value={formData.dayEndTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dayEndTime: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Début de pause</Label>
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
                  <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Durée d&apos;un créneau (min)</Label>
                  <Select
                    value={String(formData.slotDuration)}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, slotDuration: parseInt(v) }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="55">55 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Education System */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Système éducatif
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Système d&apos;enseignement</Label>
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
                <Label className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC]">Système de notation</Label>
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
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">
              Récapitulatif
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
            className="text-xs text-[#646262] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-all duration-150"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Précédent
          </Button>
          {step < 5 ? (
            <Button
              onClick={() => {
                if (canProceed(step)) {
                  setStep(step + 1);
                }
              }}
              disabled={!canProceed(step)}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 transition-all duration-150"
            >
              Suivant
              {!canProceed(step) && <AlertCircle className="h-3 w-3 ml-1" />}
              {canProceed(step) && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.name}
              className="text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 border-0 transition-all duration-150"
            >
              {isLoading ? "Création en cours..." : "Créer l'établissement"}
              <Check className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
