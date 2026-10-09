"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Award,
  Plus,
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
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
import { formatDateIndo, MASTERY_LEVELS } from "@/lib/utils";

interface AssessmentItem {
  id: string;
  topic: string;
  score: number;
  masteryLevel: string;
  notes: string | null;
  date: string;
  student: { id: string; studentId: string; fullName: string };
  class: { id: string; name: string };
  subject: { id: string; name: string; code: string };
  tutor: { user: { name: string } };
}

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentFilter, setStudentFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

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

  const { success, error } = useToast();

  const fetchAssessments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (studentFilter) params.set("studentId", studentFilter);
      if (classFilter) params.set("classId", classFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);

      const res = await fetch(`/api/assessments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAssessments(data.assessments || []);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat rekap penilaian");
    } finally {
      setLoading(false);
    }
  }, [studentFilter, classFilter, subjectFilter, error]);

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
  }, []);

  useEffect(() => {
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

  const updateScoreAndAutoMastery = (sc: number) => {
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

  const handleDelete = async (a: AssessmentItem) => {
    if (!confirm(`Hapus penilaian ${a.student.fullName} topik "${a.topic}"?`)) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Akademik"
        title="Penilaian & Capaian Belajar"
        description="Rekam evaluasi skor kuis, tingkatan penguasaan materi 5-tier, dan umpan balik perkembangan anak."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Input Nilai Baru
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Siswa"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
          >
            <option value="">Semua Siswa</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.studentId})
              </option>
            ))}
          </Select>

          <Select
            label="Kelas"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Mata Pelajaran"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat rekap penilaian..." />
      ) : assessments.length === 0 ? (
        <EmptyState
          title="Belum Ada Rekap Penilaian"
          description="Masukkan skor dan evaluasi belajar siswa untuk mata pelajaran yang diajarkan."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Input Penilaian Pertama
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Siswa</TableHead>
              <TableHead>Mata Pelajaran & Topik</TableHead>
              <TableHead>Skor Nilai</TableHead>
              <TableHead>Tingkat Penguasaan</TableHead>
              <TableHead>Tutor & Tanggal</TableHead>
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
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {a.student.fullName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {a.student.studentId} • {a.class.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {a.subject.name}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">{a.topic}</p>
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
                    <div className="text-xs">
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {a.tutor.user.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatDateIndo(a.date)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                      {a.notes || "-"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(a)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="Hapus penilaian"
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Modal: Input Penilaian */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Input Penilaian Siswa"
        description="Masukkan skor numerik dan evaluasi pemahaman materi pelajaran."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Siswa yang Dinilai"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              label="Tanggal Evaluasi"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <Input
            label="Topik / Materi Evaluasi"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Contoh: Pengenalan Fonik Suku Kata Ba-Bi-Bu"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Skor Numerik (0 - 100)"
              type="number"
              min={0}
              max={100}
              value={form.score.toString()}
              onChange={(e) => updateScoreAndAutoMastery(parseFloat(e.target.value) || 0)}
              required
            />

            <Select
              label="Tingkat Penguasaan (Mastery)"
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
            label="Catatan Guru / Umpan Balik untuk Orang Tua"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Sangat cepat memahami konsep, perlu sedikit latihan mandiri..."
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Penilaian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
