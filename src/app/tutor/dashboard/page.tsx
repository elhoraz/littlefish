"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  GraduationCap,
  CalendarCheck,
  FileText,
  Award,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { formatDateIndo, formatRupiah } from "@/lib/utils";

export default function TutorDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
    specialization: "",
  });

  const { success, error } = useToast();

  const loadProfile = async () => {
    if (!data?.tutor?.id) return;
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/tutors/${data.tutor.id}`);
      const d = await res.json();
      if (res.ok && d.tutor) {
        setProfileData(d.tutor);
        setProfileForm({
          name: d.tutor.user?.name || "",
          phone: d.tutor.user?.phone || "",
          address: d.tutor.address || "",
          specialization: d.tutor.specialization || "",
        });
      }
    } catch {
      error("Gagal", "Tidak dapat memuat profil");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenProfile = () => {
    setIsProfileOpen(true);
    loadProfile();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData?.id) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/tutors/${profileData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const d = await res.json();
      if (!res.ok) {
        error("Gagal", d.error || "Gagal memperbarui profil");
        setSavingProfile(false);
        return;
      }
      success("Berhasil", "Profil Anda berhasil diperbarui");
      setProfileData(d.tutor);
      setIsProfileOpen(false);
      // Reload dashboard data
      fetch("/api/dashboard/tutor")
        .then((r) => r.json())
        .then((fresh) => setData(fresh))
        .catch(() => {});
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    fetch("/api/dashboard/tutor")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingSpinner text="Memuat data pengajar..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Bimbel Littlefish — Portal Pengajar"
        title="Dashboard Tutor"
        description="Pantau kelas binaan, kelola presensi harian, modul pembelajaran, dan evaluasi capaian siswa."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenProfile}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              Profil Saya
            </Button>
            <Link
              href="/tutor/attendance"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-2xs transition-colors"
            >
              Isi Presensi Hari Ini
            </Link>
            <Link
              href="/tutor/assessments"
              className="px-3 py-2 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            >
              Input Penilaian
            </Link>
          </div>
        }
      />

      {/* Operational Task Alert */}
      {!data?.todayAttendancesFilled && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Tugas Sesi Hari Ini: Presensi Belum Direkam
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                Pastikan mencatat kehadiran siswa segera setelah sesi pembelajaran berlangsung.
              </p>
            </div>
          </div>
          <Link
            href="/tutor/attendance"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shrink-0 text-center"
          >
            Catat Kehadiran
          </Link>
        </div>
      )}

      {/* Structured Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Kelas Diampu</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data?.classes?.length || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Kelompok belajar aktif
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Siswa Binaan</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data?.studentsCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tersebar di kelas Anda
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Presensi Hari Ini</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-base font-bold mt-1">
            {data?.todayAttendancesFilled ? (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Sudah Direkam
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Perlu Dicatat
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sesi kelas tanggal hari ini
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tarif Honor Sesi</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(data?.tutor?.rate || 60000)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Per sesi tatap muka
          </p>
        </Card>
      </div>

      {/* Classes List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Daftar Kelas Binaan Anda:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.classes?.map((c: any) => (
            <Card key={c.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {c.name}
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">{c.level}</p>
                  </div>
                  <Badge variant="success">{c.status === "ACTIVE" ? "Aktif" : c.status}</Badge>
                </div>

                <div className="py-2.5 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <p>
                    <span className="text-slate-400">Jadwal:</span> {c.dayOfWeek || "-"} • {c.timeSlot || "-"}
                  </p>
                  <p>
                    <span className="text-slate-400">Ruangan:</span> {c.room || "Ruang Belajar Littlefish"}
                  </p>
                  <p>
                    <span className="text-slate-400">Jumlah Siswa:</span> {c.students?.length || 0} Siswa
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                <Link
                  href={`/tutor/attendance`}
                  className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
                >
                  Presensi <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  href={`/tutor/assessments`}
                  className="text-xs font-medium text-indigo-700 hover:underline flex items-center gap-1"
                >
                  Input Nilai <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Operational Streams: Recent Modules & Assessments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Modules */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Modul Pembelajaran Anda</CardTitle>
              <Link
                href="/tutor/modules"
                className="text-xs text-teal-700 hover:underline flex items-center gap-1 font-medium"
              >
                Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data?.recentModules?.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada modul yang dibuat.</p>
              ) : (
                data?.recentModules?.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {m.topic}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {m.class.name} • Bulan {m.month}/{m.year}
                      </p>
                    </div>
                    <Badge variant="info">{m.subject.name}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assessments Recorded */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Penilaian Terakhir Diinput</CardTitle>
              <Link
                href="/tutor/assessments"
                className="text-xs text-teal-700 hover:underline flex items-center gap-1 font-medium"
              >
                Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data?.recentAssessments?.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada penilaian yang diinput.</p>
              ) : (
                data?.recentAssessments?.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {a.student.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {a.subject.name} • {a.topic}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{a.score}</span>
                      <p className="text-[10px] text-slate-400">{formatDateIndo(a.date)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Profil Tutor */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="Profil Pribadi Tutor"
        maxWidth="md"
      >
        {loadingProfile ? (
          <LoadingSpinner text="Memuat data profil..." />
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">Email Login:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{profileData?.user?.email || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">Peran Akun:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">TUTOR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">Tarif Honor Sesi:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">
                  {formatRupiah(profileData?.compensationRate || data?.tutor?.rate || 60000)} / sesi
                </span>
              </div>
              <p className="text-[10px] text-slate-500 italic pt-0.5">
                *Tarif honor, peran, dan status akun dikelola oleh Manajemen Admin Littlefish.
              </p>
            </div>

            <Input
              label="Nama Lengkap"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              required
            />

            <Input
              label="Nomor WhatsApp / Telepon"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="Contoh: 081234567890"
            />

            <Input
              label="Bidang Keahlian / Spesialisasi Mengajar"
              value={profileForm.specialization}
              onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
              placeholder="Contoh: Calistung, Bahasa Inggris Anak, Matematika Dasar"
              required
            />

            <Input
              label="Alamat Domisili"
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              placeholder="Alamat tempat tinggal"
            />

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)} disabled={savingProfile}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={savingProfile}>
                Simpan Profil
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
