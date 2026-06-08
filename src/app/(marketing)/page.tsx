"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sparkles,
  AlertTriangle,
  Building2,
  Share2,
  UserX,
  BarChart3,
  ArrowRight,
  Check,
  Menu,
  X,
  Sun,
  Moon,
  Terminal,
  ChevronRight,
  Zap,
  Shield,
  Clock,
  Rocket,
  Globe,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Animated Terminal Component ──────────────────────────────────

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
    <div
      className="bg-[#201D1D] dark:bg-[#111111] border border-[#2A2A2A] p-4 sm:p-6 text-xs sm:text-sm font-mono max-w-lg mx-auto"
      style={{ borderRadius: 0 }}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2A2A2A]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-[#DC2626]" style={{ borderRadius: 0 }} />
          <div className="w-2.5 h-2.5 bg-[#D97706]" style={{ borderRadius: 0 }} />
          <div className="w-2.5 h-2.5 bg-[#16A34A]" style={{ borderRadius: 0 }} />
        </div>
        <span className="text-[#9A9898] text-[10px] ml-2">planningpro — terminal</span>
      </div>
      <div className="space-y-1.5">
        {lines.slice(0, currentLine + 1).map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className={cn(
                "shrink-0 font-bold",
                line.prompt === "✓"
                  ? "text-[#16A34A]"
                  : line.prompt === "$"
                  ? "text-[#FDFCFC]"
                  : "text-[#9A9898]"
              )}
            >
              {line.prompt}
            </span>
            <span
              className={cn(
                line.prompt === "✓"
                  ? "text-[#16A34A]"
                  : line.prompt === "$"
                  ? "text-[#FDFCFC]"
                  : "text-[#9A9898]"
              )}
            >
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Card Component ───────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div
      className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors group"
      style={{ borderRadius: 0 }}
    >
      <div
        className="h-10 w-10 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] mb-4 group-hover:border-[#201D1D] dark:group-hover:border-[#FDFCFC] transition-colors"
        style={{ borderRadius: 0 }}
      >
        <Icon className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
      </div>
      <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2">
        {title}
      </h3>
      <p className="text-xs text-[#9A9898] leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Pricing Card Component ───────────────────────────────────────

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted,
  cta,
  ctaHref,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
}) {
  return (
    <div
      className={cn(
        "border p-6 flex flex-col",
        highlighted
          ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC]"
          : "border-[#E5E5E5] dark:border-[#2A2A2A]"
      )}
      style={{ borderRadius: 0 }}
    >
      <div className="mb-4">
        <h3
          className={cn(
            "text-sm font-bold mb-1",
            highlighted
              ? "text-[#FDFCFC] dark:text-[#0A0A0A]"
              : "text-[#201D1D] dark:text-[#FDFCFC]"
          )}
        >
          {name}
        </h3>
        <p className="text-[10px] text-[#9A9898]">{description}</p>
      </div>
      <div className="mb-6">
        <span
          className={cn(
            "text-3xl font-bold",
            highlighted
              ? "text-[#FDFCFC] dark:text-[#0A0A0A]"
              : "text-[#201D1D] dark:text-[#FDFCFC]"
          )}
        >
          {price}
        </span>
        <span className="text-xs text-[#9A9898]">/{period}</span>
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs">
            <Check
              className={cn(
                "h-3 w-3 mt-0.5 shrink-0",
                highlighted ? "text-[#FDFCFC] dark:text-[#0A0A0A]" : "text-[#16A34A]"
              )}
            />
            <span
              className={cn(
                highlighted
                  ? "text-[#FDFCFC]/80 dark:text-[#0A0A0A]/80"
                  : "text-[#646262] dark:text-[#9A9898]"
              )}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={cn(
          "block text-center text-xs font-bold py-3 border transition-colors",
          highlighted
            ? "border-[#FDFCFC] dark:border-[#0A0A0A] text-[#FDFCFC] dark:text-[#0A0A0A] hover:bg-[#FDFCFC]/10 dark:hover:bg-[#0A0A0A]/10"
            : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
        )}
        style={{ borderRadius: 0 }}
      >
        {cta}
      </Link>
    </div>
  );
}

// ─── Step Card Component ──────────────────────────────────────────

function StepCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="h-14 w-14 flex items-center justify-center border border-[#201D1D] dark:border-[#FDFCFC] mb-4"
        style={{ borderRadius: 0 }}
      >
        <Icon className="h-6 w-6 text-[#201D1D] dark:text-[#FDFCFC]" />
      </div>
      <span className="text-[10px] font-bold text-[#9A9898] mb-1">
        ÉTAPE {number}
      </span>
      <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2">
        {title}
      </h3>
      <p className="text-xs text-[#9A9898] leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  );
}

