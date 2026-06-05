terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 8.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 6.0, < 8.0"
    }
  }
}

provider "google" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}

locals {
  artifact_repository_id               = coalesce(var.artifact_repository_id, "ai-voice-coach-${var.environment}")
  backend_service_account_id           = coalesce(var.backend_service_account_id, "ai-voice-coach-${var.environment}")
  cloud_run_service_name               = coalesce(var.cloud_run_service_name, "ai-voice-coach-${var.environment}")
  github_actions_service_account_id    = coalesce(var.github_actions_service_account_id, "ai-voice-coach-gh-${var.environment}")
  github_workload_identity_pool_id     = coalesce(var.github_workload_identity_pool_id, "github-actions-${var.environment}")
  github_workload_identity_provider_id = "github"
  firebase_hosting_site_id             = coalesce(var.firebase_hosting_site_id, var.project_id)
  study_materials_bucket               = coalesce(var.study_materials_bucket_name, "${var.project_id}-${var.environment}-study-materials")

  required_apis = toset([
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
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

resource "google_service_account" "github_actions_deployer" {
  project      = var.project_id
  account_id   = local.github_actions_service_account_id
  display_name = "AI Voice Coach GitHub Actions Deployer (${var.environment})"

  depends_on = [
    google_project_service.apis["iam.googleapis.com"],
  ]
}

resource "google_iam_workload_identity_pool" "github_actions" {
  project                   = var.project_id
  workload_identity_pool_id = local.github_workload_identity_pool_id
  display_name              = "GitHub Actions ${var.environment}"
  description               = "GitHub Actions OIDC pool for ${var.github_repository}."

  depends_on = [
    google_project_service.apis["iam.googleapis.com"],
  ]
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = local.github_workload_identity_provider_id
  display_name                       = "GitHub Actions"
  description                        = "Trusts GitHub Actions tokens for ${var.github_repository}."

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.ref"        = "assertion.ref"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_actions_workload_identity_user" {
  service_account_id = google_service_account.github_actions_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/${var.github_repository}"
}

resource "google_service_account_iam_member" "github_actions_can_use_backend_runtime" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions_deployer.email}"
}

resource "google_project_iam_member" "github_actions_deployer_roles" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/firebasehosting.admin",
    "roles/run.admin",
    "roles/serviceusage.apiKeysViewer",
  ])

  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.github_actions_deployer.email}"
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

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [
    google_project_service.apis["firebase.googleapis.com"],
    google_project_service.apis["identitytoolkit.googleapis.com"],
  ]
}

resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = google_firebase_project.default.project

  sign_in {
    email {
      enabled           = true
      password_required = true
    }

    phone_number {
      enabled            = false
      test_phone_numbers = {}
    }
  }

  depends_on = [
    google_project_service.apis["identitytoolkit.googleapis.com"],
  ]
}

resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = google_firebase_project.default.project
  display_name = "AI Voice Coach Frontend (${var.environment})"

  depends_on = [
    google_identity_platform_config.default,
  ]
}

data "google_firebase_web_app_config" "frontend" {
  provider   = google-beta
  project    = google_firebase_web_app.frontend.project
  web_app_id = google_firebase_web_app.frontend.app_id
}

resource "google_firebase_hosting_site" "frontend" {
  provider = google-beta
  project  = google_firebase_project.default.project
  site_id  = local.firebase_hosting_site_id
  app_id   = google_firebase_web_app.frontend.app_id

  depends_on = [
    google_project_service.apis["firebasehosting.googleapis.com"],
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
