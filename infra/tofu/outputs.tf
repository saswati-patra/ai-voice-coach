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
