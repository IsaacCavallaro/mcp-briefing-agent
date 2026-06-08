# MCP Briefing Agent

`mcp-briefing-agent` is a compact TypeScript repo for generating structured briefings with:

- OpenAI Responses API, Gemini, or an OpenAI-compatible provider for agentic reasoning
- MCP server for context and tool boundaries
- Lightweight eval harness for repeatable output checks
- Clean CLI workflow for local runs and quick iteration

This is not another generic chatbot. It is a small, reviewable system that demonstrates how to compose model reasoning, tool use, and protocol-driven context into one coherent app.

## Architecture

```text
user prompt
   |
   v
CLI command
   |
   v
Model API loop
   |
   +--> function tool: search_library ------+
   |                                        |
   +--> function tool: read_briefing        |
                                            v
                                   MCP client over stdio
                                            |
                                            v
                                     local MCP server
                                            |
                                            v
                                      briefing library
```

The model never reaches directly into the data layer. It reasons over tool results, while the MCP server owns the context surface.

## Repo Layout

```text
src/
  briefing/
    agent.ts        # Model loop for OpenAI, Gemini, and mock mode
    library.ts      # Sample briefing corpus and search logic
    types.ts        # Shared domain types
  evals/
    dataset.ts      # Scenario fixtures
    run.ts          # Lightweight evaluation runner
  mcp/
    client.ts       # Stdio MCP client wrapper
    server.ts       # Local MCP server exposing tools/resources
  cli.ts            # CLI entrypoint
docs/
platform/
  k8s/              # Base and local Kubernetes manifests
  terraform/        # Provider-free local and AWS reference IaC
```

## Quickstart

1. Install dependencies.

```bash
npm install
```

2. Copy the environment file.

```bash
cp .env.example .env
```

3. Configure a provider in `.env`.

Gemini free-tier setup:

```env
MODEL_PROVIDER=gemini
MODEL_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-2.5-flash-lite
```

4. Run a live briefing.

```bash
npm run brief -- --topic "How remote MCP servers change internal tooling" --audience "engineering manager" --live
```

5. Run the eval harness.

```bash
npm run eval
```

If `--live` is not used, the repo falls back to deterministic mock mode so the architecture is still demoable without secrets.

## Provider Configuration

The project supports:

- `MODEL_PROVIDER=gemini`
- `MODEL_PROVIDER=openai`
- `MODEL_PROVIDER=openai-compatible`

Gemini setup:

```env
MODEL_PROVIDER=gemini
MODEL_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-2.5-flash-lite
```

For Gemini, `MODEL_BASE_URL` is optional. If it is not set, the repo uses the Google OpenAI-compatible endpoint automatically.

OpenAI setup:

```env
MODEL_PROVIDER=openai
MODEL_API_KEY=your_api_key
MODEL_NAME=gpt-5
```

OpenAI-compatible setup:

```env
MODEL_PROVIDER=openai-compatible
MODEL_BASE_URL=http://localhost:11434/v1
MODEL_API_KEY=local
MODEL_NAME=your-model-name
```

The second option is useful for local or free models exposed through an OpenAI-compatible endpoint.

## Commands

```bash
npm run brief -- --topic "Why evals matter for agent apps"
npm run brief -- --topic "Remote MCP servers" --save-run --trace
npm run catalog
npm run mcp
npm run eval
npm run eval:report
npm run test
npm run build
npm run serve
npm start         # run the compiled CLI after build
```

## Local Service

The repo includes a small standard-library HTTP wrapper so the agent can be exercised like a service without deploying anything or creating cloud resources.

```bash
npm run serve
```

Endpoints:

- `GET /health`
- `GET /ready`
- `GET /catalog`
- `GET /metrics`
- `POST /brief`

Example request:

```bash
curl --silent http://127.0.0.1:8787/brief \
  --header "content-type: application/json" \
  --data '{"topic":"Why evals matter for agent apps","audience":"engineering manager","saveRun":true}'
```

By default, `POST /brief` uses mock mode unless the request explicitly sets `"live": true`. That keeps the service safe to run for portfolio review without paid model calls.

## Local Production Shape

This project is intentionally runnable without paid accounts:

- Dockerfile for a built Node runtime
- Docker Compose for the HTTP service, local Postgres run history, and local Prometheus
- Kubernetes manifests with local Kustomize overlay, health probes, metrics annotations, resource limits, and rollback path
- Terraform/OpenTofu validation for local and reference platform shapes without cloud credentials
- Prometheus text metrics at `/metrics`
- JSON run artifacts under `runs/` when `--save-run`, `"saveRun": true`, or `BRIEFING_SAVE_RUNS=1` is used
- optional Postgres-backed run history with queryable metadata and JSONB request/result/trace payloads
- eval reports under `reports/evals/latest.json` when `npm run eval:report` is used
- architecture, runbook, tradeoff, and threat-model notes under [`docs/`](./docs)

Run the local stack:

```bash
docker compose up --build
```

Then open:

- agent service: `http://127.0.0.1:8787`
- Postgres: `postgres://briefing_agent:briefing_agent@127.0.0.1:5432/briefing_agent`
- Prometheus: `http://127.0.0.1:9090`

See [run history storage](./docs/run-history-storage.md) for the Postgres schema, local query examples, and production mapping.

## Platform Engineering Demo

The repo includes a no-cost platform package that demonstrates production-shaped deployment practices without requiring AWS, GCP, Azure, a paid registry, or a managed database.

Key docs:

- [Platform architecture](./docs/platform-architecture.md)
- [Deployment runbook](./docs/deployment-runbook.md)
- [No-cost cloud strategy](./docs/no-cost-cloud-strategy.md)

Validate the platform artifacts:

```bash
make platform-validate
```

Render and validate the local Kubernetes overlay without a cluster:

```bash
make k8s-render
make k8s-validate
```

If a local cluster is running, check server-side admission without applying:

```bash
make k8s-dry-run-local
```

Run in a local Kubernetes cluster:

```bash
make k8s-apply-local
make k8s-port-forward
make k8s-smoke
```

The local overlay uses `mcp-briefing-agent:local` with `imagePullPolicy: Never`, so it does not pull from or push to a remote registry. If you use kind, load the built image with `kind load docker-image mcp-briefing-agent:local` before applying the overlay.

## Example Output Shape

The agent returns markdown with a stable structure:

- Executive summary
- Why this matters now
- Key signals
- Risks and unknowns
- Suggested next moves
- Source notes

That makes it easy to score in the eval script and compare outputs across runs.

## Next Extensions

- swap the in-memory briefing library for Notion, GitHub, or Jira ingestion
- add durable run storage behind the current JSON artifact boundary
- add a second evaluator for citation quality and actionability
- expose the MCP server remotely instead of over stdio
