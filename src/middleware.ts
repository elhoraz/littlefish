import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "littlefish_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "littlefish-bimbel-secret-key-32-chars-minimum-security-2026"
);

interface SessionData {
  userId: string;
  role: "ADMIN" | "TUTOR" | "PARENT";
  name: string;
  email: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let session: SessionData | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload as unknown as SessionData;
    } catch {
      session = null;
    }
  }

  // Allow /login to always render cleanly without redirect loops
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Root redirect - allow page.tsx to verify user in database
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Protected Admin Routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      // Forbidden: redirect to their authorized role area
      if (session.role === "TUTOR") return NextResponse.redirect(new URL("/tutor/dashboard", request.url));
      if (session.role === "PARENT") return NextResponse.redirect(new URL("/parent/dashboard", request.url));
    }
  }

  // Protected Tutor Routes
  if (pathname.startsWith("/tutor")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "TUTOR" && session.role !== "ADMIN") {
      if (session.role === "PARENT") return NextResponse.redirect(new URL("/parent/dashboard", request.url));
    }
  }

  // Protected Parent Routes
  if (pathname.startsWith("/parent")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "PARENT" && session.role !== "ADMIN") {
      if (session.role === "TUTOR") return NextResponse.redirect(new URL("/tutor/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
