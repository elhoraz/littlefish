"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Users, Plus, Search, Mail, Phone, MapPin, Edit2, UserX } from "lucide-react";
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

interface ParentItem {
  id: string;
  occupation: string | null;
  address: string | null;
  emergencyContact: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
  };
  students: {
    id: string;
    studentId: string;
    fullName: string;
    status: string;
  }[];
}

export default function AdminParentsPage() {
  const [parents, setParents] = useState<ParentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    occupation: "",
    address: "",
    emergencyContact: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    occupation: "",
    address: "",
    emergencyContact: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const { success, error } = useToast();

  const fetchParents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/parents?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setParents(data.parents || []);
      }
    } catch {
      error("Gagal", "Tidak dapat mengambil data orang tua");
    } finally {
      setLoading(false);
    }
  }, [search, error]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const handleOpenAdd = () => {
    setForm({
      name: "",
      email: "",
      password: "parent123",
      phone: "",
      occupation: "",
      address: "",
      emergencyContact: "",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p: ParentItem) => {
    setSelectedParent(p);
    setEditForm({
      name: p.user.name,
      phone: p.user.phone || "",
      occupation: p.occupation || "",
      address: p.address || "",
      emergencyContact: p.emergencyContact || "",
      status: p.user.status as "ACTIVE" | "INACTIVE",
    });
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Menambah", data.error || "Gagal membuat akun orang tua");
        setSaving(false);
        return;
      }
      success("Berhasil", `Akun orang tua ${form.name} berhasil dibuat`);
      setIsAddOpen(false);
      fetchParents();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/parents/${selectedParent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        error("Gagal Mengubah", data.error || "Gagal memperbarui data orang tua");
        setSaving(false);
        return;
      }
      success("Berhasil", `Data orang tua ${editForm.name} berhasil diperbarui`);
      setIsEditOpen(false);
      fetchParents();
    } catch {
      error("Kesalahan Jaringan", "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (p: ParentItem) => {
    if (!confirm(`Nonaktifkan akun orang tua ${p.user.name}? Akun tidak akan dapat masuk ke sistem.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/parents/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Berhasil", `Akun orang tua ${p.user.name} dinonaktifkan`);
        fetchParents();
      } else {
        const data = await res.json();
        error("Gagal", data.error || "Gagal menonaktifkan orang tua");
      }
    } catch {
      error("Kesalahan", "Gagal menghubungi server");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Master Data"
        title="Data Orang Tua & Wali"
        description="Kelola akun portal wali murid, informasi kontak darurat, dan keterhubungan anak."
        actions={
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Akun Orang Tua
          </Button>
        }
      />

      <Card className="p-4">
        <Input
          placeholder="Cari nama orang tua, email, nomor HP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {loading ? (
        <LoadingSpinner text="Memuat akun orang tua..." />
      ) : parents.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Orang Tua"
          description="Belum ada akun orang tua yang terdaftar."
          action={
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1" /> Buat Akun Orang Tua
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Orang Tua</TableHead>
              <TableHead>Kontak & Email</TableHead>
              <TableHead>Pekerjaan</TableHead>
              <TableHead>Anak Terdaftar (Siswa)</TableHead>
              <TableHead>Kontak Darurat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parents.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs shrink-0">
                      {p.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {p.user.name}
                      </p>
                      <p className="text-xs text-slate-400">{p.address || "-"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-0.5">
                    <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {p.user.email}
                    </p>
                    {p.user.phone && (
                      <p className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {p.user.phone}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {p.occupation || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.students.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Belum ditautkan</span>
                    ) : (
                      p.students.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                        >
                          {s.fullName} ({s.studentId})
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {p.emergencyContact || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.user.status === "ACTIVE" ? "success" : "danger"}>
                    {p.user.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(p)}
                      title="Ubah profil orang tua"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Ubah
                    </Button>
                    {p.user.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(p)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Nonaktifkan akun orang tua"
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

      {/* Modal: Tambah Orang Tua */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Akun Orang Tua"
        description="Buat kredensial login portal untuk orang tua atau wali murid."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <Input
            label="Nama Lengkap Orang Tua / Wali"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Ibu Ratna Dewi"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Alamat Email (Login)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ortu@littlefish.test"
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
              placeholder="0815xxxxxxxx"
            />
            <Input
              label="Pekerjaan"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              placeholder="Wiraswasta / Karyawan"
            />
          </div>

          <Input
            label="Kontak Darurat (Nama & No. HP)"
            value={form.emergencyContact}
            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            placeholder="Contoh: 081555667799 (Bpk. Hendra)"
          />

          <Input
            label="Alamat Tempat Tinggal"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Jalan, RT/RW, Perumahan, Kota"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Buat Akun Orang Tua
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ubah Profil Orang Tua */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Data Orang Tua"
        description="Perbarui informasi kontak, alamat, dan status akun orang tua / wali murid."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Nama Lengkap Orang Tua / Wali"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nomor Telepon / WhatsApp"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="0815xxxxxxxx"
            />
            <Input
              label="Pekerjaan"
              value={editForm.occupation}
              onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
              placeholder="Wiraswasta / Karyawan"
            />
          </div>

          <Input
            label="Kontak Darurat"
            value={editForm.emergencyContact}
            onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
            placeholder="Contoh: 081555667799 (Bpk. Hendra)"
          />

          <Input
            label="Alamat Tempat Tinggal"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />

          <Select
            label="Status Akun"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
          >
            <option value="ACTIVE">Aktif (Dapat Mengakses Portal)</option>
            <option value="INACTIVE">Nonaktif (Akses Ditangguhkan)</option>
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
