# Architecture

`mcp-briefing-agent` is a local-first agent service. It demonstrates model orchestration, MCP tool boundaries, evals, and operational surfaces without requiring paid cloud infrastructure.

## Runtime Shape

```text
HTTP client or CLI
  |
  v
briefing request
  |
  v
agent loop
  |
  +--> MCP client over stdio
          |
          v
        MCP server
          |
          v
        briefing library
```

The model never reads the document library directly. It asks for context through tools, while the MCP server owns the allowed resource surface.

## Entrypoints

- CLI: `src/cli.ts`
- HTTP service: `src/http/server.ts`
- MCP server: `src/mcp/server.ts`
- eval runner: `src/evals/run.ts`

## Safety Defaults

Mock mode is the default unless the CLI uses `--live` or the HTTP request sets `"live": true`. This prevents accidental paid model calls during local demos, CI, and portfolio review.

## Observability

Each briefing result includes an in-memory trace with request validation, MCP connection, search/read calls, model tool calls, and completion events. The HTTP service exposes Prometheus text metrics at `/metrics`.

Run artifacts can be saved locally as JSON under `runs/`. Eval reports can be saved under `reports/evals/latest.json`.
