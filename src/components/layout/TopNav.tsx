"use client";

import { useAppStore, type AppSection } from "@/lib/store";
import { Menu, X, Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const navItems: { id: AppSection; label: string; shortcut?: string }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "timetable", label: "Emploi du temps" },
  { id: "teachers", label: "Enseignants" },
  { id: "rooms", label: "Salles" },
  { id: "subjects", label: "Matières" },
  { id: "classes", label: "Classes" },
  { id: "settings", label: "Paramètres" },
];

interface TopNavProps {
  institutionName?: string;
}

export function TopNav({ institutionName }: TopNavProps) {
  const { currentSection, setCurrentSection, mobileMenuOpen, setMobileMenuOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  // Use useSyncExternalStore to detect hydration for theme toggle
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="border-b border-[#E5E5E5] bg-white dark:bg-[#0A0A0A] dark:border-[#2A2A2A] sticky top-0 z-40">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          {/* Logo + institution name */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSection("dashboard")}
              className="font-bold text-sm text-[#201D1D] dark:text-[#FDFCFC] hover:opacity-70 transition-opacity"
            >
              PlanningPro_
            </button>
            {institutionName && (
              <span className="hidden sm:inline text-[10px] text-[#9A9898] border-l border-[#E5E5E5] dark:border-[#2A2A2A] pl-2">
                {institutionName}
              </span>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className={cn(
                  "text-sm pb-3 pt-3 border-b-2 transition-all duration-150",
                  currentSection === item.id
                    ? "border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] font-bold"
                    : "border-transparent text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side: theme toggle + mobile hamburger */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
              aria-label={mounted && theme === "dark" ? "Mode clair" : "Mode sombre"}
              title={mounted && theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
              ) : (
                <Menu className="h-5 w-5 text-[#201D1D] dark:text-[#FDFCFC]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu with slide animation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A] mobile-menu-animate no-print">
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "text-sm px-6 py-3 text-left border-l-2 transition-all duration-150",
                  currentSection === item.id
                    ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold"
                    : "border-transparent text-[#646262] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
