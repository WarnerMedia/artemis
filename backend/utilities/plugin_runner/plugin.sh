#!/usr/bin/env bash

set -o pipefail

BASEDIR="$(dirname "${BASH_SOURCE[0]}")" || exit 1
readonly BASEDIR
readonly TEMPDIR="$BASEDIR/tmp"
readonly COMPOSEFILE="$TEMPDIR/docker-compose.yml"

workdir_readonly=true

# Print usage info to stderr.
function usage {
  cat <<EOD >&2
Usage: $0 (subcommand)

Available subcommands:
    run - Run a core plugin in local containers.
    run-writable - Same as "run", but mounts target directory as read-write.
    clean - Stop and clean up all containers.
EOD
}

# Install one of the optional JSON files used for plugin arguments.
# If the file does not exist, a file with an empty JSON object is installed
# instead.
# base_json may be specified as a JSON object (serialized as a string) to
# be merged with the user-provided JSON file.
function install_plugin_arg_file {
  local filename="$1"
  local plugindir="$2"
  local base_json="$3"

  if [[ $base_json = '' ]]; then
    base_json='{}'
  fi

  local src="$BASEDIR/$filename"
  local dest="$plugindir/$filename"

  local src_json='{}'
  local merged_json

  if [[ -f $src ]]; then
    echo "--> Using arg file: $src"
    if ! jq empty "$src" > /dev/null; then
      echo "*** Error: Invalid JSON detected: $src" >&2
      return 1
    fi
    src_json=$(<"$src")
  fi

  # Merge the JSON objects together.
  merged_json="$(echo "${base_json}${src_json}" | jq '. + input')" || return 1
  echo "$merged_json" > "$dest" || return 1
}

# Generate the environment and Docker Compose files.
# This always regenerates the files, so we expect that any previous Docker
# Compose stack will have been shutdown.
function init_compose {
  local plugin="$1"; shift
  local plugin_image="$1"; shift
  local target="$1"; shift
  local runner="$1"; shift
  local writable="$1"; shift
  local debug_shell=("$@")

  echo "==> Generating configuration for plugin: $plugin"

  mkdir "$TEMPDIR" || return 1
  local plugindir="$TEMPDIR/plugin"
  mkdir "$plugindir" || return 1

  local plugincmd
  case "$runner" in
    core)
      plugincmd="python /srv/engine/plugins/$plugin/main.py"
      ;;
    boxed)
      plugincmd="/srv/engine/plugins/plugin.sh --quiet -- $plugin"
      ;;
    *)
      echo "Unsupported plugin runner: $runner" >&2
      return 1
  esac

  # Note: We use /bin/sh for the entrypoint scripts since we don't know
  #       if the containers have Bash available.

  local plugin_entry="$plugindir/entrypoint.sh"
  echo "--> Generating: $plugin_entry"
  cat <<EOD > "$plugin_entry" || return 1
#!/bin/sh
$plugincmd \
  "\$(cat /opt/artemis-run-plugin/engine-vars.json)" \
  "\$(cat /opt/artemis-run-plugin/images.json)" \
  "\$(cat /opt/artemis-run-plugin/config.json)" \
  "$target"
exitcode=\$?
printf "==> Plugin exited with status: %d " "\$exitcode"
if [ "\$exitcode" -eq 0 ]; then
  echo '(success)'
else
  echo '(failed)'
fi
EOD
  chmod 755 "$plugin_entry" || return 1

  local plugin_debug_entry="$plugindir/entrypoint-debug.sh"
  echo "--> Generating: $plugin_debug_entry"
  cat <<EOD > "$plugin_debug_entry" || return 1
