# Plugin Runner and Debugging Tool

This script runs a core plugin locally in a similar way to in a deployed environment (i.e., in a container).

Running plugins this way enables rapid local testing and debuggging of changes to the container image without needing to spin up a full local environment.

This is intended to only support basic plugins that do not need the Artemis services in order to run.

## Prerequisites

* Bash 4.x
* Docker Compose (via Docker 25 or later)
* jq

A local Artemis dev environment is *not* required to be configured.

## Building images

This script does *not* build the container images since the Makefile is sensitive to configuration options.

## Example usage

Run the "gosec" plugin on a local directory then exit:

> [!NOTE]
> The local directory must be specified as an absolute path.

```bash
./plugin.sh run gosec ~/git/my-repo
```

Run the "gosec" plugin and start a debug shell in the container:

```bash
./plugin.sh run gosec ~/git/my-repo /bin/bash
```

```text
==> Generating configuration for plugin: gosec
[+] Creating 2/2
 ✔ Network artemis-run-plugin_default  Created
 ✔ Container engine                    Created
[+] Running 1/1
 ✔ Container engine  Started
[2024-09-17T19:09:28+0000] INFO     [gosec] {'files': 10, 'lines': 512, 'nosec': 0, 'found': 17}
==> Plugin exited with status: 0 (success)
==> Starting debug shell: /bin/bash
    To run the plugin again with the same configuration:
      /opt/artemis-run-plugin/entrypoint.sh
bash-5.0#
```

By default, the target directory is mounted as read-only to avoid unexpected changes that would change the results from run-to-run.
This is fine for most plugins, but some plugins expect the target directory to be writable.
For those plugins, use `run-writable` instead of `run`:

```bash
./plugin.sh run-writable gosec ~/git/my-repo
```

Stop all containers and release resources:

```bash
./plugin.sh clean
```

> [!TIP]
> The `run` command will automatically run `clean` before starting the new containers.

## Configuration

### Environment

If an `.env` file exists, then it will be used to set the environment of the plugin container.

Suggested environment variables:

* `ARTEMIS_PLUGIN_DEBUG` - Set to `1` to enable debug logging in the plugin loader.

### Plugin command-line arguments

The engine passes three JSON command-line arguments to the plugin: Engine vars, images, and the plugin config.

Be default, this script will pass an empty object (`{}`) for these arguments.

To configure these arguments, create any of the following files:

* `engine-vars.json`
* `images.json`
* `config.json`

Examples of these files are provided (e.g. `engine-vars-example.json`).

The script will perform a sanity check on the JSON file. If the file does not contain valid JSON then a warning will be issued:

```text
*** Warning: Invalid JSON detected (proceeding anyway): ./images.json
```
