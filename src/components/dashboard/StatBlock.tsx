"use client";

import { cn } from "@/lib/utils";

interface StatBlockProps {
  label: string;
  value: string | number;
  sublabel?: string;
  onClick?: () => void;
}

export function StatBlock({ label, value, sublabel, onClick }: StatBlockProps) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={cn(
        "border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 transition-colors duration-150",
        isClickable && "stat-block-hover cursor-pointer",
        isClickable && "hover:border-[#201D1D] dark:hover:border-[#FDFCFC]"
      )}
    >
      <p className="text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{value}</p>
      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-1">{label}</p>
      {sublabel && (
        <p className="text-xs text-[#9A9898] mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}
