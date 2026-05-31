"use client";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-[#E5E5E5] dark:border-[#2A2A2A]">
      <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">{title}</h3>
      <p className="text-xs text-[#9A9898] mt-1 text-center max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
