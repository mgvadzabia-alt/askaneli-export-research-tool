import { buildBrandBibleContext } from "./brandBible";

/**
 * Builds the single research prompt sent to Claude Code headless for a given
 * country + product. Every rule from brief.txt is baked in here, plus the
 * exact JSON schema the model must return.
 */

const JSON_SHAPE = `{
  "meta": { "country": string, "product": string, "generatedAt": ISO-8601 string, "model": string },
  "executiveSummary": [string, ...],
  "gaps": [string, ...],
  "sectionConfidence": {
    "marketSizeStructure": "high" | "medium" | "low",
    "regulatoryTrade": "high" | "medium" | "low",
    "distributionLandscape": "high" | "medium" | "low",
    "consumerDemandTrends": "high" | "medium" | "low",
    "competitiveLandscape": "high" | "medium" | "low",
    "routeToMarket": "high" | "medium" | "low",
    "risksBarriers": "high" | "medium" | "low"
  },
  "marketSizeStructure": {
    "narrative": string,
    "categorySizeVolume": string,
    "categorySizeValue": string,
    "growthRate": string,
    "importVsDomesticShare": string,
    "ourVisibility": string,
    "keyCompetingOrigins": string
  },
  "regulatoryTrade": {
    "narrative": string,
    "importDuties": string,
    "exciseTax": string,
    "labelingRules": string,
    "certifications": string,
    "advertisingRetailRestrictions": string
  },
  "distributionLandscape": {
    "narrative": string,
    "keyRetailChains": string,
    "traditionalTradeRelevance": string,
    "horecaStructure": string,
    "ecommercePenetration": string
  },
  "consumerDemandTrends": {
    "narrative": string,
    "consumptionPerCapita": string,
    "priceSegmentPreferences": string,
    "discoveryNaturalOrangeInterest": string,
    "colorMix": string,
    "occasionBasedConsumption": string
  },
  "competitiveLandscape": {
    "narrative": string,
    "gainingShare": string,
    "pricingBenchmarks": string,
    "positioningGaps": string
  },
  "routeToMarket": {
    "narrative": string,
    "entryOptions": string,
    "marginStructure": string,
    "timelineInvestment": string
  },
  "risksBarriers": {
    "currency": string,
    "logistics": string,
    "seasonality": string,
    "competition": string,
    "culturalPerception": string
  },
  "partnerDiscovery": [
    {
      "companyName": string,
      "website": string,
      "portfolioOverview": string,
      "marketsChannels": string,
      "estimatedSizeReach": string,
      "publicContactRoute": string,
      "fitRationale": string,
      "rankLikelihood": string
    }
  ],
  "soWhat": [
    { "action": string, "expectedImpact": string, "timeline": string }
  ],
  "sources": [
    { "label": string, "url": string, "date": string, "natureFlag": "hard data" | "estimate" | "industry consensus" }
  ],
  "charts": {
    "marketSizeTrend": [ { "year": string, "value": number, "unit": string } ],
    "competitorPriceComparison": [ { "competitor": string, "price": number, "currency": string } ],
    "channelMix": [ { "channel": string, "sharePercent": number } ]
  }
}`;

