"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore, type AppSection } from "@/lib/store";
import { TopNav } from "@/components/layout/TopNav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { TimetableView } from "@/components/timetable/TimetableView";
import { TeachersView } from "@/components/teachers/TeachersView";
import { RoomsView } from "@/components/rooms/RoomsView";
import { SubjectsView } from "@/components/subjects/SubjectsView";
import { ClassesView } from "@/components/classes/ClassesView";
import { SettingsView } from "@/components/settings/SettingsView";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
  country: string;
}

const sectionShortcuts: Record<string, AppSection> = {
  "1": "dashboard",
  "2": "timetable",
  "3": "teachers",
  "4": "rooms",
  "5": "subjects",
  "6": "classes",
  "7": "settings",
};

export default function HomePage() {
  const { currentSection, institutionId, setInstitutionId, setCurrentSection } = useAppStore();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  useEffect(() => {
    checkInstitution();
  }, []);

  useEffect(() => {
    if (institutionId) {
      loadInstitution();
    }
  }, [institutionId]);

  // Global keyboard shortcuts for section navigation and search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Number keys 1-7 for section navigation (only when not in input)
      if (!isInInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const section = sectionShortcuts[e.key];
        if (section) {
          e.preventDefault();
          setCurrentSection(section);
          return;
        }
      }

      // "/" to focus search inputs
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
  }, [setCurrentSection]);

  // Trigger transition animation on section change
  useEffect(() => {
    setTransitionKey((prev) => prev + 1);
  }, [currentSection]);

  const checkInstitution = async () => {
    try {
      const res = await fetch("/api/institution");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const inst = data[0];
          setInstitution(inst);
          setInstitutionId(inst.id);
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
      }
    } catch (error) {
      console.error(error);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleSettingsUpdate = () => {
    loadInstitution();
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

  // Main app layout with top nav
  const renderSection = () => {
    switch (currentSection) {
      case "dashboard":
        return <DashboardView institutionId={institutionId} />;
      case "timetable":
        return <TimetableView institutionId={institutionId} />;
      case "teachers":
        return <TeachersView institutionId={institutionId} />;
      case "rooms":
        return <RoomsView institutionId={institutionId} />;
      case "subjects":
        return <SubjectsView institutionId={institutionId} />;
      case "classes":
        return <ClassesView institutionId={institutionId} />;
      case "settings":
        return <SettingsView institutionId={institutionId} onUpdate={handleSettingsUpdate} />;
      default:
        return <DashboardView institutionId={institutionId} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0A0A0A]">
      <TopNav institutionName={institution.name} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div key={transitionKey} className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 page-transition">
          {renderSection()}
        </div>
      </main>
      <MobileBottomNav />
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}
