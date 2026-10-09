"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
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

interface SppItem {
  id: string;
  invoiceNumber: string;
  month: number;
  year: number;
  amount: number;
  status: "BELUM_BAYAR" | "MENUNGGU" | "LUNAS";
  method: string | null;
  paymentDate: string | null;
  notes: string | null;
  student: {
    id: string;
    studentId: string;
    fullName: string;
    class: { name: string } | null;
  };
}

export default function AdminSppPage() {
  const [payments, setPayments] = useState<SppItem[]>([]);
  const [summary, setSummary] = useState<any>({
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    totalRecords: 0,
  });
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthFilter, setMonthFilter] = useState("10"); // Default current month
  const [yearFilter, setYearFilter] = useState("2026");
  const [statusFilter, setStatusFilter] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SppItem | null>(null);
  const [saving, setSaving] = useState(false);

  // New Invoice Form State
  const [form, setForm] = useState({
    studentId: "",
    month: 10,
    year: 2026,
    amount: 250000,
    notes: "",
  });

  // Verification Form State
  const [verifyForm, setVerifyForm] = useState({
    status: "LUNAS" as "LUNAS" | "MENUNGGU" | "BELUM_BAYAR",
    method: "TRANSFER" as "TRANSFER" | "TUNAI" | "QRIS",
    paymentDate: new Date().toISOString().substring(0, 10),
    notes: "",
  });

  const { success, error } = useToast();

  const fetchSpp = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (monthFilter) params.set("month", monthFilter);
      if (yearFilter) params.set("year", yearFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/spp?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
        setSummary(data.summary || {});
      }
    } catch {
      error("Gagal", "Tidak dapat memuat daftar tagihan SPP");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter, statusFilter, error]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchSpp();
  }, [fetchSpp]);

  const handleOpenAdd = () => {
    setForm({
      studentId: students[0]?.id || "",
      month: 10,
      year: 2026,
      amount: 250000,
      notes: "Tagihan SPP reguler bulanan",
    });
    setIsAddOpen(true);
  };

  const handleOpenVerify = (p: SppItem) => {
    setSelectedPayment(p);
    setVerifyForm({
      status: "LUNAS",
      method: (p.method as any) || "TRANSFER",
      paymentDate: p.paymentDate
        ? p.paymentDate.substring(0, 10)
        : new Date().toISOString().substring(0, 10),
      notes: p.notes || "Lunas dikonfirmasi admin",
    });
    setIsVerifyOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/spp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menerbitkan", data.error || "Gagal menerbitkan tagihan SPP");
        setSaving(false);
        return;
      }
      success("Tagihan Diterbitkan", `Invoice ${data.payment.invoiceNumber} berhasil dibuat`);
      setIsAddOpen(false);
      fetchSpp();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/spp/${selectedPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyForm),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Memperbarui", data.error || "Gagal memperbarui status SPP");
        setSaving(false);
        return;
      }
      success(
        "Status Diperbarui",
        `Tagihan ${selectedPayment.invoiceNumber} kini berstatus ${verifyForm.status}`
      );
      setIsVerifyOpen(false);
      fetchSpp();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Administrasi & Keuangan"
        title="Administrasi SPP Siswa"
        description="Kelola penerbitan tagihan bulanan, verifikasi pelunasan tunai/transfer/QRIS, dan rekap pendapatan."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Terbitkan Tagihan SPP
          </Button>
        }
      />

      {/* Finance Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Nominal Tagihan</p>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatRupiah(summary.totalAmount || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.totalRecords} invoice tercatat
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Penerimaan Lunas</p>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatRupiah(summary.paidAmount || 0)}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil diverifikasi
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Tunggakan / Belum Lunas</p>
          <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {formatRupiah(summary.unpaidAmount || 0)}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Menunggu pembayaran
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Bulan"
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

          <Select
            label="Status Pembayaran"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="LUNAS">Lunas</option>
            <option value="MENUNGGU">Menunggu Konfirmasi</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
          </Select>
        </div>
      </Card>

      {/* Table Data */}
      {loading ? (
        <LoadingSpinner text="Memuat tagihan SPP..." />
      ) : payments.length === 0 ? (
        <EmptyState
          title="Tidak Ada Tagihan SPP"
          description="Belum ada catatan tagihan SPP untuk filter bulan atau status ini."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Terbitkan Tagihan Baru
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Invoice & Siswa</TableHead>
              <TableHead>Periode SPP</TableHead>
              <TableHead>Nominal Tagihan</TableHead>
              <TableHead>Status Pembayaran</TableHead>
              <TableHead>Metode & Tanggal Bayar</TableHead>
              <TableHead className="text-right">Aksi Verifikasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-bold text-xs shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {p.student.fullName}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {p.invoiceNumber} • {p.student.class?.name || "Tanpa Kelas"}
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
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {formatRupiah(p.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.status === "LUNAS"
                        ? "success"
                        : p.status === "MENUNGGU"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {p.status === "LUNAS"
                      ? "Lunas"
                      : p.status === "MENUNGGU"
                      ? "Menunggu Konfirmasi"
                      : "Belum Bayar"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {p.method || "-"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {p.paymentDate ? formatDateIndo(p.paymentDate) : "-"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={p.status === "LUNAS" ? "outline" : "primary"}
                    size="sm"
                    onClick={() => handleOpenVerify(p)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {p.status === "LUNAS" ? "Ubah Status" : "Verifikasi Bayar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: Terbitkan SPP Baru */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Terbitkan Tagihan SPP Baru"
        description="Buat invoice tagihan SPP bulanan untuk peserta didik."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <Select
            label="Pilih Siswa"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            required
          >
            <option value="">-- Pilih Siswa --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentId})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Bulan Tagihan"
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

          <Input
            label="Nominal SPP (Rp)"
            type="number"
            value={form.amount.toString()}
            onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
            required
          />

          <Input
            label="Catatan Tagihan"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Terbitkan Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Verifikasi Pembayaran */}
      <Modal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        title="Verifikasi Pembayaran SPP"
        description={`Konfirmasi pembayaran untuk ${selectedPayment?.student.fullName} (${selectedPayment?.invoiceNumber})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveVerify} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 text-xs">
            <p className="font-semibold text-cyan-900 dark:text-cyan-200">
              Periode: {MONTH_NAMES_INDO[(selectedPayment?.month || 1) - 1]}{" "}
              {selectedPayment?.year}
            </p>
            <p className="text-base font-extrabold text-cyan-950 dark:text-cyan-100 mt-1">
              {formatRupiah(selectedPayment?.amount || 0)}
            </p>
          </div>

          <Select
            label="Ubah Status Pembayaran"
            value={verifyForm.status}
            onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value as any })}
            required
          >
            <option value="LUNAS">Lunas (LUNAS)</option>
            <option value="MENUNGGU">Menunggu Konfirmasi (MENUNGGU)</option>
            <option value="BELUM_BAYAR">Belum Bayar (BELUM_BAYAR)</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Metode Pembayaran"
              value={verifyForm.method}
              onChange={(e) => setVerifyForm({ ...verifyForm, method: e.target.value as any })}
            >
              <option value="TRANSFER">Transfer Bank</option>
              <option value="TUNAI">Tunai / Kasir</option>
              <option value="QRIS">QRIS Digital</option>
            </Select>

            <Input
              label="Tanggal Bayar"
              type="date"
              value={verifyForm.paymentDate}
              onChange={(e) => setVerifyForm({ ...verifyForm, paymentDate: e.target.value })}
            />
          </div>

          <Input
            label="Catatan Transaksi / No. Referensi"
            value={verifyForm.notes}
            onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
            placeholder="Bukti transfer BCA / Resi tunai diterima"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsVerifyOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Verifikasi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
