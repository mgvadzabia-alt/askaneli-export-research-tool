import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";

const MIN_PASSWORD_LENGTH = 8;
// Simple sanity check, not full RFC validation — just enough to catch typos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };

  // Rate-limit signups by IP, to slow down automated account-creation spam.
  const rateLimitKey = `signup:${getClientIp(request)}`;
  const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey);
  if (!allowed) {
    const retryAfterMinutes = Math.ceil((retryAfterMs ?? 0) / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Please try again in about ${retryAfterMinutes} minute(s).` },
      { status: 429 }
    );
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const result = await createUser(email, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  await createSession(result.user.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
