"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MONTH_NAMES_INDO } from "@/lib/utils";

export default function ParentModulesPage() {
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
    return <LoadingSpinner text="Memuat silabus materi pembelajaran..." />;
  }

  const modules = data?.modules || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Orang Tua"
        title="Materi & Modul Pembelajaran"
        description="Silabus dan rencana topik yang sedang dipelajari buah hati Anda di kelas bimbingan."
      />

      {modules.length === 0 ? (
        <EmptyState
          title="Belum Ada Modul Ajar Tersedia"
          description="Tutor belum menerbitkan modul pembelajaran bulanan untuk kelas ini."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m: any) => (
            <Card key={m.id} className="p-6 space-y-4">
              <div className="border-b pb-3">
                <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">
                  Bulan {MONTH_NAMES_INDO[m.month - 1]} {m.year} • {m.subject?.name}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {m.topic}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Tujuan Pembelajaran Anak:
                  </h5>
                  <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.objectives}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Alat Peraga & Media:
                  </h5>
                  <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.materials}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Aktivitas Kelas:
                  </h5>
                  <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.activities}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
