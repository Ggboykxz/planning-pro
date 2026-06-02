"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore, sectionToPath, pathToSection, type AppSection } from "@/lib/store";
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

const sectionShortcuts: Record<string, AppSection> = {
  "1": "dashboard",
  "2": "timetable",
  "3": "teachers",
  "4": "rooms",
  "5": "subjects",
  "6": "classes",
  "7": "settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentSection, institutionId, setInstitutionId, setCurrentSection } = useAppStore();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Sync URL -> store on pathname change
  useEffect(() => {
    const section = pathToSection[pathname];
    if (section && section !== currentSection) {
      setCurrentSection(section);
    }
  }, [pathname, setCurrentSection]);

  // Check institution on mount
  const institutionLoaded = useRef(false);
  useEffect(() => {
    if (institutionLoaded.current) return;
    institutionLoaded.current = true;
    fetch("/api/institution")
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          const inst = data[0];
          setInstitution(inst);
          setInstitutionId(inst.id);
        }
      })
      .catch((error) => console.error(error));
  }, [setInstitutionId]);

  // Global keyboard shortcuts for section navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (!isInInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const section = sectionShortcuts[e.key];
        if (section) {
          e.preventDefault();
          router.push(sectionToPath[section]);
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
  }, [router]);

  // Loading state
  if (!institutionId || !institution) {
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

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0A0A0A]">
      <TopNav institutionName={institution.name} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 page-transition">
          {children}
        </div>
      </main>
      <MobileBottomNav />
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}
