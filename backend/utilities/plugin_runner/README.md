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

Stop all containers and release resources:

```bash
./plugin.sh clean
```

> [!INFO]
> The `run` command will automatically run `clean` before starting the new containers.

## Configuration

### Environment

If an `.env` file exists, then it will be used to set the environment of the plugin container.
