import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { fileKey } = await params;

    // Sanitize fileKey to prevent path traversal
    const safeFileKey = path.basename(fileKey);

    const worksheet = await prisma.worksheet.findFirst({
      where: { fileKey: safeFileKey },
      include: { class: true },
    });

    if (!worksheet) {
      return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });
    }

    // Role check: If parent, verify their child belongs to the class
    if (user.role === "PARENT" && user.parentId) {
      const parentHasChildInClass = await prisma.student.findFirst({
        where: { parentId: user.parentId, classId: worksheet.classId },
      });
      if (!parentHasChildInClass) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki akses ke berkas kelas ini" },
          { status: 403 }
        );
      }
    }

    const filePath = path.join(process.cwd(), "uploads", safeFileKey);

    try {
      const fileBuffer = await fs.readFile(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": worksheet.fileType,
          "Content-Disposition": `inline; filename="${worksheet.fileName}"`,
          "Content-Length": worksheet.fileSize.toString(),
        },
      });
    } catch {
      // In case of sample placeholder or missing file, return a mock PDF/text note
      return new NextResponse(`Berkas Lembar Kerja: ${worksheet.title}\nID: ${worksheet.id}`, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `inline; filename="${worksheet.fileName}.txt"`,
        },
      });
    }
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("Download error:", error);
    return NextResponse.json({ error: "Gagal mengunduh berkas" }, { status: 500 });
  }
}
