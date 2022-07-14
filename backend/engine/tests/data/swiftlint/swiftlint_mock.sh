#!/bin/bash

################################################################################
# This is a mock script for swiftlint unit tests
################################################################################

set -euo pipefail

CWD=$(pwd)

################################################################################
# Main function
################################################################################

main() {
  swift_file_count=$(find . -type f -iname '*.swift' | wc -l | awk '{print $1}')

  # If no swift files present
  if [[ ${swift_file_count} == "0" ]]; then
    echo "Linting Swift files at paths ${CWD}" >&2
    echo "Error: No lintable files found at paths: '${CWD}'" >&2
    exit 1
  fi

  # Swift file with private_over_fileprivate warning
  swift_file=findings.swift

  if [[ -f ${swift_file} ]]; then
    verify_checksum "${swift_file}" "3bd1be15338e87f3ae662a485229a15d2d6d272b"
    echo "Linting Swift files at paths engine/tests/data/swiftlint" >&2
    echo "Linting '${swift_file}' (1/1)" >&2
    echo "${CWD}/${swift_file}:1:1: warning: Private over fileprivate Violation: Prefer \`private\` over \`fileprivate\` declarations. (private_over_fileprivate)"
    echo "Done linting! Found 1 violation, 0 serious in 1 file." >&2
  fi

  # Swift file with no findings
  swift_file=nofindings.swift

  if [[ -f ${swift_file} ]]; then
    verify_checksum "${swift_file}" "2c8a3342740ef392614acb1e9831942f8223ea51"
    echo "Linting Swift files at paths ${CWD}" >&2
    echo "Linting '${swift_file}' (1/1)" >&2
    echo "Done linting! Found 0 violations, 0 serious in 1 file." >&2
  fi
}

################################################################################
# Verify the checksum of a given swift file
################################################################################

verify_checksum() {
  swift_file="${1}"
  expected_checksum="${2}"

  checksum=$(shasum "${swift_file}" | awk '{print $1}')

  if [[ ${checksum} != "${expected_checksum}" ]]; then
    echo "The checksum for '${swift_file}' should be '${expected_checksum}'" >&2
    echo "If you intended to modify the unit test, edit this script, and update the checksum accordingly" >&2
    exit 1
  fi
}

main
