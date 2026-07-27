import Link from "next/link";
import { getReportData, getReportEntry } from "@/lib/store";
import { formatCountryDisplay, formatDateTime } from "@/lib/format";
import type { MarketResearchReport, ReportIndexEntry } from "@/lib/research/reportSchema";

export const dynamic = "force-dynamic";

const MAX_COMPARE = 4;

interface ComparedReport {
  entry: ReportIndexEntry;
  report: MarketResearchReport;
}

function usd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/** A row in the comparison grid: a label plus how to read the value off one report. */
interface CompareRow {
  label: string;
  value: (r: MarketResearchReport) => string;
}

const ROWS: CompareRow[] = [
  { label: "Category size (value)", value: (r) => r.marketSizeStructure.categorySizeValue || "—" },
  { label: "Category size (volume)", value: (r) => r.marketSizeStructure.categorySizeVolume || "—" },
  { label: "Growth rate", value: (r) => r.marketSizeStructure.growthRate || "—" },
  { label: "Import vs domestic share", value: (r) => r.marketSizeStructure.importVsDomesticShare || "—" },
  { label: "Our current visibility", value: (r) => r.marketSizeStructure.ourVisibility || "—" },
  { label: "Key competing origins", value: (r) => r.marketSizeStructure.keyCompetingOrigins || "—" },
  { label: "Pricing benchmarks", value: (r) => r.competitiveLandscape.pricingBenchmarks || "—" },
  { label: "Who's gaining share", value: (r) => r.competitiveLandscape.gainingShare || "—" },
  { label: "Import duties", value: (r) => r.regulatoryTrade.importDuties || "—" },
  { label: "Excise tax", value: (r) => r.regulatoryTrade.exciseTax || "—" },
  {
    label: "Official trade data (latest)",
    value: (r) => {
      if (!r.tradeFlow || r.tradeFlow.series.length === 0) return "Not available";
      return r.tradeFlow.series
        .map((s) => {
          const latest = s.points[s.points.length - 1];
          return latest ? `${s.commodityLabel}: ${usd(latest.valueUsd)} (${latest.year})` : null;
        })
        .filter(Boolean)
        .join(" · ");
    },
  },
  {
    label: "Sources / hard data",
    value: (r) => {
      const total = r.sources?.length ?? 0;
      const hard = r.sources?.filter((s) => s.natureFlag === "hard data").length ?? 0;
      return `${total} sources · ${hard} hard-data`;
    },
  },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  if (ids.length < 2) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Back to history
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
          Compare reports
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          Select 2 to {MAX_COMPARE} completed reports from the history list to compare them
          side by side.
        </p>
      </main>
    );
  }

  const loaded = await Promise.all(
    ids.map(async (id) => {
      const entry = await getReportEntry(id);
      if (!entry) return { id, missing: true as const };
      if (entry.status !== "done") return { id, entry, notDone: true as const };
      const report = await getReportData(id);
      if (!report) return { id, entry, missing: true as const };
      return { id, entry, report } satisfies ComparedReport & { id: string };
    })
  );

  const compared = loaded.filter(
    (r): r is { id: string } & ComparedReport => "report" in r && r.report !== undefined
  );
  const unavailable = loaded.filter((r) => !("report" in r));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back to history
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
        Compare reports
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Side-by-side view of {compared.length} report{compared.length === 1 ? "" : "s"}. Values are
        copied as-is from each report — differing units/currencies mean a market-by-market read,
        not a strict ranking.
      </p>

      {unavailable.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {unavailable.length} selected report{unavailable.length === 1 ? " isn't" : "s aren't"}{" "}
          available for comparison (not found, or not finished generating yet).
        </div>
      )}

      {compared.length < 2 ? (
        <p className="mt-6 text-sm text-neutral-600">
          At least 2 completed reports are needed to compare. Go back and select more.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="sticky left-0 bg-neutral-50 px-4 py-3 font-medium">Metric</th>
                {compared.map(({ id, entry }) => (
                  <th key={id} className="px-4 py-3 font-medium text-neutral-900">
                    <Link href={`/reports/${id}`} className="hover:underline">
                      {formatCountryDisplay(entry.country)}
                    </Link>
                    <div className="text-xs font-normal text-neutral-500">{entry.product}</div>
                    <div className="mt-0.5 text-xs font-normal text-neutral-400">
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="sticky left-0 bg-white px-4 py-3 font-medium text-neutral-700">
                    {row.label}
                  </td>
                  {compared.map(({ id, report }) => (
                    <td key={id} className="max-w-xs px-4 py-3 align-top text-neutral-700">
                      {row.value(report)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
