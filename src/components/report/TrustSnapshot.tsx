import type {
  MarketResearchReport,
  SectionConfidence,
} from "@/lib/research/reportSchema";

function countConfidence(sectionConfidence: SectionConfidence | undefined) {
  const counts = { high: 0, medium: 0, low: 0 };
  if (!sectionConfidence) return counts;
  for (const level of Object.values(sectionConfidence)) {
    if (level === "high") counts.high++;
    else if (level === "medium") counts.medium++;
    else if (level === "low") counts.low++;
  }
  return counts;
}

/**
 * At-a-glance trust summary shown at the top of the report (memo item A, plus
 * the dead-link warning from C). Confidence and link health are otherwise
 * scattered across every section and the sources list; this pulls the headline
 * signals — how many sources, how many hard-data, how many dead links, section
 * confidence spread — into one strip so the reader can gauge the whole report
 * before reading it.
 */
export function TrustSnapshot({ report }: { report: MarketResearchReport }) {
  const sources = report.sources ?? [];
  const totalSources = sources.length;
  const hardData = sources.filter((s) => s.natureFlag === "hard data").length;
  const deadLinks = sources.filter((s) => s.reachability === "unreachable").length;
  const confidence = countConfidence(report.sectionConfidence);

  const chips: { label: string; style: string }[] = [
    {
      label: `${totalSources} source${totalSources === 1 ? "" : "s"}`,
      style: "bg-neutral-100 text-neutral-700",
    },
    {
      label: `${hardData} hard-data`,
      style: "bg-emerald-100 text-emerald-800",
    },
  ];

  if (confidence.high || confidence.medium || confidence.low) {
    chips.push({
      label: `confidence: ${confidence.high} high · ${confidence.medium} med · ${confidence.low} low`,
      style: "bg-blue-100 text-blue-800",
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          At a glance
        </span>
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.style}`}
          >
            {chip.label}
          </span>
        ))}
      </div>

      {deadLinks > 0 && (
        <p className="mt-2 text-xs font-medium text-red-700">
          ⚠️ {deadLinks} source link{deadLinks === 1 ? "" : "s"} could not be reached — verify
          {deadLinks === 1 ? " it" : " them"} in the Sources list below before relying on
          {deadLinks === 1 ? " it" : " them"}.
        </p>
      )}
    </div>
  );
}
