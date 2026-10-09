import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const calculatePayrollSchema = z.object({
  tutorId: z.string().min(1, "Tutor wajib dipilih"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  customSessions: z.number().optional().nullable(),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const tutorId = searchParams.get("tutorId");

    const where: any = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (tutorId) where.tutorId = tutorId;

    const payments = await prisma.tutorPayment.findMany({
      where,
      include: {
        tutor: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const totalDisbursed = payments
      .filter((p) => p.status === "PAID")
      .reduce((acc, curr) => acc + curr.total, 0);

    const totalPending = payments
      .filter((p) => p.status === "PENDING")
      .reduce((acc, curr) => acc + curr.total, 0);

    return NextResponse.json({
      payments,
      summary: {
        totalRecords: payments.length,
        totalDisbursed,
        totalPending,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/tutor-payments error:", error);
    return NextResponse.json({ error: "Gagal memuat rekap honor tutor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = calculatePayrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input rekap honor tidak valid" },
        { status: 400 }
      );
    }

    const { tutorId, month, year, customSessions, status, notes } = parsed.data;

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      include: { user: true },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor tidak ditemukan" }, { status: 404 });
    }

    // Check financial protection for already PAID records
    const existing = await prisma.tutorPayment.findUnique({
      where: {
        tutorId_month_year: {
          tutorId,
          month,
          year,
        },
      },
    });

    if (existing && existing.status === "PAID" && status !== "PAID") {
      return NextResponse.json(
        { error: "Honorarium yang telah berstatus LUNAS (PAID) tidak dapat diubah kembali menjadi PENDING." },
        { status: 400 }
      );
    }

    let sessions = 0;

    if (customSessions !== undefined && customSessions !== null) {
      sessions = customSessions;
    } else {
      // Calculate real attendance sessions from database for this month
      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      // Deduplicate sessions by date string (YYYY-MM-DD) and classId so same session is NEVER counted twice
      const uniqueSessions = new Set<string>();

      const tutorAttendances = await prisma.attendance.findMany({
        where: {
          tutorId,
          type: "TUTOR",
          status: "HADIR",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { date: true, classId: true },
      });

      for (const att of tutorAttendances) {
        const dateStr = att.date.toISOString().split("T")[0];
        uniqueSessions.add(`${dateStr}_${att.classId}`);
      }

      // Also check taught classes where student attendance occurred (legacy/fallback)
      const taughtClassesAttendance = await prisma.attendance.findMany({
        where: {
          class: { tutorId },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { date: true, classId: true },
      });

      for (const att of taughtClassesAttendance) {
        const dateStr = att.date.toISOString().split("T")[0];
        uniqueSessions.add(`${dateStr}_${att.classId}`);
      }

      sessions = uniqueSessions.size;
    }

    const rate = tutor.compensationRate;
    const total = sessions * rate;

    const isUpdate = !!existing;
    const wasPaid = existing?.status === "PAID";

    // Upsert to handle recalculations
    const record = await prisma.tutorPayment.upsert({
      where: {
        tutorId_month_year: {
          tutorId,
          month,
          year,
        },
      },
      update: {
        sessions,
        rate,
        total,
        status,
        paidAt: status === "PAID" ? existing?.paidAt || new Date() : null,
        notes: notes?.trim() || null,
      },
      create: {
        tutorId,
        month,
        year,
        sessions,
        rate,
        total,
        status,
        paidAt: status === "PAID" ? new Date() : null,
        notes: notes?.trim() || null,
      },
      include: {
        tutor: { include: { user: true } },
      },
    });

    const action = wasPaid || isUpdate ? "UPDATE" : "CREATE";
    const prefix = wasPaid ? "[PENYESUAIAN HONOR LUNAS] " : "";
    const details = `${prefix}Rekap honor tutor: ${record.tutor.user.name} (${month}/${year}) - ${sessions} sesi × Rp ${rate} = Rp ${total} (Status: ${status})${notes ? ` - Catatan: ${notes}` : ""}`;

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action,
      entity: "TutorPayment",
      entityId: record.id,
      details,
    });

    return NextResponse.json({ success: true, payment: record });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/tutor-payments error:", error);
    return NextResponse.json({ error: "Gagal menghitung honor tutor" }, { status: 500 });
  }
}
