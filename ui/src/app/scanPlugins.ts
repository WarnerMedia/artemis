import { t } from "@lingui/macro";
import {
	APP_AQUA_ENABLED,
	APP_GHAS_ENABLED,
	APP_SNYK_ENABLED,
	APP_VERACODE_ENABLED,
} from "app/globals";
import { capitalize } from "utils/formatters";

export interface ScanPlugin {
	displayName: string;
	apiName: string;
	group: string;
}

interface ScanPluginKeys {
	[name: string]: ScanPlugin;
}

export const GROUP_ANALYSIS = t`Static Analysis`;
export const GROUP_CONFIG = t`Configuration`;
export const GROUP_INVENTORY = t`Technology Inventory`;
export const GROUP_SBOM = t`Software Bill of Materials`;
export const GROUP_SECRETS = t`Secret Detection`;
export const GROUP_VULN = t`Vulnerability Detection`;

// all plugin information (enabled & disabled)
// keys should match apiName
export const configPluginsKeys: ScanPluginKeys = {
	github_repo_health: {
		displayName: t`GitHub Repo Health Check`,
		apiName: "github_repo_health",
		group: GROUP_CONFIG,
	},
	gitlab_repo_health: {
		displayName: t`GitLab Repo Health Check`,
		apiName: "gitlab_repo_health",
		group: GROUP_CONFIG,
	},
};

export const sbomPluginsKeys: ScanPluginKeys = {
	veracode_sbom: {
		displayName: t`Veracode SBOM`,
		apiName: "veracode_sbom",
		group: GROUP_SBOM,
	},
	trivy_sbom: {
		displayName: t`Trivy SBOM`,
		apiName: "trivy_sbom",
		group: GROUP_SBOM,
	},
};

export const secretPluginsKeys: ScanPluginKeys = {
	ghas_secrets: {
		displayName: t`GitHub Advanced Security Secrets`,
		apiName: "ghas_secrets",
		group: GROUP_SECRETS,
	},
	gitsecrets: {
		displayName: t`Git Secrets`,
		apiName: "gitsecrets",
		group: GROUP_SECRETS,
	},
	trufflehog: {
		displayName: t`Trufflehog`,
		apiName: "trufflehog",
		group: GROUP_SECRETS,
	},
};

export const staticPluginsKeys: ScanPluginKeys = {
	cfn_python_lint: {
		displayName: t`AWS CloudFormation Linter`,
		apiName: "cfn_python_lint",
		group: GROUP_ANALYSIS,
	},
	bandit: {
		displayName: t`Bandit (Python)`,
		apiName: "bandit",
		group: GROUP_ANALYSIS,
	},
	brakeman: {
		displayName: t`Brakeman (Ruby)`,
		apiName: "brakeman",
		group: GROUP_ANALYSIS,
	},
	checkov: {
		displayName: t`Checkov (IaC)`,
		apiName: "checkov",
		group: GROUP_ANALYSIS,
	},
	detekt: {
		displayName: t`Detekt (Kotlin)`,
		apiName: "detekt",
		group: GROUP_ANALYSIS,
	},
	eslint: {
		displayName: t`ESlint (JavaScript)`,
		apiName: "eslint",
		group: GROUP_ANALYSIS,
	},
	findsecbugs_java7: {
		displayName: t`FindSecBugs (Java 7)`,
		apiName: "findsecbugs_java7",
		group: GROUP_ANALYSIS,
	},
	findsecbugs_java8: {
		displayName: t`FindSecBugs (Java 8)`,
		apiName: "findsecbugs_java8",
		group: GROUP_ANALYSIS,
	},
	findsecbugs_java13: {
		displayName: t`FindSecBugs (Java 13)`,
		apiName: "findsecbugs_java13",
		group: GROUP_ANALYSIS,
	},
	gosec: {
		displayName: t`GoSec (Golang)`,
		apiName: "gosec",
		group: GROUP_ANALYSIS,
	},
	nodejsscan: {
		displayName: t`NodeJS Scan (NodeJS)`,
		apiName: "nodejsscan",
		group: GROUP_ANALYSIS,
	},
	python_code_checker: {
		displayName: t`Pylint (Python)`,
		apiName: "python_code_checker",
		group: GROUP_ANALYSIS,
	},
	shell_check: {
		displayName: t`Shell Check (Shell)`,
		apiName: "shell_check",
		group: GROUP_ANALYSIS,
	},
	swiftlint: {
		displayName: t`SwiftLint (Swift)`,
		apiName: "swiftlint",
		group: GROUP_ANALYSIS,
	},
	tflint: {
		displayName: t`TFLint (Terraform)`,
		apiName: "tflint",
		group: GROUP_ANALYSIS,
	},
};

export const techPluginsKeys: ScanPluginKeys = {
	base_images: {
		displayName: t`Base Images (Docker)`,
		apiName: "base_images",
		group: GROUP_INVENTORY,
	},
	cicd_tools: {
		displayName: t`CI/CD Tool Discovery`,
		apiName: "cicd_tools",
		group: GROUP_INVENTORY,
	},
	technology_discovery: {
		displayName: t`Enry Technology Discovery`,
		apiName: "technology_discovery",
		group: GROUP_INVENTORY,
	},
};

