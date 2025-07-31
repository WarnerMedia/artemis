#!/usr/bin/env bash

# Generate the download URL for a ShellCheck release tarball for the specified version.
# This takes into account the current OS and architecture.

set -o pipefail

readonly version="$1"
shift
if [[ $version == '' ]]; then
  echo "Usage: $0 version" >&2
  exit 1
fi

platform="$(uname | tr '[:upper:]' '[:lower:]')" || exit 1
if [[ $platform != 'darwin' && $platform != 'linux' ]]; then
  echo "Unsupported ShellCheck release platform: $platform" >&2
  exit 1
fi
readonly platform

arch="$(uname -m)" || exit 1
case "$arch" in
aarch64 | x86_64) ;;
arm64) arch=aarch64 ;;
*)
  echo "Unsupported ShellCheck release architecture: $arch" >&2
  exit 1
  ;;
esac
readonly arch

echo "https://github.com/koalaman/shellcheck/releases/download/v${version}/shellcheck-v${version}.${platform}.${arch}.tar.xz"
