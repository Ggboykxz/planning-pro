"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/lib/store";
import { Terminal, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser, setInstitutionId, currentUser } = useAppStore();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  // Validate individual fields
  const validateEmail = (value: string) => {
    if (!value.trim()) return "L'email est requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Format d'email invalide";
    return undefined;
  };

  const validatePassword = (value: string) => {
    if (!value) return "Le mot de passe est requis";
    return undefined;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate fields
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr || passwordErr) {
      setFieldErrors({ email: emailErr, password: passwordErr });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        return;
      }

      // Store user in Zustand and localStorage
      setCurrentUser(data.user);
      if (data.user.institutionId) {
        setInstitutionId(data.user.institutionId);
      }
      localStorage.setItem("planningpro_user", JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === "student") {
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

  // Don't render login form if already authenticated
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
          Connectez-vous à votre compte
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* General error */}
        {error && (
          <div className="flex items-start gap-2 border border-[#DC2626] bg-[#DC2626]/5 p-3 text-xs font-mono text-[#DC2626]">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
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

        {/* Password field with show/hide */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Mot de passe
            </label>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••"
              className={`font-mono rounded-none focus-visible:ring-0 h-10 pr-10 ${
                fieldErrors.password
                  ? "border-[#DC2626] focus-visible:border-[#DC2626]"
                  : "border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
              }`}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-[10px] font-mono text-[#DC2626] flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            className="rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] data-[state=checked]:bg-[#201D1D] data-[state=checked]:border-[#201D1D] dark:data-[state=checked]:bg-[#FDFCFC] dark:data-[state=checked]:border-[#FDFCFC]"
          />
          <label
            htmlFor="remember"
            className="text-xs font-mono text-[#9A9898] cursor-pointer select-none"
          >
            Se souvenir de moi
          </label>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11 gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      {/* Links */}
      <div className="text-center space-y-3">
        <p className="text-xs font-mono text-[#9A9898]">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-[#201D1D] dark:text-[#FDFCFC] font-bold hover:underline"
          >
            Créer un compte
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
