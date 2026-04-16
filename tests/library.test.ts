import test from "node:test";
import assert from "node:assert/strict";

import { getBrief, searchBriefs } from "../src/briefing/library.js";

test("searchBriefs returns relevant results for MCP queries", () => {
  const results = searchBriefs("mcp protocol tools", 2);
  assert.ok(results.length > 0);
  assert.equal(results[0]?.id, "mcp-protocol");
});

test("getBrief returns a known document", () => {
  const result = getBrief("responses-api");
  assert.ok(result);
  assert.equal(result?.title, "Responses API becomes the default agent loop");
});
