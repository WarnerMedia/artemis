#!/bin/bash
set -euo pipefail

OPTIND=1

# Use the baseline scan config
BASELINE=0

# Fail closed if an error accessing Artemis occurs
FAIL_CLOSED=0

# Defaults
DEFAULT_CATEGORIES="[\"vulnerability\", \"secret\"]"
DEFAULT_PLUGINS="[\"-truffle_hog\", \"-aqua_cli_scanner\"]"

usage() {
    echo "artemis-scan.sh [-h] [-b] [-c] [-P...] [-C...] [-i...] [-e...] <SERVICE> <REPO> <BRANCH> <SEVERITY>"
    echo "  -h  Print this message"
    echo "  -b  Perform a baseline-qualified scan"
    echo "  -c  Fail-closed when Artemis is in maintenance mode (default is to fail-open)"
    echo "  -C  Specify one or more categories of plugins to run (preface each with - to exclude)"
    echo "      Categories are: inventory, sbom, secret, static_analysis, and vulnerability"
    echo "  -P  Specify one or more plugins to include/exclude (preface each with - to exclude)"
    echo "  -i  Specify a path within the repo to include in the scan"
    echo "  -e  Specify a path within the repo to exclude from the scan"
    echo ""
    echo "  Positional arguments:"
    echo "    SERVICE   Service name (github, gitlab, etc.)"
    echo "    REPO      Repository name with organization or group(s)"
    echo "    BRANCH    Branch name to scan"
    echo "    SEVERITY  CSV list of severities to fail on (ex: critical,high)"
    echo ""
    echo "  The ARTEMIS_API_KEY environment variable must be set to authenticate to the API"
}

userCategories=()
userPlugins=()
includePaths=()
excludePaths=()

while getopts ":bch:C:P:i:e:" opt; do
  case "$opt" in
    b) BASELINE=1
      ;;
    c) FAIL_CLOSED=1
      ;;
    h) usage
      exit 0;;
    C) userCategories+=( "${OPTARG}" )
      ;;
    P) userPlugins+=( "${OPTARG}" )
      ;;
    i) includePaths+=( "${OPTARG}" )
      ;;
    e) excludePaths+=( "${OPTARG}" )
      ;;
  esac
done

# Prepare for positional arguments
shift $((OPTIND-1))
[ "${1:-}" = "--" ] && shift

# Verify that all positional arguments were set
if [ -z "${4:-}" ]
then
    usage
    exit 1
fi

# Verify that API key was set
if [ -z "${ARTEMIS_API_KEY:-}" ]
then
    echo "ARTEMIS_API_KEY environment variable is not set"
    exit 1
fi

# Scan parameters
ARTEMIS="ARTEMIS_FQDN"  # NOTE: REPLACE WITH FQDN OF RUNNING ARTEMIS INSTANCE
ARTEMIS_API="$ARTEMIS/api/v1"
ARTEMIS_RESULTS="$ARTEMIS/results"
SERVICE=$1
RESOURCE=$2
BRANCH=$3
SEVERITY=$4

if [ $BASELINE -eq 1 ]; then
    # Baseline scan config
    CATEGORIES="[\"vulnerability\", \"secret\", \"static_analysis\", \"technology_discovery\", \"sbom\"]"
    PLUGINS="[\"-truffle_hog\", \"-aqua_cli_scanner\", \"-nodejsscan\"]"
