"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, sectionToPath, type AppSection } from "@/lib/store";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DoorOpen,
  BookOpen,
  GraduationCap,
  UserX,
  Settings,
  UserPlus,
  Sparkles,
  Search,
  User,
  CreditCard,
  ScrollText,
} from "lucide-react";

const sectionItems: { id: AppSection; label: string; path: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: "dashboard", label: "Tableau de bord", path: "/dashboard", icon: <LayoutDashboard className="h-3.5 w-3.5" />, shortcut: "1" },
  { id: "timetable", label: "Emploi du temps", path: "/timetable", icon: <Calendar className="h-3.5 w-3.5" />, shortcut: "2" },
  { id: "teachers", label: "Enseignants", path: "/teachers", icon: <Users className="h-3.5 w-3.5" />, shortcut: "3" },
  { id: "rooms", label: "Salles", path: "/rooms", icon: <DoorOpen className="h-3.5 w-3.5" />, shortcut: "4" },
  { id: "subjects", label: "Matières", path: "/subjects", icon: <BookOpen className="h-3.5 w-3.5" />, shortcut: "5" },
  { id: "classes", label: "Classes", path: "/classes", icon: <GraduationCap className="h-3.5 w-3.5" />, shortcut: "6" },
  { id: "absences", label: "Absences", path: "/absences", icon: <UserX className="h-3.5 w-3.5" />, shortcut: "8" },
  { id: "settings", label: "Paramètres", path: "/settings", icon: <Settings className="h-3.5 w-3.5" />, shortcut: "7" },
  { id: "student", label: "Portail étudiant", path: "/student", icon: <GraduationCap className="h-3.5 w-3.5" />, shortcut: "9" },
  { id: "profile", label: "Profil", path: "/profile", icon: <User className="h-3.5 w-3.5" />, shortcut: "" },
  { id: "pricing", label: "Abonnement", path: "/pricing", icon: <CreditCard className="h-3.5 w-3.5" />, shortcut: "" },
  { id: "audit", label: "Journal d'activité", path: "/audit", icon: <ScrollText className="h-3.5 w-3.5" />, shortcut: "" },
];

const quickActions: { label: string; path: string; icon: React.ReactNode }[] = [
  { label: "Ajouter un enseignant", path: "/teachers", icon: <UserPlus className="h-3.5 w-3.5" /> },
  { label: "Créer une salle", path: "/rooms", icon: <DoorOpen className="h-3.5 w-3.5" /> },
  { label: "Nouvelle matière", path: "/subjects", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { label: "Générer emploi du temps", path: "/timetable", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { label: "Signaler une absence", path: "/absences", icon: <UserX className="h-3.5 w-3.5" /> },
  { label: "Portail étudiant", path: "/student", icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { label: "Voir mon profil", path: "/profile", icon: <User className="h-3.5 w-3.5" /> },
  { label: "Voir les tarifs", path: "/pricing", icon: <CreditCard className="h-3.5 w-3.5" /> },
  { label: "Journal d'activité", path: "/audit", icon: <ScrollText className="h-3.5 w-3.5" /> },
];

function CommandPaletteInner() {
  const { setCommandPaletteOpen } = useAppStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = [
    ...sectionItems.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      shortcut: item.shortcut,
      type: "section" as const,
      action: () => {
        router.push(item.path);
        setCommandPaletteOpen(false);
      },
    })),
    ...quickActions.map((item) => ({
      id: `action-${item.path}`,
      label: item.label,
      icon: item.icon,
      shortcut: "",
      type: "action" as const,
      action: () => {
        router.push(item.path);
        setCommandPaletteOpen(false);
      },
    })),
  ];

  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-focus the input when mounted
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selected index when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setCommandPaletteOpen(false)}
      />
      {/* Palette */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] command-palette-animate">
        {/* Search input */}
        <div className="flex items-center border-b border-[#E5E5E5] dark:border-[#2A2A2A] px-4">
          <Search className="h-4 w-4 text-[#9A9898] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une section ou action..."
            className="flex-1 bg-transparent text-sm text-[#201D1D] dark:text-[#FDFCFC] placeholder:text-[#9A9898] px-3 py-3 outline-none font-mono"
          />
          <kbd className="text-[10px] text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A] px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        {/* Results */}
        <div className="max-h-72 overflow-y-auto scrollbar-thin py-1">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[#9A9898]">Aucun résultat</p>
            </div>
          ) : (
            <>
              {/* Sections */}
              {filteredItems.filter((i) => i.type === "section").length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-[#9A9898] px-4 py-1.5 uppercase tracking-wider">
                    Sections
                  </p>
                  {filteredItems.filter((i) => i.type === "section").map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100 ${
                          globalIdx === selectedIndex
                            ? "bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC]"
                            : "text-[#646262] dark:text-[#9A9898]"
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="text-xs flex-1">{item.label}</span>
                        {item.shortcut && (
                          <kbd className="text-[10px] text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A] px-1.5 py-0.5">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
              {/* Quick actions */}
              {filteredItems.filter((i) => i.type === "action").length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-[#9A9898] px-4 py-1.5 uppercase tracking-wider mt-1">
                    Actions rapides
                  </p>
                  {filteredItems.filter((i) => i.type === "action").map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100 ${
                          globalIdx === selectedIndex
                            ? "bg-[#F8F7F7] dark:bg-[#1A1A1A] text-[#201D1D] dark:text-[#FDFCFC]"
                            : "text-[#646262] dark:text-[#9A9898]"
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="text-xs flex-1">{item.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
        {/* Footer */}
        <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] px-4 py-2 flex items-center gap-4">
          <span className="text-[10px] text-[#9A9898]">
            <kbd className="border border-[#E5E5E5] dark:border-[#2A2A2A] px-1 py-0.5 mr-1">↑↓</kbd>
            Naviguer
          </span>
          <span className="text-[10px] text-[#9A9898]">
            <kbd className="border border-[#E5E5E5] dark:border-[#2A2A2A] px-1 py-0.5 mr-1">↵</kbd>
            Sélectionner
          </span>
          <span className="text-[10px] text-[#9A9898]">
            <kbd className="border border-[#E5E5E5] dark:border-[#2A2A2A] px-1 py-0.5 mr-1">ESC</kbd>
            Fermer
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return <CommandPaletteInner />;
}
