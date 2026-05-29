import test from "node:test";
import assert from "node:assert/strict";

import { resolveServerCommand } from "../src/mcp/client.js";

test("resolveServerCommand uses the tsx loader when invoked from src even if dist exists", () => {
  const result = resolveServerCommand(
    "file:///Users/example/Development/mcp-briefing-agent/src/mcp/client.ts",
    () => true
  );

  assert.equal(result.command, process.execPath);
  assert.equal(result.args[0], "--import");
  assert.equal(result.args[1], "tsx");
  assert.equal(
    result.args[2],
    "/Users/example/Development/mcp-briefing-agent/src/mcp/server.ts"
  );
});

test("resolveServerCommand uses built server when invoked from dist", () => {
  const result = resolveServerCommand(
    "file:///Users/example/Development/mcp-briefing-agent/dist/mcp/client.js",
    () => true
  );

  assert.equal(result.command, process.execPath);
  assert.equal(
    result.args[0],
    "/Users/example/Development/mcp-briefing-agent/dist/mcp/server.js"
  );
});
