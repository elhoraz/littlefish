"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    isDark,
    gridColor: isDark ? "#1e293b" : "#f1f5f9",
    textColor: isDark ? "#94a3b8" : "#64748b",
    tooltipStyle: {
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      borderColor: isDark ? "#1e293b" : "#e2e8f0",
      color: isDark ? "#f8fafc" : "#0f172a",
      borderRadius: "0.5rem",
      fontSize: "0.75rem",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    },
    colors: {
      teal: isDark ? "#14b8a6" : "#0f766e",
      indigo: isDark ? "#818cf8" : "#4f46e5",
      emerald: isDark ? "#10b981" : "#059669",
      amber: isDark ? "#fbbf24" : "#d97706",
      rose: isDark ? "#f87171" : "#dc2626",
      sky: isDark ? "#38bdf8" : "#0284c7",
    },
  };
}
