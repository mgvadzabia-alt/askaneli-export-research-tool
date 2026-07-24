// The "research pass" of the two-pass pipeline produces a batch of discrete,
// inspectable findings BEFORE any report narrative is written. This is the
// separation the recommendations memo asks for: collect what was actually
// found first, as traceable records, then write the report only from those
// records — so nothing in the final report can exist without a finding (and
// a source) behind it.

import type { SourceNature } from "./reportSchema";

/**
 * A single atomic thing the research pass found, tied to exactly one source.
 * Findings are numbered (1-based) in the order produced; the writing pass
 * cites them by that number, so every claim in the report is traceable back
 * to a specific finding and its URL.
 */
export interface ResearchFinding {
  /** 1-based id, assigned in array order; used as the inline citation marker. */
  id: number;
  /** Which report area this finding informs (loose grouping, not enforced). */
  topic: string;
  /** The concrete claim/fact, self-contained enough to cite on its own. */
  claim: string;
  /** Source URL the claim came from ("" if the model could not attribute one). */
  url: string;
  /** Human-readable source label (publication/site/dataset). */
  sourceLabel: string;
  /** Source date or "unknown" if not determinable. */
  date: string;
  /** Whether this is hard data, an estimate, or industry consensus. */
  natureFlag: SourceNature;
}

export interface ResearchFindingsBatch {
  country: string;
  product: string;
  /** ISO-8601 timestamp when the research pass completed. */
  collectedAt: string;
  findings: ResearchFinding[];
  /**
   * Topics the research pass genuinely could not find usable data for.
   * Carried into the report as an honest gaps list rather than being papered
   * over with a plausible-sounding estimate (memo: "a visible gap is more
   * useful than an invisible guess").
   */
  gaps: string[];
}

const VALID_NATURE: readonly SourceNature[] = [
  "hard data",
  "estimate",
  "industry consensus",
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Structural validation of a parsed findings batch. Returns a list of problems;
 * empty list means the batch is well-formed enough to feed into the writing
 * pass. Individual malformed findings are reported by index so a retry prompt
 * can be specific.
 */
export function validateFindingsBatch(value: unknown): string[] {
  const problems: string[] = [];
  if (typeof value !== "object" || value === null) {
    return ["findings batch is not an object"];
  }
  const b = value as Record<string, unknown>;

  if (!Array.isArray(b.findings)) {
    problems.push('missing "findings" array');
  } else if (b.findings.length === 0) {
    problems.push('"findings" array is empty — the research pass found nothing');
  } else {
    b.findings.forEach((f, i) => {
      if (typeof f !== "object" || f === null) {
        problems.push(`finding[${i}] is not an object`);
        return;
      }
      const finding = f as Record<string, unknown>;
      if (!isNonEmptyString(finding.claim)) {
        problems.push(`finding[${i}] has an empty "claim"`);
      }
      if (
        typeof finding.natureFlag !== "string" ||
        !VALID_NATURE.includes(finding.natureFlag as SourceNature)
      ) {
        problems.push(
          `finding[${i}] has an invalid "natureFlag" (must be one of: ${VALID_NATURE.join(", ")})`
        );
      }
    });
  }

  if (b.gaps !== undefined && !Array.isArray(b.gaps)) {
    problems.push('"gaps" must be an array of strings when present');
  }

  return problems;
}

/**
 * Normalizes a validated-but-possibly-loose parsed object into a concrete
 * ResearchFindingsBatch: assigns sequential ids, coerces missing optional
 * fields to safe defaults, and drops obviously-empty findings. Assumes
 * validateFindingsBatch already passed.
 */
export function normalizeFindingsBatch(
  value: unknown,
  country: string,
  product: string
): ResearchFindingsBatch {
  const b = value as Record<string, unknown>;
  const rawFindings = Array.isArray(b.findings) ? b.findings : [];

  const findings: ResearchFinding[] = rawFindings
    .map((f) => f as Record<string, unknown>)
    .filter((f) => isNonEmptyString(f?.claim))
    .map((f, index) => ({
      id: index + 1,
      topic: isNonEmptyString(f.topic) ? (f.topic as string) : "general",
      claim: (f.claim as string).trim(),
      url: isNonEmptyString(f.url) ? (f.url as string).trim() : "",
      sourceLabel: isNonEmptyString(f.sourceLabel)
        ? (f.sourceLabel as string).trim()
        : "Unattributed",
      date: isNonEmptyString(f.date) ? (f.date as string).trim() : "unknown",
      natureFlag: VALID_NATURE.includes(f.natureFlag as SourceNature)
        ? (f.natureFlag as SourceNature)
        : "estimate",
    }));

  const gaps = Array.isArray(b.gaps)
    ? b.gaps.filter(isNonEmptyString).map((g) => (g as string).trim())
    : [];

  return {
    country,
    product,
    collectedAt: new Date().toISOString(),
    findings,
    gaps,
  };
}
