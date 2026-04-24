import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const token = await getToken({
    req,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      if (role === "TEACHER") return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
      return NextResponse.redirect(new URL("/student/dashboard", req.url));
    }
  }

  if (pathname.startsWith("/teacher")) {
    if (role !== "TEACHER") {
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      return NextResponse.redirect(new URL("/student/dashboard", req.url));
    }
  }

  if (pathname.startsWith("/student")) {
    if (role !== "STUDENT") {
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      if (role === "TEACHER") return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
    }
  }

  if (pathname.startsWith("/api/admin") && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (pathname.startsWith("/api/teacher") && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (pathname.startsWith("/api/student") && role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
