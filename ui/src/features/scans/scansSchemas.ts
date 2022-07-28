import * as Yup from "yup";
import { Response } from "api/client";
import { AppMeta, appMetaSchema } from "custom/scanMetaSchemas";

// interfaces
export interface ScanFormLocationState {
	fromScanForm?: boolean; // did user navigate to this page from the scan form?
}

export type ScanCategories =
	| "vulnerability"
	| "-vulnerability"
	| "secret"
	| "-secret"
	| "static_analysis"
	| "-static_analysis"
	| "inventory"
	| "-inventory";

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
}

interface VulnDetails {
	source: string[];
	severity: Severities;
	description: string;
	remediation?: string;
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

interface ScanResults {
	vulnerabilities?: ResultsVulnComponents;
	secrets?: SecretFindingResult;
	static_analysis?: ResultsAnalysis;
	inventory?: ScanInventory;
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
	depth?: number | "";
	includeDev?: boolean;
	submitContext?: SubmitContext;
	secretPlugins?: string[];
	staticPlugins?: string[];
	techPlugins?: string[];
	vulnPlugins?: string[];
}

export interface ScanOptions {
	branch?: string;
	categories?: Array<ScanCategories>;
	depth?: number;
	include_dev?: boolean;
	plugins?: string[];
}

// validation schemas...
const scanQueueFailedSchema = Yup.object()
	.shape({
		repo: Yup.string().defined(),
		error: Yup.string().defined(),
	})
	.defined();

const scanQueueSchema: Yup.SchemaOf<ScanQueue> = Yup.object()
	.shape({
		queued: Yup.array().defined().of(Yup.string().defined()),
		failed: Yup.array().defined().of(scanQueueFailedSchema),
	})
	.defined();

export const scanQueueResponseSchema = Yup.object().shape({
	data: scanQueueSchema,
});

const scanCallbackSchema = Yup.object().shape({
	url: Yup.string().nullable(),
	client_id: Yup.string().nullable(),
});

const scanOptionsSchema = Yup.object()
	.shape({
		categories: Yup.array().defined().of(Yup.string().defined()),
		plugins: Yup.array().defined().of(Yup.string().defined()),
		depth: Yup.number().defined().nullable(),
		include_dev: Yup.boolean().defined(),
		callback: scanCallbackSchema,
		batch_priority: Yup.boolean().defined(),
	})
	.defined();

const scanStatusDetailSchema: Yup.SchemaOf<ScanStatusDetail> = Yup.object()
	.shape({
		plugin_name: Yup.string().defined().nullable(),
		plugin_start_time: Yup.string().defined().nullable(),
		current_plugin: Yup.number().defined().nullable(),
		total_plugins: Yup.number().defined().nullable(),
	})
	.defined();

const scanTimestampsSchema: Yup.SchemaOf<ScanTimestamps> = Yup.object()
	.shape({
		queued: Yup.string().defined().nullable(),
		start: Yup.string().defined().nullable(),
		end: Yup.string().defined().nullable(),
	})
	.defined();

const severityLevelsSchema: Yup.SchemaOf<SeverityLevels> = Yup.object()
	.shape({
		critical: Yup.number().defined(),
		high: Yup.number().defined(),
		medium: Yup.number().defined(),
		low: Yup.number().defined(),
		negligible: Yup.number().defined(),
		"": Yup.number().defined(),
	})
	.defined();

const summaryInventorySchema: Yup.SchemaOf<SummaryInventory> = Yup.object()
	.shape({
		technology_discovery: Yup.number(),
		base_images: Yup.number(),
	})
	.defined();

const scanResultsSummarySchema: Yup.SchemaOf<ScanResultsSummary> = Yup.object()
	.shape({
		vulnerabilities: severityLevelsSchema.nullable(),
		secrets: Yup.number().defined().nullable(),
		static_analysis: severityLevelsSchema.nullable(),
		inventory: summaryInventorySchema.nullable(),
	})
	.defined();

const scanInventorySchema: Yup.SchemaOf<ScanInventory> = Yup.object()
	.shape({
		base_images: Yup.object(), // object with varying keys based on images detected
		technology_discovery: Yup.object(), // object with varying keys based on languages detected
	})
	.defined();

const scanResultsSchema = Yup.object()
	.shape({
		vulnerabilities: Yup.object(), // shallow check since keys can vary
		secrets: Yup.object(),
		static_analysis: Yup.object(),
		inventory: scanInventorySchema,
	})
	.defined();

export const scanIdSchema = Yup.string()
	.defined()
	.length(36)
	.matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID

export const analysisReportSchema: Yup.SchemaOf<any> = Yup.object()
	.shape({
		repo: Yup.string().defined(),
		scan_id: scanIdSchema.defined(),
		engine_id: Yup.string().nullable(),
		initiated_by: Yup.string().defined().nullable(),
		service: Yup.string().defined(),
		branch: Yup.string().defined().nullable(),
		scan_options: scanOptionsSchema,
		status: Yup.string().defined(),
		application_metadata: appMetaSchema.nullable(),
		status_detail: scanStatusDetailSchema,
		success: Yup.boolean().defined(),
		truncated: Yup.boolean().defined(),
		timestamps: scanTimestampsSchema,
		errors: Yup.object().defined().nullable(),
		alerts: Yup.object().nullable(),
		debug: Yup.object().nullable(),
		results_summary: scanResultsSummarySchema,
		results: scanResultsSchema,
	})
	.defined();

export const analysisReportResponseSchema = Yup.object().shape({
	data: analysisReportSchema,
});

export const scanHistorySchema: Yup.SchemaOf<any> = Yup.object()
	.shape({
		repo: Yup.string().defined(),
		service: Yup.string().defined(),
		branch: Yup.string().defined().nullable(),
		timestamps: scanTimestampsSchema,
		initiated_by: Yup.string().defined().nullable(),
		status: Yup.string().defined(),
		status_detail: scanStatusDetailSchema,
		scan_options: scanOptionsSchema,
	})
	.defined();

export const scanHistoryResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			results: Yup.array().of(scanHistorySchema),
			count: Yup.number().defined(),
			next: Yup.string().defined().nullable(),
			previous: Yup.string().defined().nullable(),
		})
		.defined(),
});
