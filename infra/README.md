# AI Voice Coach Infrastructure

Infrastructure-as-code for Google Cloud resources, managed with OpenTofu.

## Structure

```text
tofu/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars.example
```

The current OpenTofu configuration provisions the dev cloud foundation: required APIs, Firebase Auth foundation, Firestore, Cloud Storage, Artifact Registry, a backend service account, and baseline IAM.

## Prerequisites

Install OpenTofu:

```bash
brew install opentofu
```

Confirm installation:

```bash
tofu version
```

## Bootstrap

OpenTofu can manage the cloud resources, but it needs authentication and the Service Usage API before the first apply:

```bash
export PROJECT_ID="your-google-cloud-project-id"
gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud auth application-default set-quota-project "$PROJECT_ID"
gcloud services enable serviceusage.googleapis.com --project "$PROJECT_ID"
```

If the project is new, create it and link billing before this step.

## Local Commands

From the repo root:

```bash
cp infra/tofu/terraform.tfvars.example infra/tofu/terraform.tfvars
```

Edit `infra/tofu/terraform.tfvars`, then run:

```bash
tofu -chdir=infra/tofu init
tofu -chdir=infra/tofu fmt
tofu -chdir=infra/tofu validate
tofu -chdir=infra/tofu plan
tofu -chdir=infra/tofu apply
```

Useful outputs after apply:

```bash
tofu -chdir=infra/tofu output
tofu -chdir=infra/tofu output -raw study_materials_bucket_name
tofu -chdir=infra/tofu output -raw backend_service_account_email
```

Use `study_materials_bucket_name` in `backend/.env` as `GOOGLE_CLOUD_STORAGE_BUCKET`.

## State And Secrets

Do not commit:

- `.terraform/`
- `.terraform.lock.hcl`
- `*.tfstate`
- `*.tfvars`
- Google Cloud credential files

Track only example files such as `terraform.tfvars.example`.

## Planned Google Cloud Resources

- Cloud Run deployment
- Firebase Web App and sign-in provider setup for the frontend milestone
- Secret Manager secrets and secret versions
- Remote state storage
