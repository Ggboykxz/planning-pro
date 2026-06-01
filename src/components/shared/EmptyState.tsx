"use client";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: string;
  step?: number;
}

const asciiPatterns = [
  `
  ┌─────────────┐
  │  ╔═══╗      │
  │  ║   ║ ○ ○ │
  │  ╚═══╝      │
  │    │        │
  └─────────────┘`,
  `
  ┌─────────────┐
  │  ┌───┐      │
  │  │   │ ─── │
  │  └───┘      │
  │  ┌───┐      │
  └─────────────┘`,
  `
  ┌─────────────┐
  │  ▒▒▒▒▒▒▒▒  │
  │  ▒     ▒    │
  │  ▒▒▒▒▒▒▒▒  │
  │             │
  └─────────────┘`,
  `
  ┌─────────────┐
  │  ╭───╮      │
  │  │ ? │      │
  │  ╰───╯      │
  │             │
  └─────────────┘`,
  `
  ┌─────────────┐
  │  [     ]    │
  │  [     ]    │
  │  [     ]    │
  │             │
  └─────────────┘`,
];

export function EmptyState({ title, description, action, icon = "╌╌╌", step }: EmptyStateProps) {
  const patternIndex = step ? (step - 1) % asciiPatterns.length : 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 border border-[#E5E5E5] dark:border-[#2A2A2A] empty-state-animate">
      {/* Step indicator */}
      {step && (
        <div className="mb-4">
          <span className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] border border-[#E5E5E5] dark:border-[#2A2A2A] px-2 py-1">
            ÉTAPE {step}
          </span>
        </div>
      )}
      {/* ASCII art pattern */}
      <pre className="text-[8px] leading-[1.1] text-[#E5E5E5] dark:text-[#2A2A2A] mb-4 select-none">
        {asciiPatterns[patternIndex]}
      </pre>
      {/* Icon box (smaller, inline with title) */}
      <div className="flex items-center gap-2 mb-2">
        <pre className="text-xs text-[#E5E5E5] dark:text-[#2A2A2A] leading-none">{`┌─┐
│${icon.charAt(0)}│
└─┘`}</pre>
        <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">{title}</h3>
      </div>
      <p className="text-xs text-[#9A9898] mt-1 text-center max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
