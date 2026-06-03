"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";

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

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("universite");
  const [country, setCountry] = useState("FR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser, setInstitutionId } = useAppStore();

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
      setStep(2);
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

      router.push("/dashboard");
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC] tracking-tight font-mono">
          PlanningPro_
        </h1>
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

      {/* Step 1: Account */}
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
            />
          </div>

          <Button
            type="submit"
            className="w-full font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11"
          >
            Suivant →
          </Button>
        </form>
      )}

      {/* Step 2: Institution */}
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
