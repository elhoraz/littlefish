"use client";

import React, { useEffect, useState } from "react";
import { GraduationCap, Calendar, MapPin, UserCheck, Phone, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateIndo } from "@/lib/utils";

export default function ParentChildrenPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/parent")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner text="Memuat profil peserta didik..." />;
  }

  const children = data?.children || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Bimbel Littlefish — Portal Orang Tua"
        title="Profil Peserta Didik"
        description="Informasi data induk siswa, penempatan rombel kelas, dan kontak pengajar pendamping."
      />

      {children.length === 0 ? (
        <EmptyState
          title="Tidak Ada Siswa Terhubung"
          description="Akun Anda belum memiliki data anak terdaftar aktif di Bimbel Littlefish."
        />
      ) : (
        <div className="space-y-6">
          {children.map((child: any) => (
            <div key={child.id} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white font-bold text-base shrink-0">
                    {child.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {child.fullName}
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                      ID Siswa: {child.studentId}
                    </p>
                    <div className="mt-1">
                      <Badge variant="success">Aktif Belajar</Badge>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500">Nama Panggilan:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {child.nickname || "-"}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500">Jenis Kelamin:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {child.gender === "L" ? "Laki-laki" : child.gender === "P" ? "Perempuan" : child.gender}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500">Tanggal Lahir:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDateIndo(child.birthDate)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-3.5">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                  Penempatan Kelas & Tutor
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">Kelas Belajar:</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {child.class?.name || "Belum ditentukan"}
                    </p>
                    <p className="text-teal-700 dark:text-teal-400 font-medium">{child.class?.level}</p>
                    <p className="text-slate-500 mt-1">
                      Jadwal: {child.class?.dayOfWeek || "-"} ({child.class?.timeSlot || "-"})
                    </p>
                  </div>

                  {child.class?.tutor && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400">Tutor Pengampu:</span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {child.class.tutor.user.name}
                      </p>
                      <p className="text-slate-500">
                        Spesialisasi: {child.class.tutor.specialization || "Umum"}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
