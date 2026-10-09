"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { useTheme, Theme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeSwitcherProps {
  variant?: "dropdown" | "segmented" | "compact";
  align?: "left" | "right";
  className?: string;
}

export function ThemeSwitcher({ variant = "dropdown", align = "right", className }: ThemeSwitcherProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const options: { id: Theme; label: string; icon: React.ElementType }[] = [
    { id: "light", label: "Terang", icon: Sun },
    { id: "dark", label: "Gelap", icon: Moon },
    { id: "system", label: "Sistem", icon: Laptop },
  ];

  const CurrentIcon = resolvedTheme === "dark" ? Moon : Sun;

  // Segmented control variant - responsive flex layout that fits cleanly inside sidebars and containers
  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "flex items-center w-full rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/80 box-border overflow-hidden",
          className
        )}
        role="group"
        aria-label="Pilih tema tampilan"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-[11px] font-medium transition-all cursor-pointer min-w-0 select-none",
                isActive
                  ? "bg-white text-teal-800 shadow-2xs font-semibold dark:bg-slate-800 dark:text-teal-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
              aria-pressed={isActive}
              title={`Pilih tema ${opt.label}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact icon-only quick toggle
  if (variant === "compact") {
    const handleToggle = () => {
      if (theme === "light") setTheme("dark");
      else if (theme === "dark") setTheme("system");
      else setTheme("light");
    };

    return (
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer",
          className
        )}
        title={`Tema saat ini: ${theme === "light" ? "Terang" : theme === "dark" ? "Gelap" : "Sistem (Otomatis)"}. Klik untuk ganti.`}
        aria-label="Ganti tema tampilan"
      >
        <CurrentIcon className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
      </button>
    );
  }

  // Standard Dropdown variant
  return (
    <div className={cn("relative inline-block text-left shrink-0", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer shrink-0"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Pilih tema tampilan"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
        <span className="hidden sm:inline">
          {theme === "light" ? "Terang" : theme === "dark" ? "Gelap" : "Sistem"}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-36 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white p-1 shadow-md ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900",
            align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTheme(opt.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  isSelected
                    ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                )}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-teal-700 dark:text-teal-400" : "text-slate-400")} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
