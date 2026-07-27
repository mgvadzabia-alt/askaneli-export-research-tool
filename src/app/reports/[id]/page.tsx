import Link from "next/link";
import { notFound } from "next/navigation";
import { getReportData, getReportEntry } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCountryDisplay, formatDateTime } from "@/lib/format";
import { ReportPoller } from "@/components/report/ReportPoller";
import { RetryButton } from "@/components/report/RetryButton";
import { Section, Narrative, FieldGrid } from "@/components/report/Section";
import { NatureBadge } from "@/components/report/NatureBadge";
import { ReachabilityBadge } from "@/components/report/ReachabilityBadge";
import { ConfidenceBadge } from "@/components/report/ConfidenceBadge";
import { RecommendationsSection } from "@/components/report/RecommendationsSection";
import { ReportAgeBadge } from "@/components/report/ReportAgeBadge";
import { DownloadPdfButton } from "@/components/report/DownloadPdfButton";
import { TrustSnapshot } from "@/components/report/TrustSnapshot";
import { TradeFlowBlock } from "@/components/report/TradeFlowBlock";
import { KeyNumbersStrip } from "@/components/report/KeyNumbersStrip";
import {
  ChannelMixChart,
  CompetitorPriceChart,
  MarketSizeTrendChart,
} from "@/components/report/Charts";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getReportEntry(id);
  if (!entry) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-neutral-500 hover:underline print:hidden">
            ← Back to history
          </Link>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-neutral-900">
            {formatCountryDisplay(entry.country)} — {entry.product}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Requested {formatDateTime(entry.createdAt)}
            {entry.createdBy && <> by {entry.createdBy.email}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {entry.status === "done" && <DownloadPdfButton />}
          <StatusBadge status={entry.status} />
        </div>
      </div>

      {entry.status === "running" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-medium">Researching your report — this typically takes 10-15 minutes.</p>
          <p className="mt-1 text-amber-800">
            The tool researches the market first (collecting source-tagged findings), then writes
            the report from those findings only. This page will update itself automatically once
            the report is ready — you can safely leave and come back from the history list later.
          </p>
          <ReportPoller id={id} />
        </div>
      )}

      {entry.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <p className="font-medium">Report generation failed.</p>
          <p className="mt-1 whitespace-pre-wrap text-red-800">{entry.errorMessage}</p>
          <RetryButton country={entry.country} product={entry.product} language={entry.language} />
        </div>
      )}

      {entry.status === "done" && <ReportBody id={id} researchedAt={entry.createdAt} />}
    </main>
  );
}

