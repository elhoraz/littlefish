"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Layers,
  CalendarCheck,
  CreditCard,
  Banknote,
  Award,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { useChartTheme } from "@/lib/chartTheme";

interface DashboardData {
  kpis: {
    activeStudentsCount: number;
    activeTutorsCount: number;
    activeClassesCount: number;
    todayAttendanceCount: number;
    unpaidSppCount: number;
    currentPeriodRevenue: number;
    tutorCompensationTotal: number;
  };
  charts: {
    attendanceStats: {
      Hadir: number;
      Izin: number;
      Sakit: number;
      Alpa: number;
    };
    masteryDistribution: {
      name: string;
      count: number;
      color: string;
    }[];
    classEnrollments: {
      name: string;
      siswa: number;
      kapasitas: number;
    }[];
  };
  recent: {
    students: any[];
    payments: any[];
    assessments: any[];
    attendances: any[];
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { textColor, tooltipStyle } = useChartTheme();

  useEffect(() => {
    fetch("/api/dashboard/admin")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner text="Memuat data operasional Littlefish..." />;
  }

  if (!data || !data.kpis) {
    return (
      <div className="p-8 text-center text-slate-500">
        Gagal memuat data analitik dashboard. Silakan muat ulang halaman.
      </div>
    );
  }

  const attendanceChartData = [
    { name: "Hadir", count: data.charts.attendanceStats.Hadir, fill: "#059669" },
    { name: "Izin", count: data.charts.attendanceStats.Izin, fill: "#0284c7" },
    { name: "Sakit", count: data.charts.attendanceStats.Sakit, fill: "#d97706" },
    { name: "Alpa", count: data.charts.attendanceStats.Alpa, fill: "#dc2626" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Bimbel Littlefish — Operasional"
        title="Ringkasan Operasional Bimbel"
        description="Pantauan terpadu data siswa, kehadiran sesi, modul ajar, dan status administrasi SPP Littlefish."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance"
              className="px-3 py-2 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            >
              Cek Presensi Hari Ini
            </Link>
            <Link
              href="/admin/spp"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-2xs transition-colors"
            >
              Kelola SPP
            </Link>
          </div>
        }
      />

      {/* Operational Attention Banner */}
      {data.kpis.unpaidSppCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Perhatian Administrasi: {data.kpis.unpaidSppCount} Tagihan SPP Belum Lunas
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                Segera tinjau status pembayaran atau kirimkan notifikasi invoice kepada orang tua siswa terkait.
              </p>
            </div>
          </div>
          <Link
            href="/admin/spp"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shrink-0 text-center"
          >
            Buka Rekap SPP
          </Link>
        </div>
      )}

      {/* Structured Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Siswa Aktif</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data.kpis.activeStudentsCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Terbagi di {data.kpis.activeClassesCount} kelas belajar
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Presensi Hari Ini</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data.kpis.todayAttendanceCount} Sesi
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sesi tercatat pada tanggal hari ini
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Penerimaan SPP</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(data.kpis.currentPeriodRevenue)}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Dana masuk periode berjalan
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Estimasi Honor Tutor</span>
            <Banknote className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(data.kpis.tutorCompensationTotal)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total {data.kpis.activeTutorsCount} tutor aktif
          </p>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Academic Mastery Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Distribusi Penguasaan Akademik Siswa</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  5 Tingkatan Taksonomi Evaluasi Belajar (Data Penilaian Riil)
                </p>
              </div>
              <Award className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.masteryDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: textColor }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`${val} Siswa / Evaluasi`, "Frekuensi"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.charts.masteryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Proporsi Kehadiran Sesi Pembelajaran</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekapitulasi status kehadiran siswa pada semua kelas
                </p>
              </div>
              <CalendarCheck className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Sesi`, "Kehadiran"]} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Streams: Recent Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Latest Assessments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Penilaian Terbaru</CardTitle>
              <Link
                href="/admin/assessments"
                className="text-xs text-teal-700 hover:underline flex items-center gap-0.5 font-medium"
              >
                Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.recent.assessments.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada penilaian tercatat.</p>
              ) : (
                data.recent.assessments.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {a.student.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {a.subject.name} • {a.topic}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                        {a.score}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {formatDateIndo(a.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Latest Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Pembayaran SPP</CardTitle>
              <Link
                href="/admin/spp"
                className="text-xs text-teal-700 hover:underline flex items-center gap-0.5 font-medium"
              >
                Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.recent.payments.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada transaksi SPP.</p>
              ) : (
                data.recent.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {p.student.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {p.invoiceNumber} • {formatRupiah(p.amount)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        p.status === "LUNAS"
                          ? "success"
                          : p.status === "MENUNGGU"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Latest Students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Siswa Baru Terdaftar</CardTitle>
              <Link
                href="/admin/students"
                className="text-xs text-teal-700 hover:underline flex items-center gap-0.5 font-medium"
              >
                Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.recent.students.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada siswa terdaftar.</p>
              ) : (
                data.recent.students.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {s.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {s.studentId} • {s.class?.name || "Belum ada kelas"}
                      </p>
                    </div>
                    <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                      {s.status === "ACTIVE" ? "Aktif" : s.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
