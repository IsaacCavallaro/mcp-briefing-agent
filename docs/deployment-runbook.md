# Deployment Runbook

This runbook covers the no-cost local deployment path. It does not require cloud accounts, cloud credentials, managed databases, or paid registries.

## Prerequisites

- Docker
- `kubectl`
- an optional local Kubernetes cluster such as Docker Desktop Kubernetes, Rancher Desktop, kind, or minikube
- optional `tofu` or `terraform` for local IaC validation

## Validate Everything

```bash
make ci
make platform-validate
```

If neither `tofu` nor `terraform` is installed, Terraform/OpenTofu validation is skipped locally with a clear message. CI installs OpenTofu and validates those files.

`make k8s-validate` renders the local Kustomize overlay offline. If a local Kubernetes cluster is running, use this additional server-side admission check:

```bash
make k8s-dry-run-local
```

## Docker Compose Demo

```bash
docker compose up --build
```

In another shell:

```bash
make smoke
curl --fail --silent http://127.0.0.1:8787/metrics
```

Prometheus is available at `http://127.0.0.1:9090`.

## Local Kubernetes Deploy

Build the local image:

```bash
make k8s-build-image
```

If using kind, load the image into the cluster:

```bash
kind load docker-image mcp-briefing-agent:local
```

Apply the local overlay:

```bash
kubectl apply -k platform/k8s/local
kubectl -n mcp-briefing-agent rollout status deployment/mcp-briefing-agent --timeout=90s
```

Or run both steps with:

```bash
make k8s-apply-local
```

Port-forward the service:

```bash
make k8s-port-forward
```

In another shell:

```bash
make k8s-smoke
```

## Logs And Metrics

```bash
make k8s-logs
kubectl -n mcp-briefing-agent describe deployment/mcp-briefing-agent
kubectl -n mcp-briefing-agent get pods
```

Metrics are exposed at `/metrics` after port-forwarding.

## Rollback

Kubernetes keeps the last three deployment revisions:

```bash
make k8s-rollback
```

For a real hosted deployment, rollback would be paired with image tags tied to commit SHAs and release notes.

## Cleanup

```bash
make k8s-delete-local
docker compose down
```

## Common Failures

`ImagePullBackOff` or `ErrImageNeverPull`

The local cluster cannot see `mcp-briefing-agent:local`. Rebuild the image and, for kind, run `kind load docker-image mcp-briefing-agent:local`.

`connection refused` during smoke checks

Start `make k8s-port-forward` in another shell and retry the checks.

`live mode requires MODEL_API_KEY`

The service is being asked to run live model mode without credentials. Use mock mode for no-cost demos or provide a key intentionally.
