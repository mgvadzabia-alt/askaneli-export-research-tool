import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./currentUser";
import type { PublicUser } from "./users";

/**
 * Authoritative auth gate for pages. Middleware (proxy.ts) only checks
 * whether *some* session cookie is present — a fast, cheap redirect for the
 * common case of "no cookie at all" — but it cannot verify the cookie's
 * signature (Edge runtime has no Node crypto). Without this check, a request
 * carrying ANY cookie value (even garbage) would sail past the middleware gate
 * and the page would render real data to an unauthenticated caller.
 *
 * Call this at the top of every protected server component page. Redirects to
 * /login if there's no valid, signature-verified session.
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Authoritative auth gate for API route handlers. Same rationale as
 * requireUser() above, but returns a 401 JSON response instead of redirecting
 * (an API caller doesn't get a browser redirect). Call at the top of every
 * protected route handler:
 *
 *   const authResult = await requireApiUser();
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult;
 */
export async function requireApiUser(): Promise<PublicUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return user;
}
