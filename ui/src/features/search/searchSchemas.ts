import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import * as Yup from "yup";

import { PagedResponse, Response, responseSchema } from "api/apiSchemas";
import { Risks, scanIdSchema, Severities } from "features/scans/scansSchemas";
import { AppMeta, appMetaSchema } from "custom/scanMetaSchemas";

// interfaces
export interface ComponentLicense {
	id: string;
	name: string;
}

export interface SearchComponent {
	_id?: string; // generated client-side
	name: string;
	version: string;
	licenses: ComponentLicense[];
}

export interface SearchComponentsResponse extends Response {
	results: SearchComponent[];
}

export interface Scan {
	created: string;
	scan_id: string;
}

export interface SearchRepo {
	_id?: string; // generated client-side
	service: string;
	repo: string;
	risk: Risks | null;
	scan: Scan | null;
	qualified_scan: Scan | null;
	last_qualified_scan?: Scan | null; // generated client-side
	application_metadata: AppMeta | null;
}

export interface SearchReposResponse extends Response {
	results: SearchRepo[];
}

// subset of repo fields
export interface SearchComponentRepo {
	_id?: string; // generated client-side
	service: string;
	repo: string;
	risk: Risks | null;
}

export interface SearchComponentReposResponse extends Response {
	results: SearchComponentRepo[];
}

export interface VulnComponent {
	[name: string]: string[];
}

export interface SearchVulnerability {
	id: string;
	advisory_ids: string[];
	vuln_id?: string[]; // generated client-side
	description: string;
	severity: Severities;
	remediation: string;
	components: VulnComponent;
	source_plugins: string[];
	plugin: string[]; // generated client-side
}

export interface SearchVulnsResponse extends Response {
	results: SearchVulnerability[];
}

// schemas
export const booleanStringSchema = (message: string) => {
	return Yup.string().trim().oneOf(["true", "false", ""], message);
};

export const matchDateSchema = (message: string) => {
	return Yup.string().trim().oneOf(["lt", "gt"], message); // FUTURE: also include "bt"
};

export const matchNullDateSchema = (message: string) => {
	return Yup.string().trim().oneOf(["null", "notnull", "lt", "gt"], message); // FUTURE: also include "bt"
};

export const matchStringSchema = (message: string) => {
	return Yup.string().trim().oneOf(["icontains", "exact"], message);
};

const componentLicenseSchema: Yup.ObjectSchema<ComponentLicense> = Yup.object()
	.shape({
		id: Yup.string().defined(),
		name: Yup.string().defined(),
	})
	.defined();

// type to SearchComponent but omit _id field, which is internal, not from API
const searchComponentSchema: Yup.ObjectSchema<Omit<SearchComponent, "_id">> =
	Yup.object()
		.shape({
			name: Yup.string().defined(),
			version: Yup.string().defined(),
			licenses: Yup.array().defined().of(componentLicenseSchema),
		})
		.defined();

export const searchComponentResponseSchema: Yup.ObjectSchema<PagedResponse> =
	Yup.object().shape({
		data: Yup.object()
			.concat(responseSchema)
			.shape({
				results: Yup.array().defined().of(searchComponentSchema).defined(),
			})
			.defined(),
	});

const qualifiedScanSchema: Yup.ObjectSchema<Scan> = Yup.object()
	.shape({
		created: Yup.string().defined(),
		scan_id: scanIdSchema.defined(),
	})
	.defined();

export const repoSchema = (message?: string) => {
	return Yup.string()
		.trim()
		.matches(/^[a-zA-Z0-9.\-_/]+$/, {
			message: message ?? i18n._(t`Invalid repository name`),
			excludeEmptyString: true,
		});
};

export const serviceSchema = () => {
	return Yup.string()
		.trim()
		.matches(
			/^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
			{
				message: i18n._(
					t`Must be a valid service name [azure|bitbucket|github] or hostname`,
				),
				excludeEmptyString: true,
			},
		);
};

