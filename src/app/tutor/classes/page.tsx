"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Users, Clock, MapPin, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TutorClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((d) => {
        setClasses(d.classes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner text="Memuat kelas Anda..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Pengajar"
        title="Kelas yang Anda Ampu"
        description="Daftar rombel kelompok belajar siswa yang ditugaskan kepada Anda."
      />

      {classes.length === 0 ? (
        <EmptyState
          title="Belum Ada Kelas yang Ditugaskan"
          description="Admin Littlefish belum menugaskan kelas kepada akun Anda."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <Card key={cls.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {cls.name}
                    </h4>
                    <span className="inline-block mt-0.5 text-xs text-cyan-600 font-semibold">
                      {cls.level}
                    </span>
                  </div>
                  <Badge variant="success">{cls.status}</Badge>
                </div>

                <div className="py-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {cls.dayOfWeek || "Hari fleksibel"} • {cls.timeSlot || "Sesuai jadwal"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Ruang: {cls.room || "Ruang Belajar Utama"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Total {cls.students?.length || 0} Siswa Binaan</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Daftar Siswa ({cls.students?.length || 0}):
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                    {cls.students?.map((s: any) => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {s.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                <Link
                  href="/tutor/attendance"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-300 transition-colors"
                >
                  Presensi Kelas
                </Link>
                <Link
                  href="/tutor/assessments"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-colors"
                >
                  Beri Nilai
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
