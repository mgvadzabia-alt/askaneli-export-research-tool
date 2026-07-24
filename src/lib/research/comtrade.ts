import type { ResearchFinding } from "./findingsSchema";
import type {
  TradeFlowSeries,
  TradeFlowSummary,
  TradeFlowYearPoint,
} from "./reportSchema";

/**
 * UN Comtrade integration (memo rec #3: "ground it in real trade-flow data,
 * not narrative estimates").
 *
 * For wine and spirits, official export-volume statistics — how much Georgian
 * wine/spirits actually flows into a given country and its trend — are the
 * single most decisive metric, and far more trustworthy than a web-search
 * "market is growing" narrative. This module pulls that hard data straight
 * from UN Comtrade's free public API and hands it to the research pass as
 * pre-verified findings, so the most important number is a fact rather than
 * something the model might stumble across.
 *
 * Everything here is best-effort: any network/parse failure returns an empty
 * result so a report still generates (just without the trade-flow findings)
 * rather than failing over a third-party outage or rate limit.
 */

// Georgia's UN M49 / Comtrade reporter code. We query Georgia as the REPORTER
// and the target market as the PARTNER, flow = export (X), to get "how much
// Georgia exported to <country>".
const GEORGIA_REPORTER_CODE = 268;

// HS commodity codes relevant to Askaneli's catalog.
const HS_WINE = "2204"; // Wine of fresh grapes
const HS_SPIRITS = "2208"; // Spirits, liqueurs (chacha, brandy)

const PARTNER_AREAS_URL =
  "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json";
const COMTRADE_PREVIEW_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

const FETCH_TIMEOUT_MS = 12000;
// The free preview endpoint accepts only ONE period per call and rate-limits
// aggressively (HTTP 429). We therefore query one year at a time and pause
// between calls; keep the year span small so a report isn't delayed too much.
const DELAY_BETWEEN_CALLS_MS = 1200;
const YEARS_TO_FETCH = 3;

interface PartnerArea {
  PartnerCode: number;
  text: string;
  PartnerCodeIsoAlpha2: string | null;
  PartnerCodeIsoAlpha3: string | null;
  isGroup: boolean;
}

