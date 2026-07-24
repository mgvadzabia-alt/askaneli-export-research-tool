import type { SourceNature } from "@/lib/research/reportSchema";

const STYLES: Record<SourceNature, string> = {
  "hard data": "bg-emerald-100 text-emerald-800 border-emerald-300",
  estimate: "bg-amber-100 text-amber-800 border-amber-300",
  "industry consensus": "bg-sky-100 text-sky-800 border-sky-300",
};

export function NatureBadge({ nature }: { nature: SourceNature }) {
  const style = STYLES[nature] ?? "bg-neutral-100 text-neutral-700 border-neutral-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {nature}
    </span>
  );
}
