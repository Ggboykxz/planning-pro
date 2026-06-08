"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore, type AppSection } from "@/lib/store";
import { LayoutDashboard, Calendar, Users, DoorOpen, BookOpen, GraduationCap, UserX, UserCog, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems: { id: AppSection; label: string; path: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Accueil", path: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "timetable", label: "EDT", path: "/timetable", icon: <Calendar className="h-4 w-4" /> },
  { id: "teachers", label: "Ens.", path: "/teachers", icon: <Users className="h-4 w-4" /> },
  { id: "rooms", label: "Salles", path: "/rooms", icon: <DoorOpen className="h-4 w-4" /> },
  { id: "classes", label: "Classes", path: "/classes", icon: <GraduationCap className="h-4 w-4" /> },
  { id: "absences", label: "Abs.", path: "/absences", icon: <UserX className="h-4 w-4" /> },
  { id: "team", label: "Équipe", path: "/team", icon: <UserCog className="h-4 w-4" /> },
  { id: "settings", label: "Régl.", path: "/settings", icon: <Settings className="h-4 w-4" /> },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0A0A0A] border-t border-[#E5E5E5] dark:border-[#2A2A2A] z-40 pb-safe no-print">
      <div className="flex items-center overflow-x-auto scrollbar-thin h-14">
        <div className="flex items-center justify-around min-w-full">
          {mobileNavItems.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 px-2 transition-colors shrink-0",
                pathname === item.path
                  ? "text-[#201D1D] dark:text-[#FDFCFC]"
                  : "text-[#9A9898]"
              )}
            >
              {item.icon}
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
