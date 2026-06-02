"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-t border-[#E5E5E5] dark:border-[#2A2A2A]">
      {/* Showing X-Y of Z */}
      <p className="text-[10px] text-[#9A9898] font-mono">
        Affichage {totalItems === 0 ? "0" : startIndex}–{endIndex} sur {totalItems} résultat{totalItems !== 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#9A9898] font-mono">Lignes:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-[10px] font-mono bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] px-1.5 py-1 focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className="p-1 text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Page précédente"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[#201D1D] dark:text-[#FDFCFC] px-2">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className="p-1 text-[#646262] dark:text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC] hover:bg-[#F8F7F7] dark:hover:bg-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Page suivante"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
