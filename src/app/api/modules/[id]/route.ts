import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const moduleUpdateSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  topic: z.string().min(2, "Topik materi wajib diisi"),
  objectives: z.string().min(2, "Tujuan pembelajaran wajib diisi"),
  materials: z.string().min(2, "Materi & alat ajar wajib diisi"),
  activities: z.string().min(2, "Rencana aktivitas wajib diisi"),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { id } = await params;

    const moduleItem = await prisma.teachingModule.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        tutor: { include: { user: true } },
      },
    });

    if (!moduleItem) {
      return NextResponse.json({ error: "Modul ajar tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "PARENT" && user.parentId) {
      const parentHasChildInClass = await prisma.student.findFirst({
        where: { parentId: user.parentId, classId: moduleItem.classId },
      });
      if (!parentHasChildInClass) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
    }

    return NextResponse.json({ module: moduleItem });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/modules/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat modul ajar" }, { status: 500 });
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
    const parsed = moduleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.teachingModule.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Modul ajar tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (existing.tutorId !== user.tutorId && existing.class.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah modul ini" },
          { status: 403 }
        );
      }
    }

    const isChanged =
      existing.month !== data.month ||
      existing.year !== data.year ||
      existing.topic !== data.topic.trim() ||
      existing.objectives !== data.objectives.trim() ||
      existing.materials !== data.materials.trim() ||
      existing.activities !== data.activities.trim() ||
      (existing.notes || "") !== (data.notes?.trim() || "");

    if (!isChanged) {
      return NextResponse.json({ success: true, module: existing, noChanges: true });
    }

    const updated = await prisma.teachingModule.update({
      where: { id },
      data: {
        month: data.month,
        year: data.year,
        topic: data.topic.trim(),
        objectives: data.objectives.trim(),
        materials: data.materials.trim(),
        activities: data.activities.trim(),
        notes: data.notes?.trim() || null,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "TeachingModule",
      entityId: id,
      details: `Memperbarui modul ajar: ${updated.topic}`,
    });

    return NextResponse.json({ success: true, module: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/modules/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui modul ajar" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;

    const existing = await prisma.teachingModule.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Modul ajar tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (existing.tutorId !== user.tutorId && existing.class.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk menghapus modul ini" },
          { status: 403 }
        );
      }
    }

    await prisma.teachingModule.delete({
      where: { id },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "DELETE",
      entity: "TeachingModule",
      entityId: id,
      details: `Menghapus modul ajar: ${existing.topic}`,
    });

    return NextResponse.json({ success: true, message: "Modul ajar berhasil dihapus" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/modules/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus modul ajar" }, { status: 500 });
  }
}
