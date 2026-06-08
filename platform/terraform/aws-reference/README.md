# AWS Reference Shape

This directory is a reference-only Terraform/OpenTofu model. It intentionally declares no AWS provider and no `resource` blocks, so `init`, `validate`, and `output` are safe to run without credentials or billable infrastructure.

The purpose is to document how the local service would map to AWS if a real deployment were approved:

- ECR for the container artifact
- ECS Fargate or managed Kubernetes for runtime
- RDS PostgreSQL or S3 for durable run history
- Prometheus-compatible metrics and platform logs
- Secrets Manager or SSM Parameter Store for live model keys

Do not convert this into applied infrastructure without an explicit cloud account, budget, and cleanup plan.
