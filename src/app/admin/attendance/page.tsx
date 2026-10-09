"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Save,
  Filter,
  Edit3,
  XCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { formatDateIndo, formatDateTimeIndo } from "@/lib/utils";

type AttendanceMode = "READ_ONLY" | "FILLING" | "REVISING";

interface StudentAttendanceItem {
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
  notes: string;
}

export default function AdminAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const [classDetail, setClassDetail] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<AttendanceMode>("READ_ONLY");

  const [attendanceForm, setAttendanceForm] = useState<Record<string, StudentAttendanceItem>>({});
  const [backupForm, setBackupForm] = useState<Record<string, StudentAttendanceItem>>({});

  const [tutorAttendanceStatus, setTutorAttendanceStatus] = useState<
    "HADIR" | "IZIN" | "SAKIT" | "ALPA"
  >("HADIR");
  const [backupTutorStatus, setBackupTutorStatus] = useState<
    "HADIR" | "IZIN" | "SAKIT" | "ALPA"
  >("HADIR");

  const { success, error } = useToast();

  // 1. Fetch Class List
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        const cls = data.classes || [];
        setClasses(cls);
        if (cls.length > 0 && !selectedClassId) {
          setSelectedClassId(cls[0].id);
        }
      });
  }, [selectedClassId]);

  // 2. Fetch Class Students & Existing Attendance Records for Date
  const loadClassSession = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const [resClass, resAttendance] = await Promise.all([
        fetch(`/api/classes/${selectedClassId}`),
        fetch(`/api/attendance?classId=${selectedClassId}&date=${selectedDate}`),
      ]);

      const dataClass = await resClass.json();
      const dataAttendance = await resAttendance.json();

      if (resClass.ok) {
        setClassDetail(dataClass.class);

        const existingAtt = dataAttendance.attendances || [];
        setRecords(existingAtt);
        setSessionInfo(dataAttendance.sessionInfo || null);

        const formMap: Record<string, StudentAttendanceItem> = {};

        dataClass.class?.students?.forEach((s: any) => {
          const match = existingAtt.find((a: any) => a.studentId === s.id && a.type === "STUDENT");
          formMap[s.id] = {
            status: match?.status || "HADIR",
            notes: match?.notes || "",
          };
        });

        setAttendanceForm(formMap);
        setBackupForm(JSON.parse(JSON.stringify(formMap)));

        // Tutor attendance match
        const tutorAtt = existingAtt.find((a: any) => a.type === "TUTOR");
        const initialTutorStatus = tutorAtt ? tutorAtt.status : "HADIR";
        setTutorAttendanceStatus(initialTutorStatus);
        setBackupTutorStatus(initialTutorStatus);

        // Determine mode: if student attendance exists, default to READ_ONLY mode. Otherwise, FILLING.
        const studentRecords = existingAtt.filter((a: any) => a.type === "STUDENT");
        if (studentRecords.length > 0) {
          setMode("READ_ONLY");
        } else {
          setMode("FILLING");
        }
      }
    } catch {
      error("Gagal", "Tidak dapat memuat sesi presensi");
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedDate, error]);

  useEffect(() => {
    loadClassSession();
  }, [loadClassSession]);

  const handleStartRevision = () => {
    setBackupForm(JSON.parse(JSON.stringify(attendanceForm)));
    setBackupTutorStatus(tutorAttendanceStatus);
    setMode("REVISING");
  };

  const handleCancelRevision = () => {
    setAttendanceForm(JSON.parse(JSON.stringify(backupForm)));
    setTutorAttendanceStatus(backupTutorStatus);
    setMode("READ_ONLY");
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !classDetail || saving) return;
    setSaving(true);

    try {
      const studentAttendances = Object.entries(attendanceForm).map(([studentId, val]) => ({
        studentId,
        status: val.status,
        notes: val.notes || null,
      }));

      const body: any = {
        date: selectedDate,
        classId: selectedClassId,
        studentAttendances,
      };

      if (classDetail.tutorId) {
        body.tutorAttendance = {
          tutorId: classDetail.tutorId,
          status: tutorAttendanceStatus,
        };
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menyimpan", data.error || "Gagal menyimpan presensi");
        setSaving(false);
        return;
      }

      success(
        mode === "REVISING" ? "Revisi Presensi Berhasil" : "Presensi Tersimpan",
        `Berhasil merekam kehadiran untuk tanggal ${formatDateIndo(selectedDate)}`
      );

      // Reload fresh session and return to READ_ONLY mode
      await loadClassSession();
      setMode("READ_ONLY");
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const getStatusButtonClass = (
    currentStatus: string,
    targetStatus: string,
    colorType: "emerald" | "blue" | "amber" | "rose"
  ) => {
    const isSelected = currentStatus === targetStatus;
    if (colorType === "emerald") {
      return isSelected
        ? "bg-emerald-600 text-white font-bold shadow-xs"
        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300";
    }
    if (colorType === "blue") {
      return isSelected
        ? "bg-blue-600 text-white font-bold shadow-xs"
        : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300";
    }
    if (colorType === "amber") {
      return isSelected
        ? "bg-amber-500 text-white font-bold shadow-xs"
        : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300";
    }
    return isSelected
      ? "bg-rose-600 text-white font-bold shadow-xs"
      : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300";
  };

  const getStatusBadgeVariant = (st: string): "success" | "info" | "warning" | "danger" => {
    if (st === "HADIR") return "success";
    if (st === "IZIN") return "info";
    if (st === "SAKIT") return "warning";
    return "danger";
  };

  const studentCount = classDetail?.students?.length || 0;
  const studentRecords = records.filter((a) => a.type === "STUDENT");
  const isSaved = studentRecords.length > 0;
  const isFullyRecorded = studentCount > 0 && studentRecords.length >= studentCount;

  // Real-time live counts based on current form
  const formEntries = Object.values(attendanceForm);
  const liveHadirCount = formEntries.filter((v) => v.status === "HADIR").length;
  const liveIzinCount = formEntries.filter((v) => v.status === "IZIN").length;
  const liveSakitCount = formEntries.filter((v) => v.status === "SAKIT").length;
  const liveAlpaCount = formEntries.filter((v) => v.status === "ALPA").length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Akademik"
        title="Presensi Siswa & Tutor"
        description="Pencatatan kehadiran digital per tanggal dan kelas, validasi kehadiran tutor, serta status izin/sakit."
        actions={
          <div className="flex items-center gap-2">
            {mode === "READ_ONLY" ? (
              <Button variant="primary" onClick={handleStartRevision}>
                <Edit3 className="w-4 h-4 mr-1.5" />
                Ubah Presensi
              </Button>
            ) : mode === "REVISING" ? (
              <>
                <Button variant="secondary" onClick={handleCancelRevision} disabled={saving}>
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Batal
                </Button>
                <Button variant="primary" onClick={handleSaveAttendance} isLoading={saving}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Simpan Perubahan
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={handleSaveAttendance} isLoading={saving}>
                <Save className="w-4 h-4 mr-1.5" />
                Simpan Presensi Kelas
              </Button>
            )}
          </div>
        }
      />

      {/* Date & Class Selectors */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Pilih Tanggal Sesi"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />

          <Select
            label="Pilih Kelas Pembelajaran"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level}) - Tutor: {c.tutor?.user.name || "Belum ada"}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Status & Summary Banner */}
      {classDetail && (
        <Card className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status Sesi:
                </span>
                {isSaved ? (
                  <Badge variant={isFullyRecorded ? "success" : "warning"}>
                    {isFullyRecorded ? "Tersimpan Lengkap" : "Tersimpan Sebagian"}
                  </Badge>
                ) : (
                  <Badge variant="warning">Belum Diisi</Badge>
                )}
                {mode === "REVISING" && (
                  <Badge variant="info">Mode Revisi (Admin)</Badge>
                )}
                {mode === "READ_ONLY" && (
                  <Badge variant="default">Mode Baca Saja</Badge>
                )}
              </div>

              {sessionInfo?.lastRecordedBy ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Terakhir disimpan oleh:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {sessionInfo.lastRecordedBy.name} ({sessionInfo.lastRecordedBy.role})
                  </strong>{" "}
                  pada {formatDateTimeIndo(sessionInfo.lastRecordedBy.updatedAt)}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1.5">
                  Belum ada rekaman kehadiran untuk tanggal ini.
                </p>
              )}

              {sessionInfo?.lockReason && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{sessionInfo.lockReason}</span>
                </div>
              )}
            </div>

            {/* Attendance Counters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
                  HADIR
                </span>
                <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-200">
                  {liveHadirCount}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block">
                  IZIN
                </span>
                <span className="text-sm font-extrabold text-blue-800 dark:text-blue-200">
                  {liveIzinCount}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">
                  SAKIT
                </span>
                <span className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                  {liveSakitCount}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">
                  ALPA
                </span>
                <span className="text-sm font-extrabold text-rose-800 dark:text-rose-200">
                  {liveAlpaCount}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner text="Memuat daftar hadir kelas..." />
      ) : !classDetail ? (
        <div className="p-8 text-center text-slate-400">Pilih kelas di atas.</div>
      ) : (
        <div className="space-y-6">
          {/* Tutor Attendance Card */}
          {classDetail.tutor && (
            <Card className="p-4 border border-slate-200 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Presensi Tutor Penanggung Jawab
                  </span>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {classDetail.tutor.user.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Spesialisasi: {classDetail.tutor.specialization || "Umum"}
                  </p>
                </div>

                {mode === "READ_ONLY" ? (
                  <div>
                    <Badge variant={getStatusBadgeVariant(tutorAttendanceStatus)}>
                      Tutor: {tutorAttendanceStatus}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {(["HADIR", "IZIN", "SAKIT", "ALPA"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTutorAttendanceStatus(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          st === "HADIR"
                            ? getStatusButtonClass(tutorAttendanceStatus, st, "emerald")
                            : st === "IZIN"
                            ? getStatusButtonClass(tutorAttendanceStatus, st, "blue")
                            : st === "SAKIT"
                            ? getStatusButtonClass(tutorAttendanceStatus, st, "amber")
                            : getStatusButtonClass(tutorAttendanceStatus, st, "rose")
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Student Roster Attendance Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Daftar Hadir Siswa: {classDetail.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total {classDetail.students?.length || 0} Siswa terdaftar pada tanggal{" "}
                    <strong>{formatDateIndo(selectedDate)}</strong>
                  </p>
                </div>

                {mode === "READ_ONLY" && (
                  <Button variant="secondary" size="sm" onClick={handleStartRevision}>
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Ubah Presensi
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {classDetail.students?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada siswa yang ditempatkan di kelas ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classDetail.students?.map((s: any) => {
                    const currentItem = attendanceForm[s.id] || { status: "HADIR", notes: "" };
                    const studentStatus = currentItem.status;
                    const studentNotes = currentItem.notes;

                    return (
                      <div
                        key={s.id}
                        className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        {/* Student Identity */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-bold text-xs shrink-0">
                            {s.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {s.fullName}
                            </p>
                            <p className="text-[11px] text-slate-400">{s.studentId}</p>
                          </div>
                        </div>

                        {/* Read-Only Mode vs Edit Mode */}
                        {mode === "READ_ONLY" ? (
                          <div className="flex items-center gap-3">
                            <Badge variant={getStatusBadgeVariant(studentStatus)}>
                              {studentStatus}
                            </Badge>
                            {studentNotes ? (
                              <span className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg max-w-xs truncate">
                                &ldquo;{studentNotes}&rdquo;
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        ) : (
                          /* Edit / Revision controls */
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  [s.id]: { ...prev[s.id], status: "HADIR" },
                                }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs transition-all ${getStatusButtonClass(
                                studentStatus,
                                "HADIR",
                                "emerald"
                              )}`}
                            >
                              Hadir
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  [s.id]: { ...prev[s.id], status: "IZIN" },
                                }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs transition-all ${getStatusButtonClass(
                                studentStatus,
                                "IZIN",
                                "blue"
                              )}`}
                            >
                              Izin
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  [s.id]: { ...prev[s.id], status: "SAKIT" },
                                }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs transition-all ${getStatusButtonClass(
                                studentStatus,
                                "SAKIT",
                                "amber"
                              )}`}
                            >
                              Sakit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  [s.id]: { ...prev[s.id], status: "ALPA" },
                                }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs transition-all ${getStatusButtonClass(
                                studentStatus,
                                "ALPA",
                                "rose"
                              )}`}
                            >
                              Alpa
                            </button>

                            {/* Notes input */}
                            <input
                              type="text"
                              placeholder="Catatan izin/keterangan..."
                              value={studentNotes}
                              onChange={(e) =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  [s.id]: {
                                    status: prev[s.id]?.status || "HADIR",
                                    notes: e.target.value,
                                  },
                                }))
                              }
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-full sm:w-48 ml-0 sm:ml-2"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                {mode === "READ_ONLY" ? (
                  <Button variant="primary" onClick={handleStartRevision}>
                    <Edit3 className="w-4 h-4 mr-1.5" />
                    Ubah Presensi
                  </Button>
                ) : mode === "REVISING" ? (
                  <>
                    <Button variant="secondary" onClick={handleCancelRevision} disabled={saving}>
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Batal
                    </Button>
                    <Button variant="primary" onClick={handleSaveAttendance} isLoading={saving}>
                      <Save className="w-4 h-4 mr-1.5" />
                      Simpan Perubahan
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={handleSaveAttendance} isLoading={saving}>
                    <Save className="w-4 h-4 mr-1.5" />
                    Simpan Presensi Kelas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
