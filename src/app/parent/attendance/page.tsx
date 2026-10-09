"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CalendarCheck, Calendar, Clock, CheckCircle2, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateIndo, ATTENDANCE_STATUSES } from "@/lib/utils";

export default function ParentAttendancePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(false);

  // 1. Fetch children list from parent dashboard
  useEffect(() => {
    fetch("/api/dashboard/parent")
      .then((res) => res.json())
      .then((d) => {
        const kids = d.children || [];
        setChildren(kids);
        if (kids.length > 0) {
          setSelectedChildId(kids[0].id);
        }
        setLoadingInit(false);
      })
      .catch(() => setLoadingInit(false));
  }, []);

  // 2. Fetch full attendance records for selected child
  const loadChildAttendance = useCallback(async (childId: string) => {
    if (!childId) return;
    setLoadingAtt(true);
    try {
      const res = await fetch(`/api/attendance?studentId=${childId}`);
      const data = await res.json();
      if (res.ok) {
        setAttendances(data.attendances || []);
      }
    } catch {
      // Graceful error handle
    } finally {
      setLoadingAtt(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadChildAttendance(selectedChildId);
    }
  }, [selectedChildId, loadChildAttendance]);

  if (loadingInit) {
    return <LoadingSpinner text="Memuat profil siswa..." />;
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  // Calculate live stats for selected child
  const hadirCount = attendances.filter((a) => a.status === "HADIR").length;
  const izinCount = attendances.filter((a) => a.status === "IZIN").length;
  const sakitCount = attendances.filter((a) => a.status === "SAKIT").length;
  const alpaCount = attendances.filter((a) => a.status === "ALPA").length;
  const totalSessions = attendances.length;
  const attendanceRate = totalSessions > 0 ? Math.round((hadirCount / totalSessions) * 100) : 100;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Orang Tua"
        title="Riwayat Kehadiran Siswa"
        description="Catatan presensi harian buah hati Anda pada setiap sesi kelas bimbingan belajar."
      />

      {/* Child Switcher Card */}
      {children.length > 1 && (
        <Card className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Pilih Buah Hati:
              </span>
            </div>
            <div className="w-full sm:w-72">
              <Select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.fullName} ({child.class})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] text-slate-500 font-medium">Hadir</span>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {hadirCount} <span className="text-xs font-normal text-slate-400">Sesi</span>
          </div>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] text-slate-500 font-medium">Izin</span>
          <div className="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1">
            {izinCount} <span className="text-xs font-normal text-slate-400">Sesi</span>
          </div>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] text-slate-500 font-medium">Sakit</span>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {sakitCount} <span className="text-xs font-normal text-slate-400">Sesi</span>
          </div>
        </Card>
        <Card className="p-4 text-center sm:text-left">
          <span className="text-[11px] text-slate-500 font-medium">Alpa</span>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
            {alpaCount} <span className="text-xs font-normal text-slate-400">Sesi</span>
          </div>
        </Card>
        <Card className="p-4 text-center sm:text-left col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 font-medium">Tingkat Kehadiran</span>
          <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mt-1">
            {attendanceRate}%
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Daftar Presensi {selectedChild ? selectedChild.fullName : ""}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelas: {selectedChild?.class || "-"} &bull; Total {totalSessions} catatan sesi
            </p>
          </div>
          <Badge variant="default">Mode Baca Saja (Portal Ortu)</Badge>
        </div>

        {loadingAtt ? (
          <div className="p-8">
            <LoadingSpinner text="Memuat riwayat presensi..." />
          </div>
        ) : attendances.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum Ada Rekap Presensi"
              description="Sesi kelas belum dimulai atau belum ada catatan kehadiran yang diinput tutor."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Sesi</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Status Kehadiran</TableHead>
                <TableHead>Keterangan / Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.map((att: any) => {
                const meta = ATTENDANCE_STATUSES[att.status] || {
                  label: att.status,
                  badgeClass: "bg-slate-100 text-slate-700",
                };
                return (
                  <TableRow key={att.id}>
                    <TableCell>
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {formatDateIndo(att.date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {att.class?.name || selectedChild?.class || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {att.notes || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
