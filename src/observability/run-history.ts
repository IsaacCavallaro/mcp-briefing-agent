import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BriefingRequest, BriefingResult, EvalResult } from "../briefing/types.js";

export interface BriefingRunRecord {
  id: string;
  kind: "briefing";
  createdAt: string;
  request: BriefingRequest;
  result: {
    mode: BriefingResult["mode"];
    briefIds: string[];
    durationMs: number;
    markdown: string;
  };
  trace: BriefingResult["trace"];
}

export interface EvalReportRecord {
  id: string;
  kind: "eval";
  createdAt: string;
  summary: {
    passed: number;
    total: number;
    averageScore: number;
    liveMode: boolean;
  };
  results: EvalResult[];
}

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function defaultRunDir(): string {
  return process.env.BRIEFING_RUN_DIR || "runs";
}

function runId(prefix: string): string {
  return `${prefix}-${safeTimestamp()}`;
}

export async function writeBriefingRun(
  request: BriefingRequest,
  result: BriefingResult,
  runDir = defaultRunDir()
): Promise<string> {
  const id = runId("briefing");
  const record: BriefingRunRecord = {
    id,
    kind: "briefing",
    createdAt: new Date().toISOString(),
    request,
    result: {
      mode: result.mode,
      briefIds: result.briefIds,
      durationMs: result.durationMs,
      markdown: result.markdown
    },
    trace: result.trace
  };
  const outputDir = path.join(runDir, "briefings");
  const outputPath = path.join(outputDir, `${id}.json`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return outputPath;
}

export async function writeEvalReport(
  summary: EvalReportRecord["summary"],
  results: EvalResult[],
  outputDir = path.join("reports", "evals")
): Promise<string> {
  const id = runId("eval");
  const record: EvalReportRecord = {
    id,
    kind: "eval",
    createdAt: new Date().toISOString(),
    summary,
    results
  };
  const outputPath = path.join(outputDir, "latest.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return outputPath;
}
