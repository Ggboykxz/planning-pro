"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { TopNav } from "@/components/layout/TopNav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { TimetableView } from "@/components/timetable/TimetableView";
import { TeachersView } from "@/components/teachers/TeachersView";
import { RoomsView } from "@/components/rooms/RoomsView";
import { SubjectsView } from "@/components/subjects/SubjectsView";
import { ClassesView } from "@/components/classes/ClassesView";
import { SettingsView } from "@/components/settings/SettingsView";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
  country: string;
}

export default function HomePage() {
  const { currentSection, institutionId, setInstitutionId } = useAppStore();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    checkInstitution();
  }, []);

  useEffect(() => {
    if (institutionId) {
      loadInstitution();
    }
  }, [institutionId]);

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
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] animate-pulse">
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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
