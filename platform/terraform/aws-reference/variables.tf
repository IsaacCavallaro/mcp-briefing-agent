variable "app_name" {
  description = "Application name used in the reference AWS architecture."
  type        = string
  default     = "mcp-briefing-agent"
}

variable "environment" {
  description = "Reference environment name. This does not create infrastructure."
  type        = string
  default     = "portfolio"
}

variable "region" {
  description = "Reference AWS region. This is documentation data only."
  type        = string
  default     = "us-east-1"
}
