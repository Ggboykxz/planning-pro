"use client";

import Link from "next/link";
import { Terminal, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#FDFCFC] dark:bg-[#0A0A0A]">
      {/* ASCII art 404 */}
      <pre className="text-[8px] sm:text-[10px] leading-[1.2] text-[#D97706] mb-6 select-none font-mono text-center">
{`
 ██████╗ ██╗   ██╗███████╗     ██████╗ ██╗   ██╗███████╗
██╔═══██╗██║   ██║██╔════╝    ██╔═══██╗██║   ██║██╔════╝
██║   ██║██║   ██║█████╗      ██║   ██║██║   ██║█████╗
██║   ██║╚██╗ ██╔╝██╔══╝      ██║   ██║╚██╗ ██╔╝██╔══╝
╚██████╔╝ ╚████╔╝ ███████╗    ╚██████╔╝ ╚████╔╝ ███████╗
 ╚═════╝   ╚═══╝  ╚══════╝     ╚═════╝   ╚═══╝  ╚══════╝
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
          <span className="text-[10px] text-[#9A9898] ml-2 font-mono">planningpro — erreur</span>
        </div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex gap-2">
            <span className="text-[#D97706] font-bold">$</span>
            <span className="text-[#201D1D] dark:text-[#FDFCFC]">GET /{`<page-introuvable>`}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#DC2626] font-bold">✗</span>
            <span className="text-[#DC2626]">Erreur 404 — Page introuvable</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#9A9898] font-bold">⟩</span>
            <span className="text-[#9A9898]">La ressource demandée n&apos;existe pas.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#9A9898] font-bold">⟩</span>
            <span className="text-[#9A9898]">Vérifiez l&apos;URL ou retournez à l&apos;accueil.</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[#9A9898] text-center max-w-sm mb-8 font-mono">
        Cette page n&apos;existe pas ou a été déplacée.
        <br />
        Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez le support.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 text-xs font-bold border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] px-5 py-3 hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Page précédente
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-[#201D1D] dark:bg-[#FDFCFC] text-[#FDFCFC] dark:text-[#0A0A0A] px-5 py-3 hover:opacity-80 transition-opacity min-h-[44px]"
        >
          <Home className="h-3.5 w-3.5" />
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
