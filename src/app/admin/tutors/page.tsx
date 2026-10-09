"use client";

import React, { useEffect, useState, useCallback } from "react";
import { UserCheck, Plus, Search, Mail, Phone, Banknote, BookOpen, Edit2, UserX } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils";

interface TutorItem {
  id: string;
  specialization: string | null;
  address: string | null;
  compensationRate: number;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  classes: { id: string; name: string; level: string }[];
  _count: {
    classes: number;
    attendances: number;
    modules: number;
    assessments: number;
  };
}

export default function AdminTutorsPage() {
  const [tutors, setTutors] = useState<TutorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<TutorItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    address: "",
    compensationRate: 60000,
    status: "ACTIVE",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    specialization: "",
    address: "",
    compensationRate: 60000,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const { success, error } = useToast();

  const fetchTutors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/tutors?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTutors(data.tutors || []);
      }
    } catch {
      error("Gagal", "Tidak dapat memuat data tutor");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, error]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const handleOpenAdd = () => {
    setForm({
      name: "",
      email: "",
      password: "tutor123",
      phone: "",
      specialization: "Calistung & Bahasa Inggris Kids",
      address: "",
      compensationRate: 60000,
      status: "ACTIVE",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (t: TutorItem) => {
    setSelectedTutor(t);
    setEditForm({
      name: t.user.name,
      phone: t.user.phone || "",
      specialization: t.specialization || "",
      address: t.address || "",
      compensationRate: t.compensationRate,
      status: t.status as "ACTIVE" | "INACTIVE",
    });
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menambah", data.error || "Gagal membuat akun tutor");
        setSaving(false);
        return;
      }
      success("Berhasil", `Tutor ${form.name} berhasil didaftarkan`);
      setIsAddOpen(false);
      fetchTutors();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutor) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tutors/${selectedTutor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Mengubah", data.error || "Gagal memperbarui data tutor");
        setSaving(false);
        return;
      }
      success("Berhasil", `Profil tutor ${editForm.name} berhasil diperbarui`);
      setIsEditOpen(false);
      fetchTutors();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (t: TutorItem) => {
    if (!confirm(`Nonaktifkan akun tutor ${t.user.name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/tutors/${t.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Berhasil", `Akun tutor ${t.user.name} berhasil dinonaktifkan`);
        fetchTutors();
      } else {
        const data = await res.json();
        error("Gagal", data.error || "Gagal menonaktifkan tutor");
      }
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Master Data"
        title="Daftar Pengajar & Tutor"
        description="Kelola profil tutor, bidang spesialisasi, tarif kompensasi mengajar, dan status keaktifan."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Daftarkan Tutor Baru
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Cari nama tutor, email, spesialisasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status Keaktifan</option>
            <option value="ACTIVE">Aktif Mengajar</option>
            <option value="INACTIVE">Nonaktif</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat data instruktur & tutor..." />
      ) : tutors.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Tutor"
          description="Belum ada data instruktur yang terdaftar."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Daftarkan Tutor
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Tutor</TableHead>
              <TableHead>Spesialisasi Ajar</TableHead>
              <TableHead>Honor Per Sesi</TableHead>
              <TableHead>Kelas Diampu</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tutors.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs shrink-0">
                      {t.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {t.user.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t.user.email} {t.user.phone ? `• ${t.user.phone}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t.specialization || "Umum"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(t.compensationRate)} / sesi
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {t.classes.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Belum mengampu kelas</span>
                    ) : (
                      t.classes.map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        >
                          {c.name}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === "ACTIVE" ? "success" : "danger"}>
                    {t.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(t)}
                      title="Ubah data tutor"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Ubah
                    </Button>
                    {t.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(t)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Nonaktifkan akun tutor"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        Nonaktifkan
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal: Tambah Tutor */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Daftarkan Tutor Baru"
        description="Buat akun login dan konfigurasi honor pengajar Littlefish."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <Input
            label="Nama Lengkap Tutor"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Kak Sarah Nurul, S.Si"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Alamat Email (Login)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tutor@littlefish.test"
              required
            />
            <Input
              label="Kata Sandi Awal"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nomor Telepon / WhatsApp"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0812xxxxxxxx"
            />
            <Input
              label="Tarif Honor Mengajar Per Sesi (Rp)"
              type="number"
              value={form.compensationRate.toString()}
              onChange={(e) => setForm({ ...form, compensationRate: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <Input
            label="Bidang Spesialisasi Ajar"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            placeholder="Contoh: Matematika & Sains Kreatif"
            required
          />

          <Input
            label="Alamat Domisili"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Jalan, Kota domisili"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Daftarkan Tutor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ubah Tutor */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Profil & Honor Tutor"
        description="Perbarui informasi kontak, spesialisasi, dan tarif honor mengajar per sesi."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Nama Lengkap Tutor"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nomor Telepon / WhatsApp"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              label="Tarif Honor Per Sesi (Rp)"
              type="number"
              value={editForm.compensationRate.toString()}
              onChange={(e) => setEditForm({ ...editForm, compensationRate: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <Input
            label="Bidang Spesialisasi Ajar"
            value={editForm.specialization}
            onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
            required
          />

          <Input
            label="Alamat Domisili"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />

          <Select
            label="Status Keaktifan"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
          >
            <option value="ACTIVE">Aktif Mengajar</option>
            <option value="INACTIVE">Nonaktif</option>
          </Select>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
