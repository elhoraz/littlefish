import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTimeIndo(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getJakartaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date);
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + "T00:00:00Z");
  const d2 = new Date(dateStr2 + "T00:00:00Z");
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const MONTH_NAMES_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MASTERY_LEVELS: Record<
  string,
  { label: string; color: string; badgeClass: string; scoreRange: string }
> = {
  BELUM_MENGUASAI: {
    label: "Belum Menguasai",
    color: "#ef4444",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
    scoreRange: "< 50",
  },
  MULAI_BERKEMBANG: {
    label: "Mulai Berkembang",
    color: "#f97316",
    badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900",
    scoreRange: "50 - 64",
  },
  CUKUP_MENGUASAI: {
    label: "Cukup Menguasai",
    color: "#eab308",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    scoreRange: "65 - 79",
  },
  MENGUASAI: {
    label: "Menguasai",
    color: "#06b6d4",
    badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900",
    scoreRange: "80 - 89",
  },
  SANGAT_MENGUASAI: {
    label: "Sangat Menguasai",
    color: "#10b981",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
    scoreRange: "90 - 100",
  },
};

export const ATTENDANCE_STATUSES: Record<
  string,
  { label: string; badgeClass: string }
> = {
  HADIR: {
    label: "Hadir",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  IZIN: {
    label: "Izin",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  SAKIT: {
    label: "Sakit",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  ALPA: {
    label: "Alpa",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

export const SPP_STATUSES: Record<
  string,
  { label: string; badgeClass: string }
> = {
  BELUM_BAYAR: {
    label: "Belum Bayar",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  MENUNGGU: {
    label: "Menunggu Konfirmasi",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  LUNAS: {
    label: "Lunas",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
};
