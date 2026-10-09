"use client";

import React, { useEffect, useState } from "react";
import { Award, BookOpen, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateIndo, MASTERY_LEVELS } from "@/lib/utils";

export default function ParentGradesPage() {
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
    return <LoadingSpinner text="Memuat lembar rapor & nilai..." />;
  }

  const assessments = data?.recentAssessments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Portal Orang Tua"
        title="Nilai & Lembar Evaluasi Belajar"
        description="Hasil evaluasi berkala, capaian kompetensi per materi, dan saran bimbingan dari guru."
      />

      {assessments.length === 0 ? (
        <EmptyState
          title="Belum Ada Nilai Pengujian"
          description="Guru belum menginput nilai evaluasi untuk anak Anda."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mata Pelajaran & Topik</TableHead>
              <TableHead>Skor Nilai</TableHead>
              <TableHead>Tingkat Penguasaan</TableHead>
              <TableHead>Tanggal Ujian</TableHead>
              <TableHead>Catatan & Saran Pengajar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((a: any) => {
              const mastery = MASTERY_LEVELS[a.masteryLevel] || {
                label: a.masteryLevel,
                badgeClass: "bg-slate-100 text-slate-700",
              };
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {a.subject?.name || a.topic}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">{a.topic}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-base font-bold text-teal-700 dark:text-teal-400">
                      {a.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${mastery.badgeClass}`}
                    >
                      {mastery.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">
                      {formatDateIndo(a.date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                      {a.notes || "-"}
                    </p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
