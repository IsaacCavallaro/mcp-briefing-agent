import { generateBriefing } from "../briefing/agent.js";
import type { EvalResult } from "../briefing/types.js";
import { scenarios } from "./dataset.js";
import { scoreScenario } from "./scoring.js";

async function main(): Promise<void> {
  const results: EvalResult[] = [];

  for (const scenario of scenarios) {
    const briefing = await generateBriefing({
      topic: scenario.topic,
      audience: scenario.audience,
      limit: 3,
      live: Boolean(process.env.OPENAI_API_KEY)
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

  console.log(JSON.stringify({ passed, total: results.length, averageScore, results }, null, 2));
}

await main();
