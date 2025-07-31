#!/bin/bash

set -euo pipefail

SHMFT_CMD=('shfmt' '-i' '2')
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo
echo '--------------------------------------------------------------------------------'
echo 'Starting shell script formatting tests (shfmt)'
echo '--------------------------------------------------------------------------------'
echo

if ! type shfmt &>/dev/null; then
  echo -e "${RED}ERROR: The shfmt command does not appear to be installed!${NC}"
  echo -e "${RED}Install using your preferred package manager, or read here for instructions - https://github.com/mvdan/sh${NC}"
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

  shell_script_unformatted=$(shasum -a 1 "${shell_script}" | awk '{print $1}')
  shell_script_formatted=$("${SHMFT_CMD[@]}" "${shell_script}" | shasum -a 1 | awk '{print $1}')

  if [[ "${shell_script_unformatted}" == "${shell_script_formatted}" ]]; then
    echo -e "${shell_script}: ${GREEN}PASSED${NC}"
  else
    echo -e "${shell_script}: ${RED}FAILED${NC}"
    FAILED=1
  fi
done < <(find . -type f -name '*.sh' | cut -c 3-)

if [[ "${FAILED}" == "1" ]]; then
  echo
  echo -e "${RED}ERROR: One or more tests have failed! See above for details.${NC}"
  echo
  echo -e "${RED}If you beleive a file should be ignored, add the path to the .shfmtignore file in the root of this project.${NC}" | fold
  echo
  exit 1
fi

echo
echo '--------------------------------------------------------------------------------'
echo 'Shell script formatting tests complete!'
echo '--------------------------------------------------------------------------------'
echo