else
    # Use user-specified categories, if any
    if [ ${#userCategories[@]} -gt 0 ]; then
        for i in "${!userCategories[@]}"; do
            if [ "$i" -eq 0 ]; then
                CATEGORIES="\"${userCategories[$i]}\""
            else
                CATEGORIES="$CATEGORIES, \"${userCategories[$i]}\""
            fi
        done
        CATEGORIES="[$CATEGORIES]"
    else
        # If no categories specified, use defaults
        CATEGORIES="$DEFAULT_CATEGORIES"
    fi

    # Use user-specified plugins, if any
    if [ ${#userPlugins[@]} -gt 0 ]; then
        for i in "${!userPlugins[@]}"; do
            if [ "$i" -eq 0 ]; then
                PLUGINS="\"${userPlugins[$i]}\""
            else
                PLUGINS="$PLUGINS, \"${userPlugins[$i]}\""
            fi
        done
        PLUGINS="[$PLUGINS]"
    else
        # If no plugins specified, use defaults
        PLUGINS="$DEFAULT_PLUGINS"
    fi

    # Include any paths specified
    if [ ${#includePaths[@]} -gt 0 ]; then
        for i in "${!includePaths[@]}"; do
            if [ "$i" -eq 0 ]; then
                INCLUDE_PATHS="\"${includePaths[$i]}\""
            else
                INCLUDE_PATHS="$INCLUDE_PATHS, \"${includePaths[$i]}\""
            fi
        done
        INCLUDE_PATHS="[$INCLUDE_PATHS]"
    else
        INCLUDE_PATHS="[]"
    fi

    # Exclude any paths specified
    if [ ${#excludePaths[@]} -gt 0 ]; then
        for i in "${!excludePaths[@]}"; do
            if [ "$i" -eq 0 ]; then
                EXCLUDE_PATHS="\"${excludePaths[$i]}\""
            else
                EXCLUDE_PATHS="$EXCLUDE_PATHS, \"${excludePaths[$i]}\""
            fi
        done
        EXCLUDE_PATHS="[$EXCLUDE_PATHS]"
    else
        EXCLUDE_PATHS="[]"
    fi

fi

# Helper method to print the log message with ISO8601 timestamp prepended
log() {
    echo $(date -u "+%Y-%m-%dT%H:%M:%S%z") "$1"
}

# Parse the vulnerability severity levels and build the API query args for them
SEVERITY_ARGS=""
IFS="," read -ra VALUES <<< "$SEVERITY"
for i in "${VALUES[@]}"; do
    SEVERITY_ARGS="${SEVERITY_ARGS}severity=$i&"
done

log "Running Artemis scan against $BRANCH branch of $SERVICE/$RESOURCE"

# Initiate the scan. The default config is to scan for vulnerabilities and secrets but not scan using truffle_hog
# because it's long-running and in a CI context we only care about secrets in the current code and not the commit
# history.
RESP=$(curl --silent --write-out "\n%{http_code}" \
    --request POST \
    --url "$ARTEMIS_API/$SERVICE/$RESOURCE" \
    --header "Content-Type: application/json" \
    --header "x-api-key: $ARTEMIS_API_KEY" \
    --data "{
    \"branch\": \"$BRANCH\",
    \"plugins\": $PLUGINS,
    \"categories\": $CATEGORIES,
    \"include_paths\": $INCLUDE_PATHS,
    \"exclude_paths\": $EXCLUDE_PATHS
}")

HTTP_CODE=$(echo -n "$RESP" | tail -n1)
BODY=$(echo -n "$RESP" | sed "$ d")
if [ "$HTTP_CODE" -eq "503" ]
then
    MSG=$(echo "$BODY" | jq ".message")
    log "Artemis is in maintenance mode, scan did not start. (Message: $MSG)"
    if [ $FAIL_CLOSED -eq 1 ]
    then
        exit 1
    else
        exit 0
    fi
fi

# Extract the scan ID
SCAN=$(echo "$BODY" | jq -r ".queued[0]")

if [ "$SCAN" = "null" ]
then
    echo "Scan failed to start"
    echo "Details:"
    echo "$BODY" | jq
    exit 1
fi

log "Scan started ($SCAN)"

# Wait for the scan to end
STATUS="queued"
while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ] && [ "$STATUS" != "error" ] && [ "$STATUS" != "terminated" ]
do
    sleep 10
    RESP=$(curl --silent --write-out "\n%{http_code}" \
        --request GET \
        --url "$ARTEMIS_API/$SERVICE/$SCAN?format=summary&results=vulnerabilities&${SEVERITY_ARGS}results=secrets&results=static_analysis" \
        --header "x-api-key: $ARTEMIS_API_KEY")

    HTTP_CODE=$(echo -n "$RESP" | tail -n1)
    SUMMARY=$(echo -n "$RESP" | sed "$ d")
    if [ "$HTTP_CODE" -eq "503" ]
    then
        MSG=$(echo "$SUMMARY" | jq ".message")
        log "Artemis is in maintenance mode, CI scan aborted. (Message: $MSG)"
        if [ $FAIL_CLOSED -eq 1 ]
        then
            exit 1
        else
            exit 0
        fi
    fi

    STATUS=$(echo "$SUMMARY" | jq -r ".status")

    log "Scan status: $STATUS"
done

# If the scan is not completed then something went wrong
if [ "$STATUS" != "completed" ]
then
    log "Scan failed"
    log "Details:"
    log "$SUMMARY" | jq
    exit 1
fi

# Extract the success value (whether there were findings [false] or not [true])
SUCCESS=$(echo "$SUMMARY" | jq ".success")

# Report the scan results
if [ "$SUCCESS" = "true" ]
then
    log "Analysis result: pass"
    exit 0  # Return 0 so that the CI process will continue
else
    # Get the scan ID by itself
    SCAN_ID=$(echo "$SUMMARY" | jq -r ".scan_id")
    log "Analysis result: fail"
    log "Full report at $ARTEMIS_RESULTS?service=$SERVICE&repo=$RESOURCE&id=$SCAN_ID"
    log "Summary:"
    echo "$SUMMARY" | jq ".results_summary"
    exit 1  # Return 1 so that the CI process will stop
fi
