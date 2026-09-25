# Changelog

This file tracks notable changes to the Artemis UI.

Note: Only changes starting with the 2026 release series are included.

### Security

- Development: NPM audit is no longer run in the pre-commit hook or CI. Instead, we rely on Dependabot to track security updates to dependencies.

### Changed

- Remove hardcoded AWS profiles from Terraform files.
- Minimum Terraform version is now 1.14, with AWS provider 5.100.
- 2026-09-24: Large, blanket update to reconcile OSS Artemis and internal Artemis

