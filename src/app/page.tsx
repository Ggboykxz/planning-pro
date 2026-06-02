"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, sectionToPath } from "@/lib/store";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

interface InstitutionData {
  id: string;
  name: string;
  type: string;
  country: string;
}

export default function HomePage() {
  const { institutionId, setInstitutionId } = useAppStore();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkInstitution();
  }, []);

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

  // If institution exists, redirect to /dashboard
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
      <div className="text-center">
        <div className="animate-spin h-5 w-5 border-2 border-[#201D1D] dark:border-[#FDFCFC] border-t-transparent mx-auto" />
        <p className="text-xs text-[#9A9898] mt-2">Redirection...</p>
      </div>
    </div>
  );
}
