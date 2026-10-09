import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const moduleSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  classId: z.string().min(1, "Kelas wajib dipilih"),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  topic: z.string().min(2, "Topik materi wajib diisi"),
  objectives: z.string().min(2, "Tujuan pembelajaran wajib diisi"),
  materials: z.string().min(2, "Materi & alat ajar wajib diisi"),
  activities: z.string().min(2, "Rencana aktivitas wajib diisi"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: any = {};
    if (classId) where.classId = classId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    // If Parent, restrict to classes where parent's children belong
    if (user.role === "PARENT" && user.parentId) {
      const parentStudents = await prisma.student.findMany({
        where: { parentId: user.parentId, classId: { not: null } },
        select: { classId: true },
      });
      const allowedClassIds = parentStudents.map((s) => s.classId as string);
      where.classId = { in: allowedClassIds };
    }

    // If Tutor, optionally filter to classes they teach
    if (user.role === "TUTOR" && user.tutorId) {
      if (!classId) {
        where.class = { tutorId: user.tutorId };
      }
    }

    const modules = await prisma.teachingModule.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
        tutor: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({ modules });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/modules error:", error);
    return NextResponse.json({ error: "Gagal memuat modul ajar" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const body = await request.json();
    const parsed = moduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data modul tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    let tutorId: string | undefined = user.tutorId;
    if (user.role === "TUTOR" && user.tutorId) {
      const cls = await prisma.class.findUnique({
        where: { id: data.classId },
        select: { tutorId: true },
      });
      if (!cls || cls.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk membuat modul pada kelas ini" },
          { status: 403 }
        );
      }
    } else if (user.role === "ADMIN") {
      // Find class tutor or assign first tutor
      const cls = await prisma.class.findUnique({
        where: { id: data.classId },
        select: { tutorId: true },
      });
      tutorId = cls?.tutorId ?? undefined;
      if (!tutorId) {
        const firstTutor = await prisma.tutor.findFirst();
        tutorId = firstTutor?.id ?? undefined;
      }
    }

    if (!tutorId) {
      return NextResponse.json(
        { error: "Tutor pengampu tidak ditemukan untuk kelas ini" },
        { status: 400 }
      );
    }

    const newModule = await prisma.teachingModule.create({
      data: {
        month: data.month,
        year: data.year,
        classId: data.classId,
        tutorId,
        subjectId: data.subjectId,
        topic: data.topic.trim(),
        objectives: data.objectives.trim(),
        materials: data.materials.trim(),
        activities: data.activities.trim(),
        notes: data.notes?.trim() || null,
      },
      include: {
        class: true,
        subject: true,
        tutor: { include: { user: true } },
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "TeachingModule",
      entityId: newModule.id,
      details: `Menambahkan modul ajar baru: ${newModule.topic} (Bulan ${newModule.month}/${newModule.year})`,
    });

    return NextResponse.json({ success: true, module: newModule }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/modules error:", error);
    return NextResponse.json({ error: "Gagal membuat modul ajar" }, { status: 500 });
  }
}