export function buildResearchPrompt(country: string, product: string): string {
  return `You are a senior export-market research analyst producing a commercial due-diligence
report for Askaneli Brothers, a Georgian wine and spirits producer, ahead of a potential
export push. Research the market for the following, using web search:

- Target country/market: ${country}
- Product/SKU: ${product} (a Georgian wine or spirits product)

${buildBrandBibleContext(country)}

RESEARCH RULES (must follow all of these):
1. Never fabricate statistics. If exact data is not available, give a clearly-labeled
   reasoned estimate instead of inventing a number.
2. Always distinguish facts vs. industry consensus vs. your own analysis — every field
   should make it obvious which of these it is.
3. Always cite where a number came from and its date, in the "sources" list. Every
   numeric claim in the report should map to an entry in "sources".
4. Prioritize, in this order of trust: official trade/customs data; industry reports
   (IWSR, OIV, Wine Intelligence, Euromonitor); retailer/distributor public data; recent
   news (last 12 months); Georgian export data (National Wine Agency of Georgia, Geostat).
5. Write for a commercial/executive audience: concise, concrete, no filler. Every claim
   should be actionable or quantified.
6. Keep currency/units consistent and explicit: state EUR or USD explicitly on every
   price, and state whether volumes are in bottles (0.75L) or 9-litre cases.
7. For partner discovery: only list distributor/importer candidates you can find public
   evidence for. Never invent a contact. If no verifiable contact route exists for a
   candidate, say so explicitly in "publicContactRoute" rather than guessing.
8. If, after genuine research effort, a whole section has no usable data (e.g. a very
   small or unusual market), say so plainly in that section's narrative instead of
   inventing content.
9. Never list one of Askaneli's own sub-brands (see COMPANY REFERENCE above) as a
   third-party competitor — recognize them as Askaneli-owned even if they appear
   in-market without an obvious link to the "Askaneli" name.
10. Never plot or state Askaneli's FCA cost-reference price (see COMPANY REFERENCE
    above) as if it were a retail/shelf price. If Askaneli's real in-market retail
    price cannot be found, report it as not found rather than deriving it from the
    cost reference.

REPORT SECTIONS (the JSON keys below map 1:1 to these, in this order):
- Executive summary: 3-5 bullet points, single most important takeaway first.
- Market size & structure: category size (volume & value), growth rate, import vs.
  domestic share, our current visibility, key competing origins.
- Regulatory & trade requirements: import duties, excise tax, labeling rules,
  certifications, advertising/retail restrictions.
- Distribution landscape: key retail chains and market share, Traditional Trade
  relevance, HoReCa structure, e-commerce penetration.
- Consumer & demand trends: consumption per capita and direction, price segment
  preferences, interest in discovery/natural/orange wine, red/white/rosé/sparkling
  mix, occasion-based consumption.
- Competitive landscape: which countries/brands are gaining share, pricing
  benchmarks, positioning gaps.
- Route to market & entry strategy: realistic entry options, margin structure,
  timeline/investment to build listings.
- Risks & barriers: currency, logistics, seasonality, competition, cultural/
  perception barriers.
- Partner discovery: potential distributor/importer candidates who already handle
  wine/spirits in that market.
- "So what": 3-5 concrete recommended next actions, each with expected impact and
  rough timeline.
- Sources: every figure's source and date, flagged as "hard data", "estimate", or
  "industry consensus".
- Charts: market size trend over time, competitor price comparison, and channel mix
  (Modern Trade / Traditional Trade / HoReCa / e-commerce), as structured data points.

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object, matching exactly this shape (all fields are
required; use empty arrays/short "not verifiable" strings rather than omitting a
field; do not add extra top-level keys; do not wrap it in markdown code fences; do
not include any prose, explanation, or preamble before or after the JSON):

${JSON_SHAPE}

Set "meta.generatedAt" to the current date/time in ISO-8601 format, "meta.country" to
"${country}", "meta.product" to "${product}", and "meta.model" to the name of the model
you are running as.`;
}

export const JSON_ONLY_REMINDER =
  "\n\nREMINDER: your previous response could not be parsed as JSON. Return ONLY the raw JSON object described above — no markdown code fences, no commentary, no text before or after the JSON.";

// ---------------------------------------------------------------------------
// Two-pass pipeline (memo recommendation #1: split research from writing).
// Pass 1 (research) does all the web searching and produces a flat, numbered
// batch of findings — each tied to one source — but writes no report prose.
// Pass 2 (writing) receives ONLY that batch and composes the report from it,
// so nothing in the final report can exist without a finding behind it.
// ---------------------------------------------------------------------------

const FINDINGS_SHAPE = `{
  "findings": [
    {
      "topic": string,          // which report area this informs, e.g. "market size", "regulation", "distribution", "competitors", "consumer", "route to market", "risks", "partners"
      "claim": string,          // one concrete, self-contained fact or figure
      "url": string,            // the source URL this came from ("" only if genuinely none)
      "sourceLabel": string,    // publication / site / dataset name
      "date": string,           // source date, or "unknown"
      "natureFlag": "hard data" | "estimate" | "industry consensus"
    }
  ],
  "gaps": [ string ]            // topics you genuinely could not find usable data for
}`;

/**
 * Pass 1 — RESEARCH ONLY. The model searches the web and records what it
 * actually found as discrete, source-tagged findings. It is explicitly told
 * NOT to write a report yet, and NOT to include any claim it cannot attribute
 * to a real search result.
 */
