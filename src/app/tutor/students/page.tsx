"use client";

import React, { useEffect, useState } from "react";
import { GraduationCap, Search, Phone, Eye, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { formatDateIndo } from "@/lib/utils";

export default function TutorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [notesInput, setNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const { success, error } = useToast();

  const handleOpenStudent = (s: any) => {
    setSelectedStudent(s);
    setNotesInput(s.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!selectedStudent) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal", data.error || "Gagal menyimpan catatan siswa");
        setSavingNotes(false);
        return;
      }
      success("Berhasil", "Catatan pembelajaran siswa berhasil disimpan");
      setSelectedStudent((prev: any) => ({ ...prev, notes: notesInput }));
      setStudents((prev) =>
        prev.map((s) => (s.id === selectedStudent.id ? { ...s, notes: notesInput } : s))
      );
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSavingNotes(false);
    }
  };

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((d) => {
        setStudents(d.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Pengajar"
        title="Daftar Siswa Binaan"
        description="Informasi peserta didik di kelas yang Anda bina beserta kontak dan catatan khusus."
      />

      <Card className="p-4">
        <Input
          placeholder="Cari nama siswa atau ID siswa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat siswa..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak Ada Siswa Ditemukan"
          description="Tidak ada data siswa yang cocok dengan kata kunci pencarian Anda."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Siswa</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Orang Tua / Wali</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 font-bold text-xs shrink-0">
                      {s.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-slate-400">{s.studentId}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {s.class?.name || "Belum ada"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {s.parent?.user.name || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {s.gender}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                    {s.status === "ACTIVE" ? "Aktif" : s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenStudent(s)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Profil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal Detail */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Profil Siswa"
        maxWidth="md"
      >
        {selectedStudent && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedStudent.fullName}
              </h4>
              <p className="text-cyan-800 dark:text-cyan-300">
                {selectedStudent.studentId} • Kelas: {selectedStudent.class?.name}
              </p>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
              <p>
                <strong>Orang Tua:</strong> {selectedStudent.parent?.user.name || "-"} (
                {selectedStudent.parent?.user.phone || "-"})
              </p>
              <p>
                <strong>Tanggal Lahir:</strong> {formatDateIndo(selectedStudent.birthDate)}
              </p>
              <p>
                <strong>Alamat:</strong> {selectedStudent.address || "-"}
              </p>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center justify-between">
                <strong className="text-amber-900 dark:text-amber-200 text-xs">
                  Catatan Karakteristik & Kebutuhan Belajar Siswa:
                </strong>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  (Dapat diedit oleh Tutor)
                </span>
              </div>
              <textarea
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Tuliskan catatan khusus terkait metode pemahaman siswa, kendala fokus, atau respon belajar..."
                className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveNotes}
                  isLoading={savingNotes}
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Simpan Catatan Siswa
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
