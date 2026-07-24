import { buildBrandBibleContext } from "./brandBible";

/**
 * Builds the single research prompt sent to Claude Code headless for a given
 * country + product. Every rule from brief.txt is baked in here, plus the
 * exact JSON schema the model must return.
 */

const JSON_SHAPE = `{
  "meta": { "country": string, "product": string, "generatedAt": ISO-8601 string, "model": string },
  "executiveSummary": [string, ...],
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
