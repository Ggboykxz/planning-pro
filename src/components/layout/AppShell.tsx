"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppStore, pathToSection, type AppSection } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Menu, Search, LogOut } from "lucide-react";
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
  "7": "absences",
  "8": "holidays",
  "9": "student",
};

const sectionToPath: Record<AppSection, string> = {
  dashboard: "/dashboard",
  timetable: "/timetable",
  teachers: "/teachers",
  rooms: "/rooms",
  subjects: "/subjects",
  classes: "/classes",
  absences: "/absences",
  holidays: "/holidays",
  team: "/team",
  student: "/student",
  settings: "/settings",
  profile: "/profile",
  pricing: "/pricing",
  audit: "/audit",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentSection, institutionId, setInstitutionId, setCurrentSection, setMobileMenuOpen, setCommandPaletteOpen, currentUser, setCurrentUser } = useAppStore();
  const { isAuthenticated, isLoading, restoreSession, logout, isStudent } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loadingInstitution, setLoadingInstitution] = useState(true);
  const pathname = usePathname();
  const sessionRestored = useRef(false);

  // Sync URL -> store on pathname change
  useEffect(() => {
    const section = pathToSection[pathname];
    if (section && section !== currentSection) {
      setCurrentSection(section);
    }
  }, [pathname, setCurrentSection]);

  // Restore session on mount - only once
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;
    restoreSession();
  }, [restoreSession]);

  // Load institution when user is authenticated - only once per institutionId
  const institutionLoaded = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !institutionId) return;
    if (institutionLoaded.current && institution?.id === institutionId) return;
    institutionLoaded.current = true;

    const loadInstitution = async () => {
      try {
        const res = await fetch("/api/institution");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            // Find the current institution by ID, or fall back to first
            const inst = data.find((i: InstitutionData) => i.id === institutionId) || data[0];
            setInstitution(inst);
            setInstitutionId(inst.id);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingInstitution(false);
      }
    };

    loadInstitution();
  }, [isAuthenticated, institutionId, setInstitutionId, institution?.id]);

  // If institutionId exists in store but we don't have institution data, fetch it
  useEffect(() => {
    if (institutionId && !institution && institutionLoaded.current && isAuthenticated) {
      fetch("/api/institution")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch institution");
          return res.json();
        })
        .then((data) => {
          if (data.length > 0) {
            const inst = data.find((i: InstitutionData) => i.id === institutionId) || data[0];
            setInstitution(inst);
          }
        })
        .catch(console.error);
    }
  }, [institutionId, institution, isAuthenticated]);

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

  // Auth loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] skeleton-shimmer inline-block px-2 font-mono">
            PlanningPro_
          </p>
          <p className="text-xs text-[#9A9898] mt-1 font-mono">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - should redirect (handled by useAuth)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
            PlanningPro_
          </p>
          <p className="text-xs text-[#9A9898] mt-1 font-mono">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  // Loading institution data
  if (loadingInstitution || !institutionId || !institution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] skeleton-shimmer inline-block px-2 font-mono">
            PlanningPro_
          </p>
          <p className="text-xs text-[#9A9898] mt-1 font-mono">Chargement de l&apos;établissement...</p>
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
            {isStudent && (
              <span className="text-[9px] font-bold font-mono bg-[#D97706]/10 text-[#D97706] px-2 py-0.5">
                PORTE ÉTUDIANT
              </span>
            )}
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
            <button
              onClick={logout}
              className="p-1.5 text-[#9A9898] hover:text-[#DC2626] transition-colors"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
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
