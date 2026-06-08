"use client";

import { useEffect } from "react";

/**
 * Global error boundary for the Next.js app.
 * Catches chunk loading failures (stale deployment) and auto-reloads.
 * For other errors, shows the brutalist error UI with a reload button.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload on chunk loading errors (stale deployment)
    const isChunkError =
      error.message?.includes("Failed to load chunk") ||
      error.message?.includes("Loading chunk") ||
      error.message?.includes("ChunkLoadError") ||
      error.message?.includes("loading CSS chunk") ||
      error.message?.includes("__webpack_chunk_load__");

    if (isChunkError) {
      // Clear any service worker cache that might be stale
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      // Force reload from server (not cache)
      window.location.reload();
      return;
    }

    // Log non-chunk errors
    console.error("[GlobalError]", error);
  }, [error]);

  const handleReload = () => {
    // Clear service worker and force reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#FDFCFC] dark:bg-[#0A0A0A]">
      {/* ASCII art error */}
      <pre className="text-[8px] leading-[1.1] text-[#DC2626] mb-4 select-none font-mono">
{`  ┌──────────────────────┐
  │  ╔═══╗              │
  │  ║ ! ║  ERREUR      │
  │  ╚═══╝              │
  │  ──────────────     │
  │  Une erreur s'est   │
  │  produite.          │
  └──────────────────────┘`}
      </pre>

      {/* Section label */}
      <div className="flex items-center gap-2 mb-2">
        <pre className="text-xs text-[#DC2626] leading-none font-mono">{`┌───┐
│ X │
└───┘`}</pre>
        <h3 className="text-sm font-bold text-[#201D1D] dark:text-[#FDFCFC] font-mono">
          Erreur - PlanningPro
        </h3>
      </div>

      {/* Error message */}
      <p className="text-xs text-[#9A9898] mt-1 text-center max-w-md font-mono">
        Un problème inattendu est survenu. Veuillez recharger la page.
      </p>

      {/* Error details (collapsible) */}
      <details className="mt-4 w-full max-w-md">
        <summary className="text-[10px] text-[#9A9898] cursor-pointer font-mono hover:text-[#201D1D] dark:hover:text-[#FDFCFC]">
          Détails techniques
        </summary>
        <pre className="mt-2 p-3 text-[10px] bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto max-h-32 font-mono text-[#DC2626]">
          {error.message}
        </pre>
      </details>

      {/* Reload button */}
      <button
        onClick={handleReload}
        className="mt-6 text-xs font-bold font-mono px-4 py-2 bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] hover:opacity-80 transition-opacity border-0"
      >
        Recharger
      </button>
    </div>
  );
}
