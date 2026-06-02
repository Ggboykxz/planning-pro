"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore, sectionToPath, type AppSection } from "@/lib/store";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSyncExternalStore, useState } from "react";
import { NotificationCenter } from "@/components/shared/NotificationCenter";

const navItems: { id: AppSection; label: string; path: string; shortcut?: string }[] = [
  { id: "dashboard", label: "Tableau de bord", path: "/dashboard" },
  { id: "timetable", label: "Emploi du temps", path: "/timetable" },
  { id: "teachers", label: "Enseignants", path: "/teachers" },
  { id: "rooms", label: "Salles", path: "/rooms" },
  { id: "subjects", label: "Matières", path: "/subjects" },
  { id: "classes", label: "Classes", path: "/classes" },
  { id: "settings", label: "Paramètres", path: "/settings" },
];

const semesters = ["S1", "S2", "S3", "S4", "S5", "S6"];
const academicYears = ["2024-2025", "2025-2026", "2026-2027"];

interface TopNavProps {
  institutionName?: string;
}

export function TopNav({ institutionName }: TopNavProps) {
  const {
    mobileMenuOpen,
    setMobileMenuOpen,
    currentSemester,
    currentAcademicYear,
    setSemester,
    setAcademicYear,
  } = useAppStore();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [semesterOpen, setSemesterOpen] = useState(false);
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
          {/* Logo + institution name + semester selector */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="font-bold text-sm text-[#201D1D] dark:text-[#FDFCFC] hover:opacity-70 transition-opacity"
            >
              PlanningPro_
            </Link>
            {institutionName && (
              <span className="hidden sm:inline text-[10px] text-[#9A9898] border-l border-[#E5E5E5] dark:border-[#2A2A2A] pl-2">
                {institutionName}
              </span>
            )}

            {/* Semester/Year Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setSemesterOpen(!semesterOpen)}
                className="flex items-center gap-1 text-[10px] text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] border border-[#E5E5E5] dark:border-[#2A2A2A] px-2 py-0.5 ml-2 transition-colors"
              >
                <span>
                  {currentSemester || "S1"} · {currentAcademicYear || "2025-2026"}
                </span>
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
              {semesterOpen && (
                <div className="absolute left-2 top-full mt-1 w-48 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#111111] z-50">
                  <div className="px-3 py-2 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                    <p className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC]">Semestre</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {semesters.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSemester(s); setSemesterOpen(false); }}
                          className={cn(
                            "text-[10px] px-2 py-0.5 border transition-all",
                            currentSemester === s
                              ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                              : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC]">Année académique</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {academicYears.map((y) => (
                        <button
                          key={y}
                          onClick={() => { setAcademicYear(y); setSemesterOpen(false); }}
                          className={cn(
                            "text-[10px] px-2 py-0.5 border transition-all",
                            currentAcademicYear === y
                              ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                              : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A]"
                          )}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.path}
                className={cn(
                  "text-sm pb-3 pt-3 border-b-2 transition-all duration-150",
                  pathname === item.path
                    ? "border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] font-bold"
                    : "border-transparent text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side: notification + theme toggle + mobile hamburger */}
          <div className="flex items-center gap-1">
            <NotificationCenter />

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
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm px-6 py-3 text-left border-l-2 transition-all duration-150",
                  pathname === item.path
                    ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold"
                    : "border-transparent text-[#646262] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
                )}
              >
                {item.label}
              </Link>
            ))}
            {/* Mobile semester selector */}
            <div className="px-6 py-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
              <p className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2">Semestre</p>
              <div className="flex flex-wrap gap-1">
                {semesters.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSemester(s)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 border transition-all",
                      currentSemester === s
                        ? "border-[#201D1D] dark:border-[#FDFCFC] bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] font-bold"
                        : "border-[#E5E5E5] dark:border-[#2A2A2A] text-[#646262] dark:text-[#9A9898]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
