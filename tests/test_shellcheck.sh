#!/bin/bash

set -uo pipefail

SHELLCHECK_CMD=('shellcheck')
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo
echo '--------------------------------------------------------------------------------'
echo 'Starting shell script linting tests (shellcheck)'
echo '--------------------------------------------------------------------------------'
echo

if ! type shellcheck &>/dev/null; then
  echo -e "${RED}ERROR: The shellcheck command does not appear to be installed!${NC}"
  echo -e "${RED}Install using your preferred package manager, or read here for instructions - https://github.com/koalaman/shellcheck${NC}"
  echo
  exit 1
fi

while read -r shell_script; do
  IGNORE_PATH="$(dirname "$0")/.shellignore"
  if [[ -f "$IGNORE_PATH" ]]; then
    shell_script_realpath=$(realpath "${shell_script}")
    skip=0
    while read -r pattern; do
      [[ -z "$pattern" ]] && continue
      # If pattern is a directory, skip all files under it
      if [[ -d "$pattern" && "${shell_script_realpath}" == $(realpath "$pattern")* ]]; then
        skip=1
        break
      fi
      # If pattern matches filename (glob)
      if [[ "${shell_script_realpath}" == [[$pattern]] ]] || [[ "${shell_script_realpath}" == *$pattern* ]]; then
        skip=1
        break
      fi
    done <"$IGNORE_PATH"
    if [[ $skip -eq 1 ]]; then
      echo -e "${shell_script}: ${YELLOW}SKIPPED${NC}"
      continue
    fi
  fi

  output=$("${SHELLCHECK_CMD[@]}" "${shell_script}" 2>&1)
  exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    echo -e "${shell_script}: ${GREEN}PASSED${NC}"
  elif [[ $exit_code -eq 1 ]]; then
    echo -e "${shell_script}: ${RED}FAILED${NC}"
    echo "$output"
    FAILED=1
  fi
done < <(find . -type f -name '*.sh' | cut -c 3-)

if [[ $FAILED -ne 0 ]]; then
  echo
  echo -e "${RED}ERROR: One or more tests have failed! See above for details.${NC}"
  echo
  echo -e "${RED}If you believe a file should be ignored, add the path to the .shellignore file in the root of this project.${NC}" | fold
  echo
  exit 1
fi

echo
echo '--------------------------------------------------------------------------------'
echo 'Shell script linting tests complete!'
echo '--------------------------------------------------------------------------------'
echo
