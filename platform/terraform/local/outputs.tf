output "kubernetes_manifests" {
  description = "Rendered Kubernetes YAML for the local no-cost platform shape."
  value       = [for manifest in local.manifests : yamlencode(manifest)]
}

output "smoke_test_url" {
  description = "Local URL used after port-forwarding the Kubernetes service."
  value       = "http://127.0.0.1:${var.container_port}"
}
