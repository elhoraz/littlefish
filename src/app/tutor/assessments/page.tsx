"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Award, Plus, Calendar, Edit3 } from "lucide-react";
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
import { formatDateIndo, MASTERY_LEVELS } from "@/lib/utils";

export default function TutorAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    studentId: "",
    classId: "",
    subjectId: "",
    topic: "",
    score: 85,
    masteryLevel: "MENGUASAI",
    date: new Date().toISOString().substring(0, 10),
    notes: "",
  });

  // Edit Assessment State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    topic: "",
    score: 85,
    masteryLevel: "MENGUASAI",
    date: new Date().toISOString().substring(0, 10),
    notes: "",
  });

  const { success, error } = useToast();

  const fetchAssessments = useCallback(async () => {
    try {
      const res = await fetch("/api/assessments");
      const data = await res.json();
      if (res.ok) setAssessments(data.assessments || []);
    } catch {
      error("Gagal", "Tidak dapat memuat penilaian");
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchOptions = async () => {
    try {
      const [resC, resStu, resSub] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/students"),
        fetch("/api/subjects"),
      ]);
      const dataC = await resC.json();
      const dataStu = await resStu.json();
      const dataSub = await resSub.json();
      if (resC.ok) setClasses(dataC.classes || []);
      if (resStu.ok) setStudents(dataStu.students || []);
      if (resSub.ok) setSubjects(dataSub.subjects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchAssessments();
  }, [fetchAssessments]);

  const handleOpenAdd = () => {
    setForm({
      studentId: students[0]?.id || "",
      classId: classes[0]?.id || "",
      subjectId: subjects[0]?.id || "",
      topic: "",
      score: 85,
      masteryLevel: "MENGUASAI",
      date: new Date().toISOString().substring(0, 10),
      notes: "",
    });
    setIsAddOpen(true);
  };

  const updateScoreAndMastery = (sc: number) => {
    let m = "BELUM_MENGUASAI";
    if (sc >= 90) m = "SANGAT_MENGUASAI";
    else if (sc >= 80) m = "MENGUASAI";
    else if (sc >= 65) m = "CUKUP_MENGUASAI";
    else if (sc >= 50) m = "MULAI_BERKEMBANG";

    setForm((prev) => ({
      ...prev,
      score: sc,
      masteryLevel: m,
    }));
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal menyimpan penilaian");
        setSaving(false);
        return;
      }
      success("Berhasil", "Penilaian siswa berhasil direkam");
      setIsAddOpen(false);
      fetchAssessments();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: any) => {
    if (!confirm(`Hapus penilaian untuk ${a.student.fullName}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/assessments/${a.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Berhasil", "Penilaian berhasil dihapus");
        fetchAssessments();
      } else {
        const data = await res.json();
        error("Gagal", data.error || "Gagal menghapus penilaian");
      }
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    }
  };

  const handleOpenEdit = (a: any) => {
    setEditingAssessment(a);
    const dateStr = a.date ? (typeof a.date === "string" ? a.date.substring(0, 10) : new Date(a.date).toISOString().substring(0, 10)) : new Date().toISOString().substring(0, 10);
    setEditForm({
      topic: a.topic,
      score: a.score,
      masteryLevel: a.masteryLevel,
      date: dateStr,
      notes: a.notes || "",
    });
    setIsEditOpen(true);
  };

  const updateEditScoreAndMastery = (sc: number) => {
    let m = "BELUM_MENGUASAI";
    if (sc >= 90) m = "SANGAT_MENGUASAI";
    else if (sc >= 80) m = "MENGUASAI";
    else if (sc >= 65) m = "CUKUP_MENGUASAI";
    else if (sc >= 50) m = "MULAI_BERKEMBANG";

    setEditForm((prev) => ({
      ...prev,
      score: sc,
      masteryLevel: m,
    }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/assessments/${editingAssessment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal memperbarui penilaian");
        setSavingEdit(false);
        return;
      }
      success("Berhasil", "Penilaian siswa berhasil diperbarui");
      setIsEditOpen(false);
      // In-place update to refresh table & progression cleanly
      setAssessments((prev) =>
        prev.map((item) =>
          item.id === editingAssessment.id ? { ...item, ...data.assessment } : item
        )
      );
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Pengajar"
        title="Evaluasi & Rekap Penilaian Siswa"
        description="Rekam capaian belajar, skor nilai tugas/kuis harian, dan taksonomi penguasaan materi."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Input Nilai Baru
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner text="Memuat penilaian..." />
      ) : assessments.length === 0 ? (
        <EmptyState
          title="Belum Ada Nilai Siswa"
          description="Masukkan penilaian hasil belajar pertama untuk siswa di kelas Anda."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Input Penilaian
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Siswa</TableHead>
              <TableHead>Mata Pelajaran & Topik</TableHead>
              <TableHead>Skor</TableHead>
              <TableHead>Penguasaan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Catatan Evaluasi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((a) => {
              const mastery = MASTERY_LEVELS[a.masteryLevel] || {
                label: a.masteryLevel,
                badgeClass: "bg-slate-100 text-slate-700",
              };
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {a.student.fullName}
                    </p>
                    <p className="text-[11px] text-slate-400">{a.student.studentId}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {a.subject.name}
                    </span>
                    <p className="text-[11px] text-slate-500">{a.topic}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-base font-bold text-teal-700 dark:text-teal-400">
                      {a.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${mastery.badgeClass}`}
                    >
                      {mastery.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">
                      {formatDateIndo(a.date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                      {a.notes || "-"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(a)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(a)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Hapus penilaian"
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Modal Add */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Input Penilaian Siswa"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Siswa"
              value={form.studentId}
              onChange={(e) => {
                const s = students.find((st) => st.id === e.target.value);
                setForm({
                  ...form,
                  studentId: e.target.value,
                  classId: s?.classId || form.classId,
                });
              }}
              required
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </Select>

            <Select
              label="Kelas"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              required
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Mata Pelajaran"
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              required
            >
              <option value="">-- Pilih Mapel --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Input
              label="Tanggal Penilaian"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <Input
            label="Materi / Topik Pengujian"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Contoh: Menghafal Suku Kata dan Membaca Nyaring"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nilai Skor (0 - 100)"
              type="number"
              min={0}
              max={100}
              value={form.score.toString()}
              onChange={(e) => updateScoreAndMastery(parseFloat(e.target.value) || 0)}
              required
            />

            <Select
              label="Tingkat Penguasaan"
              value={form.masteryLevel}
              onChange={(e) => setForm({ ...form, masteryLevel: e.target.value })}
            >
              <option value="BELUM_MENGUASAI">Belum Menguasai (&lt; 50)</option>
              <option value="MULAI_BERKEMBANG">Mulai Berkembang (50 - 64)</option>
              <option value="CUKUP_MENGUASAI">Cukup Menguasai (65 - 79)</option>
              <option value="MENGUASAI">Menguasai (80 - 89)</option>
              <option value="SANGAT_MENGUASAI">Sangat Menguasai (90 - 100)</option>
            </Select>
          </div>

          <Input
            label="Catatan Guru untuk Orang Tua"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Kelebihan dan aspek yang masih perlu distimulasi"
          />

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Nilai
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Penilaian Siswa"
        maxWidth="lg"
      >
        {editingAssessment && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-teal-800 dark:text-teal-300">Siswa:</span>{" "}
                  <strong className="text-slate-900 dark:text-white text-sm">
                    {editingAssessment.student?.fullName}
                  </strong>{" "}
                  <span className="text-slate-400">({editingAssessment.student?.studentId})</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-slate-800 border">
                  {editingAssessment.subject?.name}
                </span>
              </div>
              <p className="text-slate-500">
                Kelas: {editingAssessment.class?.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tanggal Penilaian"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                required
              />

              <Input
                label="Materi / Topik Pengujian"
                value={editForm.topic}
                onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                placeholder="Topik evaluasi capaian"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nilai Skor (0 - 100)"
                type="number"
                min={0}
                max={100}
                value={editForm.score.toString()}
                onChange={(e) => updateEditScoreAndMastery(parseFloat(e.target.value) || 0)}
                required
              />

              <Select
                label="Tingkat Penguasaan"
                value={editForm.masteryLevel}
                onChange={(e) => setEditForm({ ...editForm, masteryLevel: e.target.value })}
              >
                <option value="BELUM_MENGUASAI">Belum Menguasai (&lt; 50)</option>
                <option value="MULAI_BERKEMBANG">Mulai Berkembang (50 - 64)</option>
                <option value="CUKUP_MENGUASAI">Cukup Menguasai (65 - 79)</option>
                <option value="MENGUASAI">Menguasai (80 - 89)</option>
                <option value="SANGAT_MENGUASAI">Sangat Menguasai (90 - 100)</option>
              </Select>
            </div>

            <Input
              label="Catatan Guru untuk Orang Tua"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Kelebihan dan aspek yang masih perlu distimulasi"
            />

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={savingEdit}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={savingEdit}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
