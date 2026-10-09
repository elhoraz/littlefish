"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Banknote,
  Plus,
  Calculator,
  CheckCircle2,
  Clock,
  Filter,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, formatDateIndo, MONTH_NAMES_INDO } from "@/lib/utils";

interface TutorPaymentItem {
  id: string;
  month: number;
  year: number;
  sessions: number;
  rate: number;
  total: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  notes: string | null;
  tutor: {
    id: string;
    compensationRate: number;
    specialization: string | null;
    user: { name: string; email: string };
  };
}

export default function AdminTutorPaymentsPage() {
  const [payments, setPayments] = useState<TutorPaymentItem[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalDisbursed: 0,
    totalPending: 0,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  const [monthFilter, setMonthFilter] = useState("10");
  const [yearFilter, setYearFilter] = useState("2026");

  const [isCalculateOpen, setIsCalculateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Payroll Calculation Form State
  const [form, setForm] = useState({
    tutorId: "",
    month: 10,
    year: 2026,
    customSessions: 14,
    status: "PAID" as "PENDING" | "PAID",
    notes: "Honor mengajar periode berjalan",
  });

  const { success, error } = useToast();

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (monthFilter) params.set("month", monthFilter);
      if (yearFilter) params.set("year", yearFilter);

      const res = await fetch(`/api/tutor-payments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
        setSummary(data.summary || {});
      }
    } catch {
      error("Gagal", "Tidak dapat memuat rekap honor tutor");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter, error]);

  const fetchTutors = React.useCallback(async () => {
    try {
      const res = await fetch("/api/tutors");
      const data = await res.json();
      if (res.ok) {
        const tList = data.tutors || [];
        setTutors(tList);
        setForm((prev) => (prev.tutorId || tList.length === 0 ? prev : { ...prev, tutorId: tList[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleOpenCalculate = () => {
    setForm({
      tutorId: tutors[0]?.id || "",
      month: 10,
      year: 2026,
      customSessions: 14,
      status: "PENDING",
      notes: "Rekap sesi mengajar bulanan",
    });
    setIsCalculateOpen(true);
  };

  const handleCalculateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tutor-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menghitung", data.error || "Gagal menyimpan honor tutor");
        setSaving(false);
        return;
      }
      success("Honor Dihitung", `Rekap honor tutor berhasil disimpan`);
      setIsCalculateOpen(false);
      fetchPayments();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async (p: TutorPaymentItem) => {
    try {
      const res = await fetch("/api/tutor-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: p.tutor.id,
          month: p.month,
          year: p.year,
          customSessions: p.sessions,
          status: "PAID",
          notes: "Telah dibayarkan via transfer bank",
        }),
      });
      if (res.ok) {
        success("Berhasil Dibayarkan", `Honor ${p.tutor.user.name} telah ditandai LUNAS`);
        fetchPayments();
      }
    } catch {
      error("Gagal", "Gagal memperbarui status pencairan");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Administrasi & Keuangan"
        title="Rekap Honor & Kompensasi Tutor"
        description="Perhitungan insentif mengajar otomatis: jumlah sesi kehadiran × tarif per sesi."
        actions={
          <Button variant="primary" onClick={handleOpenCalculate}>
            <Calculator className="w-4 h-4 mr-1.5" />
            Hitung / Rekap Honor Baru
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Honor Telah Dicairkan</p>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatRupiah(summary.totalDisbursed || 0)}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Telah ditransfer ke rekening tutor
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Honor Menunggu Pencairan</p>
          <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {formatRupiah(summary.totalPending || 0)}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Siap verifikasi bendahara
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Bulan Periode"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="">Semua Bulan</option>
            {MONTH_NAMES_INDO.map((name, idx) => (
              <option key={idx} value={(idx + 1).toString()}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            label="Tahun"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </Select>
        </div>
      </Card>

      {/* Data Table */}
      {loading ? (
        <LoadingSpinner text="Memuat rekap kompensasi tutor..." />
      ) : payments.length === 0 ? (
        <EmptyState
          title="Belum Ada Rekap Honor"
          description="Lakukan kalkulasi sesi kehadiran untuk periode bulan ini."
          action={
            <Button variant="primary" onClick={handleOpenCalculate}>
              <Calculator className="w-4 h-4 mr-1" /> Hitung Honor Sekarang
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Tutor</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Jumlah Sesi Hadir</TableHead>
              <TableHead>Tarif per Sesi</TableHead>
              <TableHead>Total Honor</TableHead>
              <TableHead>Status Pembayaran</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {p.tutor.user.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.tutor.specialization || "Tutor Umum"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {MONTH_NAMES_INDO[p.month - 1]} {p.year}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {p.sessions} Sesi Pertemuan
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                    {formatRupiah(p.rate)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {formatRupiah(p.total)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "PAID" ? "success" : "warning"}>
                    {p.status === "PAID" ? "Tercairkan (PAID)" : "Menunggu (PENDING)"}
                  </Badge>
                  {p.paidAt && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDateIndo(p.paidAt)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "PENDING" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleMarkAsPaid(p)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Cairkan Honor
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: Kalkulasi Honor */}
      <Modal
        isOpen={isCalculateOpen}
        onClose={() => setIsCalculateOpen(false)}
        title="Kalkulasi Honor Tutor Bulanan"
        description="Hitung kompensasi berdasarkan jumlah sesi kehadiran dan tarif kontrak."
        maxWidth="md"
      >
        <form onSubmit={handleCalculateSubmit} className="space-y-4">
          <Select
            label="Pilih Tutor"
            value={form.tutorId}
            onChange={(e) => setForm({ ...form, tutorId: e.target.value })}
            required
          >
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user.name} ({formatRupiah(t.compensationRate)}/sesi)
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Bulan Periode"
              value={form.month.toString()}
              onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
              required
            >
              {MONTH_NAMES_INDO.map((name, idx) => (
                <option key={idx} value={idx + 1}>
                  {name}
                </option>
              ))}
            </Select>

            <Input
              label="Tahun"
              type="number"
              value={form.year.toString()}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Jumlah Sesi Mengajar"
              type="number"
              value={form.customSessions.toString()}
              onChange={(e) => setForm({ ...form, customSessions: parseInt(e.target.value) || 0 })}
              required
            />

            <Select
              label="Status Pencairan"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="PENDING">Menunggu (PENDING)</option>
              <option value="PAID">Tercairkan (PAID)</option>
            </Select>
          </div>

          <Input
            label="Catatan Honor"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Insentif kehadiran / penyesuaian sesi"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCalculateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan & Rekap
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
