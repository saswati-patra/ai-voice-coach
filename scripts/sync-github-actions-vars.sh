#!/usr/bin/env bash
set -euo pipefail

repo="${1:-}"

if [[ -z "$repo" ]]; then
  repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
fi

tofu -chdir=infra/tofu output -json github_actions_variables \
  | jq -r 'to_entries[] | @tsv' \
  | while IFS=$'\t' read -r name value; do
      gh variable set "$name" --repo "$repo" --body "$value"
    done

echo "Synced GitHub Actions variables for ${repo}."
