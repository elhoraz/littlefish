"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Plus, Search, FileText, Award, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  _count: {
    teachingModules: number;
    worksheets: number;
    assessments: number;
  };
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  const { success, error } = useToast();

  const fetchSubjects = React.useCallback(async () => {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      if (res.ok) {
        setSubjects(data.subjects || []);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat mata pelajaran");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleOpenAdd = () => {
    setForm({
      code: "IPA-SD",
      name: "Sains & Eksperimen Seru",
      description: "Eksperimen sains sederhana, observasi alam, dan konsep dasar lingkungan.",
    });
    setIsAddOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menambah", data.error || "Gagal membuat mata pelajaran");
        setSaving(false);
        return;
      }
      success("Berhasil", `Mata pelajaran ${data.subject.name} berhasil ditambahkan`);
      setIsAddOpen(false);
      fetchSubjects();
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
        title="Kurikulum & Mata Pelajaran"
        description="Kelola daftar mata pelajaran, kode unik silabus, dan deskripsi fokus pembelajaran."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Mata Pelajaran
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner text="Memuat mata pelajaran..." />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="Belum Ada Mata Pelajaran"
          description="Tambahkan mata pelajaran untuk memulai penyusunan modul ajar."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Mata Pelajaran
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => (
            <Card key={sub.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-bold text-sm">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {sub.name}
                      </h4>
                      <span className="inline-block text-[11px] font-bold text-cyan-600 uppercase tracking-wider">
                        Kode: {sub.code}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="py-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {sub.description || "Belum ada deskripsi kurikulum."}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {sub._count.teachingModules} Modul Ajar
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-slate-400" />
                  {sub._count.assessments} Penilaian
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Tambah Mata Pelajaran */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Mata Pelajaran Baru"
        description="Masukkan rincian kurikulum pembelajaran bimbel."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <Input
            label="Kode Unik (Contoh: CAL-TK, MAT-SD)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="KODE-SINGKAT"
            required
          />

          <Input
            label="Nama Mata Pelajaran"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Matematika Ceria SD"
            required
          />

          <Input
            label="Deskripsi / Fokus Pembelajaran"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Cakupan materi dan metode pembelajaran utama"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Mata Pelajaran
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
