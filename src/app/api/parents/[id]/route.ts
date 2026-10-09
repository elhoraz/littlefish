import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const parentUpdateSchema = z.object({
  name: z.string().min(2, "Nama orang tua wajib diisi"),
  phone: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id } = await params;

    const parent = await prisma.parent.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true } },
        students: { select: { id: true, studentId: true, fullName: true, status: true } },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: "Data orang tua tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ parent });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/parents/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat detail orang tua" }, { status: 500 });
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
    const parsed = parentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.parent.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Data orang tua tidak ditemukan" }, { status: 404 });
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

      return tx.parent.update({
        where: { id },
        data: {
          occupation: data.occupation?.trim() || null,
          address: data.address?.trim() || null,
          emergencyContact: data.emergencyContact?.trim() || null,
        },
        include: {
          user: true,
          students: true,
        },
      });
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "Parent",
      entityId: id,
      details: `Memperbarui profil orang tua: ${updated.user.name} (Status: ${updated.user.status})`,
    });

    return NextResponse.json({ success: true, parent: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/parents/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data orang tua" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id } = await params;

    const existing = await prisma.parent.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Data orang tua tidak ditemukan" }, { status: 404 });
    }

    // Soft delete: deactivate user
    await prisma.user.update({
      where: { id: existing.userId },
      data: { status: "INACTIVE" },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "STATUS_CHANGE",
      entity: "Parent",
      entityId: id,
      details: `Menonaktifkan akun orang tua: ${existing.user.name}`,
    });

    return NextResponse.json({ success: true, message: "Akun orang tua berhasil dinonaktifkan" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/parents/[id] error:", error);
    return NextResponse.json({ error: "Gagal menonaktifkan orang tua" }, { status: 500 });
  }
}
