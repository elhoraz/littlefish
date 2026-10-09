import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. KPI Counts
    const activeStudentsCount = await prisma.student.count({
      where: { status: "ACTIVE" },
    });

    const activeTutorsCount = await prisma.tutor.count({
      where: { status: "ACTIVE" },
    });

    const activeClassesCount = await prisma.class.count({
      where: { status: "ACTIVE" },
    });

    // Today's attendance count
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayAttendanceCount = await prisma.attendance.count({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
        type: "STUDENT",
      },
    });

    // Unpaid SPP count & current-period revenue
    const currentMonthSpp = await prisma.sppPayment.findMany({
      where: { month: currentMonth, year: currentYear },
    });

    const unpaidSppCount = currentMonthSpp.filter((p) => p.status !== "LUNAS").length;
    const currentPeriodRevenue = currentMonthSpp
      .filter((p) => p.status === "LUNAS")
      .reduce((sum, p) => sum + p.amount, 0);

    // Tutor compensation for current period
    const tutorPayments = await prisma.tutorPayment.findMany({
      where: { month: currentMonth, year: currentYear },
    });
    const tutorCompensationTotal = tutorPayments.reduce((sum, p) => sum + p.total, 0);

    // 2. Attendance Status Distribution
    const allAttendance = await prisma.attendance.findMany({
      where: { type: "STUDENT" },
      select: { status: true },
    });

    const attendanceStats = {
      Hadir: allAttendance.filter((a) => a.status === "HADIR").length,
      Izin: allAttendance.filter((a) => a.status === "IZIN").length,
      Sakit: allAttendance.filter((a) => a.status === "SAKIT").length,
      Alpa: allAttendance.filter((a) => a.status === "ALPA").length,
    };

    // 3. Academic Mastery Distribution
    const allAssessments = await prisma.assessment.findMany({
      select: { masteryLevel: true, score: true },
    });

    const masteryDistribution = [
      {
        name: "Belum Menguasai",
        count: allAssessments.filter((a) => a.masteryLevel === "BELUM_MENGUASAI").length,
        color: "#ef4444",
      },
      {
        name: "Mulai Berkembang",
        count: allAssessments.filter((a) => a.masteryLevel === "MULAI_BERKEMBANG").length,
        color: "#f97316",
      },
      {
        name: "Cukup Menguasai",
        count: allAssessments.filter((a) => a.masteryLevel === "CUKUP_MENGUASAI").length,
        color: "#eab308",
      },
      {
        name: "Menguasai",
        count: allAssessments.filter((a) => a.masteryLevel === "MENGUASAI").length,
        color: "#06b6d4",
      },
      {
        name: "Sangat Menguasai",
        count: allAssessments.filter((a) => a.masteryLevel === "SANGAT_MENGUASAI").length,
        color: "#10b981",
      },
    ];

    // 4. Classes Student Enrollment Chart
    const classesData = await prisma.class.findMany({
      select: {
        name: true,
        capacity: true,
        _count: { select: { students: true } },
      },
      take: 6,
    });

    const classEnrollments = classesData.map((c) => ({
      name: c.name,
      siswa: c._count.students,
      kapasitas: c.capacity,
    }));

    // 5. Recent Activity Streams
    const recentStudents = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { class: { select: { name: true } } },
    });

    const recentPayments = await prisma.sppPayment.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { student: { select: { fullName: true } } },
    });

    const recentAssessments = await prisma.assessment.findMany({
      orderBy: { date: "desc" },
      take: 4,
      include: {
        student: { select: { fullName: true } },
        subject: { select: { name: true } },
      },
    });

    const recentAttendances = await prisma.attendance.findMany({
      where: { type: "STUDENT" },
      orderBy: { date: "desc" },
      take: 4,
      include: {
        student: { select: { fullName: true } },
        class: { select: { name: true } },
      },
    });

    return NextResponse.json({
      kpis: {
        activeStudentsCount,
        activeTutorsCount,
        activeClassesCount,
        todayAttendanceCount,
        unpaidSppCount,
        currentPeriodRevenue,
        tutorCompensationTotal,
      },
      charts: {
        attendanceStats,
        masteryDistribution,
        classEnrollments,
      },
      recent: {
        students: recentStudents,
        payments: recentPayments,
        assessments: recentAssessments,
        attendances: recentAttendances,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/dashboard/admin error:", error);
    return NextResponse.json({ error: "Gagal memuat analitik dashboard admin" }, { status: 500 });
  }
}
