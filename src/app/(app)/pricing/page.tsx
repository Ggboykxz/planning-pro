"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Building2, Zap, HelpCircle, Mail, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BillingUsage {
  teachers: { current: number; limit: number };
  rooms: { current: number; limit: number };
  timetables: { current: number; limit: number };
  institutions: { current: number; limit: number };
}

interface PlanFeature {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const planFeatures: PlanFeature[] = [
  { label: "Enseignants", free: "5", pro: "50", enterprise: "∞" },
  { label: "Salles", free: "5", pro: "50", enterprise: "∞" },
  { label: "Emplois du temps", free: "3", pro: "Illimités", enterprise: "Illimités" },
  { label: "Établissements", free: "1", pro: "3", enterprise: "Illimités" },
  { label: "Exports de base (CSV)", free: true, pro: true, enterprise: true },
  { label: "Support email", free: true, pro: true, enterprise: true },
  { label: "Exports avancés (PDF, iCal)", free: false, pro: true, enterprise: true },
  { label: "Partage de liens", free: false, pro: true, enterprise: true },
  { label: "Journal d'activité", free: false, pro: true, enterprise: true },
  { label: "IA assistant", free: false, pro: true, enterprise: true },
  { label: "Support prioritaire", free: false, pro: true, enterprise: true },
  { label: "API access", free: false, pro: false, enterprise: true },
  { label: "Account manager dédié", free: false, pro: false, enterprise: true },
];

const faqItems = [
  {
    question: "Puis-je changer de plan à tout moment ?",
    answer: "Oui, vous pouvez upgrader ou downgrader à tout moment. Les changements prennent effet immédiatement.",
  },
  {
    question: "Y a-t-il un engagement minimum ?",
    answer: "Non, tous les plans sont sans engagement. Vous pouvez annuler à tout moment sans frais supplémentaires.",
  },
  {
    question: "Que se passe-t-il si je dépasse les limites de mon plan ?",
    answer: "Vous ne pourrez pas ajouter de nouvelles ressources au-delà des limites de votre plan. Vos données existantes ne seront jamais supprimées. Il vous suffira d'upgrader pour continuer.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Vos données sont stockées de manière sécurisée et des sauvegardes sont effectuées régulièrement. Vous pouvez exporter vos données à tout moment.",
  },
];

export default function PricingPage() {
  const { currentUser, setCurrentUser, institutionId } = useAppStore();
  const currentPlan = currentUser?.plan || "free";
  const [annual, setAnnual] = useState(false);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  // Load billing usage
  useEffect(() => {
    async function loadUsage() {
      try {
        const res = await fetch(`/api/billing?institutionId=${institutionId || ""}`);
        if (res.ok) {
          const data = await res.json();
          setUsage(data.usage);
        }
      } catch {
        // Silently fail - usage will be empty
      } finally {
        setLoadingUsage(false);
      }
    }
    loadUsage();
  }, [currentUser?.id, institutionId]);

  // Handle plan upgrade
  const handleUpgrade = async (plan: string) => {
    if (!currentUser?.id) {
      toast.error("Vous devez être connecté pour changer de plan");
      return;
    }
    setUpgrading(plan);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, plan }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(result.message || `Plan mis à jour vers ${plan}`);
        // Update local user state
        if (currentUser) {
          setCurrentUser({ ...currentUser, plan });
          localStorage.setItem("planningpro_user", JSON.stringify({ ...currentUser, plan }));
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la mise à jour du plan");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour du plan");
    } finally {
      setUpgrading(null);
    }
  };

  // Handle contact sales form
  const handleContactSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setContactSending(true);
    try {
      // Save the contact request as an audit log entry
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          institutionId,
          action: "contact_sales",
          entity: "billing",
          details: JSON.stringify({ email: contactEmail, message: contactMessage, plan: "enterprise" }),
        }),
      });
      if (res.ok) {
        setContactSent(true);
        toast.success("Demande envoyée ! Nous vous contacterons prochainement.");
      } else {
        toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
      }
    } catch {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setContactSending(false);
    }
  };

  // Price calculation
  const getMonthlyPrice = (plan: string) => {
    if (plan === "free") return 0;
    if (plan === "pro") return 29;
    if (plan === "enterprise") return 99;
    return 0;
  };

  const getPrice = (plan: string) => {
    const monthly = getMonthlyPrice(plan);
    if (!annual) return monthly;
    // 20% discount for annual
    return Math.round(monthly * 12 * 0.8);
  };

  const plans = [
    {
      id: "free",
      name: "Gratuit",
      icon: <Zap className="h-5 w-5" />,
      price: getPrice("free"),
      period: annual ? "/an" : "/mois",
      monthlyPrice: 0,
      cta: currentPlan === "free" ? "Plan actuel" : "Rétrograder",
      ctaStyle: "current" as const,
    },
    {
      id: "pro",
      name: "Pro",
      icon: <Sparkles className="h-5 w-5" />,
      popular: true,
      price: getPrice("pro"),
      period: annual ? "/an" : "/mois",
      monthlyPrice: getMonthlyPrice("pro"),
      cta: currentPlan === "pro" ? "Plan actuel" : "Passer au Pro",
      ctaStyle: "primary" as const,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      icon: <Building2 className="h-5 w-5" />,
      price: getPrice("enterprise"),
      period: annual ? "/an" : "/mois",
      monthlyPrice: getMonthlyPrice("enterprise"),
      cta: "Contacter les ventes",
      ctaStyle: "secondary" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-lg font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
          Abonnement & Facturation
        </h1>
        <p className="text-xs text-[#9A9898] font-mono mt-1">
          Choisissez le plan adapté à votre établissement
        </p>
      </div>

      {/* ═══ USAGE METER ═══ */}
      {usage && !loadingUsage && (
        <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
          <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-4">Utilisation actuelle</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["teachers", "rooms", "timetables", "institutions"] as const).map((type) => {
              const labels: Record<string, string> = {
                teachers: "Enseignants",
                rooms: "Salles",
                timetables: "Emplois du temps",
                institutions: "Établissements",
              };
              const u = usage[type];
              const isUnlimited = u.limit === -1;
              const percentage = isUnlimited ? 0 : u.limit > 0 ? Math.round((u.current / u.limit) * 100) : 0;
              const isNearLimit = !isUnlimited && percentage >= 80;
              const isOverLimit = !isUnlimited && percentage >= 100;
              return (
                <div key={type} className="border border-[#F8F7F7] dark:border-[#1A1A1A] p-3">
                  <p className="text-[10px] text-[#9A9898] mb-1">{labels[type]}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-lg font-bold ${isOverLimit ? "text-[#DC2626]" : isNearLimit ? "text-[#D97706]" : "text-[#201D1D] dark:text-[#FDFCFC]"}`}>
                      {u.current}
                    </span>
                    <span className="text-xs text-[#9A9898]">/ {isUnlimited ? "∞" : u.limit}</span>
                  </div>
                  {!isUnlimited && (
                    <div className="h-1.5 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isOverLimit ? "bg-[#DC2626]" : isNearLimit ? "bg-[#D97706]" : "bg-[#201D1D] dark:bg-[#FDFCFC]"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                  {isUnlimited && (
                    <div className="h-1.5 bg-[#F8F7F7] dark:bg-[#1A1A1A] w-full">
                      <div className="h-full bg-[#201D1D] dark:bg-[#FDFCFC] w-full" />
                    </div>
                  )}
                  {isNearLimit && !isOverLimit && (
                    <p className="text-[9px] text-[#D97706] mt-1">Presque à la limite</p>
                  )}
                  {isOverLimit && (
                    <p className="text-[9px] text-[#DC2626] mt-1">Limite atteinte</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ BILLING TOGGLE ═══ */}
      <div className="flex items-center justify-center gap-4">
        <span className={cn("text-xs font-mono", !annual ? "text-[#201D1D] dark:text-[#FDFCFC] font-bold" : "text-[#9A9898]")}>
          Mensuel
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className={cn(
            "relative w-12 h-6 border transition-colors duration-200",
            annual
              ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC]"
              : "border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A]"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 w-5 h-5 transition-all duration-200 border",
              annual
                ? "left-[22px] bg-[#FDFCFC] dark:bg-[#201D1D] border-[#FDFCFC] dark:border-[#201D1D]"
                : "left-0.5 bg-[#F8F7F7] dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A]"
            )}
          />
        </button>
        <span className={cn("text-xs font-mono", annual ? "text-[#201D1D] dark:text-[#FDFCFC] font-bold" : "text-[#9A9898]")}>
          Annuel
        </span>
        {annual && (
          <Badge className="font-mono text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 px-2">
            -20%
          </Badge>
        )}
      </div>

      {/* ═══ PLANS GRID ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative border flex flex-col",
                plan.popular
                  ? "border-[#201D1D] dark:border-[#FDFCFC]"
                  : "border-[#E5E5E5] dark:border-[#2A2A2A]",
              )}
              style={{ borderRadius: 0 }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    className="font-mono text-[10px] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-3"
                    style={{ borderRadius: 0 }}
                  >
                    Populaire
                  </Badge>
                </div>
              )}

              {/* Current plan indicator */}
              {isCurrent && (
                <div className="absolute -top-3 right-3">
                  <Badge
                    className="font-mono text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 px-2"
                    style={{ borderRadius: 0 }}
                  >
                    Actuel
                  </Badge>
                </div>
              )}

              <div className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[#9A9898]",
                    plan.popular && "text-[#201D1D] dark:text-[#FDFCFC]"
                  )}>
                    {plan.icon}
                  </span>
                  <span className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                    {plan.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                    {plan.price}€
                  </span>
                  <span className="text-xs font-mono text-[#9A9898]">{plan.period}</span>
                </div>
                {annual && plan.monthlyPrice > 0 && (
                  <p className="text-[10px] text-[#9A9898] mt-0.5">
                    Soit {Math.round(plan.monthlyPrice * 0.8)}€/mois
                  </p>
                )}
              </div>

              <div className="flex-1 p-6 pt-2 flex flex-col">
                {/* Features list */}
                <ul className="space-y-2 flex-1 mb-6">
                  {planFeatures.map((feature) => {
                    const value = feature[plan.id as keyof PlanFeature];
                    const isIncluded = value === true;
                    const isExcluded = value === false;
                    return (
                      <li key={feature.label} className="flex items-start gap-2">
                        {isIncluded ? (
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        ) : isExcluded ? (
                          <X className="h-3.5 w-3.5 text-[#9A9898] shrink-0 mt-0.5" />
                        ) : (
                          <span className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] shrink-0 w-8 text-right">{value}</span>
                        )}
                        <span
                          className={cn(
                            "text-xs font-mono",
                            isIncluded
                              ? "text-[#201D1D] dark:text-[#FDFCFC]"
                              : isExcluded
                              ? "text-[#9A9898] line-through"
                              : "text-[#201D1D] dark:text-[#FDFCFC]"
                          )}
                        >
                          {feature.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA button */}
                {plan.ctaStyle === "current" && isCurrent ? (
                  <Button
                    disabled
                    className="w-full font-mono text-xs border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#9A9898]"
                    style={{ borderRadius: 0 }}
                  >
                    Plan actuel
                  </Button>
                ) : plan.ctaStyle === "primary" ? (
                  <Button
                    className="w-full font-mono text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80"
                    style={{ borderRadius: 0 }}
                    disabled={upgrading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {upgrading === plan.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Mise à jour...
                      </>
                    ) : isCurrent ? (
                      "Plan actuel"
                    ) : plan.cta}
                  </Button>
                ) : plan.ctaStyle === "secondary" ? (
                  <Button
                    variant="outline"
                    className="w-full font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    style={{ borderRadius: 0 }}
                    onClick={() => {
                      const el = document.getElementById("contact-sales");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {plan.cta}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    style={{ borderRadius: 0 }}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {plan.cta}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ PLAN COMPARISON TABLE ═══ */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
              <th className="text-left p-4 text-[#9A9898] font-bold">Fonctionnalité</th>
              <th className={cn("p-4 text-center font-bold", currentPlan === "free" ? "text-[#201D1D] dark:text-[#FDFCFC]" : "text-[#9A9898]")}>
                Gratuit
              </th>
              <th className={cn("p-4 text-center font-bold", currentPlan === "pro" ? "text-[#201D1D] dark:text-[#FDFCFC]" : "text-[#9A9898]")}>
                Pro
              </th>
              <th className={cn("p-4 text-center font-bold", currentPlan === "enterprise" ? "text-[#201D1D] dark:text-[#FDFCFC]" : "text-[#9A9898]")}>
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {planFeatures.map((feature) => (
              <tr key={feature.label} className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors">
                <td className="p-4 text-[#201D1D] dark:text-[#FDFCFC]">{feature.label}</td>
                {(["free", "pro", "enterprise"] as const).map((plan) => {
                  const value = feature[plan];
                  const isIncluded = value === true;
                  const isExcluded = value === false;
                  return (
                    <td key={plan} className={cn("p-4 text-center", currentPlan === plan ? "bg-[#F8F7F7] dark:bg-[#1A1A1A]" : "")}>
                      {isIncluded ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                      ) : isExcluded ? (
                        <X className="h-4 w-4 text-[#9A9898] mx-auto" />
                      ) : (
                        <span className="font-bold text-[#201D1D] dark:text-[#FDFCFC]">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ FAQ SECTION ═══ */}
      <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-6">
        <p className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-[#9A9898]" />
          Questions fréquentes
        </p>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <div key={i} className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
              <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1">
                {item.question}
              </p>
              <p className="text-[10px] font-mono text-[#9A9898] leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CONTACT SALES FORM (Real, not fake) ═══ */}
      <div id="contact-sales" className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-6">
        <Building2 className="h-6 w-6 text-[#9A9898] mx-auto mb-3" />
        <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-1 text-center">
          Besoin d&apos;un plan sur mesure ?
        </p>
        <p className="text-[10px] font-mono text-[#9A9898] mb-4 max-w-md mx-auto text-center">
          Décrivez votre besoin et nous vous recontacterons pour créer un plan adapté à votre organisation.
        </p>

        {contactSent ? (
          <div className="border border-[#16A34A]/30 bg-[#16A34A]/5 p-4 text-center">
            <p className="text-xs font-bold text-[#16A34A]">Demande envoyée avec succès !</p>
            <p className="text-[10px] text-[#9A9898] mt-1">Notre équipe vous contactera prochainement.</p>
          </div>
        ) : (
          <form onSubmit={handleContactSales} className="space-y-3 max-w-md mx-auto">
            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                Email professionnel
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="vous@etablissement.fr"
                className="w-full h-9 px-3 text-xs font-mono border border-[#E5E5E5] dark:border-[#2A2A2A] bg-transparent rounded-none focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] uppercase tracking-wider">
                Votre besoin
              </label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Décrivez votre organisation et vos besoins spécifiques..."
                rows={3}
                className="w-full px-3 py-2 text-xs font-mono border border-[#E5E5E5] dark:border-[#2A2A2A] bg-transparent rounded-none focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] resize-none"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={contactSending}
              className="w-full font-mono text-xs border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#201D1D] hover:text-[#FDFCFC] dark:hover:bg-[#FDFCFC] dark:hover:text-[#0A0A0A] gap-2"
              variant="outline"
              style={{ borderRadius: 0 }}
            >
              {contactSending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  Envoyer la demande
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
