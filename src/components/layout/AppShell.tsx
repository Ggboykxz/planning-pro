"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppStore, pathToSection, type AppSection } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIAssistant } from "@/components/shared/AIAssistant";

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

const sectionToPath: Record<AppSection, string> = {
  dashboard: "/dashboard",
  timetable: "/timetable",
  teachers: "/teachers",
  rooms: "/rooms",
  subjects: "/subjects",
  classes: "/classes",
  settings: "/settings",
  profile: "/profile",
  pricing: "/pricing",
  audit: "/audit",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentSection, institutionId, setInstitutionId, setCurrentSection, setMobileMenuOpen, setCommandPaletteOpen } = useAppStore();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Sync URL -> store on pathname change
  useEffect(() => {
    const section = pathToSection[pathname];
    if (section && section !== currentSection) {
      setCurrentSection(section);
    }
  }, [pathname, setCurrentSection]);

  // Load institution on mount - only once
  const institutionLoaded = useRef(false);
  useEffect(() => {
    if (institutionLoaded.current) return;
    institutionLoaded.current = true;

    const loadInstitution = async () => {
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

    loadInstitution();
  }, [setInstitutionId]);

  // If institutionId exists in store but we don't have institution data, fetch it
  useEffect(() => {
    if (institutionId && !institution && institutionLoaded.current) {
      fetch("/api/institution")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch institution");
          return res.json();
        })
        .then((data) => {
          if (data.length > 0) {
            setInstitution(data[0]);
          }
        })
        .catch(console.error);
    }
  }, [institutionId, institution]);

  // Global keyboard shortcuts for section navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (!isInInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const section = sectionShortcuts[e.key];
        if (section) {
          e.preventDefault();
          window.location.href = sectionToPath[section];
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
  }, []);

  // Loading state
  if (loading || !institutionId || !institution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] skeleton-shimmer inline-block px-2 font-mono">
            PlanningPro_
          </p>
          <p className="text-xs text-[#9A9898] mt-1 font-mono">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0A0A0A]">
      {/* Sidebar */}
      <Sidebar institutionName={institution.name} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile + search */}
        <header className="sticky top-0 z-30 h-12 flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-[10px] text-[#9A9898] font-mono hidden sm:inline">
              {institution.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 text-[10px] text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A] px-3 py-1.5 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors font-mono"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Rechercher...</span>
              <kbd className="hidden sm:inline text-[9px] border border-[#E5E5E5] dark:border-[#2A2A2A] px-1 py-0.5">⌘K</kbd>
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 page-transition">
            <ErrorBoundary section={pathToSection[pathname] || "PlanningPro"}>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <CommandPalette />
      <KeyboardShortcuts />
      <AIAssistant />
    </div>
  );
}
