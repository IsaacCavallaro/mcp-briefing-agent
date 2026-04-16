import test from "node:test";
import assert from "node:assert/strict";

import { scoreScenario } from "../src/evals/scoring.js";

test("scoreScenario passes a well-structured briefing", () => {
  const result = scoreScenario(
    `## Executive Summary

Text

## Why This Matters Now

Text

## Key Signals

- MCP matters
- tool calling matters
- evals matter

## Risks And Unknowns

Text

## Suggested Next Moves

- Do one
- Do two

## Source Notes

- Responses API
`,
    ["MCP", "tool", "evals"]
  );

  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
});

test("scoreScenario flags missing sections", () => {
  const result = scoreScenario("short output", ["MCP", "tool"]);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.length > 0);
});
