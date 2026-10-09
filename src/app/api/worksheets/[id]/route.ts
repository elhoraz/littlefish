import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

import crypto from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;

    const worksheet = await prisma.worksheet.findUnique({
      where: { id },
      include: { class: true, subject: true },
    });

    if (!worksheet) {
      return NextResponse.json({ error: "Lembar kerja tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (worksheet.class.tutorId !== user.tutorId && worksheet.uploadedById !== user.id) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengubah lembar kerja ini" },
          { status: 403 }
        );
      }
    }

    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let description: string | null = null;
    let newFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = (formData.get("title") as string)?.trim() || "";
      const rawDesc = (formData.get("description") as string)?.trim();
      description = rawDesc || null;
      const fileCandidate = formData.get("file");
      if (fileCandidate && typeof fileCandidate === "object" && "size" in fileCandidate && (fileCandidate as File).size > 0) {
        newFile = fileCandidate as File;
      }
    } else {
      const body = await request.json();
      title = body.title?.trim() || "";
      description = body.description?.trim() || null;
    }

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: "Judul lembar kerja minimal 2 karakter" },
        { status: 400 }
      );
    }

    let fileReplaced = false;
    let newFileName = worksheet.fileName;
    let newFileKey = worksheet.fileKey;
    let newFileUrl = worksheet.fileUrl;
    let newFileType = worksheet.fileType;
    let newFileSize = worksheet.fileSize;
    const oldFileKeyToDelete = worksheet.fileKey;

    if (newFile) {
      if (newFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Ukuran file melebihi batas maksimum (${MAX_FILE_SIZE / (1024 * 1024)}MB)` },
          { status: 400 }
        );
      }

      const mimeType = newFile.type;
      const allowedExt = ALLOWED_MIME_TYPES[mimeType];
      if (!allowedExt) {
        return NextResponse.json(
          { error: "Format berkas tidak diizinkan. Hanya menerima PDF, JPG, PNG, DOC, DOCX" },
          { status: 400 }
        );
      }

      const safeRandomKey = crypto.randomBytes(16).toString("hex");
      const sanitizedOriginal = path.basename(newFile.name).replace(/[^a-zA-Z0-9._-]/g, "_");
      const storageFileName = `${Date.now()}_${safeRandomKey}${allowedExt}`;

      const uploadDir = path.join(process.cwd(), "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, storageFileName);
      const bytes = await newFile.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(bytes));

      newFileName = sanitizedOriginal;
      newFileKey = storageFileName;
      newFileUrl = `/api/worksheets/download/${storageFileName}`;
      newFileType = mimeType;
      newFileSize = newFile.size;
      fileReplaced = true;
    }

    const isChanged =
      worksheet.title !== title ||
      (worksheet.description || "") !== (description || "") ||
      fileReplaced;

    if (!isChanged) {
      return NextResponse.json({ success: true, worksheet, noChanges: true });
    }

    const updated = await prisma.worksheet.update({
      where: { id },
      data: {
        title,
        description,
        fileName: newFileName,
        fileKey: newFileKey,
        fileUrl: newFileUrl,
        fileType: newFileType,
        fileSize: newFileSize,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    // Safely delete old file if replacement was saved
    if (fileReplaced && oldFileKeyToDelete && oldFileKeyToDelete !== newFileKey) {
      try {
        const safeOldKey = path.basename(oldFileKeyToDelete);
        const oldFilePath = path.join(process.cwd(), "uploads", safeOldKey);
        await fs.unlink(oldFilePath);
      } catch (err) {
        console.warn("Could not delete previous physical worksheet file:", err);
      }
    }

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE",
      entity: "Worksheet",
      entityId: id,
      details: `Memperbarui lembar kerja: ${updated.title} ${fileReplaced ? `(berkas diganti: ${newFileName})` : ""}`,
    });

    return NextResponse.json({ success: true, worksheet: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("PUT /api/worksheets/[id] error:", error);
    return NextResponse.json({ error: "Gagal memperbarui lembar kerja" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const { id } = await params;

    const worksheet = await prisma.worksheet.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!worksheet) {
      return NextResponse.json({ error: "Lembar kerja tidak ditemukan" }, { status: 404 });
    }

    if (user.role === "TUTOR" && user.tutorId) {
      if (worksheet.class.tutorId !== user.tutorId && worksheet.uploadedById !== user.id) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki wewenang untuk menghapus lembar kerja ini" },
          { status: 403 }
        );
      }
    }

    // Delete record from DB
    await prisma.worksheet.delete({
      where: { id },
    });

    // Try deleting physical file from uploads folder safely
    try {
      const safeFileKey = path.basename(worksheet.fileKey);
      const filePath = path.join(process.cwd(), "uploads", safeFileKey);
      await fs.unlink(filePath);
    } catch (err) {
      console.warn("Could not delete physical worksheet file from disk:", err);
    }

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "DELETE",
      entity: "Worksheet",
      entityId: id,
      details: `Menghapus lembar kerja: ${worksheet.title} (${worksheet.fileName})`,
    });

    return NextResponse.json({ success: true, message: "Lembar kerja berhasil dihapus" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("DELETE /api/worksheets/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus lembar kerja" }, { status: 500 });
  }
}
