import { generateBriefing } from "./briefing/agent.js";
import { BriefingMcpClient } from "./mcp/client.js";

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
  const topic = readFlag("--topic", args, "Why evals matter for agent apps");
  const audience = readFlag("--audience", args, "technical team");
  const limit = readIntFlag("--limit", args, 3);

  const briefing = await generateBriefing({
    topic,
    audience,
    limit,
    live: args.includes("--live")
  });

  console.log(`# Mode: ${briefing.mode}`);
  console.log(`# Brief IDs: ${briefing.briefIds.join(", ") || "none"}`);
  console.log("");
  console.log(briefing.markdown);
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
