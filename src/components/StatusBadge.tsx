import type { ReportStatus } from "@/lib/research/reportSchema";

const STYLES: Record<ReportStatus, string> = {
  running: "bg-amber-100 text-amber-800 border-amber-300",
  done: "bg-emerald-100 text-emerald-800 border-emerald-300",
  error: "bg-red-100 text-red-800 border-red-300",
};

const LABELS: Record<ReportStatus, string> = {
  running: "Researching…",
  done: "Ready",
  error: "Failed",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
