"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  Terminal, Sparkles, AlertTriangle, Building2, Share2, UserX, BarChart3,
  ArrowRight, Check, Menu, X, Sun, Moon, ChevronRight, Zap, Shield, Clock,
  Rocket, Globe, Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
  country: string;
}

// ─── Terminal Preview Component ──────────────────────────────
function TerminalPreview() {
  const [currentLine, setCurrentLine] = useState(0);
  const lines = [
    { prompt: "$", text: "planningpro generate --ai", delay: 0 },
    { prompt: "⟩", text: "Analyse des contraintes...", delay: 800 },
    { prompt: "⟩", text: "Détection de 3 conflits...", delay: 1600 },
    { prompt: "⟩", text: "Optimisation en cours...", delay: 2400 },
    { prompt: "✓", text: "Emploi du temps généré en 2.3s", delay: 3200 },
    { prompt: "$", text: "_", delay: 4000 },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLine((prev) => (prev < lines.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(timer);
  }, [lines.length]);

  return (
    <div className="bg-[#201D1D] dark:bg-[#111111] border border-[#2A2A2A] p-4 sm:p-6 text-xs sm:text-sm font-mono max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2A2A2A]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-[#DC2626]" />
          <div className="w-2.5 h-2.5 bg-[#D97706]" />
          <div className="w-2.5 h-2.5 bg-[#16A34A]" />
        </div>
        <span className="text-[#9A9898] text-[10px] ml-2">planningpro — terminal</span>
      </div>
      <div className="space-y-1.5">
        {lines.slice(0, currentLine + 1).map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn("shrink-0 font-bold", line.prompt === "✓" ? "text-[#16A34A]" : line.prompt === "$" ? "text-[#FDFCFC]" : "text-[#9A9898]")}>
              {line.prompt}
            </span>
            <span className={cn(line.prompt === "✓" ? "text-[#16A34A]" : line.prompt === "$" ? "text-[#FDFCFC]" : "text-[#9A9898]")}>
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Landing Page Component ──────────────────────────────────
function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen bg-[#FDFCFC] dark:bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
              <span className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">PlanningPro_</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-xs text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]">Fonctionnalités</a>
              <a href="#pricing" className="text-xs text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]">Tarifs</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]" aria-label="Changer le thème">
                {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link href="/login" className="text-xs text-[#201D1D] dark:text-[#FDFCFC] hover:opacity-70">Se connecter</Link>
              <Link href="/register" className="text-xs font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-4 py-2 hover:opacity-80">Essai gratuit</Link>
            </div>
            <button className="md:hidden p-2 text-[#201D1D] dark:text-[#FDFCFC]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#E5E5E5] dark:border-[#2A2A2A] py-4 space-y-3">
              <a href="#features" className="block text-xs text-[#646262] dark:text-[#9A9898] py-2" onClick={() => setMobileMenuOpen(false)}>Fonctionnalités</a>
              <a href="#pricing" className="block text-xs text-[#646262] dark:text-[#9A9898] py-2" onClick={() => setMobileMenuOpen(false)}>Tarifs</a>
              <div className="flex gap-3 pt-2">
                <Link href="/login" className="text-xs text-[#201D1D] dark:text-[#FDFCFC] py-2">Se connecter</Link>
                <Link href="/register" className="text-xs font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-4 py-2">Essai gratuit</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 border border-[#E5E5E5] dark:border-[#2A2A2A] px-3 py-1.5 mb-6">
                <Rocket className="h-3 w-3 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#9A9898]">NOUVEAU — LANCEMENT 2025</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#201D1D] dark:text-[#FDFCFC] leading-tight mb-4">
                L&apos;emploi du temps, <span className="underline decoration-4 underline-offset-4">réinventé</span>.
              </h1>
              <p className="text-sm sm:text-base text-[#646262] dark:text-[#9A9898] leading-relaxed mb-8 max-w-md">
                Générez, optimisez et partagez vos emplois du temps en quelques secondes. L&apos;intelligence artificielle détecte les conflits et propose les meilleures organisations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 text-sm font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-6 py-3 hover:opacity-80">
                  Commencer gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#features" className="inline-flex items-center justify-center gap-2 text-sm border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] px-6 py-3 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]">
                  Voir la démo <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="hidden lg:block"><TerminalPreview /></div>
          </div>
        </div>
      </section>

      {/* Early Adopters Banner */}
      <section className="border-y border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#D97706]" />
              <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">Disponible en Afrique et en Europe</span>
            </div>
            <p className="text-xs text-[#646262] dark:text-[#9A9898] max-w-lg">
              PlanningPro accompagne les établissements francophones dans leur planification. Rejoignez les premiers utilisateurs et contribuez à façonner l&apos;outil.
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-[#9A9898]" /><span className="text-[10px] text-[#9A9898]">En phase de lancement</span></div>
              <div className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-[#16A34A]" /><span className="text-[10px] text-[#9A9898]">Gratuit pendant le lancement</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">Fonctionnalités</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-2">Tout ce dont vous avez besoin</h2>
          <p className="text-xs text-[#9A9898] mt-2 max-w-md mx-auto">Un outil complet pour gérer les emplois du temps de vos établissements, de la planification à l&apos;analyse.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: "Génération IA", desc: "Générez automatiquement des emplois du temps optimisés grâce à notre moteur d'intelligence artificielle avancé." },
            { icon: AlertTriangle, title: "Détection de conflits", desc: "Identification en temps réel des conflits de salles, d'enseignants et de créneaux horaires." },
            { icon: Building2, title: "Multi-établissements", desc: "Gérez plusieurs établissements depuis une seule interface, avec des données centralisées." },
            { icon: Share2, title: "Partage & Export", desc: "Partagez via lien sécurisé ou exportez en PDF, image et iCal pour une diffusion simple." },
            { icon: UserX, title: "Gestion des absences", desc: "Signalez et gérez les absences des enseignants avec attribution automatique de remplaçants." },
            { icon: BarChart3, title: "Analytics avancées", desc: "Tableaux de bord et statistiques détaillées pour optimiser l'utilisation des ressources." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors group">
              <div className="h-10 w-10 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] mb-4 group-hover:border-[#201D1D] dark:group-hover:border-[#FDFCFC] transition-colors">
                <Icon className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
              </div>
              <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2">{title}</h3>
              <p className="text-xs text-[#9A9898] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">Tarifs</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-2">Simple et transparent</h2>
          <p className="text-xs text-[#9A9898] mt-2">Commencez gratuitement, évoluez selon vos besoins.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { name: "Gratuit", price: "0€", features: ["1 établissement", "5 enseignants maximum", "Génération manuelle", "Export PDF"], cta: "Commencer" },
            { name: "Pro", price: "29€", features: ["Établissements illimités", "Enseignants illimités", "Génération IA", "Détection de conflits", "Export PDF & iCal", "Analytics avancées"], cta: "Essai gratuit 14 jours", highlighted: true },
            { name: "Enterprise", price: "99€", features: ["Tout le plan Pro", "API dédiée", "SSO & intégrations", "Account manager dédié", "Formation personnalisée"], cta: "Contacter l'équipe" },
          ].map((plan) => (
            <div key={plan.name} className={cn("border p-6 flex flex-col", plan.highlighted ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC]" : "border-[#E5E5E5] dark:border-[#2A2A2A]")}>
              <h3 className={cn("text-sm font-bold mb-1", plan.highlighted ? "text-[#FDFCFC] dark:text-[#0A0A0A]" : "text-[#201D1D] dark:text-[#FDFCFC]")}>{plan.name}</h3>
              <div className="mb-6 mt-2">
                <span className={cn("text-3xl font-bold", plan.highlighted ? "text-[#FDFCFC] dark:text-[#0A0A0A]" : "text-[#201D1D] dark:text-[#FDFCFC]")}>{plan.price}</span>
                <span className="text-xs text-[#9A9898]">/mois</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className={cn("h-3 w-3 mt-0.5 shrink-0", plan.highlighted ? "text-[#FDFCFC] dark:text-[#0A0A0A]" : "text-[#16A34A]")} />
                    <span className={cn(plan.highlighted ? "text-[#FDFCFC]/80 dark:text-[#0A0A0A]/80" : "text-[#646262] dark:text-[#9A9898]")}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className={cn("block text-center text-xs font-bold py-3 border transition-colors", plan.highlighted ? "border-[#FDFCFC] dark:border-[#0A0A0A] text-[#FDFCFC] dark:text-[#0A0A0A] hover:bg-[#FDFCFC]/10 dark:hover:bg-[#0A0A0A]/10" : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]")}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="border border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FDFCFC] dark:text-[#0A0A0A] mb-3">Prêt à réinventer vos emplois du temps ?</h2>
          <p className="text-xs sm:text-sm text-[#FDFCFC]/70 dark:text-[#0A0A0A]/70 mb-6 max-w-md mx-auto">
            Rejoignez les premiers établissements qui font confiance à PlanningPro pour une planification intelligente et sans stress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 text-sm font-bold border border-[#FDFCFC] dark:border-[#0A0A0A] text-[#FDFCFC] dark:text-[#0A0A0A] px-6 py-3 hover:bg-[#FDFCFC]/10 dark:hover:bg-[#0A0A0A]/10">
              Essai gratuit 14 jours <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 text-sm text-[#FDFCFC]/70 dark:text-[#0A0A0A]/70 hover:text-[#FDFCFC] dark:hover:text-[#0A0A0A] px-6 py-3">Se connecter</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#201D1D] dark:text-[#FDFCFC]" />
              <span className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">PlanningPro_</span>
            </div>
            <p className="text-[10px] text-[#9A9898]">&copy; {new Date().getFullYear()} PlanningPro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Main Root Page ──────────────────────────────────────────
export default function HomePage() {
  const { institutionId, setInstitutionId } = useAppStore();
  const { currentUser, isAuthenticated, isLoading: authLoading, restoreSession } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [checkingInstitution, setCheckingInstitution] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const hasRedirected = useRef(false);
  const sessionRestored = useRef(false);
  const institutionChecked = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;
    restoreSession();
  }, [restoreSession]);

  // Main routing logic
  useEffect(() => {
    if (authLoading) return;
    if (hasRedirected.current) return;

    // Not authenticated → show landing page (handled in render)
    if (!isAuthenticated) return;

    // Authenticated + has institutionId → redirect
    if (institutionId) {
      hasRedirected.current = true;
      if (currentUser?.role === "student") {
        router.replace("/student");
      } else {
        router.replace("/dashboard");
      }
      return;
    }

    // Authenticated + no institutionId → check if they have one on server
    if (!institutionChecked.current) {
      institutionChecked.current = true;
      checkInstitution();
    }
  }, [authLoading, isAuthenticated, institutionId, currentUser?.role, router]);

  const checkInstitution = useCallback(async () => {
    setCheckingInstitution(true);
    try {
      const res = await fetch("/api/institution");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const inst = data[0];
          setInstitution(inst);
          setInstitutionId(inst.id);
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            if (currentUser?.role === "student") {
              router.replace("/student");
            } else {
              router.replace("/dashboard");
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCheckingInstitution(false);
    }
  }, [setInstitutionId, currentUser?.role, router]);

  const handleOnboardingComplete = async (formData: Record<string, unknown>) => {
    setOnboardingLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const inst = await res.json();
        setInstitution(inst);
        setInstitutionId(inst.id);

        // Try to generate time slots (non-blocking)
        fetch("/api/timeslots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId: inst.id, generateFromConfig: true }),
        }).catch(() => {});

        router.push("/dashboard");
      } else {
        let errorData: { error?: string; details?: string };
        try { errorData = await res.json(); } catch { errorData = { error: `Erreur serveur (${res.status})` }; }
        setErrorMessage(errorData.error || errorData.details || `Erreur lors de la création (${res.status})`);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Erreur de connexion au serveur");
    } finally {
      setOnboardingLoading(false);
    }
  };

  // ─── Loading state (auth check in progress) ───
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] skeleton-shimmer inline-block px-2">PlanningPro_</p>
          <p className="text-xs text-[#9A9898] mt-1">Chargement...</p>
        </div>
      </div>
    );
  }

  // ─── Not authenticated → Show landing page ───
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // ─── Checking institution on server ───
  if (checkingInstitution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] skeleton-shimmer inline-block px-2">PlanningPro_</p>
          <p className="text-xs text-[#9A9898] mt-1">Vérification de l&apos;établissement...</p>
        </div>
      </div>
    );
  }

  // ─── Authenticated + no institution → Show onboarding ───
  if (!institutionId && !institution) {
    return (
      <div>
        {errorMessage && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#DC2626] text-[#FDFCFC] px-4 py-3 text-xs font-bold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="ml-4 px-2 py-1 border border-[#FDFCFC] hover:bg-[#FDFCFC] hover:text-[#DC2626] transition-colors">Fermer</button>
          </div>
        )}
        <OnboardingWizard onComplete={handleOnboardingComplete} isLoading={onboardingLoading} />
      </div>
    );
  }

  // ─── Authenticated + has institution → Redirecting ───
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
      <div className="text-center">
        <div className="animate-spin h-5 w-5 border-2 border-[#201D1D] dark:border-[#FDFCFC] border-t-transparent mx-auto" />
        <p className="text-xs text-[#9A9898] mt-2">Redirection...</p>
      </div>
    </div>
  );
}
