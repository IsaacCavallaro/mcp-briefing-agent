import { generateBriefing } from "../briefing/agent.js";
import { hasLiveModelConfig } from "../briefing/provider.js";
import type { EvalResult } from "../briefing/types.js";
import { writeEvalReport } from "../observability/run-history.js";
import { scenarios } from "./dataset.js";
import { scoreScenario } from "./scoring.js";

function readFlag(flag: string, args: string[], fallback: string): string {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const liveMode = hasLiveModelConfig();
  const results: EvalResult[] = [];

  for (const scenario of scenarios) {
    const briefing = await generateBriefing({
      topic: scenario.topic,
      audience: scenario.audience,
      limit: 3,
      live: liveMode
    });

    const score = scoreScenario(briefing.markdown, scenario.expectedTerms);
    results.push({
      scenarioId: scenario.id,
      ...score
    });
  }

  const passed = results.filter((result) => result.passed).length;
  const averageScore = Math.round(
    results.reduce((sum, result) => sum + result.score, 0) / results.length
  );
  const summary = { passed, total: results.length, averageScore, liveMode };
  const reportPath = args.includes("--write-report")
    ? await writeEvalReport(summary, results, readFlag("--output-dir", args, "reports/evals"))
    : undefined;

  console.log(JSON.stringify({ ...summary, reportPath, results }, null, 2));
}

await main();
