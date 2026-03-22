#!/usr/bin/env bash
set -euo pipefail

# codex-os-managed
branch="$(git rev-parse --abbrev-ref HEAD)"
pattern='^codex/(feat|fix|chore|refactor|docs|test|perf|ci|spike|hotfix)/[a-z0-9]+(-[a-z0-9]+)*$'

if [[ "$branch" == "HEAD" && ( "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ) ]]; then
  echo "Detached HEAD allowed in CI."
  exit 0
fi

if [[ ( "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ) && ( "$branch" == "main" || "$branch" == "master" ) ]]; then
  echo "Protected branch $branch allowed in CI."
  exit 0
fi

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "Direct work on $branch is blocked."
  exit 1
fi

if ! [[ "$branch" =~ $pattern ]]; then
  echo "Invalid branch: $branch"
  echo "Expected: codex/<type>/<slug>"
  exit 1
fi
