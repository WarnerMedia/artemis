import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import * as Yup from "yup";

import { PagedResponse, Response, responseSchema } from "api/apiSchemas";
import { SPLIT_MULTILINE_CN_REGEX } from "utils/formatters";
import { User } from "features/users/usersSchemas";
import { AppMeta, appMetaSchema } from "custom/scanMetaSchemas";

// interfaces
export interface ScanFormLocationState {
	fromScanForm?: boolean; // did user navigate to this page from the scan form?
}

export type ScanCategories =
	| "configuration"
	| "-configuration"
	| "inventory"
	| "-inventory"
	| "sbom"
	| "-sbom"
	| "secret"
	| "-secret"
	| "static_analysis"
	| "-static_analysis"
	| "vulnerability"
	| "-vulnerability";

const scanCategories: ScanCategories[] = [
	"configuration",
	"-configuration",
	"inventory",
	"-inventory",
	"sbom",
	"-sbom",
	"secret",
	"-secret",
	"static_analysis",
	"-static_analysis",
	"vulnerability",
	"-vulnerability",
];

interface ScanCallback {
	url?: string | null;
	client_id?: string | null;
}

interface ScanQueueFailed {
	repo: string;
	error: string;
}

export interface ScanQueue {
	queued: Array<string>;
	failed: Array<ScanQueueFailed>;
}

interface AnalysisScanOptions {
	categories?: Array<ScanCategories>;
	plugins?: Array<string>;
	depth?: number | null;
	include_dev?: boolean;
	callback?: ScanCallback;
	batch_priority?: boolean;
	include_paths: string[];
	exclude_paths: string[];
}

interface ScanStatusDetail {
	plugin_name: string | null;
	plugin_start_time: string | null;
	current_plugin: number | null;
	total_plugins: number | null;
}

interface ScanTimestamps {
	queued: string | null;
	start: string | null;
	end: string | null;
}

export interface ScanErrors {
	[key: string]: string | string[];
}

interface ScanInventory {
	base_images?: object;
	technology_discovery?: object;
}

export type Risks = "priority" | "critical" | "high" | "moderate" | "low";

export type Severities =
	| "critical"
	| "high"
	| "medium"
	| "low"
	| "negligible"
	| "";

export interface SeverityLevels {
	critical: number;
	high: number;
	medium: number;
	low: number;
	negligible: number;
	"": number;
}

export interface SummaryInventory {
	technology_discovery?: number;
	base_images?: number;
}

export interface ScanResultsSummary {
	vulnerabilities: SeverityLevels | null;
	secrets: number | null;
	static_analysis: SeverityLevels | null;
	inventory: SummaryInventory | null;
	configuration: SeverityLevels | null;
}

interface VulnDetails {
	source: string[];
	severity: Severities;
	description: string;
	remediation?: string;
	source_plugins?: string[] | null;
}

interface ComponentVulns {
	[key: string]: VulnDetails;
}

export interface ResultsVulnComponents {
	[key: string]: ComponentVulns;
}

interface AnalysisDetails {
	line: number;
	type: string;
	message: string;
	severity: Severities;
}

export interface ResultsAnalysis {
	[key: string]: AnalysisDetails[];
}

export interface AnalysisFinding {
	line: number;
	type: string;
	message: string;
	severity: Severities;
}

export interface SecretFinding {
	line: number;
	type: string;
	commit: string;
}

export interface SecretFindingResult {
	[key: string]: SecretFinding[];
}

export interface ConfigurationDetails {
	name: string;
	description: string;
	severity: Severities;
}

export interface ResultsConfiguration {
	[key: string]: ConfigurationDetails;
}

interface SbomLicense {
	id: string;
	name: string;
}

interface SbomComponentBase<T> {
	name: string;
	version: string;
	licenses: SbomLicense[];
	source: string;
	deps?: T[];
}

// use SbomComponent as recursive deps array field
interface SbomComponent extends SbomComponentBase<SbomComponent> {}

interface ScanResults {
	vulnerabilities?: ResultsVulnComponents;
	secrets?: SecretFindingResult;
	static_analysis?: ResultsAnalysis;
	inventory?: ScanInventory;
	configuration?: ResultsConfiguration;
}

export interface ScanHistory {
	scan_id?: string;
	repo: string;
	service: string;
	branch: string | null;
	timestamps: ScanTimestamps;
	initiated_by: string | null;
	status: string;
	status_detail: ScanStatusDetail;
	scan_options: AnalysisScanOptions;
	qualified?: boolean;
	batch_id?: string | null;
	batch_description?: string | null;
}

