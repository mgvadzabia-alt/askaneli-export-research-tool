import spawn from "cross-spawn";
import { buildResearchPrompt, JSON_ONLY_REMINDER } from "./buildPrompt";
import { validateReport, type MarketResearchReport } from "./reportSchema";

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
function runClaudeOnce(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    delete childEnv.CLAUDE_CODE_OAUTH_TOKEN;

    const child = spawn(
      "claude",
      [
        "-p",
        "--output-format",
        "json",
        "--allowedTools",
        "WebSearch",
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

/**
 * Runs the full research prompt for a country + product, parses the report
 * JSON out of the CLI's result text, and validates its shape. Retries once
 * with an added "JSON only" reminder if the first attempt doesn't parse or
 * validate. Throws HeadlessClaudeError on hard failure rather than ever
 * fabricating a report.
 */
export async function generateResearchReport(
  country: string,
  product: string
): Promise<MarketResearchReport> {
  const basePrompt = buildResearchPrompt(country, product);

  const attempt = async (prompt: string): Promise<MarketResearchReport> => {
    const resultText = await runClaudeOnce(prompt);
    const jsonText = extractJsonObject(resultText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new HeadlessClaudeError(
        `Claude's response was not valid JSON: ${(e as Error).message}. Raw response (truncated): ${resultText.slice(0, 1000)}`
      );
    }
    const problems = validateReport(parsed);
    if (problems.length > 0) {
      throw new HeadlessClaudeError(
        `Claude's response was JSON but didn't match the expected report shape: ${problems.join("; ")}`
      );
    }
    return parsed as MarketResearchReport;
  };

  try {
    return await attempt(basePrompt);
  } catch (firstError) {
    try {
      return await attempt(basePrompt + JSON_ONLY_REMINDER);
    } catch (secondError) {
      throw new HeadlessClaudeError(
        `Report generation failed after one retry. First attempt: ${(firstError as Error).message}. Retry: ${(secondError as Error).message}`
      );
    }
  }
}
