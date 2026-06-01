"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const shortcuts = [
  { keys: ["1"], description: "Tableau de bord" },
  { keys: ["2"], description: "Emploi du temps" },
  { keys: ["3"], description: "Enseignants" },
  { keys: ["4"], description: "Salles" },
  { keys: ["5"], description: "Matières" },
  { keys: ["6"], description: "Classes" },
  { keys: ["7"], description: "Paramètres" },
  { keys: ["⌘", "K"], description: "Palette de commandes" },
  { keys: ["/"], description: "Rechercher" },
  { keys: ["?"], description: "Afficher l'aide" },
  { keys: ["Esc"], description: "Fermer les dialogues" },
];

export function KeyboardShortcuts() {
  const { shortcutsOpen, setShortcutsOpen } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in inputs
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "?" && !isInInput) {
        e.preventDefault();
        setShortcutsOpen(!shortcutsOpen);
      }
      if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsOpen, setShortcutsOpen]);

  if (!shortcutsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setShortcutsOpen(false)}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] command-palette-animate">
        {/* Header */}
        <div className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC]">
              Raccourcis clavier
            </h2>
            <kbd className="text-[10px] text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A] px-1.5 py-0.5">
              ESC
            </kbd>
          </div>
        </div>
        {/* Shortcuts list */}
        <div className="px-6 py-4 space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.description} className="flex items-center justify-between">
              <span className="text-xs text-[#646262] dark:text-[#9A9898]">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="text-[10px] font-bold text-[#201D1D] dark:text-[#FDFCFC] bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] px-2 py-1 min-w-[28px] text-center inline-block">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="text-[10px] text-[#9A9898] mx-0.5">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] px-6 py-3">
          <p className="text-[10px] text-[#9A9898] text-center">
            Appuyez sur <kbd className="border border-[#E5E5E5] dark:border-[#2A2A2A] px-1 py-0.5 mx-0.5">?</kbd> pour basculer
          </p>
        </div>
      </div>
    </div>
  );
}
