"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Building2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import Link from "next/link";

interface PlanFeature {
  label: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  icon: React.ReactNode;
  features: PlanFeature[];
  cta: string;
  ctaStyle: "current" | "primary" | "secondary";
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "/mois",
    icon: <Zap className="h-5 w-5" />,
    features: [
      { label: "1 établissement", included: true },
      { label: "Jusqu'à 10 enseignants", included: true },
      { label: "Jusqu'à 5 classes", included: true },
      { label: "Emploi du temps basique", included: true },
      { label: "Export CSV", included: true },
      { label: "Support par email", included: true },
      { label: "Génération automatique (IA)", included: false },
      { label: "Export PDF et iCal", included: false },
      { label: "Partage de liens", included: false },
      { label: "Journal d'activité", included: false },
      { label: "SSO / SAML", included: false },
      { label: "API dédiée", included: false },
    ],
    cta: "Plan actuel",
    ctaStyle: "current",
  },
  {
    id: "pro",
    name: "Pro",
    price: "29€",
    period: "/mois",
    icon: <Sparkles className="h-5 w-5" />,
    popular: true,
    features: [
      { label: "Établissements illimités", included: true },
      { label: "Enseignants et classes illimités", included: true },
      { label: "Génération automatique (IA)", included: true },
      { label: "Export CSV, PDF, iCal", included: true },
      { label: "Partage de liens", included: true },
      { label: "Journal d'activité", included: true },
      { label: "Support prioritaire", included: true },
      { label: "SSO / SAML", included: false },
      { label: "API dédiée", included: false },
      { label: "Multi-sites", included: false },
    ],
    cta: "Passer au Pro",
    ctaStyle: "primary",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "99€",
    period: "/mois",
    icon: <Building2 className="h-5 w-5" />,
    features: [
      { label: "Tout dans Pro", included: true },
      { label: "SSO / SAML", included: true },
      { label: "API dédiée", included: true },
      { label: "Multi-sites", included: true },
      { label: "Support 24/7", included: true },
      { label: "SLA garanti", included: true },
    ],
    cta: "Contacter les ventes",
    ctaStyle: "secondary",
  },
];

export default function PricingPage() {
  const { currentUser } = useAppStore();
  const currentPlan = currentUser?.plan || "free";

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-lg font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
          Abonnement
        </h1>
        <p className="text-xs text-[#9A9898] font-mono mt-1">
          Choisissez le plan adapté à votre établissement
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative border shadow-none flex flex-col",
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

              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[#9A9898]",
                    plan.popular && "text-[#201D1D] dark:text-[#FDFCFC]"
                  )}>
                    {plan.icon}
                  </span>
                  <CardTitle className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                    {plan.name}
                  </CardTitle>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
                    {plan.price}
                  </span>
                  <span className="text-xs font-mono text-[#9A9898]">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Features */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-[#9A9898] shrink-0 mt-0.5" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-mono",
                          feature.included
                            ? "text-[#201D1D] dark:text-[#FDFCFC]"
                            : "text-[#9A9898] line-through"
                        )}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
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
                    onClick={() => alert("Fonctionnalité en cours de développement. Le paiement sera bientôt disponible.")}
                  >
                    {isCurrent ? "Plan actuel" : plan.cta}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full font-mono text-xs border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                    style={{ borderRadius: 0 }}
                    onClick={() => alert("Fonctionnalité en cours de développement. Contactez-nous à contact@planningpro.app")}
                  >
                    {plan.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ / Info */}
      <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-6">
        <h2 className="text-sm font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC] mb-4">
          Questions fréquentes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
              Puis-je changer de plan ?
            </p>
            <p className="text-[10px] font-mono text-[#9A9898]">
              Oui, vous pouvez upgrader ou downgrader à tout moment. Les changements prennent effet immédiatement.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
              Y a-t-il un engagement ?
            </p>
            <p className="text-[10px] font-mono text-[#9A9898]">
              Non, tous les plans sont sans engagement. Vous pouvez annuler à tout moment.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
              Comment fonctionne la génération IA ?
            </p>
            <p className="text-[10px] font-mono text-[#9A9898]">
              L&apos;IA analyse vos contraintes et génère automatiquement un emploi du temps optimisé.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
              Mes données sont-elles sécurisées ?
            </p>
            <p className="text-[10px] font-mono text-[#9A9898]">
              Oui, toutes les données sont chiffrées et hébergées en Europe. Conformité RGPD.
            </p>
          </div>
        </div>
      </div>

      {/* Contact link */}
      <div className="text-center border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-6">
        <p className="text-xs font-mono text-[#9A9898]">
          Besoin d&apos;un plan sur mesure ?{" "}
          <Link
            href="#"
            className="text-[#201D1D] dark:text-[#FDFCFC] underline underline-offset-2 hover:opacity-70"
            onClick={(e) => {
              e.preventDefault();
              alert("Contactez-nous à contact@planningpro.app");
            }}
          >
            Contactez-nous
          </Link>
        </p>
      </div>
    </div>
  );
}
