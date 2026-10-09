"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Award, CheckCircle2, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MASTERY_LEVELS } from "@/lib/utils";
import { useChartTheme } from "@/lib/chartTheme";

export default function ParentProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { textColor, gridColor, tooltipStyle, colors } = useChartTheme();

  useEffect(() => {
    fetch("/api/dashboard/parent")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner text="Memuat grafik capaian belajar..." />;
  }

  const scoreTrend = data?.scoreTrend || [];
  const masteryStats = data?.masteryStats || {};

  const masteryBarData = [
    { name: "Belum Menguasai", count: masteryStats.BELUM_MENGUASAI || 0, fill: "#dc2626" },
    { name: "Mulai Berkembang", count: masteryStats.MULAI_BERKEMBANG || 0, fill: "#ea580c" },
    { name: "Cukup Menguasai", count: masteryStats.CUKUP_MENGUASAI || 0, fill: "#d97706" },
    { name: "Menguasai", count: masteryStats.MENGUASAI || 0, fill: "#0284c7" },
    { name: "Sangat Menguasai", count: masteryStats.SANGAT_MENGUASAI || 0, fill: "#059669" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Bimbel Littlefish — Portal Orang Tua"
        title="Visualisasi Progres Belajar Anak"
        description="Grafik perkembangan skor evaluasi dan status penguasaan materi pembelajaran."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Rata-Rata Nilai Belajar</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
            {data?.stats?.averageScore || 0} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Skor akumulasi seluruh topik uji</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Materi yang Sudah Dikuasai</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {(masteryStats.MENGUASAI || 0) + (masteryStats.SANGAT_MENGUASAI || 0)} Topik
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Kategori Menguasai & Sangat Menguasai</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Materi Perlu Latihan Tambahan</span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {(masteryStats.BELUM_MENGUASAI || 0) + (masteryStats.MULAI_BERKEMBANG || 0)} Topik
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Fokus stimulasi pendampingan</p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Tren Nilai dari Waktu ke Waktu</CardTitle>
            <p className="text-xs text-slate-500">
              Evaluasi konsistensi dan peningkatan hasil belajar anak
            </p>
          </CardHeader>
          <CardContent>
            {scoreTrend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Belum ada data evaluasi untuk ditampilkan.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrend} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
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

        {/* Mastery Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sebaran Penguasaan Materi</CardTitle>
            <p className="text-xs text-slate-500">
              Kategorisasi hasil belajar berdasarkan tingkat pemahaman
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={masteryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`${val} Topik`, "Jumlah"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {masteryBarData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
