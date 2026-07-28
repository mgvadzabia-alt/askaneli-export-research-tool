import spawn from "cross-spawn";
import {
  buildResearchPass,
  buildWritingPass,
  FINDINGS_JSON_ONLY_REMINDER,
  JSON_ONLY_REMINDER,
} from "./buildPrompt";
import { validateReport, type MarketResearchReport } from "./reportSchema";
import {
  normalizeFindingsBatch,
  validateFindingsBatch,
  type ResearchFinding,
  type ResearchFindingsBatch,
} from "./findingsSchema";
import { fetchTradeFlow } from "./comtrade";

/**
 * Shape of the JSON envelope printed by `claude -p ... --output-format json`,
 * confirmed against the installed CLI (2.1.217) by a real headless call.
 * We only rely on the fields we actually use.
 */
interface ClaudeCliResultEnvelope {
  type: string;
  subtype: string;
  is_error: boolean;
  result?: string;
  session_id?: string;
}

// A real end-to-end test run took ~15 minutes for a full multi-section report
// with dozens of web searches, so give each attempt generous headroom before
// giving up and (if this was the first attempt) retrying once.
const CLI_TIMEOUT_MS = 20 * 60 * 1000;

export class HeadlessClaudeError extends Error {}

/**
 * Runs a single non-interactive Claude Code call: `claude -p --output-format
 * json --allowedTools WebSearch --permission-mode bypassPermissions`, with
 * ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN stripped from the child's
 * environment so the call is billed against the existing interactive Claude
 * subscription rather than metered API usage.
 *
 * The prompt itself is written to the child's stdin rather than passed as a
 * CLI argument: our research prompts are large (multiple KB of instructions
 * plus the JSON schema), and on Windows a long argv string blows past
 * cmd.exe's ~8191-character command-line limit once meta-characters are
 * escaped, silently truncating the prompt mid-sentence. Piping via stdin has
 * no such limit and was confirmed to work with `claude -p` (no prompt
 * argument) against the installed CLI.
 */
function runClaudeOnce(prompt: string, allowWebSearch: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.CLAUDE_CODE_OAUTH_TOKEN;

    // The writing pass must not browse, so it physically cannot introduce a
    // fact that isn't in the findings batch. We both drop WebSearch from the
    // allow-list and explicitly deny it, so an empty allow-list value can't be
    // misparsed into permitting it.
    const toolArgs = allowWebSearch
      ? ["--allowedTools", "WebSearch"]
      : ["--disallowedTools", "WebSearch"];

    const child = spawn(
      "claude",
      [
        "-p",
        "--output-format",
        "json",
        ...toolArgs,
        "--permission-mode",
        "bypassPermissions",
      ],
      { env: childEnv, stdio: ["pipe", "pipe", "pipe"] }
    );

    child.stdin?.write(prompt);
    child.stdin?.end();

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new HeadlessClaudeError("Claude Code CLI timed out after 20 minutes"));
    }, CLI_TIMEOUT_MS);

    child.stdout?.on("data", (d) => {
      stdout += d;
    });
    child.stderr?.on("data", (d) => {
      stderr += d;
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new HeadlessClaudeError(
          `Failed to launch the Claude Code CLI ("claude"). Is it installed and on PATH? (${err.message})`
        )
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new HeadlessClaudeError(
            `Claude Code CLI exited with code ${code}. stderr: ${stderr.slice(0, 2000)}`
          )
        );
        return;
      }

      let envelope: ClaudeCliResultEnvelope;
      try {
        envelope = JSON.parse(stdout);
      } catch {
        reject(
          new HeadlessClaudeError(
            `Could not parse Claude Code CLI output as JSON. Raw output: ${stdout.slice(0, 2000)}`
          )
        );
        return;
      }

      if (envelope.is_error || !envelope.result) {
        reject(
          new HeadlessClaudeError(
            `Claude Code CLI reported an error (subtype: ${envelope.subtype}). stderr: ${stderr.slice(0, 2000)}`
          )
        );
        return;
      }

      resolve(envelope.result);
    });
  });
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  // Strip markdown code fences if the model wrapped the JSON despite instructions.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return candidate;
  }
  return candidate.slice(start, end + 1);
}

/** Parses a JSON object out of CLI result text or throws a HeadlessClaudeError. */
function parseJsonOrThrow(resultText: string, label: string): unknown {
  const jsonText = extractJsonObject(resultText);
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new HeadlessClaudeError(
      `${label} response was not valid JSON: ${(e as Error).message}. Raw response (truncated): ${resultText.slice(0, 1000)}`
    );
  }
}

/**
 * PASS 1 — research. Runs the web-searching pass and returns a validated,
 * normalized batch of source-tagged findings. Retries once with a JSON-only
 * reminder if the first attempt doesn't parse or validate.
 */
