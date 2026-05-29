# Runbook

## Local Checks

```bash
npm run ci
```

This runs typecheck, build, tests, and mock-mode evals.

## Start The Service

```bash
npm run serve
```

Health checks:

```bash
curl --fail http://127.0.0.1:8787/health
curl --fail http://127.0.0.1:8787/ready
```

Create a mock briefing:

```bash
curl --silent http://127.0.0.1:8787/brief \
  --header "content-type: application/json" \
  --data '{"topic":"Why evals matter for agent apps","audience":"engineering manager","saveRun":true}'
```

## Docker Stack

```bash
docker compose up --build
```

The agent runs on `http://127.0.0.1:8787`. Prometheus runs on `http://127.0.0.1:9090`.

## Common Failures

`Live mode with MODEL_PROVIDER=openai requires MODEL_API_KEY or OPENAI_API_KEY.`

The service is trying to run live mode without credentials. Use mock mode, or provide a model key intentionally.

`Failed to connect to the local MCP server`

Run `npm run build` and retry. The built runtime launches `dist/mcp/server.js`; the dev runtime launches the TypeScript server through `tsx`.

`npm run eval` fails expected-term checks.

Review the generated markdown shape first. Most failures mean the prompt, mock briefing, or source library changed without updating the eval expectations.
