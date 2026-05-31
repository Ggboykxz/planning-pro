"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ChevronLeft, ChevronRight, Check, Globe, Building2, Clock, GraduationCap, Eye } from "lucide-react";

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
    { number: 1, title: "Pays", icon: Globe },
    { number: 2, title: "Établissement", icon: Building2 },
    { number: 3, title: "Horaires", icon: Clock },
    { number: 4, title: "Système éducatif", icon: GraduationCap },
    { number: 5, title: "Confirmation", icon: Eye },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
              P
            </div>
            <span className="text-2xl font-bold">PlanningPro</span>
          </div>
          <CardTitle className="text-xl">Configuration initiale</CardTitle>
          <CardDescription>
            Configurez votre établissement pour commencer
          </CardDescription>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.number;
              const isCompleted = step > s.number;
              return (
                <div key={s.number} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-6 h-0.5 mx-1 ${
                        isCompleted ? "bg-emerald-600" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Country */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">
                🌍 Dans quel pays se trouve votre établissement ?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {countries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all hover:shadow-md ${
                      formData.country === country.code
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 ring-2 ring-emerald-200 dark:ring-emerald-800"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Institution Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">
                🏫 Informations de l&apos;établissement
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nom de l&apos;établissement *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Université Cheikh Anta Diop"
                  />
                </div>
                <div>
                  <Label>Type d&apos;établissement</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, type: v }))
                    }
                  >
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
                  <Label>Année académique</Label>
                  <Input
                    value={formData.academieYear}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        academieYear: e.target.value,
                      }))
                    }
                    placeholder="2025-2026"
                  />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="Adresse de l'établissement"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+221 33 800 0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="contact@etablissement.edu"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">
                ⏰ Configuration des horaires
              </h3>
              <div>
                <Label>Jours ouvrés</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allDays.map((day) => (
                    <label
                      key={day}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.workingDays.includes(day)}
                        onCheckedChange={() => handleDayToggle(day)}
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Début de journée</Label>
                  <Input
                    type="time"
                    value={formData.dayStartTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dayStartTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Fin de journée</Label>
                  <Input
                    type="time"
                    value={formData.dayEndTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dayEndTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Début de pause</Label>
                  <Input
                    type="time"
                    value={formData.breakStartTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        breakStartTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Fin de pause</Label>
                  <Input
                    type="time"
                    value={formData.breakEndTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        breakEndTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Durée d&apos;un créneau (min)</Label>
                  <Select
                    value={String(formData.slotDuration)}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        slotDuration: parseInt(v),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
              <h3 className="text-lg font-semibold mb-4">
                🎓 Système éducatif
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Système d&apos;enseignement</Label>
                  <Select
                    value={formData.educationSystem}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, educationSystem: v }))
                    }
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
                    value={formData.gradingSystem}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, gradingSystem: v }))
                    }
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
                    value={formData.semesterSystem}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, semesterSystem: v }))
                    }
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
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">
                ✅ Récapitulatif
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Pays</p>
                    <p className="text-sm font-medium">
                      {selectedCountry?.flag} {selectedCountry?.name}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Établissement</p>
                    <p className="text-sm font-medium">{formData.name}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium">
                      {institutionTypes.find((t) => t.value === formData.type)?.label}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Année académique</p>
                    <p className="text-sm font-medium">{formData.academieYear}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Jours ouvrés</p>
                    <p className="text-sm font-medium">
                      {formData.workingDays.join(", ")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Horaires</p>
                    <p className="text-sm font-medium">
                      {formData.dayStartTime} - {formData.dayEndTime}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Pause déjeuner</p>
                    <p className="text-sm font-medium">
                      {formData.breakStartTime} - {formData.breakEndTime}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Durée créneau</p>
                    <p className="text-sm font-medium">
                      {formData.slotDuration} min
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Système éducatif</p>
                    <p className="text-sm font-medium">
                      {educationSystems.find((s) => s.value === formData.educationSystem)?.label}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Notation</p>
                    <p className="text-sm font-medium">
                      {gradingSystems.find((s) => s.value === formData.gradingSystem)?.label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>
            {step < 5 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !formData.country}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !formData.name}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? "Création en cours..." : "Créer l'établissement"}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
