import { t } from "@lingui/macro";

export interface ScanPlugin {
	displayName: string;
	apiName: string;
	group: string;
}

interface ScanPluginKeys {
	[name: string]: ScanPlugin;
}

const GROUP_SECRETS = t`Secret Detection`;
const GROUP_ANALYSIS = t`Static Analysis`;
const GROUP_VULN = t`Vulnerability Detection`;
const GROUP_INVENTORY = t`Technology Inventory`;

export const secretPluginsKeys: ScanPluginKeys = {
	gitsecrets: {
		displayName: t`Git Secrets`,
		apiName: "gitsecrets",
		group: GROUP_SECRETS,
	},
	truffle_hog: {
		displayName: t`Truffle Hog`,
		apiName: "truffle_hog",
		group: GROUP_SECRETS,
	},
};
export const secretPluginsObjects = Object.values(secretPluginsKeys);

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
export const staticPluginsObjects = Object.values(staticPluginsKeys);

export const techPluginsKeys: ScanPluginKeys = {
	base_images: {
		displayName: t`Base Images (Docker)`,
		apiName: "base_images",
		group: GROUP_INVENTORY,
	},
	technology_discovery: {
		displayName: t`Enry Technology Discovery`,
		apiName: "technology_discovery",
		group: GROUP_INVENTORY,
	},
};
export const techPluginsObjects = Object.values(techPluginsKeys);

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
		displayName: t`Trivy (Container Images)`,
		apiName: "trivy",
		group: GROUP_VULN,
	},
	veracode_sca: {
		displayName: t`Veracode SCA`,
		apiName: "veracode_sca",
		group: GROUP_VULN,
	},
};
export const vulnPluginsObjects = Object.values(vulnPluginsKeys);

// these are used in the formik state, and also in the addScan client.ts file
export const secretPlugins = secretPluginsObjects.map(
	(p: ScanPlugin) => p.apiName
);
export const staticPlugins = staticPluginsObjects.map(
	(p: ScanPlugin) => p.apiName
);
export const techPlugins = techPluginsObjects.map((p: ScanPlugin) => p.apiName);
export const vulnPlugins = vulnPluginsObjects.map((p: ScanPlugin) => p.apiName);

// dev/experimental plugins or plugins that are not enabled for all users by default
export const nonDefaultPlugins = ["snyk"];
// display names for different plugin categories
export const pluginCatalog = [
	{ name: "Secret Plugin", plugins: secretPluginsObjects },
	{ name: "Static Analysis Plugin", plugins: staticPluginsObjects },
	{ name: "Technology Inventory Plugin", plugins: techPluginsObjects },
	{ name: "Vulnerability Plugin", plugins: vulnPluginsObjects },
];
export const pluginKeys = {
	...secretPluginsKeys,
	...staticPluginsKeys,
	...techPluginsKeys,
	...vulnPluginsKeys,
};
