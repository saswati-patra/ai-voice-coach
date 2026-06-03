output "project_id" {
  description = "Google Cloud project ID targeted by this OpenTofu configuration."
  value       = var.project_id
}

output "region" {
  description = "Primary Google Cloud region."
  value       = var.region
}

output "environment" {
  description = "Deployment environment name."
  value       = var.environment
}

output "enabled_apis" {
  description = "Google Cloud APIs managed by OpenTofu."
  value       = sort(keys(google_project_service.apis))
}

output "backend_service_account_email" {
  description = "Backend runtime service account email."
  value       = google_service_account.backend.email
}

output "firestore_database_name" {
  description = "Firestore database name."
  value       = google_firestore_database.default.name
}

output "firebase_project_id" {
  description = "Firebase project ID used for backend Firebase Auth token verification."
  value       = google_firebase_project.default.project
}

output "study_materials_bucket_name" {
  description = "Cloud Storage bucket for uploaded study materials."
  value       = google_storage_bucket.study_materials.name
}

output "artifact_registry_repository_id" {
  description = "Artifact Registry Docker repository ID."
  value       = google_artifact_registry_repository.backend.repository_id
}

output "artifact_registry_repository_name" {
  description = "Fully qualified Artifact Registry repository resource name."
  value       = google_artifact_registry_repository.backend.name
}
