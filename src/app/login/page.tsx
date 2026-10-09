"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Fish, Lock, Mail, ArrowRight, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const { success, error } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal masuk ke sistem");
        error("Login Gagal", data.error || "Silakan periksa kembali email & password Anda");
        setLoading(false);
        return;
      }

      success("Login Berhasil", `Selamat datang, ${data.user.name}`);
      router.push(data.redirectUrl || "/");
      router.refresh();
    } catch {
      setErrorMsg("Terjadi gangguan jaringan saat menghubungi server");
      error("Koneksi Gagal", "Silakan coba beberapa saat lagi");
      setLoading(false);
    }
  };

  // Instant 1-Click Demo Login
  const handleQuickLogin = async (roleEmail: string, rolePass: string, roleKey: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrorMsg("");
    setLoading(true);
    setLoadingRole(roleKey);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: roleEmail, password: rolePass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal masuk ke sistem");
        error("Login Gagal", data.error || "Silakan periksa kembali email & password Anda");
        setLoading(false);
        setLoadingRole(null);
        return;
      }

      success("Login Berhasil", `Selamat datang, ${data.user.name}`);
      router.push(data.redirectUrl || "/");
      router.refresh();
    } catch {
      setErrorMsg("Terjadi gangguan jaringan saat menghubungi server");
      error("Koneksi Gagal", "Silakan coba beberapa saat lagi");
      setLoading(false);
      setLoadingRole(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      {/* Top Right Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeSwitcher variant="dropdown" align="right" />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Header */}
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-xs">
            <Fish className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bimbel Littlefish
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Sistem Informasi Manajemen Pembelajaran Terpadu
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-7 px-5 sm:px-8 shadow-xs rounded-xl border border-slate-200 dark:border-slate-800">
          <form className="space-y-4" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <Input
              id="login-email"
              label="Alamat Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@littlefish.test"
              required
              disabled={loading}
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            />

            <Input
              id="login-password"
              label="Kata Sandi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={loading && !loadingRole}
              disabled={loading}
            >
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Demo Credentials Quick Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span className="text-xs font-semibold">
                  Akun Demo (Klik untuk Masuk Langsung)
                </span>
              </div>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
                1-Klik Masuk
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pilih akun di bawah untuk langsung menguji sistem berdasarkan peran:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("admin@littlefish.test", "admin123", "ADMIN")}
                className={cn(
                  "flex flex-col items-start p-2.5 sm:p-3 rounded-lg border text-left transition-all cursor-pointer select-none group relative",
                  loadingRole === "ADMIN"
                    ? "border-teal-600 bg-teal-50 dark:bg-teal-950/50 ring-2 ring-teal-500/30"
                    : "border-slate-200 hover:border-teal-700 hover:bg-teal-50/60 hover:shadow-2xs active:scale-[0.98] dark:border-slate-700 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide">
                    Admin
                  </span>
                  {loadingRole === "ADMIN" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700 dark:text-teal-400" />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Bunda Rina
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {loadingRole === "ADMIN" ? "Sedang masuk..." : "Klik masuk →"}
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("tutor@littlefish.test", "tutor123", "TUTOR")}
                className={cn(
                  "flex flex-col items-start p-2.5 sm:p-3 rounded-lg border text-left transition-all cursor-pointer select-none group relative",
                  loadingRole === "TUTOR"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/30"
                    : "border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/60 hover:shadow-2xs active:scale-[0.98] dark:border-slate-700 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
                    Tutor
                  </span>
                  {loadingRole === "TUTOR" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700 dark:text-indigo-400" />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Kak Dimas
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {loadingRole === "TUTOR" ? "Sedang masuk..." : "Klik masuk →"}
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("ortu@littlefish.test", "parent123", "PARENT")}
                className={cn(
                  "flex flex-col items-start p-2.5 sm:p-3 rounded-lg border text-left transition-all cursor-pointer select-none group relative",
                  loadingRole === "PARENT"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 ring-2 ring-emerald-500/30"
                    : "border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/60 hover:shadow-2xs active:scale-[0.98] dark:border-slate-700 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    Orang Tua
                  </span>
                  {loadingRole === "PARENT" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 dark:text-emerald-400" />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Ibu Ratna
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {loadingRole === "PARENT" ? "Sedang masuk..." : "Klik masuk →"}
                </span>
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Sesi terenkripsi HTTP-Only JWT & Password BCrypt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
