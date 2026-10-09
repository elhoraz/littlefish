"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
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
import { formatDateIndo } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  nickname: string | null;
  birthDate: string | null;
  gender: string;
  address: string | null;
  phone: string | null;
  parentId: string | null;
  classId: string | null;
  status: string;
  notes: string | null;
  class: { id: string; name: string; level: string } | null;
  parent: {
    user: { id: string; name: string; email: string; phone: string | null };
  } | null;
  _count?: {
    attendances: number;
    assessments: number;
    sppPayments: number;
  };
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    studentId: "",
    fullName: "",
    nickname: "",
    birthDate: "",
    gender: "Laki-laki",
    address: "",
    phone: "",
    parentId: "",
    classId: "",
    notes: "",
    status: "ACTIVE",
  });

  const { success, error } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (classFilter) params.set("classId", classFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error(err);
      error("Gagal Memuat", "Tidak dapat mengambil daftar siswa");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, classFilter, error]);

  const fetchOptions = async () => {
    try {
      const [resClasses, resParents] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/parents"),
      ]);
      const dataClasses = await resClasses.json();
      const dataParents = await resParents.json();
      if (resClasses.ok) setClasses(dataClasses.classes || []);
      if (resParents.ok) setParents(dataParents.parents || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenAdd = () => {
    const nextSeq = (students.length + 1).toString().padStart(3, "0");
    setForm({
      studentId: `LF-2026-${nextSeq}`,
      fullName: "",
      nickname: "",
      birthDate: "2019-01-01",
      gender: "Laki-laki",
      address: "",
      phone: "",
      parentId: parents[0]?.id || "",
      classId: classes[0]?.id || "",
      notes: "",
      status: "ACTIVE",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setSelectedStudent(s);
    setForm({
      studentId: s.studentId,
      fullName: s.fullName,
      nickname: s.nickname || "",
      birthDate: s.birthDate ? s.birthDate.substring(0, 10) : "",
      gender: s.gender || "Laki-laki",
      address: s.address || "",
      phone: s.phone || "",
      parentId: s.parentId || "",
      classId: s.classId || "",
      notes: s.notes || "",
      status: s.status,
    });
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menambah", data.error || "Gagal menyimpan data siswa baru");
        setSaving(false);
        return;
      }
      success("Berhasil", `Siswa ${data.student.fullName} berhasil ditambahkan`);
      setIsAddOpen(false);
      fetchStudents();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Memperbarui", data.error || "Gagal memperbarui data siswa");
        setSaving(false);
        return;
      }
      success("Pembaruan Berhasil", `Data siswa ${data.student.fullName} berhasil diperbarui`);
      setIsEditOpen(false);
      fetchStudents();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (student: Student) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan siswa "${student.fullName}"?`)) return;
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Dinonaktifkan", `Siswa ${student.fullName} telah dinonaktifkan`);
        fetchStudents();
      }
    } catch {
      error("Gagal", "Tidak dapat menonaktifkan siswa");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Master Data"
        title="Manajemen Siswa"
        description="Kelola biodata siswa, penempatan kelas, relasi orang tua, dan status keaktifan."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Siswa Baru
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Cari nama, ID siswa, panggilan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif (ACTIVE)</option>
            <option value="INACTIVE">Nonaktif (INACTIVE)</option>
            <option value="GRADUATED">Lulus (GRADUATED)</option>
          </Select>
        </div>
      </Card>

      {/* Students Data Table */}
      {loading ? (
        <LoadingSpinner text="Memuat daftar siswa bimbel..." />
      ) : students.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Siswa"
          description="Belum ada siswa yang cocok dengan kriteria pencarian atau filter yang dipilih."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Siswa Pertama
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID & Nama Siswa</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Orang Tua / Wali</TableHead>
              <TableHead>Gender / Kontak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-bold text-xs shrink-0">
                      {s.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {s.studentId} {s.nickname ? `(${s.nickname})` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {s.class ? (
                    <div>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {s.class.name}
                      </span>
                      <p className="text-[11px] text-slate-400">{s.class.level}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Belum ditentukan</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.parent?.user ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {s.parent.user.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{s.parent.user.phone || s.parent.user.email}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    <p className="text-slate-700 dark:text-slate-300">{s.gender}</p>
                    <p className="text-slate-400 text-[11px]">{s.phone || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      s.status === "ACTIVE"
                        ? "success"
                        : s.status === "GRADUATED"
                        ? "info"
                        : "danger"
                    }
                  >
                    {s.status === "ACTIVE"
                      ? "Aktif"
                      : s.status === "GRADUATED"
                      ? "Lulus"
                      : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedStudent(s);
                        setIsDetailOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Lihat Detail"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Data"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {s.status === "ACTIVE" && (
                      <button
                        onClick={() => handleDeactivate(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Nonaktifkan Siswa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: Tambah Siswa */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Siswa Baru"
        description="Masukkan informasi lengkap peserta didik baru Bimbel Littlefish."
        maxWidth="xl"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="ID / Nomor Registrasi Siswa"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required
            />
            <Input
              label="Nama Lengkap Siswa"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Contoh: Kenzo Alfarizi"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Nama Panggilan"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder="Contoh: Kenzo"
            />
            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
            <Select
              label="Jenis Kelamin"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Kelas Bimbel"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </Select>

            <Select
              label="Orang Tua / Wali"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">-- Pilih Akun Orang Tua --</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name} ({p.user.email})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="No. Telepon / WhatsApp Siswa/Ortu"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0812xxxxxxxx"
            />
            <Select
              label="Status Keaktifan"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Aktif (ACTIVE)</option>
              <option value="INACTIVE">Nonaktif (INACTIVE)</option>
              <option value="GRADUATED">Lulus (GRADUATED)</option>
            </Select>
          </div>

          <Input
            label="Alamat Tempat Tinggal"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
          />

          <Input
            label="Catatan Khusus Perkembangan"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Karakteristik belajar anak, hobi, atau kebutuhan khusus"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Data Siswa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Siswa */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Data Siswa"
        description={`Memperbarui informasi untuk ${selectedStudent?.fullName} (${selectedStudent?.studentId})`}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Lengkap Siswa"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Input
              label="Nama Panggilan"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
            <Select
              label="Jenis Kelamin"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </Select>
            <Select
              label="Status Keaktifan"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Aktif (ACTIVE)</option>
              <option value="INACTIVE">Nonaktif (INACTIVE)</option>
              <option value="GRADUATED">Lulus (GRADUATED)</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Kelas Bimbel"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </Select>

            <Select
              label="Orang Tua / Wali"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">-- Pilih Akun Orang Tua --</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name} ({p.user.email})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="No. Telepon"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Alamat Rumah"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <Input
            label="Catatan Khusus"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detail Siswa */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detail Profil Siswa"
        maxWidth="lg"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white font-extrabold text-base">
                {selectedStudent.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedStudent.fullName}
                </h4>
                <p className="text-xs text-cyan-800 dark:text-cyan-300">
                  ID: {selectedStudent.studentId} • {selectedStudent.class?.name || "Belum ada kelas"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Jenis Kelamin</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedStudent.gender}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Tanggal Lahir</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatDateIndo(selectedStudent.birthDate)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Orang Tua</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedStudent.parent?.user.name || "-"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">No. Telepon</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedStudent.phone || selectedStudent.parent?.user.phone || "-"}
                </p>
              </div>
            </div>

            {selectedStudent.address && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">Alamat</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedStudent.address}
                </p>
              </div>
            )}

            {selectedStudent.notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">Catatan Guru / Pembelajaran</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedStudent.notes}
                </p>
              </div>
            )}

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
