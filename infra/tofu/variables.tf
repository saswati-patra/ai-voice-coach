variable "project_id" {
  description = "Google Cloud project ID for the AI Voice Coach environment."
  type        = string
}

variable "region" {
  description = "Primary Google Cloud region."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}
