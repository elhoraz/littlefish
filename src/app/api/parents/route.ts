import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const parentCreateSchema = z.object({
  name: z.string().min(2, "Nama orang tua wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { phone: { contains: search } } },
      ];
    }

    const parents = await prisma.parent.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true } },
        students: { select: { id: true, fullName: true, studentId: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ parents });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/parents error:", error);
    return NextResponse.json({ error: "Gagal memuat data orang tua" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = parentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data orang tua tidak valid" },
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
        role: "PARENT",
        phone: data.phone?.trim() || null,
        status: "ACTIVE",
        parent: {
          create: {
            occupation: data.occupation?.trim() || null,
            address: data.address?.trim() || null,
            emergencyContact: data.emergencyContact?.trim() || null,
          },
        },
      },
      include: {
        parent: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "Parent",
      entityId: newUser.parent?.id,
      details: `Menambahkan akun orang tua baru: ${newUser.name} (${newUser.email})`,
    });

    return NextResponse.json({ success: true, parent: newUser.parent }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/parents error:", error);
    return NextResponse.json({ error: "Gagal membuat akun orang tua" }, { status: 500 });
  }
}