export const supportedCicdTools = [
	{
		id: "aws_codebuild",
		displayName: "AWS CodeBuild",
	},
	{
		id: "azure_pipelines",
		displayName: "Azure Pipelines",
	},
	{
		id: "bitrise",
		displayName: "BitRise",
	},
	{
		id: "circleci",
		displayName: "CircleCI",
	},
	{
		id: "electron_forge",
		displayName: "Electron Forge",
	},
	{
		id: "github_actions",
		displayName: "GitHub Actions",
	},
	{
		id: "gitlab_ci",
		displayName: "GitLab CI",
	},
	{
		id: "jenkins",
		displayName: "Jenkins",
	},
	{
		id: "teamcity",
		displayName: "TeamCity",
	},
	{
		id: "travis_ci",
		displayName: "Travis CI",
	},
];

const cicdToolIDs = [
	"", // Add empty string so that no value is acceptable
	...supportedCicdTools.map((item) => item.id),
];

function getCicdToolError() {
	const validToolsStr = `[${cicdToolIDs.join("|")}]`;
	const intro = i18n._(t`Must be a supported cicd tool name:`);

	return `${intro} ${validToolsStr}`;
}

export const cicdToolSchema = () => {
	return Yup.string().trim().oneOf(cicdToolIDs, getCicdToolError());
};

export const riskSchema = Yup.string()
	.oneOf(["priority", "critical", "high", "moderate", "low"])
	.nullable();

// type to SearchRepo but omit _id, last_qualified_scan fields, which are internal, not from API
export const searchRepoSchema: Yup.ObjectSchema<
	Omit<SearchRepo, "_id" | "last_qualified_scan">
> = Yup.object()
	.shape({
		service: serviceSchema().defined(),
		repo: repoSchema().defined(),
		risk: riskSchema.defined().nullable(),
		scan: qualifiedScanSchema.defined().nullable(),
		qualified_scan: qualifiedScanSchema.defined().nullable(),
		application_metadata: appMetaSchema.nullable(),
	})
	.defined();

export const searchRepoResponseSchema: Yup.ObjectSchema<PagedResponse> =
	Yup.object().shape({
		data: Yup.object()
			.concat(responseSchema)
			.shape({
				results: Yup.array().defined().of(searchRepoSchema).defined(),
			})
			.defined(),
	});

// subset of repo fields
// type to SearchComponentRepo but omit _id field, which is internal, not from API
export const searchComponentRepoSchema: Yup.ObjectSchema<
	Omit<SearchComponentRepo, "_id">
> = Yup.object()
	.shape({
		service: serviceSchema().defined(),
		repo: repoSchema().defined(),
		risk: riskSchema.defined().nullable(),
	})
	.defined();

export const searchComponentRepoResponseSchema: Yup.ObjectSchema<PagedResponse> =
	Yup.object().shape({
		data: Yup.object()
			.concat(responseSchema)
			.shape({
				results: Yup.array().defined().of(searchComponentRepoSchema).defined(),
			})
			.defined(),
	});

export const severitySchema = Yup.string().oneOf([
	"critical",
	"high",
	"medium",
	"low",
	"negligible",
	"",
]);

// type to SearchVulnerability but omit vuln_id, plugin fields, which are internal, not from API
const searchVulnerabilitySchema: Yup.ObjectSchema<
	Omit<SearchVulnerability, "vuln_id" | "plugin">
> = Yup.object()
	.shape({
		id: Yup.string().defined(),
		advisory_ids: Yup.array().defined().of(Yup.string().defined()),
		description: Yup.string().defined(),
		severity: severitySchema.defined(),
		remediation: Yup.string().defined(),
		components: Yup.object().defined(),
		// source_plugins assumptions:
		// - field can't be null
		// - field is an array of strings, not a check for exact plugin names
		//   this is intentional so UI won't break when new plugins are added
		source_plugins: Yup.array().defined().of(Yup.string().defined()),
	})
	.defined();

export const searchVulnsResponseSchema: Yup.ObjectSchema<PagedResponse> =
	Yup.object().shape({
		data: Yup.object()
			.concat(responseSchema)
			.shape({
				results: Yup.array().defined().of(searchVulnerabilitySchema).defined(),
			})
			.defined(),
	});
