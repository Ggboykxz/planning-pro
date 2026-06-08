"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import {
  Terminal,
  GraduationCap,
  Shield,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

const INSTITUTION_TYPES = [
  { value: "universite", label: "Université" },
  { value: "lycee", label: "Lycée" },
  { value: "college", label: "Collège" },
  { value: "ecole_primaire", label: "École primaire" },
  { value: "autre", label: "Autre" },
];

const COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "SN", label: "Sénégal" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "CM", label: "Cameroun" },
  { value: "MA", label: "Maroc" },
  { value: "TN", label: "Tunisie" },
  { value: "DZ", label: "Algérie" },
  { value: "ML", label: "Mali" },
  { value: "BF", label: "Burkina Faso" },
  { value: "BJ", label: "Bénin" },
  { value: "TG", label: "Togo" },
  { value: "GN", label: "Guinée" },
  { value: "NE", label: "Niger" },
  { value: "TD", label: "Tchad" },
  { value: "GA", label: "Gabon" },
  { value: "CG", label: "Congo" },
  { value: "CD", label: "RD Congo" },
  { value: "MG", label: "Madagascar" },
  { value: "US", label: "États-Unis" },
  { value: "CA", label: "Canada" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
];

const ROLES = [
  { value: "admin", label: "Administrateur", description: "Gérer l'établissement, les emplois du temps et l'équipe", icon: Shield },
  { value: "teacher", label: "Enseignant", description: "Consulter et gérer mes cours et emplois du temps", icon: User },
  { value: "student", label: "Étudiant", description: "Consulter mon emploi du temps et mes cours", icon: GraduationCap },
];

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "weak";
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

