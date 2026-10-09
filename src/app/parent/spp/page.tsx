"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CreditCard, CheckCircle2, Clock, AlertCircle, Send, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, formatDateIndo, MONTH_NAMES_INDO } from "@/lib/utils";

export default function ParentSppPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [confirmMethod, setConfirmMethod] = useState<"TRANSFER" | "TUNAI" | "QRIS">("TRANSFER");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchSpp = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/parent");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat data SPP");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSpp();
  }, [fetchSpp]);

  const handleOpenConfirm = (inv: any) => {
    setSelectedInvoice(inv);
    setConfirmMethod("TRANSFER");
    setConfirmNotes("Sudah ditransfer via m-banking");
    setIsConfirmOpen(true);
  };

  const handleSubmitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/spp/${selectedInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "MENUNGGU",
          method: confirmMethod,
          notes: confirmNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        error("Gagal", resData.error || "Gagal mengirim konfirmasi");
        setSubmitting(false);
        return;
      }

      success(
        "Konfirmasi Terkirim",
        "Pemberitahuan pembayaran berhasil dikirimkan ke Admin Bimbel untuk verifikasi."
      );
      setIsConfirmOpen(false);
      fetchSpp();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Memuat tagihan administrasi SPP..." />;
  }

  const invoices = data?.sppPayments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Orang Tua"
        title="Status Tagihan & Riwayat SPP"
        description="Pantau invoice biaya bimbingan belajar anak Anda dan konfirmasi pembayaran secara online."
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="Belum Ada Tagihan SPP"
          description="Tidak ada catatan tagihan SPP yang diterbitkan untuk buah hati Anda saat ini."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Invoice</TableHead>
              <TableHead>Periode Bulan</TableHead>
              <TableHead>Nominal Biaya</TableHead>
              <TableHead>Status Pembayaran</TableHead>
              <TableHead>Metode & Tanggal</TableHead>
              <TableHead className="text-right">Aksi Konfirmasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                    {inv.invoiceNumber}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {MONTH_NAMES_INDO[inv.month - 1]} {inv.year}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatRupiah(inv.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      inv.status === "LUNAS"
                        ? "success"
                        : inv.status === "MENUNGGU"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {inv.status === "LUNAS"
                      ? "Lunas"
                      : inv.status === "MENUNGGU"
                      ? "Menunggu Cek Admin"
                      : "Belum Bayar"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {inv.method || "-"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {inv.paymentDate ? formatDateIndo(inv.paymentDate) : "-"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {inv.status === "BELUM_BAYAR" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenConfirm(inv)}
                    >
                      <Send className="w-3 h-3 mr-1" /> Konfirmasi Bayar
                    </Button>
                  )}
                  {inv.status === "MENUNGGU" && (
                    <span className="text-xs font-semibold text-amber-600 italic">
                      Sedang Diverifikasi
                    </span>
                  )}
                  {inv.status === "LUNAS" && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                      <Check className="w-3.5 h-3.5" /> Terverifikasi
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: Konfirmasi Pembayaran Orang Tua */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Konfirmasi Pembayaran SPP"
        description={`Kirimkan bukti dan metode pembayaran untuk tagihan ${selectedInvoice?.invoiceNumber}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitConfirm} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400">Total yang harus dibayar:</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {formatRupiah(selectedInvoice?.amount || 0)}
            </p>
            <p className="text-teal-800 dark:text-teal-300 mt-1 font-medium">
              Rekening Bimbel Littlefish: BCA 8820-1234-56 a.n. Bimbel Littlefish
            </p>
          </div>

          <Select
            label="Metode Pembayaran yang Digunakan"
            value={confirmMethod}
            onChange={(e) => setConfirmMethod(e.target.value as any)}
            required
          >
            <option value="TRANSFER">Transfer Bank (BCA / Mandiri / BRI)</option>
            <option value="QRIS">QRIS / E-Wallet (GoPay, OVO, Dana)</option>
            <option value="TUNAI">Tunai di Meja Resepsionis</option>
          </Select>

          <Input
            label="Keterangan / Nomor Referensi Transfer"
            value={confirmNotes}
            onChange={(e) => setConfirmNotes(e.target.value)}
            placeholder="Contoh: Transfer m-BCA a.n. Ratna Dewi"
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Kirim Konfirmasi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
