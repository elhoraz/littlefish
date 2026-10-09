"use client";

import React, { useEffect, useState } from "react";
import { Award, TrendingUp, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { MASTERY_LEVELS } from "@/lib/utils";
import { useChartTheme } from "@/lib/chartTheme";

export default function TutorProgressPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { textColor, tooltipStyle } = useChartTheme();

  useEffect(() => {
    fetch("/api/assessments")
      .then((res) => res.json())
      .then((d) => {
        setAssessments(d.assessments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner text="Menganalisis kemajuan belajar siswa..." />;
  }

  const masteryCounts = [
    {
      name: "Belum Menguasai",
      count: assessments.filter((a) => a.masteryLevel === "BELUM_MENGUASAI").length,
      fill: "#dc2626",
    },
    {
      name: "Mulai Berkembang",
      count: assessments.filter((a) => a.masteryLevel === "MULAI_BERKEMBANG").length,
      fill: "#ea580c",
    },
    {
      name: "Cukup Menguasai",
      count: assessments.filter((a) => a.masteryLevel === "CUKUP_MENGUASAI").length,
      fill: "#d97706",
    },
    {
      name: "Menguasai",
      count: assessments.filter((a) => a.masteryLevel === "MENGUASAI").length,
      fill: "#0284c7",
    },
    {
      name: "Sangat Menguasai",
      count: assessments.filter((a) => a.masteryLevel === "SANGAT_MENGUASAI").length,
      fill: "#059669",
    },
  ];

  const avgScore =
    assessments.length > 0
      ? Math.round(
          assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Bimbel Littlefish — Portal Pengajar"
        title="Analisis Progres Akademik Siswa"
        description="Visualisasi grafik capaian penguasaan materi dan tren performa kelas binaan Anda."
      />

      {/* Analytics KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Rata-Rata Nilai</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
            {avgScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dari seluruh sesi evaluasi materi</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tingkat Penguasaan Tinggi</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {masteryCounts[4].count + masteryCounts[3].count} Penilaian
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Kategori Menguasai & Sangat Menguasai
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Perlu Pendampingan Khusus</span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {masteryCounts[0].count} Penilaian
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Kategori Belum Menguasai
          </p>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi Penguasaan Materi Siswa di Kelas Anda</CardTitle>
          <p className="text-xs text-slate-500">
            Sebaran taksonomi capaian materi berdasarkan hasil ujian dan aktivitas harian
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={masteryCounts} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: any) => [`${val} Penilaian`, "Jumlah"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {masteryCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
