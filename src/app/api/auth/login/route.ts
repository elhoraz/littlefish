import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, setSessionCookie, SessionPayload } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format request tidak valid (wajib JSON)" },
        { status: 400 }
      );
    }
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        parent: true,
        tutor: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email atau kata sandi tidak sesuai" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun Anda berstatus non-aktif. Silakan hubungi Admin Littlefish." },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Email atau kata sandi tidak sesuai" },
        { status: 401 }
      );
    }

    const sessionPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionPayload["role"],
      tutorId: user.tutor?.id,
      parentId: user.parent?.id,
    };

    await setSessionCookie(sessionPayload);

    await logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "LOGIN",
      entity: "Auth",
      entityId: user.id,
      details: `User ${user.email} (${user.role}) berhasil masuk`,
    });

    let redirectUrl = "/";
    if (user.role === "ADMIN") redirectUrl = "/admin/dashboard";
    else if (user.role === "TUTOR") redirectUrl = "/tutor/dashboard";
    else if (user.role === "PARENT") redirectUrl = "/parent/dashboard";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server saat login" },
      { status: 500 }
    );
  }
}
