"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Rechercher..." }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9898] group-focus-within:text-[#201D1D] dark:group-focus-within:text-[#FDFCFC] transition-colors" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-xs bg-[#F8F7F7] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] text-[#201D1D] dark:text-[#FDFCFC] placeholder:text-[#9A9898] focus:outline-none focus:border-[#201D1D] dark:focus:border-[#FDFCFC]"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A] transition-colors"
        >
          <X className="h-3 w-3 text-[#9A9898] hover:text-[#201D1D] dark:hover:text-[#FDFCFC]" />
        </button>
      ) : (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9A9898] border border-[#E5E5E5] dark:border-[#2A2A2A] px-1 py-0.5 pointer-events-none">
          /
        </kbd>
      )}
    </div>
  );
}
