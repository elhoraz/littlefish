import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const studentCreateSchema = z.object({
  studentId: z.string().min(2, "ID Siswa wajib diisi"),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  nickname: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(["Laki-laki", "Perempuan"]).default("Laki-laki"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]).default("ACTIVE"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const classId = searchParams.get("classId") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { studentId: { contains: search } },
        { nickname: { contains: search } },
      ];
    }

    if (classId) {
      where.classId = classId;
    }

    if (status) {
      where.status = status;
    }

    // If Tutor is logged in and not admin, filter to their classes if desired
    if (user.role === "TUTOR" && user.tutorId) {
      where.class = {
        tutorId: user.tutorId,
      };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, level: true } },
        parent: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        _count: {
          select: {
            attendances: true,
            assessments: true,
            sppPayments: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ students });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: "Gagal memuat data siswa" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = studentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data siswa tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique studentId
    const existing = await prisma.student.findUnique({
      where: { studentId: data.studentId.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `ID Siswa '${data.studentId}' sudah digunakan` },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        studentId: data.studentId.trim(),
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
      include: {
        class: true,
        parent: { include: { user: true } },
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "Student",
      entityId: student.id,
      details: `Menambahkan siswa baru: ${student.fullName} (${student.studentId})`,
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data siswa" }, { status: 500 });
  }
}
