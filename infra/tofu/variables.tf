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

variable "study_materials_bucket_name" {
  description = "Globally unique Cloud Storage bucket name for uploaded study materials. Defaults to <project_id>-<environment>-study-materials."
  type        = string
  default     = null
}

variable "artifact_repository_id" {
  description = "Artifact Registry Docker repository ID. Defaults to ai-voice-coach-<environment>."
  type        = string
  default     = null
}

variable "backend_service_account_id" {
  description = "Service account ID for the backend runtime. Must be 30 characters or fewer. Defaults to ai-voice-coach-<environment>."
  type        = string
  default     = null
}

variable "force_destroy_buckets" {
  description = "Whether OpenTofu can delete non-empty buckets. Keep false for normal environments."
  type        = bool
  default     = false
}
