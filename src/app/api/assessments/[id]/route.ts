import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const assessmentUpdateSchema = z.object({
  score: z.number().min(0).max(100, "Nilai harus berada di antara 0 sampai 100"),
  topic: z.string().min(2, "Topik materi penilaian wajib diisi"),
  masteryLevel: z.enum([
    "BELUM_MENGUASAI",
    "MULAI_BERKEMBANG",
    "CUKUP_MENGUASAI",
    "MENGUASAI",
    "SANGAT_MENGUASAI",
  ]).optional(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

function calculateMasteryLevel(score: number): string {
  if (score >= 90) return "SANGAT_MENGUASAI";
  if (score >= 80) return "MENGUASAI";
  if (score >= 65) return "CUKUP_MENGUASAI";
  if (score >= 50) return "MULAI_BERKEMBANG";
  return "BELUM_MENGUASAI";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { id } = await params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        student: true,
        subject: true,
        class: true,
        tutor: { include: { user: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Penilaian tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "PARENT" && user.parentId) {
      if (assessment.student.parentId !== user.parentId) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
    }

    return NextResponse.json({ assessment });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/assessments/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat penilaian" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = assessmentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.assessment.findUnique({
      where: { id },
      include: { class: true, student: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Penilaian tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (existing.tutorId !== user.tutorId && existing.class.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah penilaian ini" },
          { status: 403 }
        );
      }
    }

    const mastery = data.masteryLevel || calculateMasteryLevel(data.score);
    const targetDate = data.date ? new Date(data.date) : existing.date;

    const existingDateStr = existing.date.toISOString().substring(0, 10);
    const targetDateStr = targetDate.toISOString().substring(0, 10);

    const isChanged =
      existing.score !== data.score ||
      existing.topic !== data.topic.trim() ||
      existing.masteryLevel !== mastery ||
      (existing.notes || "") !== (data.notes?.trim() || "") ||
      existingDateStr !== targetDateStr;

    if (!isChanged) {
      return NextResponse.json({ success: true, assessment: existing, noChanges: true });
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        score: data.score,
        topic: data.topic.trim(),
        masteryLevel: mastery,
        date: targetDate,
        notes: data.notes?.trim() || null,
      },
      include: {
        student: true,
        subject: true,
        class: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "Assessment",
      entityId: id,
      details: `Memperbarui penilaian ${updated.student.fullName}: Nilai ${updated.score} (${updated.masteryLevel}) topik ${updated.topic}`,
    });

    return NextResponse.json({ success: true, assessment: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/assessments/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui penilaian" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;

    const existing = await prisma.assessment.findUnique({
      where: { id },
      include: { class: true, student: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Penilaian tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (existing.tutorId !== user.tutorId && existing.class.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk menghapus penilaian ini" },
          { status: 403 }
        );
      }
    }

    await prisma.assessment.delete({
      where: { id },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "DELETE",
      entity: "Assessment",
      entityId: id,
      details: `Menghapus penilaian ${existing.student.fullName} topik ${existing.topic}`,
    });

    return NextResponse.json({ success: true, message: "Penilaian berhasil dihapus" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/assessments/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus penilaian" }, { status: 500 });
  }
}