// ─── Main Landing Page Component ──────────────────────────────────

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen">
      {/* ─── Navbar ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
              <span className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                PlanningPro_
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              <a
                href="#features"
                className="text-xs text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
              >
                Fonctionnalités
              </a>
              <a
                href="#pricing"
                className="text-xs text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
              >
                Tarifs
              </a>
            </div>

            {/* CTA buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
                aria-label="Changer le thème"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <Link
                href="/login"
                className="text-xs text-[#201D1D] dark:text-[#FDFCFC] hover:opacity-70 transition-opacity"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="text-xs font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-4 py-2 hover:opacity-80 transition-opacity"
                style={{ borderRadius: 0 }}
              >
                Essai gratuit
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-[#201D1D] dark:text-[#FDFCFC]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#E5E5E5] dark:border-[#2A2A2A] py-4 space-y-3">
              <a
                href="#features"
                className="block text-xs text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Fonctionnalités
              </a>
              <a
                href="#pricing"
                className="block text-xs text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tarifs
              </a>
              <div className="flex gap-3 pt-2">
                <Link
                  href="/login"
                  className="text-xs text-[#201D1D] dark:text-[#FDFCFC] py-2"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-4 py-2"
                  style={{ borderRadius: 0 }}
                >
                  Essai gratuit
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 border border-[#E5E5E5] dark:border-[#2A2A2A] px-3 py-1.5 mb-6">
                <Rocket className="h-3 w-3 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#9A9898]">
                  NOUVEAU — LANCEMENT 2025
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#201D1D] dark:text-[#FDFCFC] leading-tight mb-4">
                L&apos;emploi du temps,{" "}
                <span className="underline decoration-4 underline-offset-4">
                  réinventé
                </span>
                .
              </h1>
              <p className="text-sm sm:text-base text-[#646262] dark:text-[#9A9898] leading-relaxed mb-8 max-w-md">
                Générez, optimisez et partagez vos emplois du temps en quelques
                secondes. L&apos;intelligence artificielle détecte les conflits et
                propose les meilleures organisations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-6 py-3 hover:opacity-80 transition-opacity"
                  style={{ borderRadius: 0 }}
                >
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 text-sm border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] px-6 py-3 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Voir la démo
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="hidden lg:block">
              <TerminalPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Early Adopters Banner ──────────────────────────────── */}
      <section className="border-y border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#D97706]" />
              <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">
                Disponible en Afrique et en Europe
              </span>
            </div>
            <p className="text-xs text-[#646262] dark:text-[#9A9898] max-w-lg">
              PlanningPro accompagne les établissements francophones dans leur planification. 
              Rejoignez les premiers utilisateurs et contribuez à façonner l&apos;outil.
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-[#9A9898]" />
                <span className="text-[10px] text-[#9A9898]">En phase de lancement</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-[#16A34A]" />
                <span className="text-[10px] text-[#9A9898]">Gratuit pendant le lancement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">
            Fonctionnalités
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-2">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-xs text-[#9A9898] mt-2 max-w-md mx-auto">
            Un outil complet pour gérer les emplois du temps de vos
            établissements, de la planification à l&apos;analyse.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={Sparkles}
            title="Génération IA"
            description="Générez automatiquement des emplois du temps optimisés grâce à notre moteur d'intelligence artificielle avancé."
          />
          <FeatureCard
            icon={AlertTriangle}
            title="Détection de conflits"
            description="Identification en temps réel des conflits de salles, d'enseignants et de créneaux horaires."
          />
          <FeatureCard
            icon={Building2}
            title="Multi-établissements"
            description="Gérez plusieurs établissements depuis une seule interface, avec des données centralisées."
          />
          <FeatureCard
            icon={Share2}
            title="Partage & Export"
            description="Partagez via lien sécurisé ou exportez en PDF, image et iCal pour une diffusion simple."
          />
          <FeatureCard
            icon={UserX}
            title="Gestion des absences"
            description="Signalez et gérez les absences des enseignants avec attribution automatique de remplaçants."
          />
          <FeatureCard
            icon={BarChart3}
            title="Analytics avancées"
            description="Tableaux de bord et statistiques détaillées pour optimiser l'utilisation des ressources."
          />
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────── */}
      <section className="border-y border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">
              Comment ça marche
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-2">
              Trois étapes. Zéro complexité.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <StepCard
              number="01"
              title="Configurez"
              description="Renseignez vos enseignants, salles, matières et classes. Importez vos données ou laissez l'IA vous guider."
              icon={Shield}
            />
            <StepCard
              number="02"
              title="Générez"
              description="L'IA crée un emploi du temps optimisé en quelques secondes, sans conflits ni chevauchements."
              icon={Zap}
            />
            <StepCard
              number="03"
              title="Optimisez"
              description="Ajustez manuellement ou relancez la génération. Partagez et exportez en un clic."
              icon={Clock}
            />
          </div>
          {/* Connecting line for desktop */}
          <div className="hidden sm:flex items-center justify-center mt-8">
            <div className="flex items-center gap-2 text-[#9A9898]">
              <span className="text-[10px] font-bold">Configurez</span>
              <div className="w-12 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              <ArrowRight className="h-3 w-3" />
              <div className="w-12 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              <span className="text-[10px] font-bold">Générez</span>
              <div className="w-12 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              <ArrowRight className="h-3 w-3" />
              <div className="w-12 h-px bg-[#E5E5E5] dark:bg-[#2A2A2A]" />
              <span className="text-[10px] font-bold">Optimisez</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold text-[#9A9898] uppercase tracking-widest">
            Tarifs
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-2">
            Simple et transparent
          </h2>
          <p className="text-xs text-[#9A9898] mt-2">
            Commencez gratuitement, évoluez selon vos besoins.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <PricingCard
            name="Gratuit"
            price="0€"
            period="mois"
            description="Pour découvrir PlanningPro"
            features={[
              "1 établissement",
              "5 enseignants maximum",
              "Génération manuelle",
              "Export PDF",
              "Support par email",
            ]}
            cta="Commencer"
            ctaHref="/register"
          />
          <PricingCard
            name="Pro"
            price="29€"
            period="mois"
            description="Pour les établissements exigeants"
            features={[
              "Établissements illimités",
              "Enseignants illimités",
              "Génération IA",
              "Détection de conflits",
              "Export PDF & iCal",
              "Analytics avancées",
              "Support prioritaire",
            ]}
            highlighted
            cta="Essai gratuit 14 jours"
            ctaHref="/register"
          />
          <PricingCard
            name="Enterprise"
            price="99€"
            period="mois"
            description="Pour les grandes organisations"
            features={[
              "Tout le plan Pro",
              "API dédiée",
              "SSO & intégrations",
              "Account manager dédié",
              "Formation personnalisée",
            ]}
            cta="Contacter l'équipe"
            ctaHref="mailto:contact@planningpro.app"
          />
        </div>
      </section>

      {/* ─── CTA Section ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div
          className="border border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] p-8 sm:p-12 text-center"
          style={{ borderRadius: 0 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FDFCFC] dark:text-[#0A0A0A] mb-3">
            Prêt à réinventer vos emplois du temps ?
          </h2>
          <p className="text-xs sm:text-sm text-[#FDFCFC]/70 dark:text-[#0A0A0A]/70 mb-6 max-w-md mx-auto">
            Rejoignez les premiers établissements qui font confiance à PlanningPro pour
            une planification intelligente et sans stress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 text-sm font-bold border border-[#FDFCFC] dark:border-[#0A0A0A] text-[#FDFCFC] dark:text-[#0A0A0A] px-6 py-3 hover:bg-[#FDFCFC]/10 dark:hover:bg-[#0A0A0A]/10 transition-colors"
              style={{ borderRadius: 0 }}
            >
              Essai gratuit 14 jours
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-[#FDFCFC]/70 dark:text-[#0A0A0A]/70 hover:text-[#FDFCFC] dark:hover:text-[#0A0A0A] transition-colors px-6 py-3"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-4 w-4 text-[#201D1D] dark:text-[#FDFCFC]" />
                <span className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
                  PlanningPro_
                </span>
              </div>
              <p className="text-[10px] text-[#9A9898] leading-relaxed">
                L&apos;outil de planification intelligent pour les établissements
                scolaires et universitaires.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider mb-3">
                Produit
              </h4>
              <ul className="space-y-2">
                {[
                  { label: "Fonctionnalités", href: "#features" },
                  { label: "Tarifs", href: "#pricing" },
                  { label: "Changelog", href: "#" },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider mb-3">
                Ressources
              </h4>
              <ul className="space-y-2">
                {["Documentation", "Blog", "API"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider mb-3">
                Légal
              </h4>
              <ul className="space-y-2">
                {["Confidentialité", "CGU", "Mentions légales"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-[#9A9898]">
              © {new Date().getFullYear()} PlanningPro. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
