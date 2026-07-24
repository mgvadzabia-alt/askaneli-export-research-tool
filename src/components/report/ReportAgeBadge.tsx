/**
 * Shows how old a report's data is, and warns when it's stale (memo rec #5:
 * operational trust). Market conditions — prices, distributors, regulations —
 * drift, so a months-old report can quietly mislead. This makes the report's
 * age explicit and nudges the reader to regenerate once it's likely out of date.
 *
 * Thresholds are deliberately conservative for wine/spirits export research,
 * where the underlying trade data and regulations change over months, not days.
 */

const FRESH_DAYS = 90;
const STALE_DAYS = 180;

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function describeAge(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "about 1 month ago";
  if (months < 12) return `about ${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "about 1 year ago" : `about ${years} years ago`;
}

export function ReportAgeBadge({ generatedAt }: { generatedAt: string }) {
  const generated = new Date(generatedAt);
  // If the timestamp is unparseable, render nothing rather than a wrong age.
  if (Number.isNaN(generated.getTime())) return null;

  const days = daysBetween(generated, new Date());
  const ageText = describeAge(days);

  let style: string;
  let note: string;
  if (days <= FRESH_DAYS) {
    style = "bg-emerald-50 text-emerald-800 border-emerald-200";
    note = "Data is recent.";
  } else if (days <= STALE_DAYS) {
    style = "bg-amber-50 text-amber-800 border-amber-200";
    note = "Data is a few months old — double-check fast-moving figures.";
  } else {
    style = "bg-red-50 text-red-800 border-red-200";
    note = "Data is likely out of date — consider regenerating this report.";
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-xs ${style}`}
    >
      <span className="font-semibold">Researched {ageText}</span>
      <span className="opacity-90">{note}</span>
    </div>
  );
}
