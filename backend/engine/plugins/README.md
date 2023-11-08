# Plugin Development

The Artemis Engine has a plugin architecture to enable easy integration of new functionality. Since the plugins are where the actual analysis occurs, most development on Artemis will be writing and updating plugins.

Plugins are Python 3 modules that run in a containerized environment. The entrypoint is well-known and the output is a JSON blob that is printed to the container's `stdout` for consumption by the Engine's plugin runner. The plugins run in containers to simplify dependency management. For example, a plugin that needs to analyze Node.js code and run `npm` can use a Node.js container, which already has Node.js and all its dependencies installed.

## Plugin Structure

The Engine structure is:

```plaintext
engine/
 <application code>
 plugins/
  a_plugin/
   <a_plugin code>
  another_plugin/
   <another_plugin code>
  rule_of_threes_plugin/
   <rule_of_threes_plugin code>
```

Each plugin resides in a directory under the `plugins` directory. The structure within a plugin's directory is:

```plaintext
settings.json
__init__.py
main.py
<other plugin code>
```

### settings.json

This file contains the plugin's settings. The settings are:

- name: The name of the plugin
- type: The type of the plugin: `vulnerability`, `secrets`, `static_analysis`, `inventory`, `configuration`, `sbom`
- image: The Docker image the plugin runs in. If using a non-public image prefix with `$ECR`. During local development `$ECR` is ignored. When running in AWS, the `$ECR` environment variable is populated with the current account's ECR URL.
- disabled: Boolean. If true the plugin is skipped. This can also be a string containing the name of an environment variable containing the boolean value, for example "$ARTEMIS_FEATURE_XYZ_ENABLED".
- timeout: Integer. The amount of time, in seconds, to allow the plugin to run before exiting early with an error.

```json
{
    "name": "Example",
    "type": null,
    "image": "$ECR/<image>:<tag>",
    "disabled": true,
    "timeout": 3600
}
```

### main.py

This is the entrypoint into the plugin and is executed by the Engine plugin runner:

```shell
python /srv/engine/PLUGIN/main.py
```

The only hard requirements are that `main.py` be runnable and that it outputs results as a JSON dictionary of a particular format.

The fields are:

- `success`: Boolean result of the plugin's findings. `true` is no findings/issues found (or no issues found of sufficient severity to merit a failed result. `false` is that the plugin has determined the repository has findings sufficient to fail the scan. If used in a CI/CD context then `success: false` would fail the build.
- `truncated`: This should always be set to `false`. Historically, this boolean was used to indicate that more findings were generated than could fit within the 400kb DynamoDB item size limit. This is no longer necessary.
- `details`: List of findings. The requirements of the contents of the `details` list is determined by the plugin's [type](#plugin-types).
- `errors`: List of error strings generated during plugin execution.

Example simple plugin:

```python
import json

def main():
    print(json.dumps({
        'success': True,  # True if scan found no issues or nothing to scan. False otherwise.
        'truncated': False,  # This should always be set to False. Historically, this boolean would be set to True to indicate that more findings were generated than could fit within the 400kb DynamoDB item size limit. This is no longer necessary.
        'details': [],  # List of detailed results. Format is determined by plugin type.
        'errors': []  # List of error strings generated during plugin execution.
    }))

if __name__ == "__main__":
    main()
```

## Plugin Types

There are five types of plugins: vulnerability, secrets, static analysis, sbom, inventory, and configuration. Each type of plugin has a defined output format so that the results can be easily consolidated.

### Vulnerability

Vulnerability plugins look for known (disclosed) vulnerabilities in libraries and other dependencies. The findings have a canonical ID that can be referenced outside of the tool, such as a CVE ID. The `details` returned by a vulnerability plugin is a list of dictionaries. Each distinct vulnerability in each distinct package should have its own entry in the list.

The fields are:

- `component`: The name and version of the component containing the vulnerability
- `source`: The source of the component in the repository, such as a `Dockerfile` or `package.json` file.
- `id`: The canonical ID of the vulnerability. CVE, if available, or URL to an advisory if no typical ID is available.
- `description`: The short name or description of the vulnerability.
- `severity`: The severity level of the vulnerability: critical, high, medium, low, or negligible.
- `remediation`: The steps required to remediate the vulnerabilitiy. Empty string if omitted.

Example:

```json
[
    {
        "component": "package-1.2.3",
        "source": "src/package.json",
        "id": "CVE-2019-00000",
        "description": "An unauthenticated RCE vulnerability exists in package <= 1.2.3",
        "severity": "critical",
        "remediation": "Upgrade to package 1.2.4 or later"
    }
]
```

### Secrets

Secrets plugins look for sensitive information in the repository that should not be stored there. The findings have a filename, line number, and type in addition to identifying commit information. The `details` returned by a secrets plugin is a list of dictionaries. Each distinct secret should have its own entry in the list.

The fields are:

- `filename`: The path and filename containing the secret.
- `line`: The line number within the file where the secret is located.
- `commit`: The commit hash when the secret was added/modified.
- `type`: The secret type, such as aws or ssh.
- `author`: The name/email of the commit author.

Example:

```json
[
    {
        "filename": "src/env/config.json",
        "line": 42,
        "commit": "45d6bf712794a90aea3304dbb0d2dfa3a1b9ecef",
        "type": "aws",
        "author": "George P. Burdell <george.p.burdell@example.com>"
    }
]
```

### Static Analysis

Static analysis plugins look for code issues beyond secrets and known vulnerabilities. These can be potential vulnerabilities, violations of best practices, or other code issues. The `details` returned by a static analysis plugin is a list of dictionaries. Each distinct issue should have its own entry in the list.

The fields are:

- `filename`: The path and filename containing the issue.
- `line`: The line number within the file where the issue is located.
- `message`: The short name or description of the issue.
- `severity`: The severity level of the issue: critical, high, medium, low, or negligible.
- `type`: The issue type.

Example:

```json
[
    {
        "filename": "src/lib/main.py",
        "line": 42,
        "message": "Unused variable",
        "severity": "low",
        "type": "pep8"
    }
]
```

### SBOM

TODO: Add documentation here

### Inventory

TODO: Add documentation here

### Configuration

TODO: Add documentation here

## Local Testing

To test a plugin locally

1. If plugin requires secrets, ensure that you are logged in to AWS and appropriate profile is set

    ```bash
    #login to was and select profile(s) for temp credentials
    gimme-was-creds
    #assign selected profile
    read AWS_PROFILE -P “AWS profile to use”
    export AWS_PROFILE
    ```

2. Ensure any additional environment pre-requisites for the plugin being test are satisfied
3. Execute the plugin being tested

```bash
PYTHONPATH=$PWD python engine/plugins/PLUGIN/main.py {} {} /path/to/local/source/you/want/to/scan
```
