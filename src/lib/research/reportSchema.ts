// Full shape of a generated export-market research report.
// Keep this in sync with the JSON schema embedded in buildPrompt.ts —
// the model is instructed to return exactly this shape.

export type SourceNature = "hard data" | "estimate" | "industry consensus";

export interface SourceEntry {
  label: string;
  url: string;
  date: string;
  natureFlag: SourceNature;
}

export interface PartnerCandidate {
  companyName: string;
  website: string;
  portfolioOverview: string;
  marketsChannels: string;
  estimatedSizeReach: string;
  publicContactRoute: string;
  fitRationale: string;
  rankLikelihood: string;
}

export interface NextAction {
  action: string;
  expectedImpact: string;
  timeline: string;
}

export interface MarketSizeTrendPoint {
  year: string;
  value: number;
  unit: string;
}

export interface CompetitorPricePoint {
  competitor: string;
  price: number;
  currency: string;
}

export interface ChannelMixPoint {
  channel: string;
  sharePercent: number;
}

export interface MarketSizeStructure {
  narrative: string;
  categorySizeVolume: string;
  categorySizeValue: string;
  growthRate: string;
  importVsDomesticShare: string;
  ourVisibility: string;
  keyCompetingOrigins: string;
}

export interface RegulatoryTrade {
  narrative: string;
  importDuties: string;
  exciseTax: string;
  labelingRules: string;
  certifications: string;
  advertisingRetailRestrictions: string;
}

export interface DistributionLandscape {
  narrative: string;
  keyRetailChains: string;
  traditionalTradeRelevance: string;
  horecaStructure: string;
  ecommercePenetration: string;
}

export interface ConsumerDemandTrends {
  narrative: string;
  consumptionPerCapita: string;
  priceSegmentPreferences: string;
  discoveryNaturalOrangeInterest: string;
  colorMix: string;
  occasionBasedConsumption: string;
}

export interface CompetitiveLandscape {
  narrative: string;
  gainingShare: string;
  pricingBenchmarks: string;
  positioningGaps: string;
}

export interface RouteToMarket {
  narrative: string;
  entryOptions: string;
  marginStructure: string;
  timelineInvestment: string;
}

export interface RisksBarriers {
  currency: string;
  logistics: string;
  seasonality: string;
  competition: string;
  culturalPerception: string;
}

export interface ReportCharts {
  marketSizeTrend: MarketSizeTrendPoint[];
  competitorPriceComparison: CompetitorPricePoint[];
  channelMix: ChannelMixPoint[];
}

export interface ReportMeta {
  country: string;
  product: string;
  generatedAt: string;
  model: string;
}

export interface MarketResearchReport {
  meta: ReportMeta;
  executiveSummary: string[];
  marketSizeStructure: MarketSizeStructure;
  regulatoryTrade: RegulatoryTrade;
  distributionLandscape: DistributionLandscape;
  consumerDemandTrends: ConsumerDemandTrends;
  competitiveLandscape: CompetitiveLandscape;
  routeToMarket: RouteToMarket;
  risksBarriers: RisksBarriers;
  partnerDiscovery: PartnerCandidate[];
  soWhat: NextAction[];
  sources: SourceEntry[];
  charts: ReportCharts;
}

/** History index entry — one per generated report, kept in /data/index.json */
export type ReportStatus = "running" | "done" | "error";

export interface ReportIndexEntry {
  id: string;
  country: string;
  product: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Structural validation of a parsed report object. Returns a list of problems;
 * empty list means the report is well-formed enough to store and render.
 */
export function validateReport(value: unknown): string[] {
  const problems: string[] = [];
  if (typeof value !== "object" || value === null) {
    return ["report is not an object"];
  }
  const r = value as Record<string, unknown>;

  const requireObject = (key: string) => {
    if (typeof r[key] !== "object" || r[key] === null) {
      problems.push(`missing or invalid "${key}" object`);
      return {} as Record<string, unknown>;
    }
    return r[key] as Record<string, unknown>;
  };
  const requireStringField = (obj: Record<string, unknown>, path: string) => {
    if (!isNonEmptyString(obj[path])) {
      problems.push(`missing or empty string field "${path}"`);
    }
  };

  const meta = requireObject("meta");
  requireStringField(meta, "country");
  requireStringField(meta, "product");
  requireStringField(meta, "generatedAt");

  if (!isStringArray(r.executiveSummary) || (r.executiveSummary as string[]).length === 0) {
    problems.push('missing or empty "executiveSummary" string array');
  }

  const marketSizeStructure = requireObject("marketSizeStructure");
  [
    "narrative",
    "categorySizeVolume",
    "categorySizeValue",
    "growthRate",
    "importVsDomesticShare",
    "ourVisibility",
    "keyCompetingOrigins",
  ].forEach((f) => requireStringField(marketSizeStructure, f));

  const regulatoryTrade = requireObject("regulatoryTrade");
  [
    "narrative",
    "importDuties",
    "exciseTax",
    "labelingRules",
    "certifications",
    "advertisingRetailRestrictions",
  ].forEach((f) => requireStringField(regulatoryTrade, f));

  const distributionLandscape = requireObject("distributionLandscape");
  [
    "narrative",
    "keyRetailChains",
    "traditionalTradeRelevance",
    "horecaStructure",
    "ecommercePenetration",
  ].forEach((f) => requireStringField(distributionLandscape, f));

  const consumerDemandTrends = requireObject("consumerDemandTrends");
  [
    "narrative",
    "consumptionPerCapita",
    "priceSegmentPreferences",
    "discoveryNaturalOrangeInterest",
    "colorMix",
    "occasionBasedConsumption",
  ].forEach((f) => requireStringField(consumerDemandTrends, f));

  const competitiveLandscape = requireObject("competitiveLandscape");
  ["narrative", "gainingShare", "pricingBenchmarks", "positioningGaps"].forEach((f) =>
    requireStringField(competitiveLandscape, f)
  );

  const routeToMarket = requireObject("routeToMarket");
  ["narrative", "entryOptions", "marginStructure", "timelineInvestment"].forEach((f) =>
    requireStringField(routeToMarket, f)
  );

  const risksBarriers = requireObject("risksBarriers");
  ["currency", "logistics", "seasonality", "competition", "culturalPerception"].forEach((f) =>
    requireStringField(risksBarriers, f)
  );

  if (!Array.isArray(r.partnerDiscovery)) {
    problems.push('missing "partnerDiscovery" array');
  }
  if (!Array.isArray(r.soWhat) || r.soWhat.length === 0) {
    problems.push('missing or empty "soWhat" array');
  }
  if (!Array.isArray(r.sources) || r.sources.length === 0) {
    problems.push('missing or empty "sources" array');
  }

  const charts = requireObject("charts");
  if (!Array.isArray(charts.marketSizeTrend)) {
    problems.push('missing "charts.marketSizeTrend" array');
  }
  if (!Array.isArray(charts.competitorPriceComparison)) {
    problems.push('missing "charts.competitorPriceComparison" array');
  }
  if (!Array.isArray(charts.channelMix)) {
    problems.push('missing "charts.channelMix" array');
  }

  return problems;
}