export interface AnalysisReport extends ScanHistory {
	scan_id: string;
	engine_id?: string;
	application_metadata?: AppMeta | null;
	success?: boolean;
	truncated?: boolean;
	errors?: ScanErrors;
	alerts?: ScanErrors;
	debug?: ScanErrors;
	results_summary?: ScanResultsSummary;
	results?: ScanResults;
}

export interface SbomReport extends ScanHistory {
	engine_id?: string;
	sbom: SbomComponent[];
}

export interface ScanHistoryResponse extends Response {
	results: AnalysisReport[];
}

export type SubmitContext = "scan" | "view";

export interface ScanOptionsForm {
	vcsOrg: string | null;
	repo: string;
	branch?: string;
	secrets?: boolean;
	staticAnalysis?: boolean;
	inventory?: boolean;
	vulnerability?: boolean;
	configuration?: boolean;
	sbom?: boolean;
	depth?: number | "";
	includeDev?: boolean;
	submitContext?: SubmitContext;
	secretPlugins?: string[];
	staticPlugins?: string[];
	techPlugins?: string[];
	vulnPlugins?: string[];
	configPlugins?: string[];
	sbomPlugins?: string[];
	includePaths?: string;
	excludePaths?: string;
}

export interface ScanOptions {
	branch?: string;
	categories?: Array<ScanCategories>;
	depth?: number;
	include_dev?: boolean;
	plugins?: string[];
	include_paths?: string[];
	exclude_paths?: string[];
}

// validation schemas...
const scanQueueFailedSchema: Yup.ObjectSchema<ScanQueueFailed> = Yup.object()
	.shape({
		repo: Yup.string().defined(),
		error: Yup.string().defined(),
	})
	.defined();

const scanQueueSchema: Yup.ObjectSchema<ScanQueue> = Yup.object()
	.shape({
		queued: Yup.array().defined().of(Yup.string().defined()),
		failed: Yup.array().defined().of(scanQueueFailedSchema),
	})
	.defined();

export const scanQueueResponseSchema = Yup.object().shape({
	data: scanQueueSchema,
});

const scanCallbackSchema: Yup.ObjectSchema<ScanCallback> = Yup.object().shape({
	url: Yup.string().nullable(),
	client_id: Yup.string().nullable(),
});

const scanOptionsSchema: Yup.ObjectSchema<AnalysisScanOptions> = Yup.object()
	.shape({
		categories: Yup.array()
			.defined()
			.of(Yup.string().oneOf(scanCategories).defined()),
		plugins: Yup.array().defined().of(Yup.string().defined()),
		depth: Yup.number().defined().nullable(),
		include_dev: Yup.boolean().defined(),
		callback: scanCallbackSchema,
		batch_priority: Yup.boolean().defined(),
		include_paths: Yup.array().defined().of(Yup.string().defined()),
		exclude_paths: Yup.array().defined().of(Yup.string().defined()),
	})
	.defined();

const scanStatusDetailSchema: Yup.ObjectSchema<ScanStatusDetail> = Yup.object()
	.shape({
		plugin_name: Yup.string().defined().nullable(),
		plugin_start_time: Yup.string().defined().nullable(),
		current_plugin: Yup.number().defined().nullable(),
		total_plugins: Yup.number().defined().nullable(),
	})
	.defined();

const scanTimestampsSchema: Yup.ObjectSchema<ScanTimestamps> = Yup.object()
	.shape({
		queued: Yup.string().defined().nullable(),
		start: Yup.string().defined().nullable(),
		end: Yup.string().defined().nullable(),
	})
	.defined();

const severityLevelsSchema: Yup.ObjectSchema<SeverityLevels> = Yup.object()
	.shape({
		critical: Yup.number().defined(),
		high: Yup.number().defined(),
		medium: Yup.number().defined(),
		low: Yup.number().defined(),
		negligible: Yup.number().defined(),
		"": Yup.number().defined(),
	})
	.defined();

const summaryInventorySchema: Yup.ObjectSchema<SummaryInventory> = Yup.object()
	.shape({
		technology_discovery: Yup.number(),
		base_images: Yup.number(),
	})
	.defined();

const scanResultsSummarySchema: Yup.ObjectSchema<ScanResultsSummary> =
	Yup.object()
		.shape({
			vulnerabilities: severityLevelsSchema.nullable(),
			secrets: Yup.number().defined().nullable(),
			static_analysis: severityLevelsSchema.nullable(),
			inventory: summaryInventorySchema.nullable(),
			configuration: severityLevelsSchema.nullable(),
		})
		.defined();

