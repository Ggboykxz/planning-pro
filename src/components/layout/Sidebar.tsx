"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  CalendarDays,
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
  LogOut,
  Landmark,
  School,
  Castle,
  Library,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mainNavItems: { id: AppSection; label: string; path: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
  { id: "timetable", label: "Emploi du temps", path: "/timetable", icon: Calendar },
  { id: "teachers", label: "Enseignants", path: "/teachers", icon: Users },
  { id: "rooms", label: "Salles", path: "/rooms", icon: DoorOpen },
  { id: "subjects", label: "Matières", path: "/subjects", icon: BookOpen },
  { id: "classes", label: "Classes", path: "/classes", icon: GraduationCap },
  { id: "absences", label: "Absences", path: "/absences", icon: UserX },
  { id: "holidays", label: "Vacances", path: "/holidays", icon: CalendarDays },
  { id: "team", label: "Équipe", path: "/team", icon: Users },
  { id: "settings", label: "Paramètres", path: "/settings", icon: Settings },
];

const secondaryNavItems: { id: AppSection; label: string; path: string; icon: React.ElementType; studentOnly?: boolean }[] = [
  { id: "student", label: "Portail étudiant", path: "/student", icon: GraduationCap, studentOnly: true },
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

// Map institution type to icon
function getInstitutionTypeIcon(type: string): LucideIcon {
  switch (type) {
    case "universite": return Landmark;
    case "lycee": return School;
    case "college": return Castle;
    case "ecole_primaire": return Library;
    default: return Building2;
  }
}

// Map role to French label + color
function getRoleBadge(role: string): { label: string; color: string; bg: string } {
  switch (role) {
    case "admin": return { label: "Admin", color: "text-[#D97706]", bg: "bg-[#D97706]/10 border-[#D97706]/30" };
    case "editor": return { label: "Gestionnaire", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    case "student": return { label: "Étudiant", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" };
    case "viewer": return { label: "Observateur", color: "text-[#9A9898]", bg: "bg-[#9A9898]/10 border-[#9A9898]/30" };
    default: return { label: role, color: "text-[#9A9898]", bg: "bg-[#9A9898]/10 border-[#9A9898]/30" };
  }
}

export function Sidebar({ institutionName }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, currentUser, mobileMenuOpen, setMobileMenuOpen, institutionId, setInstitutionId, setCurrentUser } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
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

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navRef = useRef<HTMLElement>(null);

  // Fetch user's institutions
  useEffect(() => {
    if (currentUser?.id) {
      fetch(`/api/institutions`)
        .then((res) => res.ok ? res.json() : [])
        .then((data: InstitutionOption[]) => {
          setInstitutions(data);
        })
        .catch(() => {});
    }
  }, [currentUser?.id, institutionId]);

  // Derive current institution name from institutions list or prop
  const currentInstName = institutions.find((i) => i.id === institutionId)?.name || institutionName || "";
  const currentInstType = institutions.find((i) => i.id === institutionId)?.type || "";

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

  // Handle institution switch with client-side navigation
  const handleSwitchInstitution = useCallback((instId: string) => {
    setInstitutionId(instId);
    setSwitcherOpen(false);
    // Use router.push for client-side navigation
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    } else {
      // Force a refresh of the current page data
      router.refresh();
    }
  }, [pathname, router, setInstitutionId]);

  // Handle "All institutions" view
  const handleShowAllInstitutions = useCallback(() => {
    setInstitutionId(null);
    setSwitcherOpen(false);
    router.push("/dashboard");
  }, [router, setInstitutionId]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setInstitutionId(null);
      localStorage.removeItem("planningpro_user");
      router.push("/");
    } catch {
      // Still clear local state
      setCurrentUser(null);
      setInstitutionId(null);
      localStorage.removeItem("planningpro_user");
      router.push("/");
    }
  }, [router, setCurrentUser, setInstitutionId]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  // Role label in French for switcher
  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrateur";
      case "editor": return "Gestionnaire";
      case "viewer": return "Observateur";
      case "student": return "Étudiant";
      default: return role;
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (!currentUser?.name) return "U";
    const parts = currentUser.name.split(" ");
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return currentUser.name.charAt(0).toUpperCase();
  };

  // Keyboard navigation for sidebar items
  const allNavItems = [...mainNavItems, ...secondaryNavItems];
  const handleNavKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, allNavItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const item = allNavItems[focusedIndex];
      if (item) {
        router.push(item.path);
        setMobileMenuOpen(false);
      }
    }
  }, [allNavItems, focusedIndex, router, setMobileMenuOpen]);

  // Reset focused index when sidebar loses focus
  const handleNavBlur = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  const currentRoleBadge = currentUser ? getRoleBadge(currentUser.role) : null;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] border-r border-[#E5E5E5] dark:border-[#2A2A2A]">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-12 border-b border-[#E5E5E5] dark:border-[#2A2A2A] shrink-0",
        sidebarOpen ? "px-4" : "px-3 justify-center"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#201D1D] dark:text-[#FDFCFC] font-mono">
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
              {currentInstType ? (
                (() => {
                  const TypeIcon = getInstitutionTypeIcon(currentInstType);
                  return <TypeIcon className="h-3.5 w-3.5 shrink-0 text-[#9A9898]" />;
                })()
              ) : (
                <Building2 className="h-3.5 w-3.5 shrink-0 text-[#9A9898]" />
              )}
              <span className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate">
                {currentInstName || "Établissement"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {institutions.length > 1 && (
                <span className="text-[9px] font-mono px-1 py-0.5 bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/30">
                  {institutions.length}
                </span>
              )}
              <ChevronDown className={cn(
                "h-3 w-3 text-[#9A9898] shrink-0 transition-transform duration-200",
                switcherOpen && "rotate-180"
              )} />
            </div>
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <div className="absolute left-0 right-0 top-full z-50 border border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-md animate-in slide-in-from-top-1 duration-150">
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {/* All institutions option */}
                {institutions.length > 1 && (
                  <button
                    onClick={handleShowAllInstitutions}
                    className={cn(
                      "w-full px-4 py-2 flex items-center justify-between gap-2 text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
                      !institutionId && "bg-[#F8F7F7] dark:bg-[#1A1A1A]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-[#9A9898]" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate">
                          Tous les établissements
                        </p>
                        <p className="text-[10px] text-[#9A9898]">
                          {institutions.length} établissements
                        </p>
                      </div>
                    </div>
                    {!institutionId && (
                      <Check className="h-3 w-3 text-[#201D1D] dark:text-[#FDFCFC] shrink-0" />
                    )}
                  </button>
                )}

                {institutions.map((inst) => {
                  const InstIcon = getInstitutionTypeIcon(inst.type);
                  return (
                    <button
                      key={inst.id}
                      onClick={() => handleSwitchInstitution(inst.id)}
                      className={cn(
                        "w-full px-4 py-2 flex items-center justify-between gap-2 text-left hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors",
                        inst.id === institutionId && "bg-[#F8F7F7] dark:bg-[#1A1A1A]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <InstIcon className="h-3.5 w-3.5 shrink-0 text-[#9A9898]" />
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate">
                            {inst.name}
                          </p>
                          <p className="text-[10px] text-[#9A9898]">
                            {roleLabel(inst.userRole)}
                          </p>
                        </div>
                      </div>
                      {inst.id === institutionId && (
                        <Check className="h-3 w-3 text-[#D97706] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    router.push("/settings");
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors relative"
              >
                {currentInstType ? (
                  (() => {
                    const TypeIcon = getInstitutionTypeIcon(currentInstType);
                    return <TypeIcon className="h-4 w-4" />;
                  })()
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                {institutions.length > 1 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-[#D97706] text-white text-[7px] font-bold flex items-center justify-center">
                    {institutions.length}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] rounded-none border border-[#2A2A2A] dark:border-[#E5E5E5]">
              {currentInstName || "Changer d'établissement"}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Main Navigation */}
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto scrollbar-thin py-2"
        onKeyDown={handleNavKeyDown}
        onBlur={handleNavBlur}
      >
        <div className="flex flex-col gap-0.5 px-2">
          {mainNavItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 text-xs font-mono transition-all duration-200 outline-none",
                  sidebarOpen ? "px-3 py-2" : "px-2 py-2 justify-center",
                  active
                    ? "bg-[#D97706]/5 dark:bg-[#D97706]/10 text-[#201D1D] dark:text-[#FDFCFC] font-bold border-l-2 border-[#D97706]"
                    : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] border-l-2 border-transparent",
                  focusedIndex === index && "ring-1 ring-[#D97706]/40 ring-inset"
                )}
                title={!sidebarOpen ? item.label : undefined}
                tabIndex={0}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#D97706]")} />
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
          {secondaryNavItems.filter((item) => !item.studentOnly || currentUser?.role === "student").map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const globalIndex = mainNavItems.length + index;
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 text-xs font-mono transition-all duration-200 outline-none",
                  sidebarOpen ? "px-3 py-2" : "px-2 py-2 justify-center",
                  active
                    ? "bg-[#D97706]/5 dark:bg-[#D97706]/10 text-[#201D1D] dark:text-[#FDFCFC] font-bold border-l-2 border-[#D97706]"
                    : "text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] border-l-2 border-transparent",
                  focusedIndex === globalIndex && "ring-1 ring-[#D97706]/40 ring-inset"
                )}
                title={!sidebarOpen ? item.label : undefined}
                tabIndex={0}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#D97706]")} />
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
              "flex items-center gap-2 text-xs text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-all duration-300 relative overflow-hidden",
              sidebarOpen ? "px-2 py-1.5" : "p-2 justify-center"
            )}
            aria-label={mounted && theme === "dark" ? "Mode clair" : "Mode sombre"}
            title={mounted && theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            <span className="relative h-4 w-4 shrink-0">
              <Sun className={cn(
                "h-4 w-4 absolute inset-0 transition-all duration-300",
                mounted && theme === "dark"
                  ? "opacity-100 rotate-0 scale-100"
                  : "opacity-0 -rotate-90 scale-50"
              )} />
              <Moon className={cn(
                "h-4 w-4 absolute inset-0 transition-all duration-300",
                mounted && theme === "dark"
                  ? "opacity-0 rotate-90 scale-50"
                  : "opacity-100 rotate-0 scale-100"
              )} />
            </span>
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
          sidebarOpen ? "px-3 py-2.5" : "px-2 py-2"
        )}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
                  >
                    {/* Avatar circle with initials */}
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] font-bold text-xs font-mono rounded-none transition-transform group-hover:scale-105">
                      {getUserInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-[#201D1D] dark:text-[#FDFCFC] truncate font-bold">
                        {currentUser?.name || "Utilisateur"}
                      </p>
                      {currentRoleBadge && (
                        <span className={cn(
                          "inline-block text-[9px] font-mono px-1 py-0.5 border mt-0.5",
                          currentRoleBadge.bg,
                          currentRoleBadge.color
                        )}>
                          {currentRoleBadge.label}
                        </span>
                      )}
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] rounded-none border border-[#2A2A2A] dark:border-[#E5E5E5]">
                  <p className="font-bold">{currentUser?.name || "Utilisateur"}</p>
                  <p className="text-[10px] opacity-70">{currentUser?.email || ""}</p>
                  {currentUser?.plan && (
                    <p className="text-[10px] opacity-70">Plan : {currentUser.plan}</p>
                  )}
                </TooltipContent>
              </Tooltip>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#9A9898] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                title="Déconnexion"
                aria-label="Déconnexion"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="h-8 w-8 flex items-center justify-center bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] font-bold text-xs font-mono rounded-none"
                  >
                    {getUserInitials()}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#201D1D] rounded-none border border-[#2A2A2A] dark:border-[#E5E5E5]">
                  <p className="font-bold">{currentUser?.name || "Utilisateur"}</p>
                  <p className="text-[10px] opacity-70">{currentUser?.email || ""}</p>
                </TooltipContent>
              </Tooltip>
              <button
                onClick={handleLogout}
                className="p-1 text-[#9A9898] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Déconnexion"
                aria-label="Déconnexion"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0",
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
              className="absolute top-3 right-3 p-1 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] z-10"
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
