import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const sppUpdateSchema = z.object({
  status: z.enum(["BELUM_BAYAR", "MENUNGGU", "LUNAS"]),
  method: z.enum(["TRANSFER", "TUNAI", "QRIS"]).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "PARENT"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = sppUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input pembaruan tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.sppPayment.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Data SPP tidak ditemukan" }, { status: 404 });
    }

    // If parent is updating, they can only set status to MENUNGGU (konfirmasi bayar) for their own child!
    if (user.role === "PARENT") {
      if (existing.student.parentId !== user.parentId) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      if (data.status !== "MENUNGGU") {
        return NextResponse.json(
          { error: "Orang tua hanya dapat mengirimkan status konfirmasi pembayaran" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.sppPayment.update({
      where: { id },
      data: {
        status: data.status,
        method: data.method || existing.method,
        paymentDate:
          data.status === "LUNAS" && !data.paymentDate
            ? new Date()
            : data.paymentDate
            ? new Date(data.paymentDate)
            : existing.paymentDate,
        notes: data.notes?.trim() || existing.notes,
        recordedById: user.id,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "PAYMENT_RECORD",
      entity: "SppPayment",
      entityId: id,
      details: `Pembaruan SPP ${existing.invoiceNumber} (${existing.student.fullName}): status menjadi ${updated.status} (Metode: ${updated.method || "-"})`,
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/spp/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui SPP" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}
