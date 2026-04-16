import test from "node:test";
import assert from "node:assert/strict";

import { validateBriefingRequest } from "../src/briefing/request.js";

test("validateBriefingRequest trims valid input", () => {
  const result = validateBriefingRequest({
    topic: "  Why evals matter for agent apps  ",
    audience: "  technical team  ",
    limit: 3,
    live: false
  });

  assert.equal(result.topic, "Why evals matter for agent apps");
  assert.equal(result.audience, "technical team");
});

test("validateBriefingRequest rejects too-short topics", () => {
  assert.throws(
    () =>
      validateBriefingRequest({
        topic: "ai",
        audience: "team",
        limit: 3,
        live: false
      }),
    /Topic must be at least 5 characters long/
  );
});
