"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  FileSpreadsheet,
  Award,
  CreditCard,
  Banknote,
  FileText,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Fish,
  ChevronRight,
  UserCheck,
  Layers,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export interface AppShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "TUTOR" | "PARENT";
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
      setIsLoggingOut(false);
    }
  };

  // Define navigation groups per role
  const getNavSections = () => {
    if (user.role === "ADMIN") {
      return [
        {
          title: "Utama",
          items: [
            { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
          ],
        },
        {
          title: "Master Data",
          items: [
            { href: "/admin/students", label: "Data Siswa", icon: GraduationCap },
            { href: "/admin/parents", label: "Data Orang Tua", icon: Users },
            { href: "/admin/tutors", label: "Data Tutor", icon: UserCheck },
            { href: "/admin/classes", label: "Kelola Kelas", icon: Layers },
            { href: "/admin/subjects", label: "Mata Pelajaran", icon: BookOpen },
          ],
        },
        {
          title: "Akademik",
          items: [
            { href: "/admin/attendance", label: "Presensi", icon: CalendarCheck },
            { href: "/admin/modules", label: "Modul Ajar", icon: FileText },
            { href: "/admin/worksheets", label: "Lembar Kerja", icon: FileSpreadsheet },
            { href: "/admin/assessments", label: "Penilaian & Nilai", icon: Award },
          ],
        },
        {
          title: "Keuangan & Operasional",
          items: [
            { href: "/admin/spp", label: "SPP Siswa", icon: CreditCard },
            { href: "/admin/tutor-payments", label: "Honor Tutor", icon: Banknote },
            { href: "/admin/reports", label: "Laporan Bimbel", icon: BarChart3 },
            { href: "/admin/audit-logs", label: "Audit Log", icon: ShieldAlert },
          ],
        },
      ];
    }

    if (user.role === "TUTOR") {
      return [
        {
          title: "Utama",
          items: [
            { href: "/tutor/dashboard", label: "Dashboard Tutor", icon: LayoutDashboard },
            { href: "/tutor/classes", label: "Kelas Saya", icon: Layers },
            { href: "/tutor/students", label: "Daftar Siswa", icon: GraduationCap },
          ],
        },
        {
          title: "Pembelajaran",
          items: [
            { href: "/tutor/attendance", label: "Input Presensi", icon: CalendarCheck },
            { href: "/tutor/modules", label: "Modul Bulanan", icon: FileText },
            { href: "/tutor/worksheets", label: "Lembar Kerja", icon: FileSpreadsheet },
            { href: "/tutor/assessments", label: "Input Penilaian", icon: Award },
            { href: "/tutor/progress", label: "Perkembangan Siswa", icon: TrendingUp },
          ],
        },
      ];
    }

    // PARENT
    return [
      {
        title: "Pemantauan Anak",
        items: [
          { href: "/parent/dashboard", label: "Beranda Pemantauan", icon: LayoutDashboard },
          { href: "/parent/children", label: "Profil Anak", icon: GraduationCap },
          { href: "/parent/attendance", label: "Riwayat Presensi", icon: CalendarCheck },
          { href: "/parent/progress", label: "Progres Penguasaan", icon: TrendingUp },
          { href: "/parent/grades", label: "Nilai & Evaluasi", icon: Award },
          { href: "/parent/modules", label: "Materi & Modul", icon: BookOpen },
        ],
      },
      {
        title: "Administrasi",
        items: [
          { href: "/parent/spp", label: "Status & Riwayat SPP", icon: CreditCard },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80">ADMIN</span>;
      case "TUTOR":
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">TUTOR</span>;
      case "PARENT":
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">ORANG TUA</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-200 overflow-x-hidden">
      {/* Mobile Header Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow-2xs">
            <Fish className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate block">
              Littlefish Bimbel
            </span>
            <div className="flex items-center gap-1.5">{getRoleBadge(user.role)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitcher variant="compact" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay on Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar for Desktop & Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-white border-r border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-transform duration-200 ease-in-out md:static md:translate-x-0 shrink-0 overflow-hidden",
          mobileMenuOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow-2xs">
            <Fish className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Littlefish Bimbel
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
              Sistem Manajemen Terpadu
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5 pt-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" &&
                      item.href !== "/tutor/dashboard" &&
                      item.href !== "/parent/dashboard" &&
                      pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-teal-50 text-teal-800 font-semibold border-l-2 border-teal-700 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-400"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-teal-700 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Theme Switcher, User Card & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2.5">
          {/* Theme switch in sidebar with proper container fitting */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tema Tampilan
              </span>
            </div>
            <ThemeSwitcher variant="segmented" className="w-full" />
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 font-semibold text-xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {getRoleBadge(user.role)}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            className="w-full text-slate-600 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400 text-xs font-medium justify-start"
          >
            <LogOut className="w-3.5 h-3.5 mr-2 shrink-0" />
            Keluar Sistem
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between h-14 px-4 lg:px-6 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 sticky top-0 z-30 min-w-0">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">TA 2026/2027 • Semester Genap</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <ThemeSwitcher variant="dropdown" />
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-semibold text-xs border border-teal-200/60 dark:border-teal-800/60 shrink-0">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[120px] lg:max-w-[160px] truncate">
                {user.name}
              </span>
              {getRoleBadge(user.role)}
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
