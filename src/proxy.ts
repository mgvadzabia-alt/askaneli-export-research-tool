import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/sessionConstants";

/**
 * Route protection. Runs on the edge runtime where Node crypto isn't
 * available, so here we only do a cheap presence check: no session cookie at
 * all → redirect to /login. The cookie's SIGNATURE is fully verified server-
 * side (getSessionUserId) on the pages themselves, so a forged/tampered cookie
 * still can't access data — it just gets past this first gate and is rejected
 * at the page. This keeps the proxy fast and the real check authoritative.
 */

// Paths reachable without a session.
const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
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

  // NOTE: deliberately no "already signed in → redirect away from /login" here.
  // `hasSession` is only a cookie-presence check, not a signature check (Edge
  // runtime has no Node crypto). A stale/invalid cookie (e.g. after an
  // AUTH_SECRET rotation) would count as "signed in" here but fail the
  // authoritative check on the home page, which redirects back to /login —
  // creating an infinite redirect loop between the two cheap/strict checks.
  // The equivalent "already signed in, skip the login form" convenience is
  // instead done authoritatively in the login/signup pages themselves.

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
