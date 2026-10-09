import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const studentNotesSchema = z.object({
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = studentNotesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Format catatan tidak valid" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // Role-based authorization: Tutor can only edit notes for students in their assigned class
    if (user.role === "TUTOR" && user.tutorId) {
      if (!student.classId || student.class?.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah catatan siswa ini" },
          { status: 403 }
        );
      }
    }

    const cleanNotes = parsed.data.notes?.trim() || null;
    const isChanged = (student.notes || null) !== cleanNotes;

    if (!isChanged) {
      return NextResponse.json({ success: true, student, noChanges: true });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        notes: cleanNotes,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "StudentNotes",
      entityId: id,
      details: `Memperbarui catatan karakteristik belajar siswa ${updated.fullName}: "${cleanNotes || '(dikosongkan)'}"`,
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PATCH /api/students/[id]/notes error:", error);
    return NextResponse.json({ error: "Gagal memperbarui catatan siswa" }, { status: 500 });
  }
}
