"use client";

import { UserPlus, DoorOpen, BookOpen, Sparkles } from "lucide-react";

interface QuickActionsProps {
  actions: { label: string; onClick: () => void; icon?: React.ReactNode }[];
}

const defaultIcons = [
  <UserPlus key="user" className="h-3.5 w-3.5" />,
  <DoorOpen key="door" className="h-3.5 w-3.5" />,
  <BookOpen key="book" className="h-3.5 w-3.5" />,
  <Sparkles key="spark" className="h-3.5 w-3.5" />,
];

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="text-xs px-3 py-2 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] hover:-translate-y-px active:translate-y-0 transition-all duration-150 flex items-center gap-1.5"
        >
          {action.icon || defaultIcons[i % defaultIcons.length]}
          {action.label}
        </button>
      ))}
    </div>
  );
}
