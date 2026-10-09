"use client";

import React, { useEffect, useState } from "react";
import { Printer, FileSpreadsheet, Download, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

export default function AdminReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/admin")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner text="Menyiapkan laporan bimbel terpadu..." />;
  }

  const currentDateStr = formatDateIndo(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Laporan & Eksekutif"
        title="Laporan Terpadu Bimbel Littlefish"
        description="Rekapitulasi komprehensif metrik akademik, operasional presensi, dan kesehatan finansial lembaga."
        actions={
          <Button
            variant="primary"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Cetak Laporan / Simpan PDF
          </Button>
        }
      />

      {/* Printable Report Document Card */}
      <Card className="p-8 space-y-8 bg-white border print:border-none print:shadow-none shadow-sm max-w-4xl mx-auto">
        {/* Header Document */}
        <div className="flex items-center justify-between border-b pb-6 border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              BIMBEL LITTLEFISH
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sistem Informasi Manajemen Pembelajaran & Administrasi Terpadu
            </p>
            <p className="text-xs text-slate-400">
              Periode Laporan: Oktober 2026 • Dicetak pada: {currentDateStr}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800">
              LAPORAN RESMI
            </span>
          </div>
        </div>

        {/* Section 1: Ringkasan Finansial */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b pb-1">
            1. Ringkasan Finansial & Penerimaan SPP
          </h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border">
              <span className="text-slate-500">Penerimaan SPP Masuk</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {formatRupiah(data?.kpis?.currentPeriodRevenue || 0)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border">
              <span className="text-slate-500">Pengeluaran Honor Tutor</span>
              <p className="text-lg font-bold text-amber-700 mt-1">
                {formatRupiah(data?.kpis?.tutorCompensationTotal || 0)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border">
              <span className="text-slate-500">Tagihan SPP Belum Lunas</span>
              <p className="text-lg font-bold text-rose-700 mt-1">
                {data?.kpis?.unpaidSppCount || 0} Siswa
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Ringkasan Akademik & Peserta Didik */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b pb-1">
            2. Keadaan Siswa & Kapasitas Kelas
          </h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border">
              <span className="text-slate-500">Total Siswa Aktif</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {data?.kpis?.activeStudentsCount || 0} Siswa
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border">
              <span className="text-slate-500">Total Tutor Terdaftar</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {data?.kpis?.activeTutorsCount || 0} Pengajar
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border">
              <span className="text-slate-500">Jumlah Kelas Berjalan</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {data?.kpis?.activeClassesCount || 0} Kelompok
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Taksonomi Penguasaan Materi Siswa */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b pb-1">
            3. Distribusi Capaian Penguasaan Materi (5-Tier)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {data?.charts?.masteryDistribution?.map((m: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl border text-center bg-slate-50">
                <span className="font-bold text-[11px] block text-slate-600 truncate">
                  {m.name}
                </span>
                <span className="text-xl font-extrabold text-cyan-800 mt-1 block">
                  {m.count}
                </span>
                <span className="text-[10px] text-slate-400">Penilaian</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Tanda Tangan Pengesahan */}
        <div className="pt-8 border-t flex justify-between text-xs text-slate-700">
          <div>
            <p className="font-semibold">Mengetahui,</p>
            <p className="mt-12 font-bold underline">Bunda Rina</p>
            <p className="text-[11px] text-slate-500">Kepala Lembaga Bimbel Littlefish</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Jakarta, {currentDateStr}</p>
            <p className="mt-12 font-bold underline">Tim Administrasi Littlefish</p>
            <p className="text-[11px] text-slate-500">Tata Usaha & Keuangan</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
