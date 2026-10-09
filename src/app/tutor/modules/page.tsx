"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FileText, Plus, Eye, BookOpen, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { MONTH_NAMES_INDO } from "@/lib/utils";

export default function TutorModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
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

  // Edit Module State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    month: 10,
    year: 2026,
    topic: "",
    objectives: "",
    materials: "",
    activities: "",
    notes: "",
  });

  const { success, error } = useToast();

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch("/api/modules");
      const data = await res.json();
      if (res.ok) setModules(data.modules || []);
    } catch {
      error("Gagal", "Tidak dapat memuat modul ajar");
    } finally {
      setLoading(false);
    }
  }, [error]);

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
      success("Berhasil", "Modul ajar bulanan berhasil dibuat");
      setIsAddOpen(false);
      fetchModules();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (m: any) => {
    setEditingModule(m);
    setEditForm({
      month: m.month,
      year: m.year,
      topic: m.topic,
      objectives: m.objectives,
      materials: m.materials,
      activities: m.activities,
      notes: m.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/modules/${editingModule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal memperbarui modul ajar");
        setSavingEdit(false);
        return;
      }
      success("Berhasil", "Modul pembelajaran berhasil diperbarui");
      setIsEditOpen(false);
      // In-place update to prevent duplicate or stale data
      setModules((prev) =>
        prev.map((item) =>
          item.id === editingModule.id ? { ...item, ...data.module } : item
        )
      );
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (m: any) => {
    if (!confirm(`Hapus modul "${m.topic}"?`)) {
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
        breadcrumb="Portal Pengajar"
        title="Modul Ajar Pembelajaran"
        description="Rancang dan dokumentasikan rencana aktivitas serta tujuan pembelajaran bulanan."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Buat Modul Baru
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner text="Memuat modul pengajaran..." />
      ) : modules.length === 0 ? (
        <EmptyState
          title="Belum Ada Modul Ajar"
          description="Rancang modul pengajaran pertama Anda untuk kelas binaan."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Buat Modul
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <Card key={m.id} className="flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">
                  {MONTH_NAMES_INDO[m.month - 1]} {m.year} • {m.subject.name}
                </span>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                  {m.topic}
                </h4>
                <p className="text-xs text-slate-500 mt-1">Kelas: {m.class.name}</p>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                  <strong>Tujuan:</strong> {m.objectives}
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(m)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                  title="Hapus modul"
                >
                  Hapus
                </Button>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(m)}
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Ubah
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedModule(m);
                      setIsDetailOpen(true);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Rincian
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Add */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Buat Modul Ajar Bulanan"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Bulan"
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

          <div className="grid grid-cols-2 gap-3">
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
            label="Topik Materi Pokok"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Contoh: Pengenalan Suku Kata & Fonik Dasar"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tujuan Pembelajaran <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.objectives}
              onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Materi & Alat Peraga <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.materials}
              onChange={(e) => setForm({ ...form, materials: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rencana Aktivitas <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.activities}
              onChange={(e) => setForm({ ...form, activities: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Modul
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Rincian Modul Pembelajaran"
        maxWidth="md"
      >
        {selectedModule && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border">
              <span className="font-bold text-cyan-800 dark:text-cyan-300">
                {MONTH_NAMES_INDO[selectedModule.month - 1]} {selectedModule.year}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {selectedModule.topic}
              </h4>
              <p className="text-slate-500 mt-0.5">
                {selectedModule.class.name} • {selectedModule.subject.name}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
              <strong>Tujuan:</strong>
              <p className="mt-1 whitespace-pre-line">{selectedModule.objectives}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
              <strong>Materi:</strong>
              <p className="mt-1 whitespace-pre-line">{selectedModule.materials}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
              <strong>Aktivitas:</strong>
              <p className="mt-1 whitespace-pre-line">{selectedModule.activities}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Edit */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Modul Pembelajaran"
        maxWidth="lg"
      >
        {editingModule && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 text-xs">
              <span className="font-semibold text-cyan-800 dark:text-cyan-300">Kelas:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{editingModule.class?.name}</strong>{" "}
              • <span className="font-semibold text-cyan-800 dark:text-cyan-300">Mapel:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{editingModule.subject?.name}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Bulan"
                value={editForm.month.toString()}
                onChange={(e) => setEditForm({ ...editForm, month: parseInt(e.target.value) })}
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
                value={editForm.year.toString()}
                onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value) })}
                required
              />
            </div>

            <Input
              label="Topik Materi Pokok"
              value={editForm.topic}
              onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
              placeholder="Contoh: Pengenalan Suku Kata & Fonik Dasar"
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tujuan Pembelajaran <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={editForm.objectives}
                onChange={(e) => setEditForm({ ...editForm, objectives: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Materi & Alat Peraga <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={editForm.materials}
                onChange={(e) => setEditForm({ ...editForm, materials: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rencana Aktivitas <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={editForm.activities}
                onChange={(e) => setEditForm({ ...editForm, activities: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Tambahan (Opsional)
              </label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Catatan diferensiasi atau pengayaan materi"
              />
            </div>

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
