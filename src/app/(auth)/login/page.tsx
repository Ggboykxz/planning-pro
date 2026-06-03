"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser, setInstitutionId } = useAppStore();

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

      router.push("/dashboard");
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    router.push("/");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[#201D1D] dark:text-[#FDFCFC] tracking-tight font-mono">
          PlanningPro_
        </h1>
        <p className="text-sm text-[#9A9898] font-mono">
          Gestion d&apos;emplois du temps
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
            placeholder="••••••"
            className="font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] focus-visible:ring-0 focus-visible:border-[#201D1D] dark:focus-visible:border-[#FDFCFC]"
            required
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

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E5E5E5] dark:border-[#2A2A2A]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-[#0A0A0A] px-2 text-[#9A9898] font-mono">ou</span>
        </div>
      </div>

      {/* Demo Mode */}
      <Button
        variant="outline"
        onClick={handleDemoMode}
        className="w-full font-mono rounded-none border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] h-11"
      >
        Mode démo (sans compte)
      </Button>

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
