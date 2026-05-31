"use client";

import {
  LayoutDashboard,
  Calendar,
  Users,
  DoorOpen,
  BookOpen,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppStore, type AppSection } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems: { id: AppSection; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "timetable", label: "Emploi du temps", icon: Calendar },
  { id: "teachers", label: "Enseignants", icon: Users },
  { id: "rooms", label: "Salles", icon: DoorOpen },
  { id: "subjects", label: "Matières", icon: BookOpen },
  { id: "classes", label: "Classes", icon: GraduationCap },
  { id: "settings", label: "Paramètres", icon: Settings },
];

interface AppSidebarProps {
  institutionName?: string;
}

export function AppSidebar({ institutionName }: AppSidebarProps) {
  const { currentSection, setCurrentSection, sidebarOpen, setSidebarOpen } =
    useAppStore();

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300 h-full",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo / Institution */}
        <div className="flex items-center gap-3 p-4 min-h-[64px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
            P
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">
                {institutionName || "PlanningPro"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                Gestion d&apos;emplois du temps
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;

              const button = (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    !sidebarOpen && "justify-center px-0",
                    isActive &&
                      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                  )}
                  onClick={() => setCurrentSection(item.id)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Button>
              );

              if (!sidebarOpen) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Collapse button */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">Réduire</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
