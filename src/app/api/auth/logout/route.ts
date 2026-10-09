import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await logAudit({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "LOGOUT",
        entity: "Auth",
        entityId: user.id,
        details: `User ${user.email} (${user.role}) logout`,
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Gagal logout" }, { status: 500 });
  }
}
