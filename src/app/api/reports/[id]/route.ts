import { NextRequest, NextResponse } from "next/server";
import { getReportData, getReportEntry } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await getReportEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  const report = entry.status === "done" ? await getReportData(id) : null;
  return NextResponse.json({ entry, report });
}