const scanInventorySchema: Yup.ObjectSchema<ScanInventory> = Yup.object()
	.shape({
		base_images: Yup.object(), // object with varying keys based on images detected
		technology_discovery: Yup.object(), // object with varying keys based on languages detected
	})
	.defined();

const sbomLicenseSchema: Yup.ObjectSchema<SbomLicense> = Yup.object()
	.shape({
		id: Yup.string().defined(),
		name: Yup.string().defined(),
	})
	.defined();

const sbomComponentSchema: Yup.ObjectSchema<SbomComponent> = Yup.object()
	.shape({
		name: Yup.string().defined(),
		version: Yup.string().defined(),
		licenses: Yup.array().of(sbomLicenseSchema.defined()).defined(),
		source: Yup.string().defined(),
		deps: Yup.array().of(
			// lazy evaluate at validation/cast time to enable creation of recursive schemas
			// default(undefined) prevents infinite recursion when cast
			Yup.lazy(() => sbomComponentSchema.default(undefined))
		),
	})
	.defined();

const scanResultsSchema: Yup.ObjectSchema<ScanResults> = Yup.object()
	.shape({
		vulnerabilities: Yup.object(), // shallow check since keys can vary
		secrets: Yup.object(),
		static_analysis: Yup.object(),
		inventory: scanInventorySchema,
		configuration: Yup.object(),
	})
	.defined();

export const scanIdSchema = Yup.string()
	.defined()
	.length(36)
	.matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID

export const scanHistorySchema: Yup.ObjectSchema<Omit<ScanHistory, "scan_id">> =
	Yup.object()
		.shape({
			repo: Yup.string().defined(),
			service: Yup.string().defined(),
			branch: Yup.string().defined().nullable(),
			timestamps: scanTimestampsSchema,
			initiated_by: Yup.string().defined().nullable(),
			status: Yup.string().defined(),
			status_detail: scanStatusDetailSchema,
			scan_options: scanOptionsSchema,
			qualified: Yup.boolean(),
			batch_id: scanIdSchema.nullable(),
			batch_description: Yup.string().nullable(),
		})
		.defined();

export const analysisReportSchema: Yup.ObjectSchema<AnalysisReport> =
	Yup.object()
		.shape({
			scan_id: scanIdSchema.defined(),
			engine_id: Yup.string(),
			application_metadata: appMetaSchema.nullable(),
			success: Yup.boolean().defined(),
			truncated: Yup.boolean().defined(),
			errors: Yup.object().defined(),
			alerts: Yup.object(),
			debug: Yup.object(),
			results_summary: scanResultsSummarySchema,
			results: scanResultsSchema,
		})
		.concat(scanHistorySchema)
		.defined();

export const analysisReportResponseSchema = Yup.object().shape({
	data: analysisReportSchema,
});

export const sbomReportSchema: Yup.ObjectSchema<SbomReport> = Yup.object()
	.shape({
		scan_id: scanIdSchema.defined(),
		engine_id: Yup.string(),
		sbom: Yup.array().defined().of(sbomComponentSchema),
	})
	.concat(scanHistorySchema)
	.defined();

export const sbomReportResponseSchema = Yup.object().shape({
	data: sbomReportSchema,
});

export const scanHistoryResponseSchema: Yup.ObjectSchema<PagedResponse> =
	Yup.object().shape({
		data: Yup.object()
			.concat(responseSchema)
			.shape({
				results: Yup.array().of(scanHistorySchema).defined(),
			})
			.defined(),
	});

export const SCAN_DEPTH = 500;
export const MAX_PATH_LENGTH = 4096;
const PATH_INVALID_FORMAT = -1;
const PATH_INVALID_LENGTH = 1;
const PATH_VALID = 0;

const validScanPaths = (paths?: string): number => {
	if (paths) {
		const pathArr = paths.split(SPLIT_MULTILINE_CN_REGEX);
		for (const p of pathArr) {
			const path = p.trim();
			if (path.length > 0) {
				if (
					path.includes("..") ||
					path.includes("\\0") ||
					path.includes("$") ||
					path.startsWith("./") ||
					path.startsWith("/")
				) {
					return PATH_INVALID_FORMAT;
				}
				if (path.length > MAX_PATH_LENGTH) {
					return PATH_INVALID_LENGTH;
				}
			}
		}
	}
	return PATH_VALID;
};

