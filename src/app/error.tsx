"use client";

import { useEffect } from "react";
import { Terminal, RotateCw, Home, AlertTriangle } from "lucide-react";
import Link from "next/link";

/**
 * Global error boundary for the Next.js app.
 * Catches chunk loading failures (stale deployment) and auto-reloads.
 * For other errors, shows the brutalist error UI with a retry button.
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
      <pre className="text-[8px] sm:text-[10px] leading-[1.2] text-[#DC2626] mb-6 select-none font-mono text-center">
{`
 ┌──────────────────────────────────────┐
 │  ╔═══╗                               │
 │  ║ ! ║  ERREUR 500                   │
 │  ╚═══╝                               │
 │  ──────────────────────────          │
 │  Une erreur interne s'est produite.  │
 │  Notre équipe a été notifiée.        │
 └──────────────────────────────────────┘
`}
      </pre>

      {/* Terminal-style error box */}
      <div className="border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#F8F7F7] dark:bg-[#1A1A1A] p-6 max-w-md w-full mb-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-[#DC2626]" />
            <div className="w-2 h-2 bg-[#D97706]" />
            <div className="w-2 h-2 bg-[#16A34A]" />
          </div>
          <span className="text-[10px] text-[#9A9898] ml-2 font-mono">planningpro — erreur système</span>
        </div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex gap-2">
            <span className="text-[#DC2626] font-bold">✗</span>
            <span className="text-[#DC2626]">Erreur interne du serveur</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#9A9898] font-bold">⟩</span>
            <span className="text-[#9A9898]">Un problème inattendu est survenu.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#9A9898] font-bold">⟩</span>
            <span className="text-[#9A9898]">Veuillez réessayer ou contacter le support.</span>
          </div>
          {error.digest && (
            <div className="flex gap-2">
              <span className="text-[#9A9898] font-bold">⟩</span>
              <span className="text-[#9A9898]">ID: {error.digest}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error details (collapsible) */}
      <details className="mb-6 w-full max-w-md">
        <summary className="text-[10px] text-[#9A9898] cursor-pointer font-mono hover:text-[#201D1D] dark:hover:text-[#FDFCFC] transition-colors">
          ▸ Détails techniques
        </summary>
        <pre className="mt-2 p-3 text-[10px] bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] overflow-x-auto max-h-32 font-mono text-[#DC2626]">
          {error.message}
        </pre>
      </details>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-5 py-3 hover:opacity-80 transition-opacity min-h-[44px]"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-xs font-bold border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] px-5 py-3 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors min-h-[44px]"
        >
          Retour à l&apos;accueil
        </Link>
      </div>

      {/* Branding */}
      <div className="mt-12 flex items-center gap-2">
        <Terminal className="h-3.5 w-3.5 text-[#9A9898]" />
        <span className="text-[10px] text-[#9A9898] font-mono">PlanningPro_</span>
      </div>
    </div>
  );
}
