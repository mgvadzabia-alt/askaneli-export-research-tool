import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Rate-limit by IP + the email being attempted, so a brute-force run against
  // one account can't be spread across many attempts even if retried quickly.
  const rateLimitKey = `login:${getClientIp(request)}:${email.trim().toLowerCase()}`;
  const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey);
  if (!allowed) {
    const retryAfterMinutes = Math.ceil((retryAfterMs ?? 0) / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Please try again in about ${retryAfterMinutes} minute(s).` },
      { status: 429 }
    );
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    // Deliberately generic: don't reveal whether the email exists.
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
