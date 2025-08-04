#!/usr/bin/env bash

set -uo pipefail

# List files that have issues
issues=$(
  find . \
    \( \
    -type d -name node_modules \
    -o -type d -name .venv \
    -o -type d -name test_shell_check \
    \) -prune -false -o \
    -type f -name "*.sh" -exec shellcheck {} + 2>&1 |
    grep '^In ' | awk '{print $2}' | sort -u
)

if [[ -n "$issues" ]]; then
  echo "Shellcheck found issues with the following scripts:"
  echo "$issues"
  exit 1
else
  echo "Shellcheck found no issues."
  exit 0
fi
