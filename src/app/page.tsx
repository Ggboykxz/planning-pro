"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
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

        // Generate time slots for the institution
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl mx-auto mb-4 animate-pulse">
            P
          </div>
          <p className="text-muted-foreground">Chargement de PlanningPro...</p>
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

  // Main app layout
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <AppSidebar institutionName={institution.name} />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebar institutionName={institution.name} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar institutionName={institution.name} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

// Mobile sidebar component
function MobileSidebar({ institutionName }: { institutionName: string }) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  if (!sidebarOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div className="w-64 shrink-0">
        <AppSidebar institutionName={institutionName} />
      </div>
      <div
        className="flex-1 bg-black/50"
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
}
