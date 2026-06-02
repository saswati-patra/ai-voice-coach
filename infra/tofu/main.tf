terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 8.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  artifact_repository_id     = coalesce(var.artifact_repository_id, "ai-voice-coach-${var.environment}")
  backend_service_account_id = coalesce(var.backend_service_account_id, "ai-voice-coach-${var.environment}")
  study_materials_bucket     = coalesce(var.study_materials_bucket_name, "${var.project_id}-${var.environment}-study-materials")

  required_apis = toset([
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "identitytoolkit.googleapis.com",
    "logging.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
  ])
}

resource "google_project_service" "apis" {
  for_each = local.required_apis

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_service_account" "backend" {
  project      = var.project_id
  account_id   = local.backend_service_account_id
  display_name = "AI Voice Coach Backend (${var.environment})"

  depends_on = [
    google_project_service.apis["iam.googleapis.com"],
  ]
}

resource "google_project_iam_member" "backend_vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.backend.email}"

  depends_on = [
    google_project_service.apis["aiplatform.googleapis.com"],
  ]
}

resource "google_project_iam_member" "backend_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend.email}"

  depends_on = [
    google_project_service.apis["firestore.googleapis.com"],
  ]
}

resource "google_project_iam_member" "backend_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.backend.email}"

  depends_on = [
    google_project_service.apis["logging.googleapis.com"],
  ]
}

resource "google_project_iam_member" "backend_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"

  depends_on = [
    google_project_service.apis["secretmanager.googleapis.com"],
  ]
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [
    google_project_service.apis["firestore.googleapis.com"],
  ]
}

resource "google_storage_bucket" "study_materials" {
  project                     = var.project_id
  name                        = local.study_materials_bucket
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.force_destroy_buckets

  depends_on = [
    google_project_service.apis["storage.googleapis.com"],
  ]
}

resource "google_storage_bucket_iam_member" "backend_study_materials_object_admin" {
  bucket = google_storage_bucket.study_materials.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_artifact_registry_repository" "backend" {
  project       = var.project_id
  location      = var.region
  repository_id = local.artifact_repository_id
  description   = "Docker images for AI Voice Coach ${var.environment}"
  format        = "DOCKER"

  depends_on = [
    google_project_service.apis["artifactregistry.googleapis.com"],
  ]
}
