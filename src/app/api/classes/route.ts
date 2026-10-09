import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const classCreateSchema = z.object({
  name: z.string().min(2, "Nama kelas wajib diisi"),
  level: z.string().min(2, "Jenjang kelas wajib diisi"),
  room: z.string().optional().nullable(),
  tutorId: z.string().optional().nullable(),
  dayOfWeek: z.string().optional().nullable(),
  timeSlot: z.string().optional().nullable(),
  capacity: z.number().min(1).default(10),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { level: { contains: search } },
        { room: { contains: search } },
      ];
    }

    if (user.role === "TUTOR" && user.tutorId) {
      where.tutorId = user.tutorId;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        tutor: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        students: {
          select: { id: true, studentId: true, fullName: true, status: true },
        },
        _count: {
          select: {
            students: true,
            attendances: true,
            teachingModules: true,
            worksheets: true,
            assessments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ classes });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/classes error:", error);
    return NextResponse.json({ error: "Gagal memuat data kelas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = classCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data kelas tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const newClass = await prisma.class.create({
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
      include: {
        tutor: { include: { user: true } },
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "Class",
      entityId: newClass.id,
      details: `Menambahkan kelas baru: ${newClass.name} (${newClass.level})`,
    });

    return NextResponse.json({ success: true, class: newClass }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/classes error:", error);
    return NextResponse.json({ error: "Gagal membuat kelas baru" }, { status: 500 });
  }
}
