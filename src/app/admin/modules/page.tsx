"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Layers,
  BookOpen,
  UserCheck,
  Eye,
} from "lucide-react";
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
import { MONTH_NAMES_INDO } from "@/lib/utils";

interface ModuleItem {
  id: string;
  month: number;
  year: number;
  topic: string;
  objectives: string;
  materials: string;
  activities: string;
  notes: string | null;
  class: { id: string; name: string; level: string };
  subject: { id: string; name: string; code: string };
  tutor: { user: { name: string } };
}

export default function AdminModulesPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [classFilter, setClassFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("10"); // Default current month
  const [yearFilter, setYearFilter] = useState("2026");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    month: 10,
    year: 2026,
    classId: "",
    subjectId: "",
    topic: "",
    objectives: "",
    materials: "",
    activities: "",
    notes: "",
  });

  const { success, error } = useToast();

  const fetchModules = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set("classId", classFilter);
      if (monthFilter) params.set("month", monthFilter);
      if (yearFilter) params.set("year", yearFilter);

      const res = await fetch(`/api/modules?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setModules(data.modules || []);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat modul ajar");
    } finally {
      setLoading(false);
    }
  }, [classFilter, monthFilter, yearFilter, error]);

  const fetchOptions = async () => {
    try {
      const [resC, resS] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/subjects"),
      ]);
      const dataC = await resC.json();
      const dataS = await resS.json();
      if (resC.ok) setClasses(dataC.classes || []);
      if (resS.ok) setSubjects(dataS.subjects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleOpenAdd = () => {
    setForm({
      month: 10,
      year: 2026,
      classId: classes[0]?.id || "",
      subjectId: subjects[0]?.id || "",
      topic: "",
      objectives: "",
      materials: "",
      activities: "",
      notes: "",
    });
    setIsAddOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal membuat modul ajar");
        setSaving(false);
        return;
      }
      success("Berhasil", "Modul pembelajaran bulanan berhasil ditambahkan");
      setIsAddOpen(false);
      fetchModules();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: ModuleItem) => {
    if (!confirm(`Hapus modul "${m.topic}" untuk kelas ${m.class.name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/modules/${m.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Berhasil", "Modul ajar berhasil dihapus");
        fetchModules();
      } else {
        const data = await res.json();
        error("Gagal", data.error || "Gagal menghapus modul");
      }
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Akademik"
        title="Modul Pembelajaran Bulanan"
        description="Perencanaan silabus bulanan, tujuan capaian belajar, materi alat peraga, dan skenario aktivitas."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Modul Ajar
          </Button>
        }
      />

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
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat modul ajar..." />
      ) : modules.length === 0 ? (
        <EmptyState
          title="Tidak Ada Modul Ajar"
          description="Belum ada modul ajar yang disusun untuk filter bulan atau kelas ini."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Buat Modul Sekarang
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <Card key={m.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">
                      {MONTH_NAMES_INDO[m.month - 1]} {m.year} • {m.subject.name}
                    </span>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                      {m.topic}
                    </h4>
                  </div>
                </div>

                <div className="py-3 space-y-2 text-xs">
                  <p className="text-slate-500">
                    <strong className="text-slate-700 dark:text-slate-300">Kelas:</strong>{" "}
                    {m.class.name}
                  </p>
                  <p className="text-slate-500">
                    <strong className="text-slate-700 dark:text-slate-300">Tutor:</strong>{" "}
                    {m.tutor.user.name}
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 line-clamp-3 text-slate-600 dark:text-slate-400">
                    <strong>Tujuan:</strong> {m.objectives}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(m)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                  title="Hapus modul"
                >
                  Hapus
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedModule(m);
                    setIsDetailOpen(true);
                  }}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Rincian
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Tambah Modul */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Buat Modul Ajar Bulanan"
        description="Rancang target materi pembelajaran per bulan untuk kelas."
        maxWidth="xl"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Bulan Pembelajaran"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Kelas Target"
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
          </div>

          <Input
            label="Topik Utama Pembelajaran"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Contoh: Operasi Hitung Perkalian Dasar & Soal Cerita"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tujuan Pembelajaran (Learning Objectives) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.objectives}
              onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              placeholder="1. Siswa dapat menghafal perkalian 1-5&#10;2. Mampu menjawab 10 soal cerita"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Materi & Alat Peraga (Materials) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.materials}
              onChange={(e) => setForm({ ...form, materials: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              placeholder="Flashcard perkalian, sempoa, lembar kuis"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Skenario Aktivitas (Activities) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.activities}
              onChange={(e) => setForm({ ...form, activities: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              placeholder="Pemanasan berhitung (10m), Teori konsep (20m), Game kelompok (30m)"
              required
            />
          </div>

          <Input
            label="Catatan Tambahan"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Petunjuk khusus bagi tutor pengganti atau orang tua"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Modul
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detail Modul */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Rincian Modul Pembelajaran"
        maxWidth="xl"
      >
        {selectedModule && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900">
              <span className="font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider">
                {MONTH_NAMES_INDO[selectedModule.month - 1]} {selectedModule.year}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                {selectedModule.topic}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Kelas: {selectedModule.class.name} • Mapel: {selectedModule.subject.name} • Tutor: {selectedModule.tutor.user.name}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Tujuan Pembelajaran:
                </h5>
                <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedModule.objectives}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Materi & Alat Pembelajaran:
                </h5>
                <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedModule.materials}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Rencana Aktivitas & Skenario:
                </h5>
                <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedModule.activities}
                </p>
              </div>

              {selectedModule.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                  <h5 className="font-bold mb-1">Catatan Tambahan:</h5>
                  <p>{selectedModule.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