export async function collectResearchFindings(
  country: string,
  product: string,
  tradeFlowFindings: Omit<ResearchFinding, "id">[] = [],
  additionalInstructions?: string
): Promise<ResearchFindingsBatch> {
  const basePrompt = buildResearchPass(country, product, additionalInstructions);

  const attempt = async (prompt: string): Promise<ResearchFindingsBatch> => {
    const resultText = await runClaudeOnce(prompt, /* allowWebSearch */ true);
    const parsed = parseJsonOrThrow(resultText, "Research pass");
    const problems = validateFindingsBatch(parsed);
    if (problems.length > 0) {
      throw new HeadlessClaudeError(
        `Research findings didn't match the expected shape: ${problems.join("; ")}`
      );
    }
    return normalizeFindingsBatch(parsed, country, product);
  };

  const runWithRetry = async (): Promise<ResearchFindingsBatch> => {
    try {
      return await attempt(basePrompt);
    } catch (firstError) {
      try {
        return await attempt(basePrompt + FINDINGS_JSON_ONLY_REMINDER);
      } catch (secondError) {
        throw new HeadlessClaudeError(
          `Research pass failed after one retry. First attempt: ${(firstError as Error).message}. Retry: ${(secondError as Error).message}`
        );
      }
    }
  };

  const batch = await runWithRetry();
  return prependTradeFlowFindings(batch, tradeFlowFindings);
}

/**
 * Prepends the official Comtrade findings to the model's own findings and
 * re-numbers the whole batch so ids stay sequential (the writing pass cites
 * by source position, but keeping ids contiguous avoids confusion). Trade-flow
 * data comes first because it's the most decisive, pre-verified evidence.
 */
function prependTradeFlowFindings(
  batch: ResearchFindingsBatch,
  tradeFlow: Omit<ResearchFinding, "id">[]
): ResearchFindingsBatch {
  if (tradeFlow.length === 0) return batch;
  const stripId = (f: ResearchFinding): Omit<ResearchFinding, "id"> => {
    const { id, ...rest } = f;
    void id;
    return rest;
  };
  const merged = [...tradeFlow, ...batch.findings.map(stripId)];
  const renumbered: ResearchFinding[] = merged.map((f, i) => ({ ...f, id: i + 1 }));
  return { ...batch, findings: renumbered };
}

/**
 * PASS 2 — writing. Runs the no-tools writing pass over a findings batch and
 * returns a validated report. Because this pass has no web access, it cannot
 * introduce a fact that isn't in the batch. Carries the research pass's honest
 * gaps list through onto the report. Retries once on parse/validate failure.
 */
export async function writeReportFromFindings(
  country: string,
  product: string,
  batch: ResearchFindingsBatch,
  language: "en" | "ka" = "en",
  additionalInstructions?: string
): Promise<MarketResearchReport> {
  const findingsJson = JSON.stringify(
    { findings: batch.findings, gaps: batch.gaps },
    null,
    2
  );
  const basePrompt = buildWritingPass(
    country,
    product,
    findingsJson,
    language,
    additionalInstructions
  );

  const attempt = async (prompt: string): Promise<MarketResearchReport> => {
    const resultText = await runClaudeOnce(prompt, /* allowWebSearch */ false);
    const parsed = parseJsonOrThrow(resultText, "Writing pass");
    const problems = validateReport(parsed);
    if (problems.length > 0) {
      throw new HeadlessClaudeError(
        `Report didn't match the expected shape: ${problems.join("; ")}`
      );
    }
    const report = parsed as MarketResearchReport;
    // Ensure the honest gaps list survives even if the writing pass dropped it.
    if (!Array.isArray(report.gaps) || report.gaps.length === 0) {
      report.gaps = batch.gaps;
    }
    return report;
  };

  try {
    return await attempt(basePrompt);
  } catch (firstError) {
    try {
      return await attempt(basePrompt + JSON_ONLY_REMINDER);
    } catch (secondError) {
      throw new HeadlessClaudeError(
        `Writing pass failed after one retry. First attempt: ${(firstError as Error).message}. Retry: ${(secondError as Error).message}`
      );
    }
  }
}

/**
 * Full two-pass pipeline: research (web search → source-tagged findings) then
 * writing (findings → report, no web access). Splitting the two means the
 * report can only be built from evidence that was explicitly collected and
 * tagged first — nothing in the final report exists without a finding behind
 * it. Throws HeadlessClaudeError on hard failure rather than fabricating.
 */
export async function generateResearchReport(
  country: string,
  product: string,
  language: "en" | "ka" = "en",
  additionalInstructions?: string
): Promise<MarketResearchReport> {
  // Pull official trade-flow data once, up front: its findings seed the
  // research pass (most decisive metric as pre-verified hard data), and its
  // structured summary is attached to the finished report for prominent
  // display. Best-effort — never blocks a report if Comtrade is unavailable.
  const tradeFlow = await fetchTradeFlow(country);
  const findings = await collectResearchFindings(
    country,
    product,
    tradeFlow.findings,
    additionalInstructions
  );
  const report = await writeReportFromFindings(
    country,
    product,
    findings,
    language,
    additionalInstructions
  );
  if (tradeFlow.summary) {
    report.tradeFlow = tradeFlow.summary;
  }
  return report;
}
