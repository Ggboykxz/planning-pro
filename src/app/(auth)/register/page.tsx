"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { Terminal, GraduationCap, Shield, User } from "lucide-react";

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

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("universite");
  const [country, setCountry] = useState("FR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser, setInstitutionId, currentUser } = useAppStore();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const validateStep1 = () => {
    if (!email || !name || !password) {
      setError("Tous les champs sont requis");
      return false;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return false;
    }
    return true;
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
    <div className="space-y-8">
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
        <div className={`h-1 flex-1 ${step >= 1 ? "bg-[#201D1D] dark:bg-[#FDFCFC]" : "bg-[#E5E5E5] dark:bg-[#2A2A2A]"}`} />
        <div className={`h-1 flex-1 ${step >= 2 ? "bg-[#201D1D] dark:bg-[#FDFCFC]" : "bg-[#E5E5E5] dark:bg-[#2A2A2A]"}`} />
      </div>

      {/* Error */}
      {error && (
        <div className="border border-[#DC2626] bg-[#DC2626]/5 p-3 text-xs font-mono text-[#DC2626]">
          {error}
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
                    className={`flex flex-col items-center gap-1.5 p-3 border text-center transition-colors ${
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

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Nom complet
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Mot de passe
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Confirmer le mot de passe
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••"
              className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              required
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11"
          >
            {loading ? "Création..." : role === "student" ? "Créer le compte" : "Suivant →"}
          </Button>
        </form>
      )}

      {/* Step 2: Institution (admin/teacher only) */}
      {step === 2 && (
        <form onSubmit={handleRegister} className="space-y-4">
          <p className="text-xs font-bold font-mono text-[#9A9898] uppercase tracking-wider">
            Étape 2 — Votre établissement (optionnel)
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Nom de l&apos;établissement
            </label>
            <Input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Université de Paris"
              className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
            />
            <p className="text-[10px] font-mono text-[#9A9898]">
              Vous pouvez ajouter un établissement plus tard
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Type d&apos;établissement
            </label>
            <select
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value)}
              className="w-full h-9 px-3 text-sm font-mono border border-[#E5E5E5] dark:border-[#2A2A2A] bg-transparent rounded-none focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC]"
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-white dark:bg-[#0A0A0A]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Pays
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-9 px-3 text-sm font-mono border border-[#E5E5E5] dark:border-[#2A2A2A] bg-transparent rounded-none focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC]"
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
              className="flex-1 font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11"
            >
              {loading ? "Création..." : "Créer le compte"}
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
