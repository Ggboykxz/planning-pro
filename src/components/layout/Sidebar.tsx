"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore, type AppSection } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DoorOpen,
  BookOpen,
  GraduationCap,
  UserX,
  Settings,
  User,
  CreditCard,
  ScrollText,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  X,
  ChevronDown,
  Plus,
  Building2,
  Check,
} from "lucide-react";

const mainNavItems: { id: AppSection; label: string; path: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
  { id: "timetable", label: "Emploi du temps", path: "/timetable", icon: Calendar },
  { id: "teachers", label: "Enseignants", path: "/teachers", icon: Users },
  { id: "rooms", label: "Salles", path: "/rooms", icon: DoorOpen },
  { id: "subjects", label: "Matières", path: "/subjects", icon: BookOpen },
  { id: "classes", label: "Classes", path: "/classes", icon: GraduationCap },
  { id: "absences", label: "Absences", path: "/absences", icon: UserX },
  { id: "settings", label: "Paramètres", path: "/settings", icon: Settings },
];

const secondaryNavItems: { id: AppSection; label: string; path: string; icon: React.ElementType }[] = [
  { id: "student", label: "Portail étudiant", path: "/student", icon: GraduationCap },
  { id: "profile", label: "Profil", path: "/profile", icon: User },
  { id: "pricing", label: "Abonnement", path: "/pricing", icon: CreditCard },
  { id: "audit", label: "Journal", path: "/audit", icon: ScrollText },
];

interface InstitutionOption {
  id: string;
  name: string;
  type: string;
  userRole: string;
}

interface SidebarProps {
  institutionName?: string;
}

export function Sidebar({ institutionName }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, currentUser, mobileMenuOpen, setMobileMenuOpen, institutionId, setInstitutionId } = useAppStore();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Institution switcher state
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Fetch user's institutions
  useEffect(() => {
    if (currentUser?.id) {
      fetch(`/api/institutions?userId=${currentUser.id}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data: InstitutionOption[]) => {
          setInstitutions(data);
        })
        .catch(() => {});
    }
  }, [currentUser?.id, institutionId]);

  // Derive current institution name from institutions list or prop
  const currentInstName = institutions.find((i) => i.id === institutionId)?.name || institutionName || "";

  // Close switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    if (switcherOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [switcherOpen]);

  // Handle institution switch
  const handleSwitchInstitution = (instId: string) => {
    setInstitutionId(instId);
    setSwitcherOpen(false);
    // Reload the page to refresh data for the new institution
    setTimeout(() => {
      window.location.assign("/dashboard");
    }, 0);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isActive = (path: string) => pathname === path;

  // Role label in French
  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrateur";
      case "editor": return "Gestionnaire";
      case "viewer": return "Observateur";
      default: return role;
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] border-r border-[#E5E5E5] dark:border-[#2A2A2A]">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-12 border-b border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0",
        sidebarOpen ? "px-4" : "px-3 justify-center"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#201D1D] dark:text-[#FDFCFC]">
            {sidebarOpen ? "PlanningPro_" : "PP_"}
          </span>
        </Link>
      </div>

      {/* Institution Switcher */}
      {sidebarOpen && (
        <div className="relative border-b border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0" ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#9A9898]" />
              <span className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate">
                {currentInstName || "Établissement"}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-3 w-3 text-[#9A9898] shrink-0 transition-transform",
              switcherOpen && "rotate-180"
            )} />
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <div className="absolute left-0 right-0 top-full z-50 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-md animate-in slide-in-from-top-1 duration-150">
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {institutions.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleSwitchInstitution(inst.id)}
                    className={cn(
                      "w-full px-4 py-2 flex items-center justify-between gap-2 text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
                      inst.id === institutionId && "bg-[#F8F7F7] dark:bg-[#1A1A1A]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate">
                        {inst.name}
                      </p>
                      <p className="text-[10px] text-[#9A9898]">
                        {roleLabel(inst.userRole)}
                      </p>
                    </div>
                    {inst.id === institutionId && (
                      <Check className="h-3 w-3 text-[#201D1D] dark:text-[#FDFCFC] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    setTimeout(() => {
                      window.location.assign("/settings");
                    }, 0);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-left text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  <span className="text-xs font-mono">Nouvel établissement</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed institution indicator */}
      {!sidebarOpen && (
        <div className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0 flex justify-center py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
            title={currentInstName || "Changer d'établissement"}
          >
            <Building2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <div className="flex flex-col gap-0.5 px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 text-xs font-mono transition-all duration-150",
                  sidebarOpen ? "px-3 py-2" : "px-2 py-2 justify-center",
                  active
                    ? "bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold border-l-2 border-[#201D1D] dark:border-[#FDFCFC]"
                    : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] border-l-2 border-transparent"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className={cn(
          "my-2 border-t border-[#E5E5E5] dark:border-[#2A2A2A]",
          sidebarOpen ? "mx-4" : "mx-2"
        )} />

        {/* Secondary Navigation */}
        <div className="flex flex-col gap-0.5 px-2">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 text-xs font-mono transition-all duration-150",
                  sidebarOpen ? "px-3 py-2" : "px-2 py-2 justify-center",
                  active
                    ? "bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold border-l-2 border-[#201D1D] dark:border-[#FDFCFC]"
                    : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] border-l-2 border-transparent"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0">
        {/* Theme toggle + Collapse toggle */}
        <div className={cn(
          "flex items-center",
          sidebarOpen ? "justify-between px-3 py-2" : "flex-col gap-1 px-1 py-2"
        )}>
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
              sidebarOpen ? "px-2 py-1.5" : "p-2 justify-center"
            )}
            aria-label={mounted && theme === "dark" ? "Mode clair" : "Mode sombre"}
            title={mounted && theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {sidebarOpen && <span>Thème</span>}
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "flex items-center gap-2 text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
              sidebarOpen ? "px-2 py-1.5" : "p-2 justify-center"
            )}
            aria-label={sidebarOpen ? "Réduire le panneau" : "Étendre le panneau"}
            title={sidebarOpen ? "Réduire" : "Étendre"}
          >
            {sidebarOpen ? (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Réduire</span>
              </>
            ) : (
              <PanelLeft className="h-4 w-4 shrink-0" />
            )}
          </button>
        </div>

        {/* User section */}
        <div className={cn(
          "border-t border-[#E5E5E5] dark:border-[#2A2A2A]",
          sidebarOpen ? "px-3 py-2" : "px-2 py-2"
        )}>
          <Link
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-2 text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors",
              !sidebarOpen && "justify-center"
            )}
          >
            {/* Avatar circle with first letter */}
            <div className="h-7 w-7 shrink-0 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC] font-bold text-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate">
                  {currentUser?.name || "Utilisateur"}
                </p>
                <p className="text-[10px] font-mono text-[#9A9898] truncate">
                  {currentUser?.plan || "gratuit"}
                </p>
              </div>
            )}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 transition-all duration-200 h-screen sticky top-0",
          sidebarOpen ? "w-60" : "w-14"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar drawer */}
          <aside className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-60 animate-in slide-in-from-left duration-200">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 p-1 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fermer le menu"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
