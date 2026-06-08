"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  GraduationCap,
  Calendar,
  Clock,
  User,
  LogOut,
  Menu,
  X,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const studentNavItems = [
  { label: "Mon emploi du temps", path: "/student", icon: Calendar },
  { label: "Mon profil", path: "/profile", icon: User },
];

export function StudentPortalShell({ children }: { children: React.ReactNode }) {
  const { currentUser, institutionId, setInstitutionId, setCurrentUser } = useAppStore();
  const { logout, isAuthenticated } = useAuth();
  const [institutionName, setInstitutionName] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Load institution name
    if (institutionId) {
      fetch("/api/institution")
        .then((res) => res.json())
        .then((data) => {
          if (data.length > 0) {
            const inst = data.find((i: { id: string }) => i.id === institutionId) || data[0];
            setInstitutionName(inst.name);
            setInstitutionId(inst.id);
          }
        })
        .catch(() => {});
    }
  }, [institutionId, setInstitutionId]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex bg-[#FDFCFC] dark:bg-[#0A0A0A]">
      {/* Student Sidebar - Compact and distinct */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111] shrink-0">
        {/* Logo */}
        <div className="h-12 flex items-center gap-2 px-4 border-b border-[#D97706]/30">
          <GraduationCap className="h-4 w-4 text-[#D97706]" />
          <span className="text-xs font-bold font-mono text-[#201D1D] dark:text-[#FDFCFC]">
            PlanningPro
          </span>
          <span className="text-[9px] font-bold font-mono bg-[#D97706]/10 text-[#D97706] px-1.5 py-0.5 ml-auto">
            ÉTUDIANT
          </span>
        </div>

        {/* Institution */}
        {institutionName && (
          <div className="px-4 py-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
            <p className="text-[10px] text-[#9A9898] font-mono truncate">
              {institutionName}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {studentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors",
                  isActive
                    ? "bg-[#D97706]/10 text-[#D97706] font-bold border-l-2 border-[#D97706]"
                    : "text-[#646262] dark:text-[#9A9898] hover:bg-[#E5E5E5]/50 dark:hover:bg-[#1A1A1A]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info & Logout */}
        <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 flex items-center justify-center bg-[#D97706]/10 text-[#D97706] text-xs font-bold font-mono">
              {currentUser?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono truncate">
                {currentUser?.name || "Étudiant"}
              </p>
              <p className="text-[9px] text-[#9A9898] font-mono truncate">
                {currentUser?.email || ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-[10px] text-[#9A9898] hover:text-[#DC2626] font-mono py-1 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-12 flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FDFCFC] dark:bg-[#0A0A0A] px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <GraduationCap className="h-4 w-4 text-[#D97706] md:hidden" />
            <span className="text-[10px] text-[#9A9898] font-mono hidden sm:inline">
              Portail étudiant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold font-mono bg-[#D97706]/10 text-[#D97706] px-2 py-0.5">
              ÉTUDIANT
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#9A9898] hover:text-[#DC2626] transition-colors md:hidden"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#111111] px-4 py-3 space-y-1">
            {studentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors",
                    isActive
                      ? "bg-[#D97706]/10 text-[#D97706] font-bold"
                      : "text-[#646262] dark:text-[#9A9898] hover:bg-[#E5E5E5]/50 dark:hover:bg-[#1A1A1A]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
