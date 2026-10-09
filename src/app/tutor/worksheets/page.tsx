"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FileSpreadsheet, Upload, Download, FileText, Edit3 } from "lucide-react";
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

export default function TutorWorksheetsPage() {
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit Worksheet State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWorksheet, setEditingWorksheet] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const { success, error } = useToast();

  const fetchWorksheets = useCallback(async () => {
    try {
      const res = await fetch("/api/worksheets");
      const data = await res.json();
      if (res.ok) setWorksheets(data.worksheets || []);
    } catch {
      error("Gagal", "Tidak dapat memuat lembar kerja");
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
      error("Pilih Berkas", "Silakan pilih berkas latihan yang hendak diunggah");
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
        error("Gagal", data.error || "Gagal mengunggah berkas");
        setUploading(false);
        return;
      }

      success("Berhasil", "Lembar kerja berhasil diunggah");
      setIsUploadOpen(false);
      fetchWorksheets();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (w: any) => {
    setEditingWorksheet(w);
    setEditTitle(w.title);
    setEditDescription(w.description || "");
    setEditFile(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorksheet) return;
    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("title", editTitle);
      formData.append("description", editDescription);
      if (editFile) {
        formData.append("file", editFile);
      }

      const res = await fetch(`/api/worksheets/${editingWorksheet.id}`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal memperbarui lembar kerja");
        setSavingEdit(false);
        return;
      }

      success("Berhasil", "Lembar kerja berhasil diperbarui");
      setIsEditOpen(false);
      setWorksheets((prev) =>
        prev.map((item) =>
          item.id === editingWorksheet.id ? { ...item, ...data.worksheet } : item
        )
      );
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (w: any) => {
    if (!confirm(`Hapus lembar kerja "${w.title}"?`)) {
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
        breadcrumb="Portal Pengajar"
        title="Lembar Kerja & Modul Latihan"
        description="Kelola lembar latihan soal dan materi penunjang pembelajaran kelas binaan Anda."
        actions={
          <Button variant="primary" onClick={handleOpenUpload}>
            <Upload className="w-4 h-4 mr-1.5" /> Unggah Lembar Kerja
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner text="Memuat repositori materi..." />
      ) : worksheets.length === 0 ? (
        <EmptyState
          title="Belum Ada Lembar Kerja"
          description="Unggah materi soal PDF atau gambar penunjang aktivitas kelas."
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
              <TableHead>Kelas & Mapel</TableHead>
              <TableHead>Nama Berkas</TableHead>
              <TableHead>Tanggal Unggah</TableHead>
              <TableHead className="text-right">Unduh</TableHead>
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
                      <p className="text-xs text-slate-400">{w.description || "-"}</p>
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
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {w.fileName}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500">
                    {formatDateIndo(w.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={w.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-300"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(w)}
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" /> Ubah
                    </Button>
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

      {/* Modal Upload */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Unggah Lembar Kerja Baru"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <Input
            label="Judul Materi / Lembar Kerja"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Latihan Membaca Kata Awalan BA-BI-BU"
            required
          />

          <div className="grid grid-cols-2 gap-3">
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
            label="Deskripsi / Petunjuk"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Petunjuk pengerjaan soal"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih File Dokumen / Gambar <span className="text-rose-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-800"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              Unggah File
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Worksheet */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Lembar Kerja"
        maxWidth="lg"
      >
        {editingWorksheet && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 text-xs">
              <span className="font-semibold text-cyan-800 dark:text-cyan-300">Kelas:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{editingWorksheet.class?.name}</strong>{" "}
              • <span className="font-semibold text-cyan-800 dark:text-cyan-300">Mapel:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{editingWorksheet.subject?.name}</strong>
            </div>

            <Input
              label="Judul Materi / Lembar Kerja"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Contoh: Latihan Membaca Kata Awalan BA-BI-BU"
              required
            />

            <Input
              label="Deskripsi Singkat / Petunjuk"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Contoh: Soal latihan 15 butir untuk dikerjakan mandiri"
            />

            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Berkas Saat Ini: <span className="font-mono text-cyan-700 dark:text-cyan-300">{editingWorksheet.fileName}</span> ({(editingWorksheet.fileSize / 1024).toFixed(1)} KB)
              </p>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2">
                Ganti Berkas (Opsional — biarkan kosong jika berkas tidak diganti)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-800"
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
