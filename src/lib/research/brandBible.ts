/**
 * Condensed Askaneli company reference, distilled from the full Brand Bible
 * (design/BRAND_BIBLE.md in the design repo). This is injected into every
 * research prompt so the model grounds "our visibility", competitor
 * exclusion, and pricing-comparison sections in real company facts instead
 * of guessing them from web search alone.
 *
 * Kept intentionally short: only the facts that change how a report should
 * be read (sub-brand ownership, current footprint, cost-basis pricing,
 * certification gaps) — not the full history/governance narrative, which
 * isn't relevant to a single market report.
 *
 * NOTE: this must be kept in sync by hand with design/BRAND_BIBLE.md
 * Sections 1-3 whenever that file changes (12-month reconfirmation cycle
 * plus any approved update — see AGENT_DESIGN.md).
 */

export const ASKANELI_CURRENT_EXPORT_MARKETS = [
  "Azerbaijan",
  "Brazil",
  "China",
  "Germany",
  "Japan",
  "South Korea",
  "Kazakhstan",
  "Thailand",
  "UK",
  "Ukraine",
  "USA",
  "Sweden",
  "Norway",
  "Latvia",
  "Lithuania",
  "Estonia",
  "Uzbekistan",
  "Turkmenistan",
  "Russia",
  "Malta",
  "Cyprus",
  "UAE",
  "Belarus",
  "Poland",
  "Israel",
];

export const ASKANELI_SUB_BRANDS = [
  "Anaseuli",
  "Dora",
  "Artwine",
  "Dear Wine",
  "Darejani",
  "Orveli",
  "Gocha",
  "Koshi",
  "Super Askana",
  "Iliko",
  "Galavani",
];

/** Determines whether a target country counts as an existing market (Growth Mode) or a new one (Penetration Mode). */
export function isExistingExportMarket(country: string): boolean {
  const normalized = country.trim().toLowerCase();
  return ASKANELI_CURRENT_EXPORT_MARKETS.some(
    (market) => market.toLowerCase() === normalized
  );
}

export function buildBrandBibleContext(country: string): string {
  const existingMarket = isExistingExportMarket(country);

  return `COMPANY REFERENCE — ASKANELI BROTHERS (read this before researching; treat
every fact below as known/confirmed, not something to re-derive from web
search):

- Founded 1998, Georgian wine/brandy/chacha producer, one of the three
  largest wine producers in Georgia, 10M+ bottles/year, own wineries and
  distilleries in Kakheti, Tbilisi, and Guria. ISO 22000 certified. Does
  NOT currently hold kosher or halal certification for any product.
- Catalog: ~39 wine SKUs across 7 lines (Classic Collection, Author's
  Collection, Author's Collection Qvevri, Author's Collection Sparkling,
  Gocha's Collection, Dear Wine, Dora Collection/Qvevri), plus ~19 spirits
  SKUs (chacha: Gold/Platinum/Premium; brandy: V.S through 25-Year
  Anniversary XO). PDO-protected wines in range: Akhasheni, Mukuzani,
  Tsinandali, Kindzmarauli, Khvanchkara, Manavi.
- Cost reference prices (FCA Tbilisi, Incoterms 2020, USD, 2026 price
  list — factory-gate cost, EXCLUDES freight/duty/excise/margin; this is
  NOT a retail price and must never be plotted or compared directly
  against a competitor's shelf price):
  Classic Collection wine $1.75-$2.90; Author's Collection wine
  $2.60-$30.00; Author's Collection Qvevri $3.20-$6.00; Author's
  Collection Sparkling $2.90-$6.50; Gocha's Collection $7.00-$10.00; Dear
  Wine $2.50-$2.90; Dora Collection (Qvevri) $5.50-$7.50; Chacha
  $2.25-$6.00; Brandy $1.40-$70.00.
- Own sub-brands/trademarks (may appear in-market with no obvious link to
  "Askaneli" — recognize these as ASKANELI-OWNED, never list them as a
  third-party competitor): ${ASKANELI_SUB_BRANDS.join(", ")}.
- Current export footprint (${ASKANELI_CURRENT_EXPORT_MARKETS.length}
  markets): ${ASKANELI_CURRENT_EXPORT_MARKETS.join(", ")}.
- Known on-file distributor relationships: ALCOPOINT (Azerbaijan,
  exclusive); MV Group / MVG Baltic (Latvia/Lithuania/Estonia). Treat
  these as confirmed if the target market is one of these three; do not
  re-research whether a distributor exists there, only whether public
  evidence adds detail to the relationship.

MODE FOR THIS REPORT: the target market "${country}" is ${
    existingMarket
      ? "an EXISTING Askaneli export market (\"Growth Mode\"). Research should focus on account growth, category share within a market where Askaneli already has some presence, and identifying where existing distribution can be deepened or expanded — not a from-zero entry plan. Actively search for Askaneli's current real in-market retail price, listings, and distributor performance rather than assuming zero presence."
      : "a market with NO current Askaneli export presence on file (\"Penetration Mode\"). Research should focus on a from-zero entry plan: which distributor to approach, what regulatory steps come first, and realistic timeline/investment to get initial listings."
  }

When filling "ourVisibility" (marketSizeStructure), "gainingShare" /
"positioningGaps" (competitiveLandscape), and "pricingBenchmarks": use the
company reference above as ground truth for what Askaneli owns and its cost
basis, but still search the web for Askaneli's actual in-market retail
presence, pricing, and any news — the cost reference above is a starting
point for sanity-checking findings, not a substitute for real market
research.`;
}
