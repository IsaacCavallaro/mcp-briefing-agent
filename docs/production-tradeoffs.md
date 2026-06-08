# Production Tradeoffs

This repo is a portfolio-scale production simulation. It intentionally avoids paid infrastructure and account risk while still showing the engineering boundaries a production service would need.

## What Is Real

- MCP server and client boundary
- model provider abstraction
- mock-mode fallback for deterministic local behavior
- eval runner
- HTTP service wrapper
- Docker runtime
- Kubernetes manifests and local Kustomize overlay
- Terraform/OpenTofu validation for local and reference platform shapes
- Prometheus-compatible metrics
- saved run and eval artifacts

## What Is Simulated

- durable storage is local JSON artifacts, not a managed database
- the briefing library is in-memory
- Prometheus is local only
- live model calls are opt-in
- the AWS platform shape is reference-only and creates no resources

## Cloud Mapping

If this were deployed for a team, the same shape could map to:

- HTTP service on ECS, Cloud Run, Fly.io, or Kubernetes
- run history in Postgres
- source documents in Notion, GitHub, Jira, or object storage
- OpenTelemetry traces exported to a managed backend
- CI running mock evals on every PR and live evals only on a protected schedule

The local version avoids those costs while preserving the architectural decisions.
