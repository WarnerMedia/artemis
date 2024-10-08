"""
Entrypoint for boxed core plugins (i.e. plugins with the "boxed" runner).

Takes the plugin name as the first argument, and all remaining arguments are
passed to the plugin.
"""

import os
import runpy
import sys

from .lib.utils import validate_plugin_name

# Note: All messages must be set to stderr;
#       only plugin results may be sent to stdout.

if os.getenv("ARTEMIS_PLUGIN_DEBUG", False):
    pyver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"Using Python {pyver}: {sys.executable}", file=sys.stderr)

if len(sys.argv) < 2:
    print(f"Usage: {sys.argv[0]} (plugin) [args...]", file=sys.stderr)
    sys.exit(1)

name = sys.argv[1]
del sys.argv[1]

if validate_plugin_name(name):
    # Run the requested plugin.
    # This is kept compatible with the "traditional" way the plugins were
    # run (via "python path/to/plugin/main.py").
    runpy.run_module(f"engine.plugins.{name}.main", {}, "__main__")
else:
    print(f"{sys.argv[0]}: Invalid plugin: {name}", file=sys.stderr)
    sys.exit(1)
