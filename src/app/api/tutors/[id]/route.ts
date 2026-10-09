import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const tutorUpdateSchema = z.object({
  name: z.string().min(2, "Nama tutor wajib diisi"),
  phone: z.string().optional().nullable(),
  specialization: z.string().min(2, "Spesialisasi ajar wajib diisi"),
  address: z.string().optional().nullable(),
  compensationRate: z.number().min(0, "Tarif honor per sesi harus valid"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;

    if (user.role === "TUTOR" && user.tutorId !== id) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki akses ke profil tutor lain" },
        { status: 403 }
      );
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true } },
        classes: { select: { id: true, name: true, level: true } },
        _count: {
          select: {
            classes: true,
            attendances: true,
            teachingModules: true,
            assessments: true,
          },
        },
      },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ tutor });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/tutors/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat detail tutor" }, { status: 500 });
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

    const existing = await prisma.tutor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tutor tidak ditemukan" }, { status: 404 });
    }

    // Role-based authorization & mass assignment protection
    if (user.role === "TUTOR") {
      if (user.tutorId !== id) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah data tutor lain" },
          { status: 403 }
        );
      }

      // Reject alteration of financial and privilege fields
      if (
        (body.compensationRate !== undefined && Number(body.compensationRate) !== existing.compensationRate) ||
        (body.status !== undefined && body.status !== existing.status) ||
        (body.role !== undefined && body.role !== user.role)
      ) {
        return NextResponse.json(
          { error: "Akses ditolak: Tarif honor, status akun, dan peran tutor hanya dapat dikelola oleh Admin" },
          { status: 403 }
        );
      }

      const newName = body.name ? body.name.trim() : existing.user.name;
      const newPhone = body.phone !== undefined ? (body.phone?.trim() || null) : existing.user.phone;
      const newSpec = body.specialization ? body.specialization.trim() : existing.specialization;
      const newAddress = body.address !== undefined ? (body.address?.trim() || null) : existing.address;

      if (!newName || newName.length < 2) {
        return NextResponse.json({ error: "Nama tutor minimal 2 karakter" }, { status: 400 });
      }

      const isChanged =
        existing.user.name !== newName ||
        (existing.user.phone || null) !== newPhone ||
        (existing.address || null) !== newAddress ||
        (existing.specialization || null) !== newSpec;

      if (!isChanged) {
        return NextResponse.json({ success: true, tutor: existing, noChanges: true });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            name: newName,
            phone: newPhone,
          },
        });

        return tx.tutor.update({
          where: { id },
          data: {
            specialization: newSpec,
            address: newAddress,
          },
          include: {
            user: true,
            classes: true,
          },
        });
      });

      await logAudit({
        actorId: user.id,
        actorName: updated.user.name,
        actorRole: user.role,
        action: "UPDATE",
        entity: "TutorProfile",
        entityId: id,
        details: `Tutor ${updated.user.name} memperbarui data profil pribadinya`,
      });

      return NextResponse.json({ success: true, tutor: updated });
    }

    // ADMIN: full update validation
    const parsed = tutorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const isChanged =
      existing.user.name !== data.name.trim() ||
      (existing.user.phone || null) !== (data.phone?.trim() || null) ||
      existing.user.status !== data.status ||
      existing.specialization !== data.specialization.trim() ||
      (existing.address || null) !== (data.address?.trim() || null) ||
      existing.compensationRate !== data.compensationRate ||
      existing.status !== data.status;

    if (!isChanged) {
      return NextResponse.json({ success: true, tutor: existing, noChanges: true });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          name: data.name.trim(),
          phone: data.phone?.trim() || null,
          status: data.status,
        },
      });

      return tx.tutor.update({
        where: { id },
        data: {
          specialization: data.specialization.trim(),
          address: data.address?.trim() || null,
          compensationRate: data.compensationRate,
          status: data.status,
        },
        include: {
          user: true,
          classes: true,
        },
      });
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "Tutor",
      entityId: id,
      details: `Memperbarui profil tutor: ${updated.user.name} (Honor: Rp ${updated.compensationRate}, Status: ${updated.status})`,
    });

    return NextResponse.json({ success: true, tutor: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/tutors/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data tutor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id } = await params;

    const existing = await prisma.tutor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tutor tidak ditemukan" }, { status: 404 });
    }

    // Soft delete: deactivate user and tutor
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: { status: "INACTIVE" },
      }),
      prisma.tutor.update({
        where: { id },
        data: { status: "INACTIVE" },
      }),
    ]);

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STATUS_CHANGE",
      entity: "Tutor",
      entityId: id,
      details: `Menonaktifkan akun tutor: ${existing.user.name}`,
    });

    return NextResponse.json({ success: true, message: "Akun tutor berhasil dinonaktifkan" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/tutors/[id] error:", error);
    return NextResponse.json({ error: "Gagal menonaktifkan tutor" }, { status: 500 });
  }
}
