"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Layers, Plus, Search, Users, Clock, MapPin, UserCheck, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";

interface ClassItem {
  id: string;
  name: string;
  level: string;
  room: string | null;
  dayOfWeek: string | null;
  timeSlot: string | null;
  capacity: number;
  status: string;
  tutor: {
    id: string;
    specialization: string | null;
    user: { id: string; name: string; phone: string | null };
  } | null;
  students: { id: string; studentId: string; fullName: string; status: string }[];
  _count: {
    students: number;
    attendances: number;
    teachingModules: number;
    worksheets: number;
    assessments: number;
  };
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    level: "TK / Prasekolah",
    room: "",
    tutorId: "",
    dayOfWeek: "Senin & Rabu",
    timeSlot: "14:00 - 15:30",
    capacity: 10,
    status: "ACTIVE",
    studentIdsToAssign: [] as string[],
    studentIdsToRemove: [] as string[],
  });

  const { success, error } = useToast();

  const fetchClasses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/classes?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat daftar kelas");
    } finally {
      setLoading(false);
    }
  }, [search, error]);

  const fetchOptions = async () => {
    try {
      const [resTutors, resStudents] = await Promise.all([
        fetch("/api/tutors"),
        fetch("/api/students"),
      ]);
      const dataTutors = await resTutors.json();
      const dataStudents = await resStudents.json();
      if (resTutors.ok) setTutors(dataTutors.tutors || []);
      if (resStudents.ok) setAvailableStudents(dataStudents.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenAdd = () => {
    setForm({
      name: "",
      level: "TK / Prasekolah",
      room: "Ruang Nemo",
      tutorId: tutors[0]?.id || "",
      dayOfWeek: "Senin & Rabu",
      timeSlot: "14:00 - 15:30",
      capacity: 8,
      status: "ACTIVE",
      studentIdsToAssign: [],
      studentIdsToRemove: [],
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (c: ClassItem) => {
    setSelectedClass(c);
    setForm({
      name: c.name,
      level: c.level,
      room: c.room || "",
      tutorId: c.tutor?.id || "",
      dayOfWeek: c.dayOfWeek || "",
      timeSlot: c.timeSlot || "",
      capacity: c.capacity,
      status: c.status,
      studentIdsToAssign: [],
      studentIdsToRemove: [],
    });
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal membuat kelas");
        setSaving(false);
        return;
      }
      success("Berhasil", `Kelas ${data.class.name} berhasil dibuat`);
      setIsAddOpen(false);
      fetchClasses();
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal memperbarui kelas");
        setSaving(false);
        return;
      }
      success("Berhasil", `Kelas ${data.class.name} berhasil diperbarui`);
      setIsEditOpen(false);
      fetchClasses();
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Master Data"
        title="Manajemen Kelas & Rombel"
        description="Atur kelompok belajar siswa, ruangan, jadwal hari & jam belajar, serta tutor penanggung jawab."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Kelas Baru
          </Button>
        }
      />

      <Card className="p-4">
        <Input
          placeholder="Cari nama kelas, jenjang, ruangan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat kelompok belajar..." />
      ) : classes.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Kelas"
          description="Belum ada kelas atau rombel yang dibuat."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Buat Kelas Pertama
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <Card key={cls.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {cls.name}
                    </h4>
                    <span className="inline-block mt-0.5 text-xs text-cyan-700 dark:text-cyan-400 font-semibold">
                      {cls.level}
                    </span>
                  </div>
                  <Badge variant={cls.status === "ACTIVE" ? "success" : "outline"}>
                    {cls.status}
                  </Badge>
                </div>

                <div className="py-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium">
                      Tutor: {cls.tutor?.user.name || "Belum ditugaskan"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {cls.dayOfWeek || "Hari fleksibel"} • {cls.timeSlot || "Sesuai jadwal"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Ruang: {cls.room || "Ruang Belajar Utama"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Kapasitas: <strong className="text-slate-900 dark:text-white">{cls.students.length}</strong> / {cls.capacity} Siswa
                    </span>
                  </div>
                </div>

                {/* Enrolled Students Preview */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Daftar Siswa di Kelas Ini ({cls.students.length}):
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {cls.students.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Belum ada siswa</span>
                    ) : (
                      cls.students.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                        >
                          {s.fullName}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(cls)}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Kelola & Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Tambah Kelas */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Buat Kelas Baru"
        description="Tentukan nama kelompok belajar, tutor pengampu, dan jadwal belajar."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Kelompok / Kelas"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Bintang Kecil B (Calistung)"
              required
            />
            <Select
              label="Jenjang Pendidikan"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            >
              <option value="TK / Prasekolah">TK / Prasekolah (Calistung)</option>
              <option value="SD Kelas 1-3">SD Kelas 1-3</option>
              <option value="SD Kelas 4-6">SD Kelas 4-6</option>
              <option value="SMP">SMP</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tutor Penanggung Jawab"
              value={form.tutorId}
              onChange={(e) => setForm({ ...form, tutorId: e.target.value })}
            >
              <option value="">-- Pilih Pengampu --</option>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user.name} ({t.specialization})
                </option>
              ))}
            </Select>

            <Input
              label="Ruangan Belajar"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              placeholder="Ruang Nemo / Ruang Lumba"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Hari Belajar"
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              placeholder="Senin & Rabu"
            />
            <Input
              label="Jam Belajar"
              value={form.timeSlot}
              onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
              placeholder="14:00 - 15:30"
            />
            <Input
              label="Kapasitas Siswa"
              type="number"
              value={form.capacity.toString()}
              onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 10 })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Kelas Baru
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Kelas */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Kelas & Penempatan Siswa"
        description={`Pembaruan untuk ${selectedClass?.name}`}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Kelas"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Select
              label="Tutor Pengampu"
              value={form.tutorId}
              onChange={(e) => setForm({ ...form, tutorId: e.target.value })}
            >
              <option value="">-- Pilih Tutor --</option>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Ruangan"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
            <Input
              label="Hari Belajar"
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
            />
            <Input
              label="Jam Sesi"
              value={form.timeSlot}
              onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Kapasitas Maksimal"
              type="number"
              value={form.capacity.toString()}
              onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 10 })}
            />
            <Select
              label="Status Kelas"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Aktif (ACTIVE)</option>
              <option value="ARCHIVED">Arsip (ARCHIVED)</option>
            </Select>
          </div>

          {/* Quick Enrolling Available Students */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Daftarkan Siswa ke Kelas Ini:
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {availableStudents.map((s) => {
                const isCurrentlyIn = s.classId === selectedClass?.id;
                const isCheckedToAssign = form.studentIdsToAssign.includes(s.id);
                const isCheckedToRemove = form.studentIdsToRemove.includes(s.id);
                const isAssigned = (isCurrentlyIn && !isCheckedToRemove) || isCheckedToAssign;

                return (
                  <label
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer text-xs hover:bg-cyan-50/50"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {s.fullName}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1.5">
                        ({s.studentId})
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Want to assign
                          setForm((prev) => ({
                            ...prev,
                            studentIdsToAssign: [...prev.studentIdsToAssign, s.id],
                            studentIdsToRemove: prev.studentIdsToRemove.filter((id) => id !== s.id),
                          }));
                        } else {
                          // Want to remove
                          setForm((prev) => ({
                            ...prev,
                            studentIdsToRemove: [...prev.studentIdsToRemove, s.id],
                            studentIdsToAssign: prev.studentIdsToAssign.filter((id) => id !== s.id),
                          }));
                        }
                      }}
                      className="rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Perubahan Kelas
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