export const vulnPluginsKeys: ScanPluginKeys = {
	aqua_cli_scanner: {
		displayName: t`Aqua CLI Scanner (Docker)`,
		apiName: "aqua_cli_scanner",
		group: GROUP_VULN,
	},
	bundler_audit: {
		displayName: t`Bundler Audit (Ruby)`,
		apiName: "bundler_audit",
		group: GROUP_VULN,
	},
	node_dependencies: {
		displayName: t`NPM Audit (NodeJS)`,
		apiName: "node_dependencies",
		group: GROUP_VULN,
	},
	owasp_dependency_check: {
		displayName: t`OWASP Check (Java)`,
		apiName: "owasp_dependency_check",
		group: GROUP_VULN,
	},
	php_sensio_security_checker: {
		displayName: t`Sensio Security Check (PHP)`,
		apiName: "php_sensio_security_checker",
		group: GROUP_VULN,
	},
	snyk: { displayName: t`Snyk`, apiName: "snyk", group: GROUP_VULN },
	trivy: {
		displayName: t`Trivy Container Image`,
		apiName: "trivy",
		group: GROUP_VULN,
	},
	trivy_sca: {
		displayName: t`Trivy SCA`,
		apiName: "trivy_sca",
		group: GROUP_VULN,
	},
	veracode_sca: {
		displayName: t`Veracode SCA`,
		apiName: "veracode_sca",
		group: GROUP_VULN,
	},
};

// feature-flagged plugins, dev/experimental plugins or plugins that are not enabled for all users by default
export const nonDefaultPlugins: string[] = [];

// any enabled plugins that should be excluded (not run) by default
export const excludePlugins: string[] = ["nodejsscan"];

export const pluginsDisabled: { [name: string]: boolean } = {};

if (!APP_AQUA_ENABLED) {
	pluginsDisabled["aqua_cli_scanner"] = true;
}

if (!APP_GHAS_ENABLED) {
	pluginsDisabled["ghas_secrets"] = true;
}

if (APP_SNYK_ENABLED) {
	nonDefaultPlugins.push("snyk");
} else {
	pluginsDisabled["snyk"] = true;
}

if (!APP_VERACODE_ENABLED) {
	pluginsDisabled["veracode_sca"] = true;
	pluginsDisabled["veracode_sbom"] = true;
}

// enabled plugins
export const configPlugins = Object.keys(configPluginsKeys)
	.filter((p) => !(p in pluginsDisabled))
	.sort();
export const sbomPlugins = Object.keys(sbomPluginsKeys)
	.filter((p) => !(p in pluginsDisabled))
	.sort();
export const secretPlugins = Object.keys(secretPluginsKeys)
	.filter((p) => !(p in pluginsDisabled))
	.sort();
export const staticPlugins = Object.keys(staticPluginsKeys)
	.filter((p) => !(p in pluginsDisabled))
	.sort();
export const techPlugins = Object.keys(techPluginsKeys)
	.filter((p) => !(p in pluginsDisabled))
	.sort();
export const vulnPlugins = Object.keys(vulnPluginsKeys)
	.filter((p) => !(p in pluginsDisabled))
	.sort();

export const configPluginsObjects = configPlugins.map(
	(k) => configPluginsKeys[k],
);
export const sbomPluginsObjects = sbomPlugins.map((k) => sbomPluginsKeys[k]);
export const secretPluginsObjects = secretPlugins.map(
	(k) => secretPluginsKeys[k],
);
export const staticPluginsObjects = staticPlugins.map(
	(k) => staticPluginsKeys[k],
);
export const techPluginsObjects = techPlugins.map((k) => techPluginsKeys[k]);
export const vulnPluginsObjects = vulnPlugins.map((k) => vulnPluginsKeys[k]);

// display names for different plugin categories
export interface IPluginCatalog {
	[type: string]: {
		displayName: string;
		plugins: ScanPlugin[];
	};
}

export const pluginCatalog: IPluginCatalog = {
	configuration: { displayName: GROUP_CONFIG, plugins: configPluginsObjects },
	sbom: { displayName: GROUP_SBOM, plugins: sbomPluginsObjects },
	secret: { displayName: GROUP_SECRETS, plugins: secretPluginsObjects },
	static_analysis: {
		displayName: GROUP_ANALYSIS,
		plugins: staticPluginsObjects,
	},
	inventory: { displayName: GROUP_INVENTORY, plugins: techPluginsObjects },
	vulnerability: { displayName: GROUP_VULN, plugins: vulnPluginsObjects },
};

export interface IPluginKeys {
	[x: string]: ScanPlugin;
}
export const pluginKeys = {
	...configPluginsKeys,
	...sbomPluginsKeys,
	...secretPluginsKeys,
	...staticPluginsKeys,
	...techPluginsKeys,
	...vulnPluginsKeys,
};

export const isFeatureDisabled = (apiName: string) => apiName.startsWith("-");

// get category or plugin display name from api name
// e.g. "owasp_dependency_check" => "OWASP Check (Java)"
export const getFeatureName = (
	apiName: string,
	featureObj: IPluginCatalog | IPluginKeys,
) => {
	const feat = isFeatureDisabled(apiName) ? apiName.slice(1) : apiName;
	return feat in featureObj && featureObj[feat]?.displayName
		? featureObj[feat].displayName
		: capitalize(feat);
};
