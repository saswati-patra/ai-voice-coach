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

The current OpenTofu configuration is a skeleton. It validates, but it does not provision Google Cloud resources yet.

## Prerequisites

Install OpenTofu:

```bash
brew install opentofu
```

Confirm installation:

```bash
tofu version
```

## Local Commands

From the repo root:

```bash
tofu -chdir=infra/tofu fmt
tofu -chdir=infra/tofu validate
```

When resources are added later:

```bash
cp infra/tofu/terraform.tfvars.example infra/tofu/terraform.tfvars
tofu -chdir=infra/tofu init
tofu -chdir=infra/tofu plan
```

## State And Secrets

Do not commit:

- `.terraform/`
- `.terraform.lock.hcl`
- `*.tfstate`
- `*.tfvars`
- Google Cloud credential files

Track only example files such as `terraform.tfvars.example`.

## Planned Google Cloud Resources

- Required project APIs
- Service accounts and IAM
- Artifact Registry
- Cloud Run
- Firestore
- Cloud Storage
- Firebase Authentication setup where practical
- Secret Manager
- Vertex AI enablement
