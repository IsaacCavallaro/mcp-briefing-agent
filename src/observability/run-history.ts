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

export type RunHistoryStore = "filesystem" | "postgres";

export interface RunHistoryWriteResult {
  id: string;
  kind: BriefingRunRecord["kind"];
  store: RunHistoryStore;
  reference: string;
  path?: string;
}

export interface RunHistoryDbClient {
  query(sql: string, values?: unknown[]): Promise<unknown>;
}

let postgresPool: Promise<RunHistoryDbClient> | undefined;

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function defaultRunDir(): string {
  return process.env.BRIEFING_RUN_DIR || "runs";
}

function runId(prefix: string): string {
  return `${prefix}-${safeTimestamp()}`;
}

export function createBriefingRunRecord(request: BriefingRequest, result: BriefingResult): BriefingRunRecord {
  const id = runId("briefing");

  return {
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
}

function configuredRunStore(): RunHistoryStore {
  const store = process.env.BRIEFING_RUN_STORE || "filesystem";

  if (store === "filesystem" || store === "postgres") {
    return store;
  }

  throw new Error(`Unsupported BRIEFING_RUN_STORE "${store}". Use "filesystem" or "postgres".`);
}

function postgresUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!url) {
    throw new Error("BRIEFING_RUN_STORE=postgres requires DATABASE_URL or POSTGRES_URL.");
  }

  return url;
}

async function createPostgresPool(): Promise<RunHistoryDbClient> {
  const { Pool } = await import("pg");
  const max = Number.parseInt(process.env.POSTGRES_POOL_MAX || "3", 10);
  const connectionTimeoutMillis = Number.parseInt(process.env.POSTGRES_CONNECT_TIMEOUT_MS || "5000", 10);
  const ssl = process.env.POSTGRES_SSL === "1" ? { rejectUnauthorized: false } : undefined;

  return new Pool({
    connectionString: postgresUrl(),
    max: Number.isFinite(max) ? max : 3,
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis) ? connectionTimeoutMillis : 5000,
    allowExitOnIdle: true,
    ssl
  });
}

async function getPostgresPool(): Promise<RunHistoryDbClient> {
  postgresPool ??= createPostgresPool();
  return postgresPool;
}

export async function ensurePostgresRunHistorySchema(client: RunHistoryDbClient): Promise<void> {
  await client.query(`
    create table if not exists briefing_runs (
      id text primary key,
      created_at timestamptz not null,
      mode text not null check (mode in ('mock', 'live')),
      topic text not null,
      audience text not null,
      brief_ids text[] not null default '{}',
      duration_ms integer not null check (duration_ms >= 0),
      request jsonb not null,
      result jsonb not null,
      trace jsonb not null,
      inserted_at timestamptz not null default now()
    )
  `);
  await client.query("create index if not exists briefing_runs_created_at_idx on briefing_runs (created_at desc)");
  await client.query("create index if not exists briefing_runs_mode_idx on briefing_runs (mode)");
  await client.query("create index if not exists briefing_runs_topic_idx on briefing_runs using gin (to_tsvector('english', topic))");
}

export async function writeBriefingRunToPostgres(
  record: BriefingRunRecord,
  client: RunHistoryDbClient
): Promise<RunHistoryWriteResult> {
  await ensurePostgresRunHistorySchema(client);
  await client.query(
    `
      insert into briefing_runs (
        id,
        created_at,
        mode,
        topic,
        audience,
        brief_ids,
        duration_ms,
        request,
        result,
        trace
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
      on conflict (id) do update set
        created_at = excluded.created_at,
        mode = excluded.mode,
        topic = excluded.topic,
        audience = excluded.audience,
        brief_ids = excluded.brief_ids,
        duration_ms = excluded.duration_ms,
        request = excluded.request,
        result = excluded.result,
        trace = excluded.trace
    `,
    [
      record.id,
      record.createdAt,
      record.result.mode,
      record.request.topic,
      record.request.audience,
      record.result.briefIds,
      record.result.durationMs,
      JSON.stringify(record.request),
      JSON.stringify(record.result),
      JSON.stringify(record.trace)
    ]
  );

  return {
    id: record.id,
    kind: record.kind,
    store: "postgres",
    reference: `postgres://briefing_runs/${record.id}`
  };
}

export async function writeBriefingRunToFile(
  record: BriefingRunRecord,
  runDir = defaultRunDir()
): Promise<RunHistoryWriteResult> {
  const outputDir = path.join(runDir, "briefings");
  const outputPath = path.join(outputDir, `${record.id}.json`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return {
    id: record.id,
    kind: record.kind,
    store: "filesystem",
    reference: outputPath,
    path: outputPath
  };
}

export async function writeBriefingRun(
  request: BriefingRequest,
  result: BriefingResult,
  runDir = defaultRunDir()
): Promise<RunHistoryWriteResult> {
  const record = createBriefingRunRecord(request, result);

  if (configuredRunStore() === "postgres") {
    const client = await getPostgresPool();
    return writeBriefingRunToPostgres(record, client);
  }

  return writeBriefingRunToFile(record, runDir);
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
