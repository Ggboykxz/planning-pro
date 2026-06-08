"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { Terminal } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
          Connectez-vous à votre compte
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="border border-[#DC2626] bg-[#DC2626]/5 p-3 text-xs font-mono text-[#DC2626]">
            {error}
          </div>
        )}

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
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
              Mot de passe
            </label>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full font-mono rounded-none bg-[#201D1D] hover:bg-[#201D1D]/90 text-[#FDFCFC] dark:bg-[#FDFCFC] dark:text-[#0A0A0A] dark:hover:bg-[#FDFCFC]/90 h-11"
        >
          {loading ? "Connexion..." : "Se connecter"}
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
