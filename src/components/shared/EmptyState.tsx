"use client";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  step?: number;
}

export function EmptyState({ title, description, action, icon, step }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-[#E5E5E5] dark:border-[#2A2A2A] empty-state-animate">
      {/* Step indicator */}
      {step && (
        <div className="mb-4">
          <span className="text-[10px] font-bold text-[#D97706] border border-[#D97706]/30 bg-[#D97706]/5 px-2.5 py-1">
            ÉTAPE {step}
          </span>
        </div>
      )}
      {/* Icon */}
      {icon && (
        <div className="h-12 w-12 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] mb-4">
          <div className="text-[#9A9898]">{icon}</div>
        </div>
      )}
      <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-1">{title}</h3>
      <p className="text-xs text-[#9A9898] text-center max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
