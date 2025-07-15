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

# Determine which Python binary to use.
# Using "python --version" is a simple and very fast check.
root="$(dirname "$0")/_boxed"
for libc in glibc musl; do
  if "$root/$libc/python/bin/python" --version > /dev/null 2>&1; then
    # Execute the plugin using the discovered interpreter.
    boxed_root="$root/$libc"
    export PATH="$boxed_root/python/bin:$PATH"
    cd "$boxed_root" || exit 1
    exec python -m engine.plugins "$@"
  fi
done

echo "$0: No suitable Python intepreter found" >&2
exit 1
