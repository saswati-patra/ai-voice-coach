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

The current OpenTofu configuration provisions the dev cloud foundation: required APIs, Firebase Auth foundation with Google account sign-in, Firebase Web App config, Firebase Hosting, Firestore, Cloud Storage, Artifact Registry, backend and GitHub Actions service accounts, Workload Identity Federation, and baseline IAM.

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

OpenTofu can manage the cloud resources, but it needs authentication plus Service Usage and Cloud Resource Manager before the first apply:

```bash
export PROJECT_ID="your-google-cloud-project-id"
gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud auth application-default set-quota-project "$PROJECT_ID"
gcloud services enable \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project "$PROJECT_ID"
```

If the project is new, create it and link billing before this step.

## Local Commands

From the repo root:

```bash
cp infra/tofu/terraform.tfvars.example infra/tofu/terraform.tfvars
```

Edit `infra/tofu/terraform.tfvars`. The Google sign-in provider needs an OAuth
web client ID and secret; keep those real values only in the ignored local
`terraform.tfvars` file.

Then run:

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
tofu -chdir=infra/tofu output -raw firebase_project_id
tofu -chdir=infra/tofu output -json firebase_frontend_env
tofu -chdir=infra/tofu output -json github_actions_variables
tofu -chdir=infra/tofu output -raw backend_service_account_email
```

Use `study_materials_bucket_name` in `backend/.env` as `GOOGLE_CLOUD_STORAGE_BUCKET`.
Use `firebase_frontend_env` for `frontend/.env`.

Use `github_actions_variables` to populate GitHub repository variables for the deployment workflow:

```bash
scripts/sync-github-actions-vars.sh
```

## State And Secrets

Do not commit:

- `.terraform/`
- `*.tfstate`
- `*.tfvars`
- Google Cloud credential files

The Identity Platform Google provider stores the OAuth client secret in OpenTofu
state. Keep state local and uncommitted until a later remote-state milestone
adds a locked-down backend.

Track provider locks and example files such as `.terraform.lock.hcl` and `terraform.tfvars.example`.

## Planned Google Cloud Resources

- Secret Manager secrets and secret versions
- Remote state storage
