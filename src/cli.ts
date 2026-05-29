import { generateBriefing } from "./briefing/agent.js";
import type { BriefingRequest } from "./briefing/types.js";
import { BriefingMcpClient } from "./mcp/client.js";
import { writeBriefingRun } from "./observability/run-history.js";

function readFlag(flag: string, args: string[], fallback: string): string {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function readIntFlag(flag: string, args: string[], fallback: number): number {
  const raw = readFlag(flag, args, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function runBrief(args: string[]): Promise<void> {
  const request: BriefingRequest = {
    topic: readFlag("--topic", args, "Why evals matter for agent apps"),
    audience: readFlag("--audience", args, "technical team"),
    limit: readIntFlag("--limit", args, 3),
    live: args.includes("--live")
  };

  const briefing = await generateBriefing(request);

  console.log(`# Mode: ${briefing.mode}`);
  console.log(`# Brief IDs: ${briefing.briefIds.join(", ") || "none"}`);
  console.log(`# Duration: ${briefing.durationMs}ms`);
  console.log("");
  console.log(briefing.markdown);

  if (args.includes("--trace")) {
    console.log("");
    console.log("## Trace");
    console.log(JSON.stringify(briefing.trace, null, 2));
  }

  if (args.includes("--save-run")) {
    const outputPath = await writeBriefingRun(request, briefing);
    console.log("");
    console.log(`# Saved run: ${outputPath}`);
  }
}

async function runCatalog(): Promise<void> {
  const mcpClient = new BriefingMcpClient();
  await mcpClient.connect();

  try {
    const catalog = await mcpClient.getCatalog();
    console.log(JSON.stringify(catalog, null, 2));
  } finally {
    await mcpClient.close();
  }
}

async function main(): Promise<void> {
  const [command = "brief", ...args] = process.argv.slice(2);

  if (command === "brief") {
    await runBrief(args);
    return;
  }

  if (command === "catalog") {
    await runCatalog();
    return;
  }

  throw new Error(`Unknown command "${command}". Supported commands are "brief" and "catalog".`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
