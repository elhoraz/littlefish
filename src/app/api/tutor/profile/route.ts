import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const profileUpdateSchema = z.object({
  name: z.string().min(2, "Nama lengkap minimal 2 karakter").optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  specialization: z.string().min(2, "Bidang keahlian minimal 2 karakter").optional(),
});

export async function GET() {
  try {
    const user = await requireAuth(["TUTOR"]);

    const tutor = await prisma.tutor.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true, status: true } },
        classes: { select: { id: true, name: true, level: true } },
      },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Profil tutor tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ tutor });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/tutor/profile error:", error);
    return NextResponse.json({ error: "Gagal memuat profil tutor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(["TUTOR"]);
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input profil tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.tutor.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profil tutor tidak ditemukan" }, { status: 404 });
    }

    const newName = data.name !== undefined ? data.name.trim() : existing.user.name;
    const newPhone = data.phone !== undefined ? (data.phone?.trim() || null) : existing.user.phone;
    const newAddress = data.address !== undefined ? (data.address?.trim() || null) : existing.address;
    const newSpec = data.specialization !== undefined ? data.specialization.trim() : existing.specialization;

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
        where: { id: user.id },
        data: {
          name: newName,
          phone: newPhone,
        },
      });

      return tx.tutor.update({
        where: { id: existing.id },
        data: {
          address: newAddress,
          specialization: newSpec,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true, status: true } },
          classes: { select: { id: true, name: true, level: true } },
        },
      });
    });

    await logAudit({
      actorId: user.id,
      actorName: updated.user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "TutorProfile",
      entityId: existing.id,
      details: `Tutor ${updated.user.name} memperbarui data profil pribadinya`,
    });

    return NextResponse.json({ success: true, tutor: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PATCH /api/tutor/profile error:", error);
    return NextResponse.json({ error: "Gagal memperbarui profil tutor" }, { status: 500 });
  }
}
