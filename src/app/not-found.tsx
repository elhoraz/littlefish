import Link from "next/link";
import { Fish, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
            <Fish className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          Galat 404
        </p>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Halaman yang Anda tuju tidak tersedia atau alamat URL telah dipindahkan. Silakan kembali ke halaman utama.
        </p>
        <div className="pt-2 flex justify-center">
          <Link href="/">
            <Button variant="primary" size="md">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