export const scanOptionsFormSchema = (
	currentUser?: User
): Yup.ObjectSchema<ScanOptionsForm> => {
	return Yup.object({
		vcsOrg: Yup.string()
			.trim()
			.nullable()
			.default(null)
			.required(i18n._(t`Required`))
			.oneOf(currentUser?.scan_orgs ?? [], i18n._(t`Invalid value`)),
		repo: Yup.string()
			.trim()
			.required(i18n._(t`Required`))
			.matches(
				/^[a-zA-Z0-9.\-_/]+$/,
				i18n._(t`May only contain the characters: A-Z, a-z, 0-9, ., -, _, /`)
			)
			.when("vcsOrg", {
				// if VCS does not contain /Org suffix, then repo must contain Org/ Prefix
				is: (vcsOrg: string) => vcsOrg && !vcsOrg.includes("/"),
				then: (schema) =>
					schema.matches(/\//, i18n._(t`Missing "Organization/" Prefix`)),
			}),
		branch: Yup.string()
			// doesn't match all sequences in the git-check-ref-format spec, but prevents most
			// individual disallowed characters
			// see: https://mirrors.edge.kernel.org/pub/software/scm/git/docs/git-check-ref-format.html
			.trim()
			.matches(
				/^[^ ~^:?*[\\]*$/,
				i18n._(
					t`Contains one of more of the following invalid characters: space, \, ~, ^, :, ?, *, [`
				)
			),
		secrets: Yup.boolean(),
		staticAnalysis: Yup.boolean(),
		inventory: Yup.boolean(),
		vulnerability: Yup.boolean(),
		configuration: Yup.boolean(),
		sbom: Yup.boolean(),
		depth: Yup.number()
			.positive(i18n._(t`Positive integer`))
			.integer(i18n._(t`Positive integer`))
			.transform(function (value, originalvalue) {
				// default value "" casts as NaN, so instead cast to undefined
				return originalvalue === "" ? undefined : value;
			}),
		includeDev: Yup.boolean(),
		submitContext: Yup.mixed<SubmitContext>().oneOf(["view", "scan"]),
		secretPlugins: Yup.array(),
		staticPlugins: Yup.array(),
		techPlugins: Yup.array(),
		vulnPlugins: Yup.array(),
		configPlugins: Yup.array(),
		sbomPlugins: Yup.array(),
		includePaths: Yup.string().test({
			name: "is-include-path",
			test(value, ctx) {
				const valid = validScanPaths(value);
				if (valid !== PATH_VALID) {
					return ctx.createError({
						message: i18n._(
							valid === PATH_INVALID_FORMAT
								? t`Invalid path, must be relative to repository base directory and contain valid characters`
								: t`Invalid path, longer than ${MAX_PATH_LENGTH} characters`
						),
					});
				}
				return true;
			},
		}),
		excludePaths: Yup.string()
			.trim()
			.test({
				name: "is-exclude-path",
				test(value, ctx) {
					const valid = validScanPaths(value);
					if (valid !== PATH_VALID) {
						return ctx.createError({
							message: i18n._(
								valid === PATH_INVALID_FORMAT
									? t`Invalid path, must be relative to repository base directory and contain valid characters`
									: t`Invalid path, longer than ${MAX_PATH_LENGTH} characters`
							),
						});
					}
					return true;
				},
			}),
	})
		.test(
			"secrets",
			i18n._(t`At least one scan feature or plugin must be enabled`),
			function (
				{
					secrets,
					staticAnalysis,
					inventory,
					vulnerability,
					configuration,
					sbom,
					secretPlugins,
					staticPlugins,
					techPlugins,
					vulnPlugins,
					configPlugins,
					sbomPlugins,
				},
				testContext
			) {
				if (
					// check false instead of falsy
					// so if these params are missing validation won't fail
					// use case: reloading page with url params
					secrets === false &&
					staticAnalysis === false &&
					inventory === false &&
					vulnerability === false &&
					configuration === false &&
					sbom === false &&
					(!secretPlugins || secretPlugins.length === 0) &&
					(!staticPlugins || staticPlugins.length === 0) &&
					(!techPlugins || techPlugins.length === 0) &&
					(!vulnPlugins || vulnPlugins.length === 0) &&
					(!configPlugins || configPlugins.length === 0) &&
					(!sbomPlugins || sbomPlugins.length === 0)
				) {
					return testContext.createError({
						path: "secrets",
						message: i18n._(
							t`At least one scan feature or plugin must be enabled`
						),
					});
				}
				return true;
			}
		)
		.defined();
};
