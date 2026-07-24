import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  MarketResearchReport,
  ReportIndexEntry,
  ReportLanguage,
} from "./research/reportSchema";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

async function ensureDirs(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });
}

/**
 * Serializes every read-modify-write of the index file. Reports are generated
 * as fire-and-forget background tasks, so two of them can finish at nearly the
 * same moment; without this lock both would readIndex() the same snapshot,
 * each append its own change, and the later writeIndex() would clobber the
 * other's entry — silently dropping a report from history. Chaining each
 * critical section onto a single promise forces them to run one at a time.
 *
 * This guards against concurrency within one Node process (the only way this
 * single-process local tool runs); it is not a cross-process file lock.
 */
let indexLock: Promise<unknown> = Promise.resolve();

function withIndexLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = indexLock.then(fn, fn);
  // Keep the chain alive even if fn rejects, but don't let the lock itself
  // reject (which would reject every future waiter).
  indexLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readIndex(): Promise<ReportIndexEntry[]> {
  try {
    const raw = await readFile(INDEX_PATH, "utf-8");
    return JSON.parse(raw) as ReportIndexEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function writeIndex(entries: ReportIndexEntry[]): Promise<void> {
  await ensureDirs();
  await writeFile(INDEX_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

/** Returns all history entries, most recently created first. */
export async function listReports(): Promise<ReportIndexEntry[]> {
  const entries = await readIndex();
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReportEntry(id: string): Promise<ReportIndexEntry | null> {
  const entries = await readIndex();
  return entries.find((e) => e.id === id) ?? null;
}

/**
 * Finds the most recent successful report for the same country + product +
 * language, generated within the last `maxAgeDays`. Used to offer a cached
 * report instead of spending ~15 minutes re-researching an identical request.
 *
 * We only ever OFFER this (the caller decides whether to reuse it) and we bound
 * it by age, because market research goes stale — silently returning a months-
 * old report would be worse than doing the work again. Matching is
 * case-insensitive and trims whitespace so "Poland" and " poland " collide.
 */
export async function findRecentReport(
  country: string,
  product: string,
  language: ReportLanguage,
  maxAgeDays: number
): Promise<ReportIndexEntry | null> {
  const entries = await readIndex();
  const normalize = (s: string) => s.trim().toLowerCase();
  const wantCountry = normalize(country);
  const wantProduct = normalize(product);
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  const matches = entries.filter(
    (e) =>
      e.status === "done" &&
      normalize(e.country) === wantCountry &&
      normalize(e.product) === wantProduct &&
      // Absent language on older reports means English.
      (e.language ?? "en") === language &&
      new Date(e.createdAt).getTime() >= cutoff
  );
  if (matches.length === 0) return null;

  // Most recent match wins.
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function getReportData(id: string): Promise<MarketResearchReport | null> {
  try {
    const raw = await readFile(path.join(REPORTS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as MarketResearchReport;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/** Creates a new "running" history entry and returns its id. */
export async function createRunningReport(
  country: string,
  product: string,
  language: ReportLanguage = "en"
): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await withIndexLock(async () => {
    const entries = await readIndex();
    entries.push({
      id,
      country,
      product,
      status: "running",
      createdAt: now,
      updatedAt: now,
      language,
    });
    await writeIndex(entries);
  });
  return id;
}

export async function markReportDone(id: string, report: MarketResearchReport): Promise<void> {
  await ensureDirs();
  await writeFile(path.join(REPORTS_DIR, `${id}.json`), JSON.stringify(report, null, 2), "utf-8");
  await withIndexLock(async () => {
    const entries = await readIndex();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], status: "done", updatedAt: new Date().toISOString() };
      await writeIndex(entries);
    }
  });
}

export async function markReportError(id: string, message: string): Promise<void> {
  await withIndexLock(async () => {
    const entries = await readIndex();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      entries[idx] = {
        ...entries[idx],
        status: "error",
        updatedAt: new Date().toISOString(),
        errorMessage: message,
      };
      await writeIndex(entries);
    }
  });
}
