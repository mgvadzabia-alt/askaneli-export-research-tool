import type { MarketResearchReport, SourceEntry } from "./reportSchema";

/**
 * The model self-declares every entry in a report's "sources" list, including
 * the URL — so a URL can be plausible-looking but dead, wrong, or invented.
 * After a report is generated we probe each source URL once and record whether
 * it actually resolves, so the UI can flag citations that can't be opened
 * instead of presenting every link as equally trustworthy.
 *
 * This never rewrites or removes a source (that would hide what the model
 * claimed); it only annotates each one with a reachability result.
 */

const PER_URL_TIMEOUT_MS = 8000;
// Cap total concurrency so a report with many sources doesn't open dozens of
// sockets at once; sources are checked in small batches instead.
const CONCURRENCY = 5;

function isProbablyHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Probes a single URL. Tries a lightweight HEAD first; some servers reject
 * HEAD (405) or mis-handle it, so on a non-OK, non-network result we retry
 * once with a ranged GET before concluding the URL is unreachable.
 */
async function probeUrl(
  url: string
): Promise<{ reachability: "reachable" | "unreachable"; httpStatus?: number }> {
  const attempt = async (method: "HEAD" | "GET"): Promise<Response | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_URL_TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        // A real browser-ish UA avoids some servers 403-ing default fetch agents.
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AskaneliResearchTool/1.0; +https://askaneli.ge)",
          // Ask for only the first byte on the GET fallback to avoid downloading whole pages.
          Range: method === "GET" ? "bytes=0-0" : "",
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const headResponse = await attempt("HEAD");
  if (headResponse && headResponse.status < 400) {
    return { reachability: "reachable", httpStatus: headResponse.status };
  }

  // HEAD failed or was rejected — retry once with a ranged GET.
  const getResponse = await attempt("GET");
  if (getResponse) {
    return {
      reachability: getResponse.status < 400 ? "reachable" : "unreachable",
      httpStatus: getResponse.status,
    };
  }

  // Network-level failure (DNS, timeout, refused) on both attempts.
  return {
    reachability: "unreachable",
    httpStatus: headResponse?.status,
  };
}

async function verifyOneSource(source: SourceEntry): Promise<SourceEntry> {
  if (!source.url || !isProbablyHttpUrl(source.url)) {
    return { ...source, reachability: "unchecked" };
  }
  const result = await probeUrl(source.url);
  return { ...source, reachability: result.reachability, httpStatus: result.httpStatus };
}

/** Runs verifyOneSource across all sources with bounded concurrency. */
async function verifyAll(sources: SourceEntry[]): Promise<SourceEntry[]> {
  const results: SourceEntry[] = new Array(sources.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < sources.length) {
      const index = cursor++;
      results[index] = await verifyOneSource(sources[index]);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, sources.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Returns a copy of the report with every source annotated with a reachability
 * result. Never throws: if the whole verification pass fails for some reason,
 * the original report is returned unchanged so a working report is never lost
 * over a link-check problem.
 */
export async function verifyReportSources(
  report: MarketResearchReport
): Promise<MarketResearchReport> {
  if (!Array.isArray(report.sources) || report.sources.length === 0) {
    return report;
  }
  try {
    const verified = await verifyAll(report.sources);
    return { ...report, sources: verified };
  } catch {
    return report;
  }
}
