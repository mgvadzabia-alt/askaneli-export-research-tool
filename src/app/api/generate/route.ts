import { NextRequest, NextResponse } from "next/server";
import { createRunningReport, markReportDone, markReportError } from "@/lib/store";
import { generateResearchReport, HeadlessClaudeError } from "@/lib/research/runClaudeHeadless";
import { verifyReportSources } from "@/lib/research/verifySources";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { country, product } = (body ?? {}) as { country?: unknown; product?: unknown };
  if (typeof country !== "string" || country.trim().length === 0) {
    return NextResponse.json({ error: "country is required" }, { status: 400 });
  }
  if (typeof product !== "string" || product.trim().length === 0) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const trimmedCountry = country.trim();
  const trimmedProduct = product.trim();
  const id = await createRunningReport(trimmedCountry, trimmedProduct);

  // Fire-and-forget: the research call can take several minutes, so we return
  // the report id immediately and let the client poll the report page while
  // this continues in the background, updating the status file when done.
  generateResearchReport(trimmedCountry, trimmedProduct)
    .then((report) => verifyReportSources(report))
    .then((report) => markReportDone(id, report))
    .catch((err) => {
      const message =
        err instanceof HeadlessClaudeError || err instanceof Error
          ? err.message
          : "Unknown error while generating the report";
      return markReportError(id, message);
    });

  return NextResponse.json({ id }, { status: 202 });
}
