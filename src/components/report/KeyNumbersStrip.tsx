import type { MarketResearchReport } from "@/lib/research/reportSchema";
import { CitedText } from "./CitedText";

/**
 * Headline market numbers as prominent cards under the executive summary (memo
 * item D). These figures — market size, growth, our visibility, pricing — are
 * the ones the reader most wants at a glance, but they otherwise sit inside the
 * dense field grids further down. This surfaces them up top. Citation markers
 * in the values stay clickable via CitedText.
 */
export function KeyNumbersStrip({ report }: { report: MarketResearchReport }) {
  const cards: { label: string; value: string }[] = [
    { label: "Category size (value)", value: report.marketSizeStructure.categorySizeValue },
    { label: "Growth rate", value: report.marketSizeStructure.growthRate },
    { label: "Our current visibility", value: report.marketSizeStructure.ourVisibility },
    { label: "Pricing benchmarks", value: report.competitiveLandscape.pricingBenchmarks },
  ];

  // Only show cards that actually have content (avoid empty/"not found" noise).
  const isMeaningful = (v: string) => {
    const t = v?.trim().toLowerCase() ?? "";
    return t.length > 0 && t !== "n/a" && t !== "not found" && t !== "unknown";
  };
  const visible = cards.filter((c) => isMeaningful(c.value));
  if (visible.length === 0) return null;

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {visible.map((card) => (
        <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {card.label}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-neutral-900">
            <CitedText text={card.value} />
          </p>
        </div>
      ))}
    </div>
  );
}
