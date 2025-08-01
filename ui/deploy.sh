#!/bin/bash

# This is a wrapper to handle complex logic within make
RED="\033[31m"
GREEN="\033[32m"
BLUE="\033[34m"
CNone="\033[0m"

INFO="  ${TIME}[${BLUE} .. ${CNone}] "
OK="  ${TIME}[${GREEN} OK ${CNone}] "
FAIL="  ${TIME}[${RED}FAIL${CNone}] "

TRUE=1
FALSE=0
FAILURE=1

AWS=aws

function checkForProfile() {
  matched_profile=$(grep -F "[${CHECK_AWS_PROFILE}]" ~/.aws/credentials | tr -d '[]')
  if [ -n "${matched_profile}" ]; then
    echo $TRUE
  else
    echo $FALSE
  fi
}

if [ "$1" != "ci" ]; then
  @echo "${INFO}Check Credentials for role ${GREEN}${CHECK_AWS_PROFILE}${CNone}"
  # expect $CHECK_AWS_PROFILE to be set in the Makefile
  if [ "$(checkForProfile)" == $TRUE ]; then
    echo -e "${OK} found credentials"
    export AWS_PROFILE=${CHECK_AWS_PROFILE}
  else
    echo -e "${INFO} Requesting for user credentials"
    if ! gimme-aws-creds; then
      echo -e "\n${FAIL} Failed to obtain AWS credentials"
      exit $FAILURE
    fi

    echo -e "\n"
    if [ "$(checkForProfile)" == $TRUE ]; then
      echo -e "${OK} Successfully obtained credentials for role ${GREEN}${CHECK_AWS_PROFILE}${CNone} credentials"
      export AWS_PROFILE=${CHECK_AWS_PROFILE}
    else
      echo -e "\n${FAIL} Failed to obtain credentials for role ${GREEN}${CHECK_AWS_PROFILE}${CNone}"
      exit $FAILURE
    fi
  fi
fi

# note: results, settings, users, etc. files are special cases where we need a placeholder for a
# SPA route. it has no file type so this must be manually set via --content-type
echo -e "${INFO}Deploying app to S3(ENV:${ENV})"
${AWS} s3 rm "s3://${S3_BUCKET}/" --recursive --exclude "docs/*" --exclude "ci-tools/*" &&
  ${AWS} s3 cp "${DISTDIR}" "s3://${S3_BUCKET}/" --recursive &&
  ${AWS} s3 cp "s3://${S3_BUCKET}/index.html" "s3://${S3_BUCKET}/index.html" --content-type "text/html" --cache-control "no-cache" &&
  ${AWS} s3 cp "s3://${S3_BUCKET}/index.html" "s3://${S3_BUCKET}/results" --content-type "text/html" --cache-control "no-cache" &&
  ${AWS} s3 cp "s3://${S3_BUCKET}/index.html" "s3://${S3_BUCKET}/settings" --content-type "text/html" --cache-control "no-cache" &&
  ${AWS} s3 cp "s3://${S3_BUCKET}/index.html" "s3://${S3_BUCKET}/users" --content-type "text/html" --cache-control "no-cache" &&
  ${AWS} s3 cp "s3://${S3_BUCKET}/index.html" "s3://${S3_BUCKET}/search" --content-type "text/html" --cache-control "no-cache" &&
  ${AWS} s3 cp "s3://${S3_BUCKET}/api/index.html" "s3://${S3_BUCKET}/api" --content-type "text/html" --cache-control "no-cache" &&
  ${AWS} cloudfront create-invalidation --distribution-id "${CLOUDFRONT_DIST_ID}" --paths "/" &&
  echo -e "${OK}"
