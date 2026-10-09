import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["PARENT", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("studentId");

    // Get parent record
    let parentId = user.parentId;
    if (!parentId && user.role === "ADMIN") {
      const firstParent = await prisma.parent.findFirst();
      parentId = firstParent?.id;
    }

    if (!parentId) {
      return NextResponse.json({
        children: [],
        selectedChild: null,
      });
    }

    const children = await prisma.student.findMany({
      where: { parentId },
      include: {
        class: {
          include: {
            tutor: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    if (children.length === 0) {
      return NextResponse.json({
        children: [],
        selectedChild: null,
      });
    }

    // Determine which child is selected
    const selectedChild =
      children.find((c) => c.id === requestedStudentId) || children[0];

    // 1. Attendance for selected child
    const attendances = await prisma.attendance.findMany({
      where: { studentId: selectedChild.id, type: "STUDENT" },
      orderBy: { date: "desc" },
    });

    const hadirCount = attendances.filter((a) => a.status === "HADIR").length;
    const izinCount = attendances.filter((a) => a.status === "IZIN").length;
    const sakitCount = attendances.filter((a) => a.status === "SAKIT").length;
    const alpaCount = attendances.filter((a) => a.status === "ALPA").length;
    const totalAttendanceSessions = attendances.length;
    const attendanceRate =
      totalAttendanceSessions > 0
        ? Math.round((hadirCount / totalAttendanceSessions) * 100)
        : 100;

    // 2. Assessments and Scores for selected child
    const assessments = await prisma.assessment.findMany({
      where: { studentId: selectedChild.id },
      include: {
        subject: true,
        tutor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: "asc" },
    });

    const averageScore =
      assessments.length > 0
        ? Math.round(
            assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length
          )
        : 0;

    // Score trend for charts
    const scoreTrend = assessments.map((a) => ({
      date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
        new Date(a.date)
      ),
      score: a.score,
      topic: a.topic,
      subject: a.subject.name,
      mastery: a.masteryLevel,
    }));

    // Mastery distribution
    const masteryStats = {
      BELUM_MENGUASAI: assessments.filter((a) => a.masteryLevel === "BELUM_MENGUASAI").length,
      MULAI_BERKEMBANG: assessments.filter((a) => a.masteryLevel === "MULAI_BERKEMBANG").length,
      CUKUP_MENGUASAI: assessments.filter((a) => a.masteryLevel === "CUKUP_MENGUASAI").length,
      MENGUASAI: assessments.filter((a) => a.masteryLevel === "MENGUASAI").length,
      SANGAT_MENGUASAI: assessments.filter((a) => a.masteryLevel === "SANGAT_MENGUASAI").length,
    };

    // 3. SPP Status for selected child
    const sppPayments = await prisma.sppPayment.findMany({
      where: { studentId: selectedChild.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const latestSpp = sppPayments[0] || null;

    // 4. Teaching modules for child's class
    let modules: any[] = [];
    if (selectedChild.classId) {
      modules = await prisma.teachingModule.findMany({
        where: { classId: selectedChild.classId },
        include: { subject: true, tutor: { include: { user: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 3,
      });
    }

    return NextResponse.json({
      children: children.map((c) => ({
        id: c.id,
        studentId: c.studentId,
        fullName: c.fullName,
        nickname: c.nickname,
        class: c.class?.name || "Belum ada kelas",
      })),
      selectedChild: {
        id: selectedChild.id,
        studentId: selectedChild.studentId,
        fullName: selectedChild.fullName,
        nickname: selectedChild.nickname,
        birthDate: selectedChild.birthDate,
        gender: selectedChild.gender,
        class: selectedChild.class,
      },
      stats: {
        attendanceRate,
        totalAttendanceSessions,
        hadirCount,
        izinCount,
        sakitCount,
        alpaCount,
        averageScore,
        totalAssessments: assessments.length,
      },
      scoreTrend,
      masteryStats,
      recentAssessments: [...assessments].reverse().slice(0, 5),
      recentAttendances: attendances.slice(0, 8),
      sppPayments,
      latestSpp,
      modules,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/dashboard/parent error:", error);
    return NextResponse.json({ error: "Gagal memuat portal orang tua" }, { status: 500 });
  }
}
