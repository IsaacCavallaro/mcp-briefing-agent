variable "app_name" {
  description = "Application name used across generated local platform manifests."
  type        = string
  default     = "mcp-briefing-agent"
}

variable "namespace" {
  description = "Kubernetes namespace for the local platform shape."
  type        = string
  default     = "mcp-briefing-agent"
}

variable "image" {
  description = "Container image reference used by the local Kubernetes deployment."
  type        = string
  default     = "mcp-briefing-agent:local"
}

variable "container_port" {
  description = "HTTP port exposed by the agent service."
  type        = number
  default     = 8787
}

variable "replicas" {
  description = "Replica count for the local deployment."
  type        = number
  default     = 1
}
