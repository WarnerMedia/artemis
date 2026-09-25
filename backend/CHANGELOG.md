# Changelog

This file tracks notable changes to the Artemis backend.

Note: Only changes starting with the 2026 release series are included.

## Unreleased

### Changed

- Engine scripts are now compatible with Amazon Linux 2023.
- Minimum Python version is now 3.13.
- Minimum Terraform version is now 1.14, with AWS provider 5.100.
- Use Docker Hardened Images for base images.
- New static analysis plugin: Zizmor
- Added new `minimal` image for plugins with no language runtime requirements.
- Trivy plugins: For PHP projects with a `composer.json`, if the repo is missing the corresponding lockfile, we now generate one automatically.
- Update GitHub Org Users Lambda: Remove extraneous logging and correct error when GitHub API fails to return a 200.
- Removed hardcoded AWS profiles from terraform files
