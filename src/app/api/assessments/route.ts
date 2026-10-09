import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const assessmentCreateSchema = z.object({
  studentId: z.string().min(1, "Siswa wajib dipilih"),
  classId: z.string().min(1, "Kelas wajib dipilih"),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  topic: z.string().min(2, "Topik materi penilaian wajib diisi"),
  score: z.number().min(0).max(100, "Nilai harus berada di antara 0 sampai 100"),
  masteryLevel: z.enum([
    "BELUM_MENGUASAI",
    "MULAI_BERKEMBANG",
    "CUKUP_MENGUASAI",
    "MENGUASAI",
    "SANGAT_MENGUASAI",
  ]).optional(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

function calculateMasteryLevel(score: number): string {
  if (score >= 90) return "SANGAT_MENGUASAI";
  if (score >= 80) return "MENGUASAI";
  if (score >= 65) return "CUKUP_MENGUASAI";
  if (score >= 50) return "MULAI_BERKEMBANG";
  return "BELUM_MENGUASAI";
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (user.role === "PARENT" && user.parentId) {
      const parentStudents = await prisma.student.findMany({
        where: { parentId: user.parentId },
        select: { id: true },
      });
      const allowedStudentIds = parentStudents.map((s) => s.id);
      if (studentId) {
        if (!allowedStudentIds.includes(studentId)) {
          return NextResponse.json(
            { error: "Akses ditolak: Anda tidak memiliki akses ke data nilai siswa ini" },
            { status: 403 }
          );
        }
        where.studentId = studentId;
      } else {
        where.studentId = { in: allowedStudentIds };
      }
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (!classId) {
        where.class = { tutorId: user.tutorId };
      }
    }

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        student: { select: { id: true, studentId: true, fullName: true } },
        class: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
        tutor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/assessments error:", error);
    return NextResponse.json({ error: "Gagal memuat penilaian" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const body = await request.json();
    const parsed = assessmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data penilaian tidak valid" },
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
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk menilai kelas ini" },
          { status: 403 }
        );
      }
    } else if (user.role === "ADMIN") {
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

    // Verify student belongs to class
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, classId: true, fullName: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }
    if (student.classId !== data.classId) {
      return NextResponse.json(
        { error: "Siswa tidak terdaftar di kelas yang dipilih" },
        { status: 400 }
      );
    }

    if (!tutorId) {
      return NextResponse.json(
        { error: "Tutor penilai tidak ditemukan" },
        { status: 400 }
      );
    }

    const mastery = data.masteryLevel || calculateMasteryLevel(data.score);

    const assessment = await prisma.assessment.create({
      data: {
        studentId: data.studentId,
        tutorId,
        classId: data.classId,
        subjectId: data.subjectId,
        topic: data.topic.trim(),
        score: data.score,
        masteryLevel: mastery,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes?.trim() || null,
      },
      include: {
        student: true,
        subject: true,
        class: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "Assessment",
      entityId: assessment.id,
      details: `Menilai ${assessment.student.fullName}: Nilai ${assessment.score} (${assessment.masteryLevel}) pada ${assessment.topic}`,
    });

    return NextResponse.json({ success: true, assessment }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/assessments error:", error);
    return NextResponse.json({ error: "Gagal menyimpan penilaian" }, { status: 500 });
  }
}
