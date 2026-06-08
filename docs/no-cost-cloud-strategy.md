# No-Cost Cloud Strategy

The goal of this platform layer is to demonstrate cloud/platform engineering judgment without creating billing risk.

## Billing Guardrails

- No workflow authenticates to AWS, GCP, Azure, or a paid registry.
- No Terraform/OpenTofu configuration declares real cloud resources.
- The AWS directory is reference-only and has no provider or `resource` blocks.
- Kubernetes defaults use a local image and local cluster.
- Mock mode remains the default, so test and demo traffic does not call paid model APIs.

## What Is Real

- Docker image build path
- Docker Compose service plus local Prometheus
- Kubernetes deployment, service, probes, resource limits, pod security defaults, and metrics annotations
- Kustomize local overlay
- Terraform/OpenTofu validation and generated local platform shape
- CI checks for application behavior, evals, Kubernetes manifests, and IaC formatting/validation

## What Is Deliberately Simulated

- Managed container registry
- Hosted Kubernetes/ECS/Cloud Run runtime
- Managed Postgres or object storage
- Managed metrics/logging backend
- Cloud secret manager

Those pieces are documented as production mappings instead of provisioned infrastructure.

## Reviewer Narrative

This repo is intended to answer: "Can this engineer design, package, validate, and operate a service with production-shaped boundaries?"

The answer should be visible without requiring a hiring manager or reviewer to provision cloud resources. They can inspect the platform files, run local validation, start Docker Compose, or apply the Kubernetes overlay to a local cluster.
