"use client";

import { cn } from "@/lib/utils";

interface ContextBarProps {
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function ContextBar({ items, activeId, onSelect }: ContextBarProps) {
  return (
    <div className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] bg-white dark:bg-[#0A0A0A]">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "text-xs pb-2 pt-2 border-b-2 transition-colors",
                activeId === item.id
                  ? "border-[#201D1D] dark:border-[#FDFCFC] text-[#201D1D] dark:text-[#FDFCFC] font-bold"
                  : "border-transparent text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
