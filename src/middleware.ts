import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/session";

/**
 * Route protection. Middleware runs on the edge runtime where Node crypto isn't
 * available, so here we only do a cheap presence check: no session cookie at
 * all → redirect to /login. The cookie's SIGNATURE is fully verified server-
 * side (getSessionUserId) on the pages themselves, so a forged/tampered cookie
 * still can't access data — it just gets past this first gate and is rejected
 * at the page. This keeps middleware fast and the real check authoritative.
 */

// Paths reachable without a session.
const PUBLIC_PATHS = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  // Auth API routes must stay reachable so login/signup can work.
  const isAuthApi = pathname.startsWith("/api/auth/");

  const hasSession = Boolean(request.cookies.get(COOKIE_NAME)?.value);

  if (!hasSession && !isPublic && !isAuthApi) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in but visiting login/signup → send home.
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
