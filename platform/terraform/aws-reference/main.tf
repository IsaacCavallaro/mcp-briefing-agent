locals {
  common_tags = {
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform-reference-only"
  }

  reference_architecture = {
    region = var.region
    container_registry = {
      service = "Amazon ECR"
      image   = "${var.app_name}:<git-sha>"
    }
    service_runtime = {
      service        = "Amazon ECS Fargate or managed Kubernetes"
      container_port = 8787
      health_path    = "/health"
      readiness_path = "/ready"
      metrics_path   = "/metrics"
    }
    durable_run_history = {
      service = "Amazon RDS PostgreSQL or S3 object storage"
      note    = "The local repo stores runs as JSON artifacts to avoid managed database cost."
    }
    observability = {
      metrics = "Prometheus-compatible scrape endpoint"
      logs    = "Container stdout/stderr routed to the platform log backend"
      traces  = "OpenTelemetry-compatible extension point"
    }
    secrets = {
      service = "AWS Secrets Manager or SSM Parameter Store"
      note    = "Live model keys remain opt-in and are never required for mock-mode demos."
    }
    tags = local.common_tags
  }
}
