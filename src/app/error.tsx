"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center dark:bg-rose-950 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          Terjadi Gangguan
        </p>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Terjadi Kesalahan pada Aplikasi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Sistem Littlefish mendeteksi kendala saat memproses halaman ini. Silakan coba muat ulang atau kembali ke halaman utama.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button variant="secondary" size="md" onClick={() => reset()}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Coba Lagi
          </Button>
          <Link href="/">
            <Button variant="primary" size="md">
              <Home className="w-4 h-4 mr-1.5" />
              Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
