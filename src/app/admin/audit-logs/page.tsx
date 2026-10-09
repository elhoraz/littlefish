"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Clock, User, Activity, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { formatDateTimeIndo } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  timestamp: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge variant="success">TAMBAH</Badge>;
      case "UPDATE":
        return <Badge variant="info">PERBARUI</Badge>;
      case "DELETE":
        return <Badge variant="danger">HAPUS</Badge>;
      case "STATUS_CHANGE":
        return <Badge variant="danger">UBAH STATUS</Badge>;
      case "LOGIN":
        return <Badge variant="outline">MASUK</Badge>;
      case "LOGOUT":
        return <Badge variant="outline">KELUAR</Badge>;
      case "PAYMENT_RECORD":
        return <Badge variant="warning">PEMBAYARAN</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Sistem & Keamanan"
        title="Audit Log & Rekam Jejak Aktivitas"
        description="Audit trail lengkap seluruh aktivitas pengguna, perubahan data, dan transaksi keuangan demi akuntabilitas."
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Filter Entitas"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">Semua Entitas</option>
            <option value="Auth">Autentikasi (Auth)</option>
            <option value="Student">Siswa (Student)</option>
            <option value="Attendance">Presensi (Attendance)</option>
            <option value="Assessment">Penilaian (Assessment)</option>
            <option value="SppPayment">SPP (SppPayment)</option>
            <option value="TutorPayment">Honor Tutor (TutorPayment)</option>
            <option value="TeachingModule">Modul Ajar</option>
            <option value="Worksheet">Lembar Kerja</option>
          </Select>

          <Select
            label="Filter Tindakan"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Semua Tindakan</option>
            <option value="CREATE">CREATE (Tambah Data)</option>
            <option value="UPDATE">UPDATE (Perbarui Data)</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE (Status)</option>
            <option value="PAYMENT_RECORD">PAYMENT_RECORD (Keuangan)</option>
            <option value="LOGIN">LOGIN (Masuk Sistem)</option>
            <option value="LOGOUT">LOGOUT (Keluar Sistem)</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat riwayat audit trail..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Tidak Ada Catatan Log"
          description="Belum ada riwayat aktivitas yang tercatat untuk filter ini."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu Kejadian</TableHead>
              <TableHead>Pelaku (Actor)</TableHead>
              <TableHead>Tindakan</TableHead>
              <TableHead>Entitas Terkait</TableHead>
              <TableHead>Detail Aktivitas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                    {formatDateTimeIndo(log.timestamp)}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">
                      {log.actorName}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {log.actorRole}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                    {log.entity}
                  </span>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
                    {log.details || "-"}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
