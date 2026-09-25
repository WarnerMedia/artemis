#!/usr/bin/env bash

# Generate the download URL for a Zizmor release tarball for the specified version.
# This takes into account the current OS and architecture.

# Note: For Linux releases, we assume that the system has glibc.

set -o pipefail

readonly version="$1"
shift
if [[ $version == '' ]]; then
  echo "Usage: $0 version" >&2
  exit 1
fi

platform="$(uname | tr '[:upper:]' '[:lower:]')" || exit 1
case "$platform" in
  darwin) platform=apple-darwin ;;
  linux) platform=unknown-linux-gnu ;; # Assuming test platform is glibc.
  *)
    echo "Unsupported Zizmor release platform: $platform" >&2
    exit 1
    ;;
esac
readonly platform

arch="$(uname -m)" || exit 1
case "$arch" in
  aarch64 | x86_64) ;;
  arm64) arch=aarch64 ;;
  *)
    echo "Unsupported Zizmor release architecture: $arch" >&2
    exit 1
    ;;
esac
readonly arch

echo "https://github.com/zizmorcore/zizmor/releases/download/v${version}/zizmor-${arch}-${platform}.tar.gz"
