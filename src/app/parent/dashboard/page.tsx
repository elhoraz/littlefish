"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CalendarCheck,
  Award,
  CreditCard,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateIndo, formatRupiah, MASTERY_LEVELS } from "@/lib/utils";
import { useChartTheme } from "@/lib/chartTheme";

export default function ParentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { textColor, gridColor, tooltipStyle, colors } = useChartTheme();

  const fetchDashboard = useCallback(async (studentId?: string) => {
    try {
      const url = studentId
        ? `/api/dashboard/parent?studentId=${studentId}`
        : `/api/dashboard/parent`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (!selectedStudentId && json.selectedChild) {
          setSelectedStudentId(json.selectedChild.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    fetchDashboard(selectedStudentId);
  }, [selectedStudentId, fetchDashboard]);

  if (loading) {
    return <LoadingSpinner text="Memuat portal belajar buah hati Anda..." />;
  }

  if (!data || !data.children || data.children.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Data Anak Terdaftar"
        description="Akun Anda belum terhubung dengan data siswa aktif di Bimbel Littlefish. Silakan hubungi admin bimbel."
      />
    );
  }

  const child = data.selectedChild;
  const stats = data.stats;
  const latestSpp = data.latestSpp;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Bimbel Littlefish — Portal Orang Tua"
        title="Beranda Pemantauan Belajar"
        description="Pantau perkembangan belajar, kehadiran sesi, materi pelajaran, dan administrasi bimbel buah hati Anda."
      />

      {/* Child Switcher for Parents with Multiple Kids */}
      {data.children.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Pilih Profil Anak:
            </p>
            <p className="text-[11px] text-slate-500">
              Data kehadiran, grafik nilai, dan tagihan SPP akan menyesuaikan secara langsung.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data.children.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedStudentId(c.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  c.id === selectedStudentId
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {c.fullName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Child Profile Card */}
      {child && (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white font-bold text-lg shrink-0">
                {child.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {child.fullName}
                  </h2>
                  {child.nickname && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      &quot;{child.nickname}&quot;
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID Siswa: <strong className="text-teal-700 dark:text-teal-400 font-semibold">{child.studentId}</strong> • Kelas:{" "}
                  <strong>{child.class?.name || "Belum ada kelas"}</strong> ({child.class?.level})
                </p>
              </div>
            </div>

            {child.class?.tutor && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs shrink-0">
                <span className="text-slate-400">Tutor Pendamping:</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {child.class.tutor.user.name}
                </p>
                {child.class.tutor.user.phone && (
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {child.class.tutor.user.phone}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tingkat Kehadiran</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {stats?.attendanceRate || 100}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats?.hadirCount || 0} Hadir dari {stats?.totalAttendanceSessions || 0} Sesi
          </p>
        </Card>

        {/* Average Score */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Rata-Rata Nilai</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
            {stats?.averageScore || 0} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari {stats?.totalAssessments || 0} kali pengujian
          </p>
        </Card>

        {/* Current SPP Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Status SPP Bulan Ini</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1">
            {latestSpp ? (
              <Badge
                variant={
                  latestSpp.status === "LUNAS"
                    ? "success"
                    : latestSpp.status === "MENUNGGU"
                    ? "warning"
                    : "danger"
                }
              >
                {latestSpp.status === "LUNAS"
                  ? "Lunas"
                  : latestSpp.status === "MENUNGGU"
                  ? "Menunggu Cek"
                  : "Belum Bayar"}
              </Badge>
            ) : (
              <Badge variant="outline">Belum Ada Tagihan</Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {latestSpp ? formatRupiah(latestSpp.amount) : "Rp 0"}
          </p>
        </Card>

        {/* Curriculum Module */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Modul Bulan Ini</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data.modules?.length || 0} Modul
          </div>
          <Link
            href="/parent/modules"
            className="text-[11px] text-teal-700 hover:underline mt-1 inline-flex items-center gap-1 font-medium"
          >
            Lihat Materi <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>
      </div>

      {/* Progress Chart & Latest Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Grafik Tren Perkembangan Nilai</CardTitle>
                <p className="text-xs text-slate-500">
                  Pergerakan skor evaluasi belajar anak dari waktu ke waktu
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {data.scoreTrend?.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                Belum ada rekaman nilai pengujian untuk grafik ini.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.scoreTrend} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: any) => [`${val} / 100`, "Nilai"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={colors.teal}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: colors.teal }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Teacher Evaluations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Catatan & Umpan Balik Guru Terkini</CardTitle>
                <p className="text-xs text-slate-500">
                  Evaluasi kualitatif dari guru pendamping anak Anda
                </p>
              </div>
              <Award className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.recentAssessments?.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada evaluasi tercatat.</p>
              ) : (
                data.recentAssessments?.map((a: any) => {
                  const mastery = MASTERY_LEVELS[a.masteryLevel] || {
                    label: a.masteryLevel,
                    badgeClass: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">
                            {a.topic}
                          </span>
                          <p className="text-[11px] text-slate-400">
                            {formatDateIndo(a.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                            {a.score}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${mastery.badgeClass}`}
                          >
                            {mastery.label}
                          </span>
                        </div>
                      </div>
                      {a.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                          &ldquo;{a.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
