"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, sectionToPath } from "@/lib/store";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { TopNav } from "@/components/layout/TopNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
  country: string;
}

const sectionShortcuts: Record<string, keyof typeof sectionToPath> = {
  "1": "dashboard",
  "2": "timetable",
  "3": "teachers",
  "4": "rooms",
  "5": "subjects",
  "6": "classes",
  "7": "settings",
};

export default function HomePage() {
  const { institutionId, setInstitutionId, setCurrentSection } = useAppStore();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkInstitution();
  }, []);

  useEffect(() => {
    if (institutionId) {
      loadInstitution();
    }
  }, [institutionId]);

  // Global keyboard shortcuts for section navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (!isInInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const section = sectionShortcuts[e.key];
        if (section) {
          e.preventDefault();
          setCurrentSection(section);
          router.push(sectionToPath[section]);
          return;
        }
      }

      if (e.key === "/" && !isInInput) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Rechercher"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, setCurrentSection]);

  const checkInstitution = async () => {
    try {
      const res = await fetch("/api/institution");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const inst = data[0];
          setInstitution(inst);
          setInstitutionId(inst.id);
          // Redirect to dashboard if institution exists
          router.replace("/dashboard");
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitution = useCallback(async () => {
    try {
      const res = await fetch("/api/institution");
      if (res.ok) {
        const data = await res.json();
        const inst = data.find((i: InstitutionData) => i.id === institutionId);
        if (inst) setInstitution(inst);
      }
    } catch (error) {
      console.error(error);
    }
  }, [institutionId]);

  const handleOnboardingComplete = async (formData: Record<string, unknown>) => {
    setOnboardingLoading(true);
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

        await fetch("/api/timeslots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId: inst.id, generateFromConfig: true }),
        });

        // Navigate to dashboard after onboarding
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] skeleton-shimmer inline-block px-2">
            PlanningPro_
          </p>
          <p className="text-xs text-[#9A9898] mt-1">Chargement...</p>
        </div>
      </div>
    );
  }

  // Onboarding if no institution
  if (!institutionId || !institution) {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        isLoading={onboardingLoading}
      />
    );
  }

  // If institution exists, this page redirects to /dashboard
  // The actual app layout is handled by individual route pages
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
      <div className="text-center">
        <div className="animate-spin h-5 w-5 border-2 border-[#201D1D] dark:border-[#FDFCFC] border-t-transparent mx-auto" />
        <p className="text-xs text-[#9A9898] mt-2">Redirection...</p>
      </div>
    </div>
  );
}