export function buildResearchPass(country: string, product: string): string {
  return `You are a senior export-market research analyst gathering evidence for a
commercial due-diligence report for Askaneli Brothers, a Georgian wine and
spirits producer considering exporting to a market. Your ONLY job in this step
is RESEARCH — do NOT write a report, narrative, or summary yet.

- Target country/market: ${country}
- Product/SKU: ${product} (a Georgian wine or spirits product)

${buildBrandBibleContext(country)}

Use web search extensively. For every relevant fact you find, record it as a
separate finding tied to the single source it came from. Cover these topics:
market size & structure, regulatory & trade requirements (duties, excise,
labeling, certifications, ad/retail restrictions), distribution landscape
(retail chains, traditional trade, HoReCa, e-commerce), consumer & demand
trends, competitive landscape (who's gaining share, pricing benchmarks,
positioning gaps), route to market, risks & barriers, and potential
distributor/importer partners.

RESEARCH RULES:
1. Every finding MUST come from a real search result you actually saw. Never
   invent a fact, a number, a URL, or a distributor contact. If you cannot
   attribute a claim to a source, do not record it.
2. Prioritize, in this order of trust: official trade/customs data; industry
   reports (IWSR, OIV, Wine Intelligence, Euromonitor); retailer/distributor
   public data; recent news (last 12 months); Georgian export data (National
   Wine Agency of Georgia, Geostat).
3. Tag each finding honestly as "hard data", "estimate", or "industry
   consensus" — do not label an estimate as hard data.
4. Keep currency/units explicit inside the claim text (state EUR or USD; state
   bottles (0.75L) vs 9-litre cases).
5. Never record one of Askaneli's own sub-brands (see COMPANY REFERENCE above)
   as a third-party competitor.
6. Never record Askaneli's FCA cost-reference price as if it were a retail
   price.
7. For any topic where genuine searching turns up nothing usable, add it to
   "gaps" instead of inventing a plausible-sounding finding.

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object of this exact shape (no markdown fences,
no prose before or after):

${FINDINGS_SHAPE}`;
}

export const FINDINGS_JSON_ONLY_REMINDER =
  "\n\nREMINDER: return ONLY the raw findings JSON object described above — no markdown code fences, no commentary, no report prose, nothing before or after the JSON.";

/**
 * Pass 2 — WRITING ONLY. The model receives the findings batch as its sole
 * evidence and composes the structured report from it. It has no web access
 * in this pass, so it physically cannot introduce an unsourced fact; it is
 * told to cite findings by id and to leave sections honest when the findings
 * don't cover them.
 */
export function buildWritingPass(
  country: string,
  product: string,
  findingsJson: string
): string {
  return `You are a senior export-market research analyst writing the final
due-diligence report for Askaneli Brothers (Georgian wine and spirits) on the
market below. You did the research in a previous step; the findings from that
step are provided as your ONLY source of facts.

- Target country/market: ${country}
- Product/SKU: ${product}

RESEARCH FINDINGS (your only evidence — each has a numeric "id"):
${findingsJson}

WRITING RULES:
1. Use ONLY the findings above as factual input. You have no web access now.
   Do NOT introduce any statistic, price, company, or claim that is not
   supported by a finding. Analysis and synthesis of the findings is fine and
   expected — inventing new facts is not.
2. First build the "sources" array from the DISTINCT sources referenced by
   your findings — label, url, date, natureFlag — deduplicated by URL. The
   ORDER of this array defines citation numbers: the first source is [1], the
   second [2], and so on.
3. Then, for every specific number or factual claim you write, append an
   inline citation marker in square brackets referencing that claim's
   position(s) in the "sources" array you just built — NOT the finding id.
   E.g. if the claim's source is the 3rd entry in "sources", write
   "category grew ~6% in 2024 [3]"; multiple sources: "[3][7]". A sentence
   with no marker signals it is your own analysis, not a sourced fact. Every
   marker number MUST be a valid 1-based index into "sources".
4. Where the findings genuinely don't cover a section (see the "gaps" list and
   any topic with no findings), say so plainly in that section's narrative
   ("no reliable distributor data was found for this market") rather than
   filling it with a plausible-sounding guess.
5. Keep it concise and executive: lead with the most decisive point.
6. For each of the seven analytical sections, set "sectionConfidence" honestly
   based on the findings behind it: "high" = backed by several independent
   hard-data findings; "medium" = a mix of hard data and estimates, or a
   single strong source; "low" = thin evidence, mostly estimates/industry
   consensus, or largely your own analysis. Carry the research pass's "gaps"
   list through into the report's "gaps" field.

REPORT SECTIONS (the JSON keys map 1:1 to these):
- Executive summary: 3-5 bullets, most important takeaway first.
- Market size & structure; Regulatory & trade; Distribution landscape;
  Consumer & demand trends; Competitive landscape; Route to market;
  Risks & barriers; Partner discovery; "So what" next actions; Sources; Charts.

OUTPUT FORMAT — CRITICAL:
Return ONLY a single valid JSON object matching exactly this shape (all fields
required; use empty arrays / short "not found" strings rather than omitting a
field; no markdown code fences; no prose before or after the JSON):

${JSON_SHAPE}

Set "meta.generatedAt" to the current date/time in ISO-8601, "meta.country" to
"${country}", "meta.product" to "${product}", and "meta.model" to the name of the
model you are running as.`;
}
