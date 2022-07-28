import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import * as Yup from "yup";

import { Response } from "api/client";
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

export interface QualifiedScan {
	created: string;
	scan_id: string;
}

export interface SearchRepo {
	_id?: string; // generated client-side
	service: string;
	repo: string;
	risk: Risks | null;
	qualified_scan: QualifiedScan | null;
	last_qualified_scan?: QualifiedScan | null; // generated client-side
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
	description: string;
	severity: Severities;
	remediation: string;
	components: VulnComponent;
	source_plugins: string[];
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

const componentLicenseSchema: Yup.SchemaOf<ComponentLicense> = Yup.object()
	.shape({
		id: Yup.string().defined(),
		name: Yup.string().defined(),
	})
	.defined();

const searchComponentSchema: Yup.SchemaOf<SearchComponent> = Yup.object()
	.shape({
		name: Yup.string().defined(),
		version: Yup.string().defined(),
		licenses: Yup.array().defined().of(componentLicenseSchema),
	})
	.defined();

export const searchComponentResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			results: Yup.array().defined().of(searchComponentSchema),
			count: Yup.number().defined(),
			next: Yup.string().defined().nullable(),
			previous: Yup.string().defined().nullable(),
		})
		.defined(),
});

const qualifiedScanSchema: Yup.SchemaOf<QualifiedScan> = Yup.object()
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

export const serviceSchema = (message?: string) => {
	return Yup.string()
		.trim()
		.matches(
			/^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
			{
				message: i18n._(
					t`Must be a valid service name [azure|bitbucket|github] or hostname`
				),
				excludeEmptyString: true,
			}
		);
};

export const riskSchema = Yup.string().oneOf([
	null,
	"priority",
	"critical",
	"high",
	"moderate",
	"low",
]);

export const searchRepoSchema: Yup.SchemaOf<SearchRepo> = Yup.object()
	.shape({
		service: serviceSchema().defined(),
		repo: repoSchema().defined(),
		risk: riskSchema.defined().nullable(),
		qualified_scan: qualifiedScanSchema.defined().nullable(),
		application_metadata: appMetaSchema.nullable(),
	})
	.defined();

export const searchRepoResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			results: Yup.array().defined().of(searchRepoSchema),
			count: Yup.number().defined(),
			next: Yup.string().defined().nullable(),
			previous: Yup.string().defined().nullable(),
		})
		.defined(),
});

// subset of repo fields
export const searchComponentRepoSchema: Yup.SchemaOf<SearchComponentRepo> =
	Yup.object()
		.shape({
			service: serviceSchema().defined(),
			repo: repoSchema().defined(),
			risk: riskSchema.defined().nullable(),
		})
		.defined();

export const searchComponentRepoResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			results: Yup.array().defined().of(searchComponentRepoSchema),
			count: Yup.number().defined(),
			next: Yup.string().defined().nullable(),
			previous: Yup.string().defined().nullable(),
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

const searchVulnerabilitySchema: Yup.SchemaOf<SearchVulnerability> =
	Yup.object()
		.shape({
			id: Yup.string().defined(),
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

export const searchVulnsResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			results: Yup.array().defined().of(searchVulnerabilitySchema),
			count: Yup.number().defined(),
			next: Yup.string().defined().nullable(),
			previous: Yup.string().defined().nullable(),
		})
		.defined(),
});
