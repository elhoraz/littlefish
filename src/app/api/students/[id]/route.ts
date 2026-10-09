import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const studentUpdateSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  nickname: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(["Laki-laki", "Perempuan"]),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            tutor: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
        parent: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 30,
        },
        assessments: {
          include: {
            subject: true,
            tutor: { include: { user: { select: { name: true } } } },
          },
          orderBy: { date: "desc" },
          take: 30,
        },
        sppPayments: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // Role-based security check: Parent can only view their own child!
    if (user.role === "PARENT" && student.parentId !== user.parentId) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki akses ke data siswa ini" },
        { status: 403 }
      );
    }

    // Role-based security check: Tutor can only view students enrolled in their assigned class
    if (user.role === "TUTOR" && user.tutorId) {
      if (!student.classId || student.class?.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk melihat data siswa ini" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ student });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/students/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat detail siswa" }, { status: 500 });
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

    const existing = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // Role-based authorization & least-privilege enforcement
    if (user.role === "TUTOR") {
      // 1. Verify tutor is assigned to this student's class
      if (!existing.classId || existing.class?.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang atas data siswa di luar kelas binaan Anda" },
          { status: 403 }
        );
      }

      // 2. Reject tampering with master data fields
      const hasMasterFieldTampering =
        (body.fullName !== undefined && body.fullName.trim() !== existing.fullName) ||
        (body.gender !== undefined && body.gender !== existing.gender) ||
        (body.status !== undefined && body.status !== existing.status) ||
        (body.classId !== undefined && body.classId !== existing.classId) ||
        (body.parentId !== undefined && body.parentId !== existing.parentId);

      if (hasMasterFieldTampering) {
        return NextResponse.json(
          { error: "Akses ditolak: Tutor tidak memiliki wewenang untuk mengubah data master siswa (nama, kelas, wali, atau status)" },
          { status: 403 }
        );
      }

      // 3. Update notes only
      const cleanNotes = body.notes !== undefined ? (body.notes?.trim() || null) : existing.notes;
      const isChanged = (existing.notes || null) !== cleanNotes;

      if (!isChanged) {
        return NextResponse.json({ success: true, student: existing, noChanges: true });
      }

      const updated = await prisma.student.update({
        where: { id },
        data: { notes: cleanNotes },
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
    }

    // ADMIN: full update validation
    const parsed = studentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const isChanged =
      existing.fullName !== data.fullName.trim() ||
      (existing.nickname || "") !== (data.nickname?.trim() || "") ||
      existing.gender !== data.gender ||
      existing.status !== data.status ||
      (existing.classId || "") !== (data.classId || "") ||
      (existing.parentId || "") !== (data.parentId || "") ||
      (existing.phone || "") !== (data.phone?.trim() || "") ||
      (existing.address || "") !== (data.address?.trim() || "") ||
      (existing.notes || "") !== (data.notes?.trim() || "");

    if (!isChanged) {
      return NextResponse.json({ success: true, student: existing, noChanges: true });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        fullName: data.fullName.trim(),
        nickname: data.nickname?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        parentId: data.parentId || null,
        classId: data.classId || null,
        notes: data.notes?.trim() || null,
        status: data.status,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "Student",
      entityId: id,
      details: `Memperbarui data siswa: ${updated.fullName} (Status: ${updated.status})`,
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/students/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data siswa" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id } = await params;

    // Soft deactivate instead of destructive wipe
    const student = await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STATUS_CHANGE",
      entity: "Student",
      entityId: id,
      details: `Menonaktifkan siswa: ${student.fullName}`,
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/students/[id] error:", error);
    return NextResponse.json({ error: "Gagal menonaktifkan siswa" }, { status: 500 });
  }
}

const studentNotesPatchSchema = z.object({
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
    const parsed = studentNotesPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Format catatan tidak valid" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // Role-based security check: Tutor can only edit notes for students in their assigned class
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
    console.error("PATCH /api/students/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui catatan siswa" }, { status: 500 });
  }
}

