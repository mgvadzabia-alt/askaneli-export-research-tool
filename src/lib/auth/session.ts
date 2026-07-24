import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Minimal signed-cookie sessions — no external auth library. The cookie holds
 * "<userId>.<hmac>", where the HMAC is over the userId with a server secret.
 * On each request we recompute the HMAC and constant-time compare, so a client
 * can't forge or tamper with their user id. The cookie is HTTP-only (JS can't
 * read it) and SameSite=Lax.
 */

const COOKIE_NAME = "askaneli_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Secret used to sign session cookies. Prefer AUTH_SECRET from the environment;
 * fall back to a fixed dev value so the tool runs out of the box locally. In a
 * real deployment AUTH_SECRET must be set (a leaked/default secret means forged
 * sessions).
 */
function getSecret(): string {
  return process.env.AUTH_SECRET ?? "askaneli-dev-secret-change-me";
}

function sign(userId: string): string {
  return createHmac("sha256", getSecret()).update(userId).digest("hex");
}

function verifySignature(userId: string, signature: string): boolean {
  const expected = sign(userId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Writes the session cookie for a user. */
export async function createSession(userId: string): Promise<void> {
  const value = `${userId}.${sign(userId)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clears the session cookie (sign-out). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Returns the authenticated user's id from a valid session cookie, or null.
 * Rejects any cookie whose signature doesn't verify.
 */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!verifySignature(userId, signature)) return null;
  return userId;
}

export { COOKIE_NAME };
