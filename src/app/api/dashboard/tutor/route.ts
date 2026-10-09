import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth(["TUTOR", "ADMIN"]);

    // If tutor is logged in, find their tutor profile
    let tutorId = user.tutorId;
    if (!tutorId && user.role === "ADMIN") {
      const firstTutor = await prisma.tutor.findFirst();
      tutorId = firstTutor?.id;
    }

    if (!tutorId) {
      return NextResponse.json({
        classes: [],
        studentsCount: 0,
        recentModules: [],
        recentWorksheets: [],
        recentAssessments: [],
      });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        classes: {
          include: {
            _count: { select: { students: true } },
            students: { select: { id: true, fullName: true, studentId: true } },
          },
        },
      },
    });

    const classIds = tutor?.classes.map((c) => c.id) || [];

    // Total unique students in tutor's classes
    const studentsCount = await prisma.student.count({
      where: { classId: { in: classIds } },
    });

    // Recent modules created by tutor
    const recentModules = await prisma.teachingModule.findMany({
      where: { tutorId },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 4,
    });

    // Recent worksheets
    const recentWorksheets = await prisma.worksheet.findMany({
      where: { classId: { in: classIds } },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    // Recent assessments recorded by tutor
    const recentAssessments = await prisma.assessment.findMany({
      where: { tutorId },
      include: {
        student: { select: { fullName: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    // Today's attendance check
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const attendancesToday = await prisma.attendance.findMany({
      where: {
        classId: { in: classIds },
        date: { gte: startOfToday, lte: endOfToday },
        type: "STUDENT",
      },
    });

    return NextResponse.json({
      tutor: {
        id: tutor?.id,
        specialization: tutor?.specialization,
        rate: tutor?.compensationRate,
      },
      classes: tutor?.classes || [],
      studentsCount,
      todayAttendancesFilled: attendancesToday.length > 0,
      recentModules,
      recentWorksheets,
      recentAssessments,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/dashboard/tutor error:", error);
    return NextResponse.json({ error: "Gagal memuat dashboard tutor" }, { status: 500 });
  }
}