#!/bin/sh
/opt/artemis-run-plugin/entrypoint.sh
echo "==> Starting debug shell: ${debug_shell[@]}"
echo '    To run the plugin again with the same configuration:'
echo '      /opt/artemis-run-plugin/entrypoint.sh'
exec ${debug_shell[@]}
EOD
  chmod 755 "$plugin_debug_entry" || return 1

  local entrypoint='/opt/artemis-run-plugin/entrypoint.sh'
  if [[ ${#debug_shell[@]} -ne 0 ]]; then
    entrypoint='/opt/artemis-run-plugin/entrypoint-debug.sh'
  fi

  local temp_vol_name="artemis-plugin-temp-$plugin-$RANDOM"

  # Install optional config files.
  if [[ -f "$BASEDIR/.env" ]]; then
    cp -L "$BASEDIR/.env" "$TEMPDIR/.env" || return 1
  fi
  local basevars
  basevars="$(jq -n --arg temp_vol_name "$temp_vol_name" \
    '{temp_vol_name:
      ("artemis-run-plugin_" + $temp_vol_name + ":/tmp/work")}')" || return 1
  install_plugin_arg_file engine-vars.json "$plugindir" "$basevars" || return 1
  install_plugin_arg_file images.json "$plugindir" || return 1
  install_plugin_arg_file config.json "$plugindir" || return 1

  # The workdir_readonly flag from "run-writable" overrides the plugin settings.
  local wro=true
  if [[ $writable = 'true' || $workdir_readonly = 'false' ]]; then
    echo "--> WARNING: Mounting writable working directory: $target"
    wro=false
  fi

  echo "--> Generating: $COMPOSEFILE"
  cat <<EOD > "$COMPOSEFILE" || return 1
name: artemis-run-plugin
services:
  engine:
    image: "artemis/engine:latest"
    container_name: engine
    command: ["/bin/true"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
  plugin:
    image: "$plugin_image"
    container_name: "$plugin"
    env_file:
      - path: ./.env
        required: false
    environment:
      PYTHONPATH: /srv
    command:
      - $entrypoint
    volumes_from:
      - engine:ro
    volumes:
      - type: bind
        source: ./plugin
        target: /opt/artemis-run-plugin
        read_only: true
      - type: bind
        source: "$target"
        target: "$target"
        read_only: $wro
      - type: volume
        source: $temp_vol_name
        target: /tmp/work
        volume:
          nocopy: true
volumes:
  $temp_vol_name:
    labels:
      artemis.temp: "1"
EOD
}

# Start the plugin container and any dependent containers.
function do_run {
  local plugin="$1"; shift
  local target="$1"; shift
  local debug_shell=("$@")

  if [[ $plugin = '' || $target = '' ]]; then
    echo "Usage: $0 run (plugin) (/path/to/scan/target) [/debug/shell]..." >&2
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

  # Determine the local image name and runnner for the plugin.
  { read -r image; read -r runner; read -r writable; } < \
    <(jq -r '.image,.runner,(.writable|not|not)' "$plugindir/settings.json") || return 1
  # shellcheck disable=SC2016
  image="${image#'$ECR/'}"  # Trim repo placeholder (assume images are local).
  if [[ $image = '' || $image = 'null' ]]; then
    echo "Unable to determine image name for plugin: $plugin" >&2
    return 1
  fi
  if [[ $runner = '' || $runner = 'null' ]]; then
    runner=core
  fi

  init_compose "$plugin" "$image" "$target" "$runner" "$writable" \
    "${debug_shell[@]}" || return 1

  docker compose -f "$COMPOSEFILE" run --rm --remove-orphans plugin
}

# Stop containers and clean up generated files (best-effort, ignore errors).
function do_clean {
  echo '==> Cleaning up any existing containers'
  if [[ -d $TEMPDIR ]]; then
    if [[ -f "$COMPOSEFILE" ]]; then
      docker compose -f "$COMPOSEFILE" rm --stop --force --volumes
      docker compose -f "$COMPOSEFILE" down --volumes --remove-orphans
      # Remove temp volumes leftover from prior aborted runs.
      docker volume prune --all --force --filter 'label=artemis.temp=1'
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
  run-writable)
    workdir_readonly=false
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
