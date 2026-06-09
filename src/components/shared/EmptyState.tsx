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
    <div className="flex flex-col items-center justify-center py-16 border border-[#E5E5E5] dark:border-[#2A2A2A] empty-state-animate relative overflow-hidden">
      {/* Decorative dashed border box */}
      <div className="absolute inset-6 border border-dashed border-[#E5E5E5] dark:border-[#2A2A2A] pointer-events-none" />

      {/* Step indicator */}
      {step && (
        <div className="mb-4 relative z-10">
          <span className="text-[10px] font-bold text-[#D97706] border border-[#D97706]/30 bg-[#D97706]/5 px-2.5 py-1">
            ÉTAPE {step}
          </span>
        </div>
      )}

      {/* Icon with animation */}
      {icon && (
        <div className="h-14 w-14 flex items-center justify-center border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] mb-5 empty-state-icon-bounce relative z-10">
          <div className="text-[#9A9898] scale-125">{icon}</div>
        </div>
      )}

      {/* Decorative ASCII line */}
      <div className="text-[10px] text-[#E5E5E5] dark:text-[#2A2A2A] mb-3 select-none relative z-10 font-mono">
        ┌──────────────────────┐
      </div>

      <h3 className="text-base font-bold text-[#201D1D] dark:text-[#FDFCFC] mb-2 relative z-10">{title}</h3>
      <p className="text-xs text-[#9A9898] text-center max-w-sm leading-relaxed relative z-10">{description}</p>

      {/* Decorative ASCII line */}
      <div className="text-[10px] text-[#E5E5E5] dark:text-[#2A2A2A] mt-3 select-none relative z-10 font-mono">
        └──────────────────────┘
      </div>

      {action && (
        <div className="mt-8 relative z-10">
          {action}
        </div>
      )}
    </div>
  );
}
