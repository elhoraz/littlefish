import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const sppCreateSchema = z.object({
  studentId: z.string().min(1, "Siswa wajib dipilih"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  amount: z.number().min(0).default(250000),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "PARENT"]);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const studentId = searchParams.get("studentId");

    const where: any = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    if (user.role === "PARENT" && user.parentId) {
      const parentStudents = await prisma.student.findMany({
        where: { parentId: user.parentId },
        select: { id: true },
      });
      const allowedStudentIds = parentStudents.map((s) => s.id);
      if (studentId) {
        if (!allowedStudentIds.includes(studentId)) {
          return NextResponse.json(
            { error: "Akses ditolak: Anda tidak memiliki akses ke data tagihan siswa ini" },
            { status: 403 }
          );
        }
        where.studentId = studentId;
      } else {
        where.studentId = { in: allowedStudentIds };
      }
    }

    const payments = await prisma.sppPayment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Calculate summary statistics
    const totalAmount = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const paidAmount = payments
      .filter((p) => p.status === "LUNAS")
      .reduce((acc, curr) => acc + curr.amount, 0);
    const unpaidAmount = totalAmount - paidAmount;

    return NextResponse.json({
      payments,
      summary: {
        totalRecords: payments.length,
        totalAmount,
        paidAmount,
        unpaidAmount,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/spp error:", error);
    return NextResponse.json({ error: "Gagal memuat tagihan SPP" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = sppCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data SPP tidak valid" },
        { status: 400 }
      );
    }

    const { studentId, month, year, amount, notes } = parsed.data;

    // Check duplicate invoice for the same month & year
    const existing = await prisma.sppPayment.findUnique({
      where: {
        studentId_month_year: {
          studentId,
          month,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Tagihan SPP bulan ${month}/${year} untuk siswa ini sudah pernah diterbitkan` },
        { status: 400 }
      );
    }

    const invMonth = month.toString().padStart(2, "0");
    const countTotal = await prisma.sppPayment.count();
    const invoiceNumber = `INV-${year}${invMonth}-${(countTotal + 1).toString().padStart(3, "0")}`;

    const payment = await prisma.sppPayment.create({
      data: {
        studentId,
        invoiceNumber,
        month,
        year,
        amount,
        status: "BELUM_BAYAR",
        notes: notes?.trim() || null,
        recordedById: user.id,
      },
      include: {
        student: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "SppPayment",
      entityId: payment.id,
      details: `Menerbitkan tagihan SPP ${payment.invoiceNumber} untuk ${payment.student.fullName} (Rp ${payment.amount})`,
    });

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/spp error:", error);
    return NextResponse.json({ error: "Gagal membuat tagihan SPP" }, { status: 500 });
  }
}
