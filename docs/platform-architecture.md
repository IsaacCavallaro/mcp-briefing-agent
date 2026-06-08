# Platform Architecture

`mcp-briefing-agent` now includes a no-cost platform layer. It is designed to show the same operational boundaries used in a cloud deployment while staying safe to run on a laptop or in CI.

## Local Runtime Shape

```text
developer or CI
  |
  +--> npm checks, unit tests, eval gates
  |
  +--> docker build mcp-briefing-agent:local
          |
          v
    local Kubernetes cluster
          |
          +--> Service :8787
          |
          +--> Deployment
                |
                +--> /health readiness and liveness probes
                +--> /ready configuration readiness
                +--> /metrics Prometheus scrape endpoint
                +--> /brief mock-mode briefing endpoint
                +--> /app/runs emptyDir run-history boundary
```

The local Kustomize overlay uses the locally built image and `imagePullPolicy: Never`, so it does not require a paid container registry.

## Cloud Mapping

The same shape can be mapped to paid infrastructure later, but this repo intentionally avoids doing so:

- container registry: ECR, GHCR, Artifact Registry, or ACR
- runtime: ECS Fargate, Cloud Run, Azure Container Apps, or Kubernetes
- durable run history: Postgres or object storage
- metrics and logs: managed Prometheus, CloudWatch, Grafana Cloud, or OpenTelemetry collector
- secrets: a cloud secret manager for live model keys

The reference Terraform under `platform/terraform/aws-reference` records this mapping without declaring cloud resources or requiring credentials.

## Operational Boundaries

- Mock mode remains the default, so demos and CI do not call paid model APIs.
- Kubernetes probes use the existing `/health` and `/ready` endpoints.
- Prometheus discovery can scrape `/metrics` through pod annotations.
- Run history is local and ephemeral in Kubernetes by default. This keeps the demo cost-free while making the persistence boundary explicit.
- Rollbacks use native Kubernetes deployment revision history.

## What This Proves

This is not a real hosted production deployment. It is a runnable production-shaped package that demonstrates containerization, deployment manifests, validation, health checks, metrics, resource limits, pod security defaults, rollout/rollback, and infrastructure-as-code hygiene without cloud billing risk.
