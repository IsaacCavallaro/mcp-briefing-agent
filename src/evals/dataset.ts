import type { EvalScenario } from "../briefing/types.js";

export const scenarios: EvalScenario[] = [
  {
    id: "mcp-market",
    topic: "How remote MCP servers change internal tooling",
    audience: "engineering manager",
    expectedTerms: ["MCP", "tools", "protocol", "signals"]
  },
  {
    id: "evals-reliability",
    topic: "Why evals matter for agent reliability",
    audience: "product lead",
    expectedTerms: ["eval", "reliability", "regression", "signals"]
  },
  {
    id: "responses-strategy",
    topic: "Why the Responses API is a better fit for agent apps",
    audience: "staff engineer",
    expectedTerms: ["Responses API", "tool", "reasoning", "summary"]
  }
];
