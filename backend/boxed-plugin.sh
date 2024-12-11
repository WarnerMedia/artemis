#!/bin/sh
# Bootstrap for launching boxed plugins.
# This script is run from within the plugin container.

# Trim options passed to the legacy self-extracting executable.
# We assume that the self-extracting executable options end with "--"
# so we can safely trim all args before that.
i=0
for opt in "$@"; do
  i=$((i+1))
  if [ "$opt" = '--' ]; then
    shift $i
    break
  fi
done

# We assume we are in a glibc-based distribution.
PACKAGED_ROOT="$(dirname "$0")/.boxed/glibc"

export PATH="$PACKAGED_ROOT/.packaged_python/python/bin:$PATH"
cd "$PACKAGED_ROOT" || exit 1
exec python -m engine.plugins "$@"