async function ReportBody({ id, researchedAt }: { id: string; researchedAt: string }) {
  const report = await getReportData(id);
  if (!report) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        Report data is missing even though it was marked done. Please try generating it again.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        {/* Use the server-recorded request time, not report.meta.generatedAt,
            which the model fills in and could get wrong. */}
        <ReportAgeBadge generatedAt={researchedAt} />
      </div>

      {/* At-a-glance trust + official trade data, surfaced above the report body. */}
      <TrustSnapshot report={report} />
      <TradeFlowBlock tradeFlow={report.tradeFlow} />

      <Section title="Executive summary">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
          {report.executiveSummary.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </Section>

      {/* Headline market numbers, pulled up from the dense grids below. */}
      <KeyNumbersStrip report={report} />

      <RecommendationsSection actions={report.soWhat} />

      {report.gaps && report.gaps.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">
            Research gaps — no reliable data found
          </h2>
          <p className="mt-1 text-xs text-amber-800">
            These topics could not be backed by a usable source, so they were left
            unfilled rather than estimated. Treat them as open questions to verify
            manually.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {report.gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      <Section
        title="Market size & structure"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.marketSizeStructure} />}
      >
        <Narrative text={report.marketSizeStructure.narrative} />
        <FieldGrid
          fields={[
            { label: "Category size (volume)", value: report.marketSizeStructure.categorySizeVolume },
            { label: "Category size (value)", value: report.marketSizeStructure.categorySizeValue },
            { label: "Growth rate", value: report.marketSizeStructure.growthRate },
            { label: "Import vs. domestic share", value: report.marketSizeStructure.importVsDomesticShare },
            { label: "Our current visibility", value: report.marketSizeStructure.ourVisibility },
            { label: "Key competing origins", value: report.marketSizeStructure.keyCompetingOrigins },
          ]}
        />
        <div className="mt-6">
          <h3 className="text-sm font-medium text-neutral-700">Market size trend over time</h3>
          <MarketSizeTrendChart data={report.charts.marketSizeTrend} />
        </div>
      </Section>

      <Section
        title="Regulatory & trade requirements"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.regulatoryTrade} />}
      >
        <Narrative text={report.regulatoryTrade.narrative} />
        <FieldGrid
          fields={[
            { label: "Import duties", value: report.regulatoryTrade.importDuties },
            { label: "Excise tax", value: report.regulatoryTrade.exciseTax },
            { label: "Labeling rules", value: report.regulatoryTrade.labelingRules },
            { label: "Certifications", value: report.regulatoryTrade.certifications },
            {
              label: "Advertising / retail restrictions",
              value: report.regulatoryTrade.advertisingRetailRestrictions,
            },
          ]}
        />
      </Section>

      <Section
        title="Distribution landscape"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.distributionLandscape} />}
      >
        <Narrative text={report.distributionLandscape.narrative} />
        <FieldGrid
          fields={[
            { label: "Key retail chains", value: report.distributionLandscape.keyRetailChains },
            {
              label: "Traditional Trade relevance",
              value: report.distributionLandscape.traditionalTradeRelevance,
            },
            { label: "HoReCa structure", value: report.distributionLandscape.horecaStructure },
            {
              label: "E-commerce penetration",
              value: report.distributionLandscape.ecommercePenetration,
            },
          ]}
        />
        <div className="mt-6">
          <h3 className="text-sm font-medium text-neutral-700">
            Channel mix (Modern Trade / Traditional Trade / HoReCa / e-commerce)
          </h3>
          <ChannelMixChart data={report.charts.channelMix} />
        </div>
      </Section>

      <Section
        title="Consumer & demand trends"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.consumerDemandTrends} />}
      >
        <Narrative text={report.consumerDemandTrends.narrative} />
        <FieldGrid
          fields={[
            {
              label: "Consumption per capita",
              value: report.consumerDemandTrends.consumptionPerCapita,
            },
            {
              label: "Price segment preferences",
              value: report.consumerDemandTrends.priceSegmentPreferences,
            },
            {
              label: "Discovery / natural / orange wine interest",
              value: report.consumerDemandTrends.discoveryNaturalOrangeInterest,
            },
            { label: "Red / white / rosé / sparkling mix", value: report.consumerDemandTrends.colorMix },
            {
              label: "Occasion-based consumption",
              value: report.consumerDemandTrends.occasionBasedConsumption,
            },
          ]}
        />
      </Section>

      <Section
        title="Competitive landscape"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.competitiveLandscape} />}
      >
        <Narrative text={report.competitiveLandscape.narrative} />
        <FieldGrid
          fields={[
            { label: "Gaining share", value: report.competitiveLandscape.gainingShare },
            { label: "Pricing benchmarks", value: report.competitiveLandscape.pricingBenchmarks },
            { label: "Positioning gaps", value: report.competitiveLandscape.positioningGaps },
          ]}
        />
        <div className="mt-6">
          <h3 className="text-sm font-medium text-neutral-700">Competitor price comparison</h3>
          <CompetitorPriceChart data={report.charts.competitorPriceComparison} />
        </div>
      </Section>

      <Section
        title="Route to market & entry strategy"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.routeToMarket} />}
      >
        <Narrative text={report.routeToMarket.narrative} />
        <FieldGrid
          fields={[
            { label: "Entry options", value: report.routeToMarket.entryOptions },
            { label: "Margin structure", value: report.routeToMarket.marginStructure },
            { label: "Timeline / investment", value: report.routeToMarket.timelineInvestment },
          ]}
        />
      </Section>

      <Section
        title="Risks & barriers"
        headerRight={<ConfidenceBadge level={report.sectionConfidence?.risksBarriers} />}
      >
        <FieldGrid
          fields={[
            { label: "Currency", value: report.risksBarriers.currency },
            { label: "Logistics", value: report.risksBarriers.logistics },
            { label: "Seasonality", value: report.risksBarriers.seasonality },
            { label: "Competition", value: report.risksBarriers.competition },
            { label: "Cultural / perception", value: report.risksBarriers.culturalPerception },
          ]}
        />
      </Section>

      <Section title="Partner discovery">
        {report.partnerDiscovery.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No verifiable distributor/importer candidates were found for this market.
          </p>
        ) : (
          <div className="space-y-4">
            {report.partnerDiscovery.map((partner, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-neutral-900">{partner.companyName}</h3>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Likelihood: {partner.rankLikelihood}
                  </span>
                </div>
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:underline"
                  >
                    {partner.website}
                  </a>
                )}
                <FieldGrid
                  fields={[
                    { label: "Portfolio overview", value: partner.portfolioOverview },
                    { label: "Markets / channels", value: partner.marketsChannels },
                    { label: "Estimated size / reach", value: partner.estimatedSizeReach },
                    { label: "Public contact route", value: partner.publicContactRoute },
                    { label: "Fit rationale", value: partner.fitRationale },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sources">
        <ul className="divide-y divide-neutral-100">
          {report.sources.map((source, i) => (
            <li
              key={i}
              id={`source-${i + 1}`}
              className="flex scroll-mt-20 flex-wrap items-center justify-between gap-2 py-3 target:bg-amber-50"
            >
              <div>
                <span className="mr-2 text-xs font-semibold text-neutral-400">[{i + 1}]</span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-700 hover:underline"
                  >
                    {source.label}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-neutral-900">{source.label}</span>
                )}
                <span className="ml-2 text-xs text-neutral-500">{source.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <ReachabilityBadge
                  reachability={source.reachability}
                  httpStatus={source.httpStatus}
                />
                <NatureBadge nature={source.natureFlag} />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-8 text-center text-xs text-neutral-400">
        Generated {formatDateTime(report.meta.generatedAt)} · Model: {report.meta.model}
      </p>
    </div>
  );
}
