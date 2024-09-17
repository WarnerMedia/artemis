#!/usr/bin/env bash

set -o pipefail

BASEDIR="$(dirname "${BASH_SOURCE[0]}")" || exit 1
readonly BASEDIR
readonly TEMPDIR="$BASEDIR/tmp"
readonly COMPOSEFILE="$TEMPDIR/docker-compose.yml"

# Print usage info to stderr.
function usage {
  cat <<EOD >&2
Usage: $0 (subcommand)

Available subcommands:
    run - Run a core plugin in local containers.
            -d - Debug mode, keep container running after exit.
    clean - Stop and clean up all containers.
EOD
}

# Generate the environment and Docker Compose files.
# This always regenerates the files, so we expect that any previous Docker
# Compose stack will have been shutdown.
function init_compose {
  local plugin="$1"
  local plugin_image="$2"
  local target="$3"
  local debug="$4"

  echo "==> Generating configuration for plugin: $plugin"

  mkdir "$TEMPDIR" || return 1
  local plugindir="$TEMPDIR/plugin"
  mkdir "$plugindir" || return 1

  local plugin_entry="$plugindir/entrypoint.sh"
  echo "--> Generating: $plugin_entry"
  cat <<EOD > "$plugin_entry" || return 1
#!/bin/sh
python /srv/engine/plugins/$plugin/main.py
exitcode=\$?
echo -n "==> Plugin exited with status: \$exitcode "
if [ "\$exitcode" -eq 0 ]; then
  echo '(success)'
else
  echo '(failed)'
fi
EOD
  if [[ $debug -eq 1 ]]; then
    # Keep container running.
    echo 'echo "--> (Debug mode) Press Ctrl-C to exit"' >> "$plugin_entry" || return 1
    echo 'tail -f /dev/null' >> "$plugin_entry" || return 1
  fi
  chmod 755 "$plugin_entry" || return 1

  echo "--> Generating: $COMPOSEFILE"
  cat <<EOD > "$COMPOSEFILE" || return 1
name: artemis-run-plugin
services:
  engine:
    image: "artemis/engine:latest"
    container_name: engine
    command: ["/bin/true"]
  plugin:
    image: "$plugin_image"
    container_name: "$plugin"
    env_file:
      - path: ./.env
        required: false
    environment:
      PYTHONPATH: /srv
    command:
      - /opt/artemis-run-plugin/entrypoint.sh
    volumes_from:
      - engine:ro
    volumes:
      - type: bind
        source: ./plugin
        target: /opt/artemis-run-plugin
        read_only: true
      - type: bind
        source: "$target"
        target: /work/base
        read_only: true
EOD
}

# Start the plugin container and any dependent containers.
function do_run {
  while getopts 'd' opt; do
    case "$opt" in
      d) local DEBUG=1 ;;
      *)
        echo "Invalid option: $opt" >&2
        return 1
    esac
  done
  shift "$((OPTIND-1))"

  local plugin="$1"
  local target="$2"

  if [[ $plugin = '' || $target = '' ]]; then
    echo "Usage: $0 run (plugin) (/path/to/scan/target)" >&2
    return 1
  fi
  local plugindir="$BASEDIR/../../engine/plugins/$plugin"
  if [[ ! -d $plugindir ]]; then
    echo "Plugin is not a core plugin: $plugin" >&2
    return 1
  fi
  if [[ $target != /* ]]; then
    echo "Target must be an absolute path: $target" >&2
    return 1
  fi
  if [[ ! -d $target ]]; then
    echo "Target does not exist or is not a directory: $target" >&2
    return 1
  fi

  if [[ -d $TEMPDIR ]]; then
    do_clean
  fi

  # Determine the local image name for the plugin.
  # shellcheck disable=SC2016
  image="$(jq -r .image "$plugindir/settings.json" | sed -r 's/^\$ECR\///')" || return 1
  if [[ $image = '' || $image = 'null' ]]; then
    echo "Unable to determine image name for plugin: $plugin" >&2
    return 1
  fi

  init_compose "$plugin" "$image" "$target" "$DEBUG" || return 1

  #TODO: Run with engine_vars, scan_images, and plugin_config from user-provided files.
  docker compose -f "$COMPOSEFILE" run --remove-orphans plugin
}

# Stop containers and clean up generated files (best-effort, ignore errors).
function do_clean {
  echo '==> Cleaning up any existing containers'
  if [[ -d $TEMPDIR ]]; then
    if [[ -f "$COMPOSEFILE" ]]; then
      docker compose -f "$COMPOSEFILE" rm --stop --force --volumes
      docker compose -f "$COMPOSEFILE" down --remove-orphans
    fi
    rm -rf "$TEMPDIR"
  fi
}

readonly cmd="$1"; shift
if [[ $cmd = '' ]]; then
  usage
  exit 1
fi

case "$cmd" in
  run)
    do_run "$@" || exit 1
    ;;
  clean)
    do_clean "$@" || exit 1
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 1
esac
