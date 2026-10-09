import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const classUpdateSchema = z.object({
  name: z.string().min(2, "Nama kelas wajib diisi"),
  level: z.string().min(2, "Jenjang kelas wajib diisi"),
  room: z.string().optional().nullable(),
  tutorId: z.string().optional().nullable(),
  dayOfWeek: z.string().optional().nullable(),
  timeSlot: z.string().optional().nullable(),
  capacity: z.number().min(1),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  studentIdsToAssign: z.array(z.string()).optional(),
  studentIdsToRemove: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;

    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        tutor: { include: { user: { select: { id: true, name: true, phone: true } } } },
        students: {
          include: {
            parent: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
        teachingModules: {
          include: {
            subject: true,
            tutor: { include: { user: { select: { name: true } } } },
          },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
        worksheets: {
          include: { subject: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId && cls.tutorId !== user.tutorId) {
      return NextResponse.json({ error: "Akses ke kelas ini ditolak" }, { status: 403 });
    }

    return NextResponse.json({ class: cls });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/classes/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat detail kelas" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = classUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan kelas tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Execute in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update basic class fields
      const cls = await tx.class.update({
        where: { id },
        data: {
          name: data.name.trim(),
          level: data.level.trim(),
          room: data.room?.trim() || null,
          tutorId: data.tutorId || null,
          dayOfWeek: data.dayOfWeek?.trim() || null,
          timeSlot: data.timeSlot?.trim() || null,
          capacity: data.capacity,
          status: data.status,
        },
      });

      // 2. Assign students if any
      if (data.studentIdsToAssign && data.studentIdsToAssign.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: data.studentIdsToAssign } },
          data: { classId: id },
        });
      }

      // 3. Remove students if any
      if (data.studentIdsToRemove && data.studentIdsToRemove.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: data.studentIdsToRemove } },
          data: { classId: null },
        });
      }

      return cls;
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "Class",
      entityId: id,
      details: `Memperbarui data kelas: ${updated.name}`,
    });

    return NextResponse.json({ success: true, class: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/classes/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui kelas" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id } = await params;

    const existing = await prisma.class.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const archived = await prisma.class.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STATUS_CHANGE",
      entity: "Class",
      entityId: id,
      details: `Mengarsipkan kelas: ${archived.name}`,
    });

    return NextResponse.json({ success: true, message: "Kelas berhasil diarsipkan", class: archived });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/classes/[id] error:", error);
    return NextResponse.json({ error: "Gagal mengarsipkan kelas" }, { status: 500 });
  }
}