interface ComtradeRecord {
  refYear: number;
  primaryValue: number | null;
  fobvalue: number | null;
  netWgt: number | null;
  qty: number | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches JSON, retrying once after a pause on an HTTP 429 (the preview
 * endpoint rate-limits aggressively). Returns null on any other failure.
 */
async function fetchJson<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (res.status === 429 && attempt === 0) {
        clearTimeout(timer);
        await delay(2500);
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// The partner-area reference list is ~300 entries and stable; cache it for the
// process lifetime so we don't re-download it on every report.
let partnerAreasCache: PartnerArea[] | null = null;

async function getPartnerAreas(): Promise<PartnerArea[]> {
  if (partnerAreasCache) return partnerAreasCache;
  const data = await fetchJson<{ results: PartnerArea[] }>(PARTNER_AREAS_URL);
  partnerAreasCache = data?.results ?? [];
  return partnerAreasCache;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Resolves a free-text country name (or ISO-2/ISO-3 code) to a Comtrade
 * partner code. Returns null if it can't be matched confidently — callers
 * treat that as "no trade data available" rather than guessing a wrong country.
 */
export async function resolvePartnerCode(
  country: string
): Promise<{ code: number; name: string } | null> {
  const areas = await getPartnerAreas();
  if (areas.length === 0) return null;

  const q = normalize(country);
  // Never match aggregate groups (e.g. "World", "EU-27") — we want a country.
  const countries = areas.filter((a) => !a.isGroup);

  // Exact match on name or ISO codes first.
  const exact = countries.find(
    (a) =>
      normalize(a.text) === q ||
      normalize(a.PartnerCodeIsoAlpha2 ?? "") === q ||
      normalize(a.PartnerCodeIsoAlpha3 ?? "") === q
  );
  if (exact) return { code: exact.PartnerCode, name: exact.text };

  // Fall back to a contains match, but only if it's unambiguous (exactly one
  // hit) so we don't silently pick the wrong country.
  const partial = countries.filter((a) => normalize(a.text).includes(q));
  if (partial.length === 1) {
    return { code: partial[0].PartnerCode, name: partial[0].text };
  }

  return null;
}

/** Builds the preview API URL for one commodity and ONE year (endpoint limit). */
function buildQueryUrl(partnerCode: number, cmdCode: string, year: number): string {
  const params = new URLSearchParams({
    reporterCode: String(GEORGIA_REPORTER_CODE),
    period: String(year),
    partnerCode: String(partnerCode),
    cmdCode,
    flowCode: "X",
    partner2Code: "0",
    customsCode: "C00",
    motCode: "0",
  });
  return `${COMTRADE_PREVIEW_BASE}?${params.toString()}`;
}

/** The last `count` complete calendar years (Comtrade annual data lags the current year). */
function recentYears(count: number): number[] {
  // Most recent full year of annual data is generally last year; go back further.
  const latest = new Date().getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => latest - i).reverse();
}

function usd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function tonnes(kg: number): string {
  return `${(kg / 1000).toFixed(1)} tonnes`;
}

/**
 * Turns Comtrade records for one commodity into human-readable findings: one
 * per year with the export value + weight, plus a trend finding if we have at
 * least two years. Every finding is tagged "hard data" and cites the Comtrade
 * query, since it comes directly from official statistics.
 */
/**
 * Collapses raw Comtrade records into one clean point per year. Comtrade can
 * return more than one record for the same year (sub-aggregations by quantity
 * unit / customs regime); we keep the one with the largest value, which is the
 * top-level aggregate, so we never double-count a year.
 */
function dedupeByYear(records: ComtradeRecord[]): TradeFlowYearPoint[] {
  const mapped = records
    .map((r) => ({
      year: r.refYear,
      valueUsd: r.primaryValue ?? r.fobvalue ?? 0,
      netWeightKg: r.netWgt ?? r.qty ?? 0,
    }))
    .filter((r) => r.year && (r.valueUsd > 0 || r.netWeightKg > 0));

  const byYear = new Map<number, TradeFlowYearPoint>();
  for (const r of mapped) {
    const existing = byYear.get(r.year);
    if (!existing || r.valueUsd > existing.valueUsd) byYear.set(r.year, r);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

function recordsToFindings(
  clean: TradeFlowYearPoint[],
  commodityLabel: string,
  partnerName: string,
  queryUrl: string
): Omit<ResearchFinding, "id">[] {
  if (clean.length === 0) return [];

  const findings: Omit<ResearchFinding, "id">[] = clean.map((r) => ({
    topic: "market size",
    claim: `Official UN Comtrade data: Georgia's ${commodityLabel} exports to ${partnerName} in ${r.year} were ${usd(r.valueUsd)} (${tonnes(r.netWeightKg)}).`,
    url: queryUrl,
    sourceLabel: "UN Comtrade (official trade statistics)",
    date: String(r.year),
    natureFlag: "hard data",
  }));

  // Add an explicit trend finding across the span.
  const first = clean[0];
  const last = clean[clean.length - 1];
  if (clean.length >= 2 && first.valueUsd > 0) {
    const pct = ((last.valueUsd - first.valueUsd) / first.valueUsd) * 100;
    const direction = pct >= 0 ? "up" : "down";
    findings.push({
      topic: "market size",
      claim: `Official UN Comtrade trend: Georgia's ${commodityLabel} exports to ${partnerName} went ${direction} ${Math.abs(pct).toFixed(0)}% from ${first.year} (${usd(first.valueUsd)}) to ${last.year} (${usd(last.valueUsd)}).`,
      url: queryUrl,
      sourceLabel: "UN Comtrade (official trade statistics)",
      date: String(last.year),
      natureFlag: "hard data",
    });
  }

  return findings;
}

export interface TradeFlowResult {
  /** Pre-verified "hard data" findings for the research pass to build on. */
  findings: Omit<ResearchFinding, "id">[];
  /** Structured summary for prominent display in the report UI, or null. */
  summary: TradeFlowSummary | null;
}

// Presentation labels (kept separate from the finding text which embeds the HS code).
const COMMODITIES: Array<{ code: string; findingLabel: string; displayLabel: string }> = [
  { code: HS_WINE, findingLabel: "wine (HS 2204)", displayLabel: "Wine (HS 2204)" },
  { code: HS_SPIRITS, findingLabel: "spirits/brandy (HS 2208)", displayLabel: "Spirits / brandy (HS 2208)" },
];

/**
 * Best-effort: fetches Georgia→country export data for wine and spirits from
 * UN Comtrade. Returns both pre-verified "hard data" findings (for the research
 * pass) and a structured summary (for prominent UI display). Never throws;
 * returns empty findings + null summary on any failure, unknown country, or
 * missing data.
 */
export async function fetchTradeFlow(country: string): Promise<TradeFlowResult> {
  const partner = await resolvePartnerCode(country);
  if (!partner) return { findings: [], summary: null };

  const years = recentYears(YEARS_TO_FETCH);
  const findings: Omit<ResearchFinding, "id">[] = [];
  const series: TradeFlowSeries[] = [];
  let summaryUrl = "";
  let firstCall = true;

  for (const commodity of COMMODITIES) {
    const records: ComtradeRecord[] = [];
    // Preview endpoint = one year per call, so loop the years and pace the
    // calls to stay under the rate limit.
    for (const year of years) {
      if (!firstCall) await delay(DELAY_BETWEEN_CALLS_MS);
      firstCall = false;
      const url = buildQueryUrl(partner.code, commodity.code, year);
      const data = await fetchJson<{ data: ComtradeRecord[] }>(url);
      if (data?.data && Array.isArray(data.data)) records.push(...data.data);
    }
    // Cite the most recent year's query as the canonical source link.
    const citationUrl = buildQueryUrl(partner.code, commodity.code, years[years.length - 1]);
    summaryUrl = citationUrl;

    const points = dedupeByYear(records);
    findings.push(
      ...recordsToFindings(points, commodity.findingLabel, partner.name, citationUrl)
    );
    if (points.length > 0) {
      series.push({ commodityLabel: commodity.displayLabel, points });
    }
  }

  const summary: TradeFlowSummary | null =
    series.length > 0
      ? { partnerName: partner.name, sourceUrl: summaryUrl, series }
      : null;

  return { findings, summary };
}
