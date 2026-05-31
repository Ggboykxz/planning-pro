"use client";

import { cn } from "@/lib/utils";

interface StatBlockProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatBlock({ label, value, sublabel }: StatBlockProps) {
  return (
    <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] p-4">
      <p className="text-3xl font-bold text-[#201D1D] dark:text-[#FDFCFC]">{value}</p>
      <p className="text-xs font-bold text-[#201D1D] dark:text-[#FDFCFC] mt-1">{label}</p>
      {sublabel && (
        <p className="text-xs text-[#9A9898] mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}
