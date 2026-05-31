"use client";

import { useAppStore, type AppSection } from "@/lib/store";
import { LayoutDashboard, Calendar, Users, DoorOpen, BookOpen, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems: { id: AppSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Accueil", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "timetable", label: "EDT", icon: <Calendar className="h-4 w-4" /> },
  { id: "teachers", label: "Ens.", icon: <Users className="h-4 w-4" /> },
  { id: "rooms", label: "Salles", icon: <DoorOpen className="h-4 w-4" /> },
  { id: "subjects", label: "Mat.", icon: <BookOpen className="h-4 w-4" /> },
  { id: "classes", label: "Classes", icon: <GraduationCap className="h-4 w-4" /> },
];

export function MobileBottomNav() {
  const { currentSection, setCurrentSection } = useAppStore();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0A0A0A] border-t border-[#E5E5E5] dark:border-[#2A2A2A] z-40 pb-safe no-print">
      <div className="flex items-center justify-around h-14">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentSection(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1 px-2 transition-colors",
              currentSection === item.id
                ? "text-[#201D1D] dark:text-[#FDFCFC]"
                : "text-[#9A9898]"
            )}
          >
            {item.icon}
            <span className="text-[9px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
