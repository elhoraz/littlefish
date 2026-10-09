import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const subjectSchema = z.object({
  code: z.string().min(2, "Kode mata pelajaran wajib diisi"),
  name: z.string().min(2, "Nama mata pelajaran wajib diisi"),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: {
            teachingModules: true,
            worksheets: true,
            assessments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ subjects });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/subjects error:", error);
    return NextResponse.json({ error: "Gagal memuat mata pelajaran" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = await request.json();
    const parsed = subjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data mata pelajaran tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.subject.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kode '${data.code}' sudah digunakan` },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE",
      entity: "Subject",
      entityId: subject.id,
      details: `Menambahkan mata pelajaran: ${subject.name} (${subject.code})`,
    });

    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/subjects error:", error);
    return NextResponse.json({ error: "Gagal membuat mata pelajaran" }, { status: 500 });
  }
}
