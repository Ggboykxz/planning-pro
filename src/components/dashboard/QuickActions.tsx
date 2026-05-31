"use client";

interface QuickActionsProps {
  actions: { label: string; onClick: () => void }[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="text-xs px-3 py-1.5 border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
