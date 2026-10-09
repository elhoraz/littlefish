import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");

    const where: any = {};
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (user.role === "PARENT" && user.parentId) {
      const parentStudents = await prisma.student.findMany({
        where: { parentId: user.parentId, classId: { not: null } },
        select: { classId: true },
      });
      const allowedClassIds = parentStudents.map((s) => s.classId as string);
      where.classId = { in: allowedClassIds };
    }

    const worksheets = await prisma.worksheet.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ worksheets });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/worksheets error:", error);
    return NextResponse.json({ error: "Gagal memuat lembar kerja" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const classId = formData.get("classId") as string;
    const subjectId = formData.get("subjectId") as string;
    const file = formData.get("file") as File | null;

    if (!title || !classId || !subjectId || !file) {
      return NextResponse.json(
        { error: "Judul, kelas, mata pelajaran, dan berkas file wajib diisi" },
        { status: 400 }
      );
    }

    // Verify class exists and tutor has authorization to upload to this class
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, tutorId: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }
    if (user.role === "TUTOR" && user.tutorId && cls.tutorId !== user.tutorId) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengunggah lembar kerja pada kelas ini" },
        { status: 403 }
      );
    }

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file melebihi batas maksimum (${MAX_FILE_SIZE / (1024 * 1024)}MB)` },
        { status: 400 }
      );
    }

    // 2. Validate MIME type
    const mimeType = file.type;
    const allowedExt = ALLOWED_MIME_TYPES[mimeType];
    if (!allowedExt) {
      return NextResponse.json(
        { error: "Format berkas tidak diizinkan. Hanya menerima PDF, JPG, PNG, DOC, DOCX" },
        { status: 400 }
      );
    }

    // 3. Generate safe unique filename to prevent path traversal
    const safeRandomKey = crypto.randomBytes(16).toString("hex");
    const sanitizedOriginal = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageFileName = `${Date.now()}_${safeRandomKey}${allowedExt}`;

    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, storageFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 4. Save metadata to database
    const worksheet = await prisma.worksheet.create({
      data: {
        title: title.trim(),
        description: description.trim() || null,
        fileName: sanitizedOriginal,
        fileKey: storageFileName,
        fileUrl: `/api/worksheets/download/${storageFileName}`,
        fileType: mimeType,
        fileSize: file.size,
        classId,
        subjectId,
        uploadedById: user.id,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "FILE_UPLOAD",
      entity: "Worksheet",
      entityId: worksheet.id,
      details: `Mengunggah lembar kerja: ${worksheet.title} (${worksheet.fileName}, ${(worksheet.fileSize / 1024).toFixed(1)} KB)`,
    });

    return NextResponse.json({ success: true, worksheet }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/worksheets error:", error);
    return NextResponse.json({ error: "Gagal mengunggah lembar kerja" }, { status: 500 });
  }
}
