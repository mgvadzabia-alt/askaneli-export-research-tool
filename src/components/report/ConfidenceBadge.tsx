import type { ConfidenceLevel } from "@/lib/research/reportSchema";

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; style: string; title: string }
> = {
  high: {
    label: "High confidence",
    style: "bg-emerald-100 text-emerald-800 border-emerald-300",
    title: "Backed by several independent hard-data sources.",
  },
  medium: {
    label: "Medium confidence",
    style: "bg-amber-100 text-amber-800 border-amber-300",
    title: "A mix of hard data and estimates, or a single strong source.",
  },
  low: {
    label: "Low confidence",
    style: "bg-red-100 text-red-800 border-red-300",
    title:
      "Thin evidence — mostly estimates or analysis. Double-check before relying on this section.",
  },
};

export function ConfidenceBadge({ level }: { level?: ConfidenceLevel }) {
  // Older reports (pre section-confidence) simply show no badge.
  if (!level) return null;
  const config = CONFIG[level];
  if (!config) return null;
  return (
    <span
      title={config.title}
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.style}`}
    >
      {config.label}
    </span>
  );
}
