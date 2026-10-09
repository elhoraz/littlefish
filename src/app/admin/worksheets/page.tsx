"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  Layers,
  BookOpen,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { formatDateIndo } from "@/lib/utils";

interface WorksheetItem {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  class: { id: string; name: string };
  subject: { id: string; name: string; code: string };
}

export default function AdminWorksheetsPage() {
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { success, error } = useToast();

  const fetchWorksheets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set("classId", classFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);

      const res = await fetch(`/api/worksheets?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setWorksheets(data.worksheets || []);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat lembar kerja");
    } finally {
      setLoading(false);
    }
  }, [classFilter, subjectFilter, error]);

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
    fetchWorksheets();
  }, [fetchWorksheets]);

  const handleOpenUpload = () => {
    setTitle("");
    setDescription("");
    setClassId(classes[0]?.id || "");
    setSubjectId(subjects[0]?.id || "");
    setSelectedFile(null);
    setIsUploadOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      error("Berkas Wajib", "Silakan pilih berkas file lembar kerja yang akan diunggah");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("classId", classId);
      formData.append("subjectId", subjectId);
      formData.append("file", selectedFile);

      const res = await fetch("/api/worksheets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        error("Gagal Unggah", data.error || "Gagal mengunggah berkas");
        setUploading(false);
        return;
      }

      success("Berhasil", `Lembar kerja ${title} berhasil diunggah`);
      setIsUploadOpen(false);
      fetchWorksheets();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (w: WorksheetItem) => {
    if (!confirm(`Hapus lembar kerja "${w.title}"? Berkas fisik juga akan dihapus.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/worksheets/${w.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Berhasil", "Lembar kerja berhasil dihapus");
        fetchWorksheets();
      } else {
        const data = await res.json();
        error("Gagal", data.error || "Gagal menghapus lembar kerja");
      }
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Akademik"
        title="Arsip Lembar Kerja & Latihan"
        description="Repositori materi latihan soal, latihan fonik/matematika, dan modul cetak bimbel."
        actions={
          <Button variant="primary" onClick={handleOpenUpload}>
            <Upload className="w-4 h-4 mr-1.5" />
            Unggah Lembar Kerja Baru
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Filter Kelas"
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
            label="Filter Mata Pelajaran"
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
        <LoadingSpinner text="Memuat repositori berkas..." />
      ) : worksheets.length === 0 ? (
        <EmptyState
          title="Belum Ada Lembar Kerja"
          description="Unggah materi soal PDF, DOC, atau gambar latihan untuk kelas ini."
          action={
            <Button variant="primary" onClick={handleOpenUpload}>
              <Upload className="w-4 h-4 mr-1" /> Unggah Lembar Kerja
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul Lembar Kerja</TableHead>
              <TableHead>Kelas & Mata Pelajaran</TableHead>
              <TableHead>Nama Berkas & Ukuran</TableHead>
              <TableHead>Tanggal Diunggah</TableHead>
              <TableHead className="text-right">Aksi Unduh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {worksheets.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-bold text-xs shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {w.title}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {w.description || "Tidak ada deskripsi"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {w.class.name}
                  </span>
                  <p className="text-[11px] text-slate-400">{w.subject.name}</p>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                    {w.fileName}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {(w.fileSize / 1024).toFixed(1)} KB
                  </p>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDateIndo(w.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={w.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-300 dark:hover:bg-cyan-900/60 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(w)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title="Hapus lembar kerja"
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: Unggah Lembar Kerja */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Unggah Lembar Kerja Baru"
        description="Mendukung format PDF, DOCX, DOC, PNG, JPG (Maks 15MB)."
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <Input
            label="Judul Lembar Kerja / Latihan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Latihan Fonik Vokal Pekan 2"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Kelas"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
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
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
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
            label="Deskripsi / Petunjuk Pengerjaan"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instruksi pengerjaan lembar kerja bagi siswa"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Berkas File (PDF, DOCX, JPG, PNG) <span className="text-rose-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 dark:file:bg-cyan-950 dark:file:text-cyan-300 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-800"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              Unggah Berkas
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
