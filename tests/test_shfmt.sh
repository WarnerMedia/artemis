#!/usr/bin/env bash

set -euo pipefail

# List files that need formatting
unformatted=$(shfmt -l .)

if [[ -n "$unformatted" ]]; then
  echo "shfmt found issues with the following scripts:"
  echo "$unformatted"
  exit 1
else
  echo "shfmt found no issues."
  exit 0
fi
