# Local Terraform/OpenTofu

This directory is intentionally provider-free. It validates the local platform shape and renders Kubernetes YAML outputs without talking to a cloud provider, creating stateful infrastructure, or requiring credentials.

```bash
tofu init -backend=false
tofu validate
tofu output kubernetes_manifests
```

Use `terraform` instead of `tofu` if that is the installed CLI on your machine.
