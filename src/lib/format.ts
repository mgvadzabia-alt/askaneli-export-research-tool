/**
 * Normalizes how a free-text country name is DISPLAYED (never mutates stored
 * data) so "POLAND", "Poland", and "poland" all render the same way in lists —
 * they otherwise look like inconsistent/duplicate entries side by side.
 * Handles multi-word names ("United Kingdom") and short all-caps codes/short
 * words users sometimes type (e.g. "UK", "UAE") by leaving anything <= 3
 * letters upper-cased.
 */
export function formatCountryDisplay(country: string): string {
  const trimmed = country.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 3) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
