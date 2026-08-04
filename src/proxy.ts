import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/week", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("family_session")?.value;
  const secret = process.env.SESSION_SECRET;

  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
      });
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/week/:path*", "/admin/:path*"],
};
