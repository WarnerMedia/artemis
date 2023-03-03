# GitHub Advanced Security Secret Scanning Plugin

This plugin gathers open GitHub Advanced Security (GHAS) Secret Scanning alerts for the repository via the GitHub API and correlates them to the branch being scanned. GHAS functionality must be enabled in the Artemis environment for this plugin to be enabled and the repository must have GHAS Secret Scanning enabled for alerts to be retrieved. The GitHub app or PAT used by Artemis must have permission to read Secret Scanning alerts.
