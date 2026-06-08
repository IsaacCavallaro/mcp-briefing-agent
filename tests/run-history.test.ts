import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { BriefingRequest, BriefingResult } from "../src/briefing/types.js";
import {
  createBriefingRunRecord,
  writeBriefingRunToFile,
  writeBriefingRunToPostgres,
  type RunHistoryDbClient
} from "../src/observability/run-history.js";

const request: BriefingRequest = {
  topic: "Postgres-backed run history",
  audience: "senior engineering reviewer",
  limit: 3,
  live: false
};

const result: BriefingResult = {
  mode: "mock",
  markdown: "## Executive Summary\n\nStored briefing.",
  briefIds: ["evals-reliability"],
  durationMs: 42,
  trace: [
    {
      timestamp: "2026-06-08T00:00:00.000Z",
      name: "briefing.completed",
      attributes: {
        mode: "mock"
      }
    }
  ]
};

class FakeRunHistoryClient implements RunHistoryDbClient {
  queries: Array<{ sql: string; values?: unknown[] }> = [];

  async query(sql: string, values?: unknown[]): Promise<void> {
    this.queries.push({ sql, values });
  }
}

test("writeBriefingRunToFile writes a complete briefing record", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "mcp-briefing-run-history-"));
  const record = createBriefingRunRecord(request, result);

  try {
    const saved = await writeBriefingRunToFile(record, outputDir);
    assert.equal(saved.store, "filesystem");
    assert.equal(saved.id, record.id);
    assert.ok(saved.path?.endsWith(`${record.id}.json`));

    const persisted = JSON.parse(await readFile(saved.reference, "utf8")) as typeof record;
    assert.equal(persisted.id, record.id);
    assert.equal(persisted.request.topic, request.topic);
    assert.deepEqual(persisted.result.briefIds, result.briefIds);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("writeBriefingRunToPostgres ensures schema and inserts JSONB payloads", async () => {
  const record = createBriefingRunRecord(request, result);
  const client = new FakeRunHistoryClient();

  const saved = await writeBriefingRunToPostgres(record, client);

  assert.equal(saved.store, "postgres");
  assert.equal(saved.reference, `postgres://briefing_runs/${record.id}`);
  assert.equal(client.queries.length, 5);
  assert.match(client.queries[0].sql, /create table if not exists briefing_runs/);

  const insert = client.queries.at(-1);
  assert.ok(insert);
  assert.match(insert.sql, /insert into briefing_runs/);
  assert.deepEqual(insert.values?.slice(0, 7), [
    record.id,
    record.createdAt,
    "mock",
    request.topic,
    request.audience,
    result.briefIds,
    result.durationMs
  ]);
  assert.deepEqual(JSON.parse(insert.values?.[7] as string), request);
  assert.deepEqual(JSON.parse(insert.values?.[8] as string), record.result);
  assert.deepEqual(JSON.parse(insert.values?.[9] as string), result.trace);
});
