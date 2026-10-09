import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ text = "Memuat data..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin text-teal-700 dark:text-teal-400 mb-2.5" />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse p-4">
      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-full mb-3" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-6 bg-slate-100 dark:bg-slate-800 rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
