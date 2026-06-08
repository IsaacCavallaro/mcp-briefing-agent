locals {
  labels = {
    "app.kubernetes.io/name"    = var.app_name
    "app.kubernetes.io/part-of" = var.app_name
  }

  selector_labels = {
    "app.kubernetes.io/name"      = var.app_name
    "app.kubernetes.io/component" = "service"
  }

  config = {
    NODE_ENV           = "production"
    PORT               = tostring(var.container_port)
    BRIEFING_SAVE_RUNS = "1"
    BRIEFING_RUN_DIR   = "/app/runs"
  }

  namespace_manifest = {
    apiVersion = "v1"
    kind       = "Namespace"
    metadata = {
      name   = var.namespace
      labels = local.labels
    }
  }

  config_map_manifest = {
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "${var.app_name}-config"
      namespace = var.namespace
      labels    = merge(local.labels, { "app.kubernetes.io/component" = "config" })
    }
    data = local.config
  }

  deployment_manifest = {
    apiVersion = "apps/v1"
    kind       = "Deployment"
    metadata = {
      name      = var.app_name
      namespace = var.namespace
      labels    = merge(local.labels, { "app.kubernetes.io/component" = "service" })
    }
    spec = {
      replicas             = var.replicas
      revisionHistoryLimit = 3
      selector = {
        matchLabels = local.selector_labels
      }
      template = {
        metadata = {
          labels = local.selector_labels
          annotations = {
            "prometheus.io/scrape" = "true"
            "prometheus.io/path"   = "/metrics"
            "prometheus.io/port"   = tostring(var.container_port)
          }
        }
        spec = {
          containers = [
            {
              name            = "agent"
              image           = var.image
              imagePullPolicy = "Never"
              ports = [
                {
                  name          = "http"
                  containerPort = var.container_port
                }
              ]
              envFrom = [
                {
                  configMapRef = {
                    name = "${var.app_name}-config"
                  }
                }
              ]
              readinessProbe = {
                httpGet = {
                  path = "/ready"
                  port = "http"
                }
              }
              livenessProbe = {
                httpGet = {
                  path = "/health"
                  port = "http"
                }
              }
            }
          ]
        }
      }
    }
  }

  service_manifest = {
    apiVersion = "v1"
    kind       = "Service"
    metadata = {
      name      = var.app_name
      namespace = var.namespace
      labels    = merge(local.labels, { "app.kubernetes.io/component" = "service" })
    }
    spec = {
      type     = "ClusterIP"
      selector = local.selector_labels
      ports = [
        {
          name       = "http"
          port       = var.container_port
          targetPort = "http"
        }
      ]
    }
  }

  manifests = [
    local.namespace_manifest,
    local.config_map_manifest,
    local.deployment_manifest,
    local.service_manifest
  ]
}
