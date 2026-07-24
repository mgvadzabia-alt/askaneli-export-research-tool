import type { TradeFlowSummary } from "@/lib/research/reportSchema";

function usd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function tonnes(kg: number): string {
  return `${(kg / 1000).toFixed(1)}t`;
}

/**
 * Prominent block for the official UN Comtrade trade-flow figures (memo item B).
 * This is the single most decisive, hard-fact data in the report — Georgia's
 * actual exports to this market — pulled straight from the API (not the model),
 * so it gets its own highlighted card at the top rather than being buried among
 * findings.
 */
export function TradeFlowBlock({ tradeFlow }: { tradeFlow?: TradeFlowSummary }) {
  if (!tradeFlow || tradeFlow.series.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-emerald-900">
          Official trade flow — Georgia → {tradeFlow.partnerName}
        </h2>
        <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          UN Comtrade · hard data
        </span>
      </div>
      <p className="mt-1 text-xs text-emerald-800">
        Actual recorded exports from official customs statistics — not an estimate.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {tradeFlow.series.map((s) => {
          const latest = s.points[s.points.length - 1];
          const first = s.points[0];
          const pct =
            s.points.length >= 2 && first.valueUsd > 0
              ? ((latest.valueUsd - first.valueUsd) / first.valueUsd) * 100
              : null;
          return (
            <div key={s.commodityLabel} className="rounded-lg border border-emerald-200 bg-white p-4">
              <h3 className="text-sm font-medium text-neutral-800">{s.commodityLabel}</h3>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {usd(latest.valueUsd)}
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  {tonnes(latest.netWeightKg)} · {latest.year}
                </span>
              </p>
              {pct !== null && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    pct >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% since {first.year}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                {s.points.map((p) => (
                  <span key={p.year}>
                    {p.year}: {usd(p.valueUsd)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <a
        href={tradeFlow.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs text-emerald-700 hover:underline print:hidden"
      >
        View source query on UN Comtrade →
      </a>
    </div>
  );
}