function getPasswordChecks(password: string) {
  return [
    { label: "Au moins 6 caractères", met: password.length >= 6 },
    { label: "Une lettre majuscule", met: /[A-Z]/.test(password) },
    { label: "Une lettre minuscule", met: /[a-z]/.test(password) },
    { label: "Un chiffre", met: /[0-9]/.test(password) },
    { label: "Un caractère spécial", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; color: string; bgColor: string; width: string }> = {
  weak: { label: "Faible", color: "text-[#DC2626]", bgColor: "bg-[#DC2626]", width: "w-1/3" },
  medium: { label: "Moyen", color: "text-[#D97706]", bgColor: "bg-[#D97706]", width: "w-2/3" },
  strong: { label: "Fort", color: "text-[#16A34A]", bgColor: "bg-[#16A34A]", width: "w-full" },
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("universite");
  const [country, setCountry] = useState("FR");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser, setInstitutionId, currentUser } = useAppStore();

  // Password strength
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const strengthConfig = STRENGTH_CONFIG[passwordStrength];

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const validateStep1 = () => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Format d'email invalide";
    }

    if (!name.trim()) {
      errors.name = "Le nom est requis";
    }

    if (!password) {
      errors.password = "Le mot de passe est requis";
    } else if (password.length < 6) {
      errors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "La confirmation est requise";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    setError(null);
    if (validateStep1()) {
      // Students skip institution step
      if (role === "student") {
        handleRegisterDirectly();
      } else {
        setStep(2);
      }
    }
  };

  const handleRegisterDirectly = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
          role,
          institutionName: undefined,
          institutionType: undefined,
          country,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur d'inscription");
        return;
      }

      // Store user in Zustand and localStorage
      setCurrentUser(data.user);
      if (data.institutionId) {
        setInstitutionId(data.institutionId);
      }
      localStorage.setItem("planningpro_user", JSON.stringify(data.user));

      // Redirect based on role
      if (role === "student") {
        router.push("/student");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
          role,
          institutionName: institutionName || undefined,
          institutionType,
          country,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur d'inscription");
        return;
      }

      // Store user in Zustand and localStorage
      setCurrentUser(data.user);
      if (data.institutionId) {
        setInstitutionId(data.institutionId);
      }
      localStorage.setItem("planningpro_user", JSON.stringify(data.user));

      // Redirect based on role
      if (role === "student") {
        router.push("/student");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  // Don't render register form if already authenticated
  if (currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <Terminal className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
          <span className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC] tracking-tight font-mono">
            PlanningPro_
          </span>
        </Link>
        <p className="text-sm text-[#9A9898] font-mono">
          Créer votre compte
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div
            className={`h-6 w-6 flex items-center justify-center text-[10px] font-mono font-bold border transition-all duration-300 ${
              step >= 1
                ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A]"
                : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898]"
            }`}
            style={{ borderRadius: 0 }}
          >
            {step > 1 ? <Check className="h-3 w-3" /> : "1"}
          </div>
          <span className={`text-[10px] font-mono ${step >= 1 ? "text-[#201D1D] dark:text-[#FDFCFC] font-bold" : "text-[#9A9898]"}`}>
            Compte
          </span>
        </div>
        <div className={`h-px flex-1 transition-colors duration-300 ${step >= 2 ? "bg-[#201D1D] dark:bg-[#FDFCFC]" : "bg-[#E5E5E5] dark:bg-[#2A2A2A]"}`} />
        <div className="flex items-center gap-1.5">
          <div
            className={`h-6 w-6 flex items-center justify-center text-[10px] font-mono font-bold border transition-all duration-300 ${
              step >= 2
                ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A]"
                : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898]"
            }`}
            style={{ borderRadius: 0 }}
          >
            2
          </div>
          <span className={`text-[10px] font-mono ${step >= 2 ? "text-[#201D1D] dark:text-[#FDFCFC] font-bold" : "text-[#9A9898]"}`}>
            Établissement
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 border border-[#DC2626] bg-[#DC2626]/5 p-3 text-xs font-mono text-[#DC2626]">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Account + Role */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNextStep();
          }}
          className="space-y-4"
        >
          <p className="text-xs font-bold font-mono text-[#9A9898] uppercase tracking-wider">
            Étape 1 — Votre compte
          </p>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Je suis...
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 border text-center transition-all duration-200 ${
                      isSelected
                        ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D]/5 dark:bg-[#FDFCFC]/5"
                        : "border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-[#201D1D] dark:text-[#FDFCFC]" : "text-[#9A9898]"}`} />
                    <span className={`text-[10px] font-bold font-mono ${isSelected ? "text-[#201D1D] dark:text-[#FDFCFC]" : "text-[#9A9898]"}`}>
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[#9A9898] font-mono">
              {ROLES.find((r) => r.value === role)?.description}
            </p>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Nom complet
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Jean Dupont"
              className={`font-mono rounded-none focus-visible:ring-0 h-10 ${
                fieldErrors.name
                  ? "border-[#DC2626] focus-visible:border-[#DC2626]"
                  : "border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              }`}
              required
              autoComplete="name"
            />
            {fieldErrors.name && (
              <p className="text-[10px] font-mono text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="votre@email.com"
              className={`font-mono rounded-none focus-visible:ring-0 h-10 ${
                fieldErrors.email
                  ? "border-[#DC2626] focus-visible:border-[#DC2626]"
                  : "border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              }`}
              required
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-[10px] font-mono text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password with strength indicator */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Minimum 6 caractères"
                className={`font-mono rounded-none focus-visible:ring-0 h-10 pr-10 ${
                  fieldErrors.password
                    ? "border-[#DC2626] focus-visible:border-[#DC2626]"
                    : "border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
                }`}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-[10px] font-mono text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.password}
              </p>
            )}
            {/* Password strength indicator */}
            {password && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[#E5E5E5] dark:bg-[#2A2A2A]">
                    <div className={`h-full ${strengthConfig.bgColor} ${strengthConfig.width} transition-all duration-300`} />
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${strengthConfig.color}`}>
                    {strengthConfig.label}
                  </span>
                </div>
                {/* Password checks */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-1 text-[10px] font-mono transition-colors duration-200 ${
                        check.met ? "text-[#16A34A]" : "text-[#9A9898]"
                      }`}
                    >
                      {check.met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {check.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="••••••"
                className={`font-mono rounded-none focus-visible:ring-0 h-10 pr-10 ${
                  fieldErrors.confirmPassword || (confirmPassword && password !== confirmPassword)
                    ? "border-[#DC2626] focus-visible:border-[#DC2626]"
                    : confirmPassword && password === confirmPassword
                    ? "border-[#16A34A] focus-visible:border-[#16A34A]"
                    : "border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
                }`}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[10px] font-mono text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.confirmPassword}
              </p>
            )}
            {!fieldErrors.confirmPassword && confirmPassword && password === confirmPassword && (
              <p className="text-[10px] font-mono text-[#16A34A] flex items-center gap-1">
                <Check className="h-3 w-3" />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11 gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              role === "student" ? "Créer le compte" : "Suivant →"
            )}
          </Button>
        </form>
      )}

      {/* Step 2: Institution (admin/teacher only) */}
      {step === 2 && (
        <form onSubmit={handleRegister} className="space-y-4">
          <p className="text-xs font-bold font-mono text-[#9A9898] uppercase tracking-wider">
            Étape 2 — Votre établissement (optionnel)
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Nom de l&apos;établissement
            </label>
            <Input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Université de Paris"
              className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC] h-10"
            />
            <p className="text-[10px] font-mono text-[#9A9898]">
              Vous pouvez ajouter un établissement plus tard
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Type d&apos;établissement
            </label>
            <select
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value)}
              className="w-full h-10 px-3 text-sm font-mono border border-[#E5E5E5] dark:border-[#2A2A2A] bg-transparent rounded-none focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC]"
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-white dark:bg-[#0A0A0A]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Pays
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-10 px-3 text-sm font-mono border border-[#E5E5E5] dark:border-[#2A2A2A] bg-transparent rounded-none focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC]"
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-white dark:bg-[#0A0A0A]">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] h-11"
            >
              ← Retour
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le compte"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Links */}
      <div className="text-center space-y-3">
        <p className="text-xs font-mono text-[#9A9898]">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-[#201D1D] dark:text-[#FDFCFC] font-bold hover:underline"
          >
            Se connecter
          </Link>
        </p>
        <Link
          href="/"
          className="text-xs font-mono text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] block"
        >
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
