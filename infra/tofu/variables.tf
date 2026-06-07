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

variable "cloud_run_service_name" {
  description = "Cloud Run service name for the backend. Defaults to ai-voice-coach-<environment>."
  type        = string
  default     = null
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy through Workload Identity Federation, in OWNER/REPO format."
  type        = string
  default     = "saswati-patra/ai-voice-coach"
}

variable "github_actions_service_account_id" {
  description = "Service account ID used by GitHub Actions deployments. Must be 30 characters or fewer. Defaults to ai-voice-coach-gh-<environment>."
  type        = string
  default     = null
}

variable "github_workload_identity_pool_id" {
  description = "Workload Identity Pool ID for GitHub Actions. Must be globally unique within the project."
  type        = string
  default     = null
}

variable "firebase_hosting_site_id" {
  description = "Firebase Hosting site ID. Defaults to the Google Cloud project ID."
  type        = string
  default     = null
}

variable "identity_platform_extra_authorized_domains" {
  description = "Additional domains allowed for Identity Platform OAuth redirects."
  type        = list(string)
  default     = []
}

variable "google_oauth_client_id" {
  description = "OAuth client ID for Identity Platform Google sign-in."
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "OAuth client secret for Identity Platform Google sign-in."
  type        = string
  sensitive   = true
}

variable "force_destroy_buckets" {
  description = "Whether OpenTofu can delete non-empty buckets. Keep false for normal environments."
  type        = bool
  default     = false
}
