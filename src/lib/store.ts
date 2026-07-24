import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MarketResearchReport, ReportIndexEntry } from "./research/reportSchema";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

async function ensureDirs(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });
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
export async function createRunningReport(country: string, product: string): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const entries = await readIndex();
  entries.push({
    id,
    country,
    product,
    status: "running",
    createdAt: now,
    updatedAt: now,
  });
  await writeIndex(entries);
  return id;
}

export async function markReportDone(id: string, report: MarketResearchReport): Promise<void> {
  await ensureDirs();
  await writeFile(path.join(REPORTS_DIR, `${id}.json`), JSON.stringify(report, null, 2), "utf-8");
  const entries = await readIndex();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], status: "done", updatedAt: new Date().toISOString() };
    await writeIndex(entries);
  }
}

export async function markReportError(id: string, message: string): Promise<void> {
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
}
