import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { createHttpHandler } from "../src/http/server.js";

test("HTTP service exposes health, readiness, and metrics endpoints", async () => {
  const server = createServer((request, response) => {
    void createHttpHandler()(request, response);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EPERM") {
      return;
    }
    throw error;
  }

  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    assert.ok(address);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });

    const ready = await fetch(`${baseUrl}/ready`);
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).status, "ready");

    const metrics = await fetch(`${baseUrl}/metrics`);
    assert.equal(metrics.status, 200);
    assert.match(await metrics.text(), /briefing_agent_requests_total/);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
