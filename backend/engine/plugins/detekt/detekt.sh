#!/bin/sh

set -eu

# Get the absolute path of the directory containing this script
relative_path=$(dirname "${0}")
absolute_path=$(cd "${relative_path}" && pwd -P)

# It is expected that detekt.jar is in the same directory as this wrapper
# All arguments passed to this wrapper are passed on to the java command
java -jar "${absolute_path}/detekt.jar" "${@:-}"
