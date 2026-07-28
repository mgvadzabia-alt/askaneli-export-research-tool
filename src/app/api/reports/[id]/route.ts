import { NextRequest, NextResponse } from "next/server";
import { deleteReport, getReportData, getReportEntry } from "@/lib/store";
import { requireApiUser } from "@/lib/auth/requireUser";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const entry = await getReportEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  const report = entry.status === "done" ? await getReportData(id) : null;
  return NextResponse.json({ entry, report });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiUser();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const removed = await deleteReport(id);
  if (!removed) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
