import "dotenv/config";

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";

import { generateBriefing } from "../briefing/agent.js";
import { getCatalog } from "../briefing/library.js";
import { hasLiveModelConfig } from "../briefing/provider.js";
import type { BriefingRequest } from "../briefing/types.js";
import { metrics } from "../observability/metrics.js";
import { writeBriefingRun } from "../observability/run-history.js";

interface BriefRequestBody {
  topic?: unknown;
  audience?: unknown;
  limit?: unknown;
  live?: unknown;
  saveRun?: unknown;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(response: ServerResponse, status: number, payload: string, contentType: string): void {
  response.writeHead(status, {
    "content-type": contentType
  });
  response.end(payload);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function briefingRequestFrom(body: BriefRequestBody): BriefingRequest {
  return {
    topic: typeof body.topic === "string" ? body.topic : "Why evals matter for agent apps",
    audience: typeof body.audience === "string" ? body.audience : "technical team",
    limit: typeof body.limit === "number" ? body.limit : 3,
    live: body.live === true
  };
}

async function handleBrief(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = (await readJsonBody(request)) as BriefRequestBody;
  const briefingRequest = briefingRequestFrom(body);
  const result = await generateBriefing(briefingRequest);
  const run =
    body.saveRun === true || process.env.BRIEFING_SAVE_RUNS === "1"
      ? await writeBriefingRun(briefingRequest, result)
      : undefined;

  metrics.increment("briefing_agent_briefings_total", {
    mode: result.mode
  });
  metrics.observeDuration("briefing_agent_duration_seconds", result.durationMs, {
    mode: result.mode
  });

  sendJson(response, 200, {
    ...result,
    runId: run?.id,
    runStore: run?.store,
    runPath: run?.path ?? run?.reference
  });
}

export function createHttpHandler() {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const startedAt = Date.now();
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    metrics.increment("briefing_agent_requests_total", {
      method: request.method ?? "UNKNOWN",
      path: url.pathname
    });

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          status: "ok"
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/ready") {
        sendJson(response, 200, {
          status: "ready",
          liveModelConfigured: hasLiveModelConfig(),
          catalogSize: getCatalog().length
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/catalog") {
        sendJson(response, 200, {
          documents: getCatalog()
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/metrics") {
        sendText(response, 200, metrics.renderPrometheus(), "text/plain; version=0.0.4; charset=utf-8");
        return;
      }

      if (request.method === "POST" && url.pathname === "/brief") {
        await handleBrief(request, response);
        return;
      }

      sendJson(response, 404, {
        error: "Not found"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(response, 500, {
        error: message
      });
    } finally {
      metrics.observeDuration("briefing_agent_http_request_duration_seconds", Date.now() - startedAt, {
        method: request.method ?? "UNKNOWN",
        path: url.pathname
      });
    }
  };
}

export function startHttpServer(port = Number.parseInt(process.env.PORT || "8787", 10)): void {
  const server = createServer((request, response) => {
    void createHttpHandler()(request, response);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`mcp-briefing-agent listening on http://127.0.0.1:${port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startHttpServer();
}
