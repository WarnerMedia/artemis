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

Run the "gosec" plugin on a local directory, with debug mode (`-d`) enabled:

> [!NOTE]
> The local directory must be specified as an absolute path.

```bash
./plugin.sh run -d gosec ~/git/my-repo
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
--> (Debug mode) Press Ctrl-C to exit
```

With the `-d` option, after the plugin runs the engine and plugin containers will be kept around for inspection.

In a separate terminal:

```bash
# Show all containers.
docker ps -a
```

```text
CONTAINER ID   IMAGE                   COMMAND                  CREATED          STATUS                     PORTS     NAMES
223a6d09ffc8   artemis/golang:latest   "/opt/artemis-run-pl…"   10 seconds ago   Up 9 seconds                         artemis-run-plugin-plugin-run-8b3a64c30150
b217dc1b15be   artemis/engine:latest   "/bin/true"              11 seconds ago   Exited (0) 9 seconds ago             engine
```

Look up the plugin container ID from above, athen open a shell into the plugin container:

```bash
docker exec -it 223a6d09ffc8 /bin/sh
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
