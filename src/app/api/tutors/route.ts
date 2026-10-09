import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const tutorCreateSchema = z.object({
  name: z.string().min(2, "Nama tutor wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().optional().nullable(),
  specialization: z.string().min(2, "Bidang keahlian wajib diisi"),
  address: z.string().optional().nullable(),
  compensationRate: z.number().min(0, "Tarif honor per sesi harus valid").default(50000),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { specialization: { contains: search } },
      ];
    }

    const tutors = await prisma.tutor.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tutors });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/tutors error:", error);
    return NextResponse.json({ error: "Gagal memuat data tutor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = tutorCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data tutor tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique email
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Email '${data.email}' sudah terdaftar` },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: "TUTOR",
        phone: data.phone?.trim() || null,
        status: data.status,
        tutor: {
          create: {
            specialization: data.specialization.trim(),
            address: data.address?.trim() || null,
            compensationRate: data.compensationRate,
            status: data.status,
          },
        },
      },
      include: {
        tutor: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "Tutor",
      entityId: newUser.tutor?.id,
      details: `Menambahkan tutor baru: ${newUser.name} (Honor: Rp ${data.compensationRate}/sesi)`,
    });

    return NextResponse.json({ success: true, tutor: newUser.tutor }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/tutors error:", error);
    return NextResponse.json({ error: "Gagal membuat akun tutor" }, { status: 500 });
  }
}
