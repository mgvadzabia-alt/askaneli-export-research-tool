import { NextRequest, NextResponse } from "next/server";
import { findRecentReport } from "@/lib/store";
import { requireApiUser } from "@/lib/auth/requireUser";

/**
 * Before spending ~15 minutes generating a report, the form asks here whether
 * an identical, recent one already exists (memo rec #5: caching). We only
 * report a match; the user decides whether to open the cached report or
 * generate a fresh one. Bounded by age so we never offer stale research.
 */

// How recent a report must be to be offered as a cache hit. Market conditions
// drift, so keep this conservative.
const CACHE_MAX_AGE_DAYS = 30;

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser();
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { country, product, language, additionalInstructions } = (body ?? {}) as {
    country?: unknown;
    product?: unknown;
    language?: unknown;
    additionalInstructions?: unknown;
  };
  if (typeof country !== "string" || country.trim().length === 0) {
    return NextResponse.json({ error: "country is required" }, { status: 400 });
  }
  if (typeof product !== "string" || product.trim().length === 0) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }
  const reportLanguage: "en" | "ka" = language === "ka" ? "ka" : "en";
  const instructions =
    typeof additionalInstructions === "string" ? additionalInstructions : undefined;

  const match = await findRecentReport(
    country.trim(),
    product.trim(),
    reportLanguage,
    CACHE_MAX_AGE_DAYS,
    instructions
  );

  if (!match) {
    return NextResponse.json({ cached: false });
  }

  return NextResponse.json({
    cached: true,
    id: match.id,
    createdAt: match.createdAt,
  });
}
