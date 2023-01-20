import axios, { RawAxiosRequestHeaders, AxiosRequestConfig } from "axios";
import * as Yup from "yup";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import store from "app/store";
import { addNotification } from "features/notifications/notificationsSlice";
import { setGlobalException } from "features/globalException/globalExceptionSlice";
import {
	AnalysisReport,
	analysisReportResponseSchema,
	ScanHistory,
	ScanHistoryResponse,
	scanHistoryResponseSchema,
	ScanOptions,
	ScanOptionsForm,
	scanQueueResponseSchema,
} from "features/scans/scansSchemas";
import {
	HiddenFinding,
	hiddenFindingsResponseSchema,
} from "features/hiddenFindings/hiddenFindingsSchemas";
import {
	Key,
	addKeyResponseSchema,
	keysResponseSchema,
	KeysResponse,
} from "features/keys/keysSchemas";
import {
	User,
	UsersResponse,
	userResponseSchema,
	usersResponseSchema,
} from "features/users/usersSchemas";
import { DateTime } from "luxon";
import {
	sbomPlugins,
	secretPlugins,
	staticPlugins,
	techPlugins,
	vulnPlugins,
} from "app/scanPlugins";
import {
	APP_NOTIFICATION_DELAY,
	PREFIX_CVEID,
	PREFIX_GHSA,
	STORAGE_SESSION_SCAN,
} from "app/globals";
import {
	VcsService,
	VcsServiceRequest,
	vcsServicesAddResponseSchema,
	VcsServicesGetResponse,
	vcsServicesGetResponseSchema,
} from "features/vcsServices/vcsServicesSchemas";
import {
	SystemStatus,
	systemStatusResponseSchema,
} from "features/systemStatus/systemStatusSchemas";
import {
	SearchComponent,
	SearchComponentRepo,
	searchComponentRepoResponseSchema,
	SearchComponentReposResponse,
	searchComponentResponseSchema,
	SearchComponentsResponse,
	SearchRepo,
	searchRepoResponseSchema,
	SearchReposResponse,
	SearchVulnerability,
	SearchVulnsResponse,
	searchVulnsResponseSchema,
} from "features/search/searchSchemas";
import adjustMetadata from "custom/clientCustom";
import { SPLIT_MULTILINE_CN_REGEX } from "utils/formatters";

// only support filtering by string|string[] field values for now
export interface FilterDef {
	[field: string]: {
		match?: "exact" | "gt" | "bt" | "lt" | "icontains" | "contains" | "null"; // default: icontains
		filter: string | string[];
	};
}

export interface Response {
	results: any;
	count: number;
	next: string | null;
	previous: string | null;
}

export interface RequestMeta {
	currentPage?: number;
	itemsPerPage?: number;
	filters?: FilterDef;
	orderBy?: string;
	abortController?: AbortController;
}

export interface Client extends AxiosRequestConfig {
	data?: any;
	meta?: RequestMeta;
	schema?: Yup.SchemaOf<any>;
	customConfig?: AxiosRequestConfig;
}

export interface ScanRequest extends Client {
	data: ScanOptionsForm;
}

export interface ScanByIdRequest extends Client {
	url: string;
}

export interface UserByIdRequest extends Client {
	email: User["email"];
}

export interface HiddenFindingsRequest extends Client {
	url: string;
	data?: HiddenFinding;
}

export interface UserRequest extends Client {
	data: User;
}

export interface UserKeyRequest extends Client {
	url: string;
	data?: Key;
}

export interface UserServiceRequest extends Client {
	url: string;
	data?: VcsServiceRequest;
}

let currentScan: string | undefined | null = undefined;

// custom error for Authentication-based errors
// such as 401 responses
export class AuthError extends Error {
	constructor(m: string) {
		super(m);
		// Set the prototype explicitly
		Object.setPrototypeOf(this, AuthError.prototype);
	}
}

/**
 * Throws an Error in the following order:
 * - AuthError if exception response code is 401
 * - Error with response.data.failed[0].error if set
 * - Error with response.statusText if set
 * - Error with defaultError
 *
 * @param err (Error) - The exception caught.
 * @param defaultError (string) - Fallback string to raise.
 *
 * @return None. Throws a new Error.
 */
const _formatError = (err: any, defaultError?: string) => {
	// TODO/FIXME: this requires some changes for better user-facing error messages:
	// instead of wholesale returning only the exception text or default error
	// it would be better to combine both in certain circumstances
	// e.g. defaultError: "Unable to get scan history"
	// + error.response.failure = 404
	// return: "Unable to get scan history: repo not found"
	const errorMessage = defaultError || i18n._(t`An unknown error occurred`);

	// re-raise Axios cancel request exception so it can be handled upstream
	if (axios.isCancel(err)) {
		console.debug("Request cancelled", err.message);
		throw err;
	}
	if (err?.response?.status === 401) {
		if (err?.response?.data?.message === "not authorized") {
			// user requested something they don't have access to
			throw new Error(i18n._(t`Not authorized`));
		}
		console.warn("Session timeout, redirecting to login");
		throw new AuthError(i18n._(t`Session expired, redirecting to login...`));
	}
	if (err?.response?.status === 404) {
		throw new Error(i18n._(t`Not found`));
	}
	if (err?.response?.data?.failed && err.response.data.failed.length) {
		console.warn(err.response.data.failed[0].error || errorMessage);
		throw new Error(err.response.data.failed[0].error || errorMessage);
	}
	if (err?.response?.statusText) {
		console.warn(err.response.statusText);
		throw new Error(err.response.statusText);
	}
	console.warn(errorMessage);
	throw new Error(errorMessage);
};

// redirect to / for reauth
// broken-out from setTimeout in handleException
// to make this separately unit testable
const _redirect = () => {
	window.location.reload();
};

/**
 * Dispaches an Error based on type:
 * - AuthError - dispatches a global exception & sets a timer to redirect => /
 * - Error - dispatches a notification to display an alert
 *
 * @param err (Error) - The exception caught.
 *
 * @return void.
 */
export const handleException = (err: any) => {
	const redirectTimeout = APP_NOTIFICATION_DELAY; // redirect => login after delay

	// authentication failure special case
	// set a global exception & force reauth
	if (err instanceof AuthError) {
		store.dispatch(
			setGlobalException({ message: err.message, action: "login" })
		);

		// redirect to / for reauth once user has opportunty to view exception
		setTimeout(_redirect, redirectTimeout);
		return true;
	}
	// don't generate notifications for cancelled requests
	if (axios.isCancel(err)) {
		return true;
	}

	// append another error notification
	store.dispatch(addNotification(err.message));
	return true;
};

const client = async (
	url: string,
	{ data, meta, schema, ...customConfig }: Client
) => {
	const headers = {
		"Content-Type": "application/json",
	};
	const config: AxiosRequestConfig = {
		baseURL: process.env.REACT_APP_API_NAMESPACE || "/api",
		url: url,
		method: data ? "POST" : "GET",
		...customConfig,
		headers: {
			...headers,
			...(customConfig.headers as RawAxiosRequestHeaders),
		},
	};
	if (data) {
		config.data = data;
	}
	if (meta) {
		// use URLSearchParams instead of a plain object
		// so we can have multiple duplicate keys (e.g. risk, severity)
		const params = new URLSearchParams();
		if (meta.itemsPerPage) {
			params.append("limit", String(meta.itemsPerPage));
			if (meta.currentPage) {
				params.append("offset", String(meta.currentPage * meta.itemsPerPage));
			}
		}
		for (const [param, value] of Object.entries(meta.filters || {})) {
			// don't add a filter if the filter string is not set
			if (value.filter) {
				const singleFilter = Array.isArray(value.filter)
					? value.filter[0]
					: value.filter;
				switch (value.match) {
					// axios handles uri encoding params in buildURL.js
					case "exact": {
						// accepts multiple filters
						const filters = Array.isArray(value.filter)
							? [...value.filter]
							: [value.filter];
						for (const filter of filters) {
							params.append(param, filter);
						}
						break;
					}
					case "gt": {
						params.append(`${param}__gt`, singleFilter);
						break;
					}
					case "lt": {
						params.append(`${param}__lt`, singleFilter);
						break;
					}
					case "bt": {
						// requires 2 filters
						if (Array.isArray(value.filter) && value.filter.length > 1) {
							params.append(`${param}__gt`, value.filter[0]);
							params.append(`${param}__lt`, value.filter[1]);
						}
						break;
					}
					case "null": {
						params.append(`${param}__isnull`, singleFilter); // isnull expects a boolean (string)
						break;
					}
					case "contains": {
						params.append(`${param}__contains`, singleFilter);
						break;
					}
					default: {
						// icontains
						params.append(`${param}__icontains`, singleFilter);
						break;
					}
				}
			}
		}
		if (meta.orderBy) {
			params.append("order_by", meta.orderBy);
		}
		if (meta.abortController) {
			config.signal = meta.abortController.signal;
		}
		config.params = params;
	}

	const response = await axios.request(config);
	// perform additional schema validation
	// note: you don't usually validate data received matches an expected format
	// this is intended to catch mismatch errors early and in 1 place
	// instead of in usage everywhere else where it's harder to catch
	if (schema) {
		try {
			await schema.validate(response);
			return response.data;
		} catch (err: any) {
			console.warn("Unexpected response format:", err);
			if (process.env.NODE_ENV === "development") {
				throw err;
			} else {
				throw new Error(i18n._(t`Unexpected response format`));
			}
		}
	}
	return response.data;
};

// ensure user object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustComponent = (response: SearchComponent) => {
	// add a generated _id field so there's a unique key to identify this field
	response._id = `component-${response.name}-${response.version}`;
};

client.getComponents = async ({
	meta,
	customConfig = {},
}: Client): Promise<SearchComponentsResponse> => {
	try {
		const response: SearchComponentsResponse = await client(
			"/sbom/components",
			{
				...customConfig,
				meta,
				schema: searchComponentResponseSchema,
				method: "GET",
			}
		);
		response.results.forEach((result: SearchComponent) => {
			adjustComponent(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get component search results`));
		return err;
	}
};

// ensure user object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustComponentRepo = (response: SearchComponentRepo) => {
	// add a generated _id field so there's a unique key to identify this field
	response._id = `component-repo-${response.service}-${response.repo}`;
};

client.getComponentRepos = async (
	name: SearchComponent["name"],
	version: SearchComponent["version"],
	{ meta, customConfig = {} }: Client
): Promise<SearchComponentReposResponse> => {
	if (!name) {
		throw new Error(i18n._(t`Component name required`));
	}
	if (!version) {
		throw new Error(i18n._(t`Component version required`));
	}

	try {
		const response = await client(
			`/sbom/components/${encodeURIComponent(name)}/${encodeURIComponent(
				version
			)}/repos`,
			{
				...customConfig,
				meta,
				schema: searchComponentRepoResponseSchema,
				method: "GET",
			}
		);
		response.results.forEach((result: SearchComponentRepo) => {
			adjustComponentRepo(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get repositories for component`));
		return err;
	}
};

// ensure user object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustRepo = (response: SearchRepo) => {
	if (response?.application_metadata) {
		adjustMetadata(response?.application_metadata);
	}
	if (response?.qualified_scan?.created) {
		response.qualified_scan.created = addUTCOffset(
			response.qualified_scan.created
		);
	}
	// duplicate the qualified_scan field into a last_qualified_scan field
	// this matches the name of the filter option
	// so that the data table can correlate the filter name with the column name
	response.last_qualified_scan = response?.qualified_scan
		? { ...response?.qualified_scan }
		: null;

	// add a generated _id field so there's a unique key to identify this field
	response._id = `repo-${response.service}-${response.repo}`;
};

client.getRepos = async ({
	meta,
	customConfig = {},
}: Client): Promise<SearchReposResponse> => {
	try {
		const response: SearchReposResponse = await client("/search/repositories", {
			...customConfig,
			meta,
			schema: searchRepoResponseSchema,
			method: "GET",
		});
		response.results.forEach((result: SearchRepo) => {
			adjustRepo(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get repository search results`));
		return err;
	}
};

// sort advisory ids by
// 1. CVEID
// 2. GHSA url
// 3. rest sorted alphabetically
const sortAdvisoryIds = (a: string, b: string) => {
	if (a.startsWith(PREFIX_CVEID) && !b.startsWith(PREFIX_CVEID)) {
		return -1;
	} else if (b.startsWith(PREFIX_CVEID)) {
		return 1;
	} else if (a.startsWith(PREFIX_GHSA) && !b.startsWith(PREFIX_GHSA)) {
		return -1;
	} else if (b.startsWith(PREFIX_GHSA)) {
		return 1;
	}
	return b.localeCompare(a);
};

// ensure user object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustVuln = (response: SearchVulnerability) => {
	for (const [name, versions] of Object.entries(response?.components)) {
		if (versions) {
			response.components[name].sort();
		}
	}
	if (response?.advisory_ids) {
		response?.advisory_ids.sort(sortAdvisoryIds);

		// duplicate advisory_ids field as vuln_id
		// this matches the name of the filter option
		// so that the data table can correlate the filter name with the column name
		response.vuln_id = [...response.advisory_ids];
	} else {
		response.vuln_id = [];
	}
	if (response?.source_plugins) {
		response?.source_plugins.sort();

		// duplicate source_plugins field as plugin
		// this matches the name of the filter option
		// so that the data table can correlate the filter name with the column name
		response.plugin = [...response.source_plugins];
	} else {
		response.plugin = [];
	}
};

// API not implemented, results format subject to change
client.getVulnerabilities = async ({
	meta,
	customConfig = {},
}: Client): Promise<SearchVulnsResponse> => {
	try {
		const response: SearchVulnsResponse = await client(
			"/search/vulnerabilities",
			{
				...customConfig,
				meta,
				schema: searchVulnsResponseSchema,
				method: "GET",
			}
		);
		response.results.forEach((result: SearchVulnerability) => {
			adjustVuln(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get vulnerability search results`));
		return err;
	}
};

// API not implemented, results format subject to change
client.getVulnerabilityRepos = async (
	id: SearchVulnerability["id"],
	{ meta, customConfig = {} }: Client
): Promise<SearchReposResponse> => {
	if (!id) {
		throw new Error(i18n._(t`Vulnerability ID required`));
	}

	try {
		const response = await client(
			`/search/vulnerabilities/${encodeURIComponent(id)}/repositories`,
			{
				...customConfig,
				meta,
				schema: searchRepoResponseSchema,
				method: "GET",
			}
		);
		response.results.forEach((result: SearchRepo) => {
			adjustRepo(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get repositories for vulnerability`));
		return err;
	}
};

client.getSystemStatus = async ({
	meta,
	customConfig = {},
}: Client = {}): Promise<SystemStatus> => {
	try {
		const response = await client("/system/status", {
			...customConfig,
			meta,
			schema: systemStatusResponseSchema,
			method: "GET",
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get system status`));
		return err;
	}
};

// ensure user object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustUser = (response: User, id?: string) => {
	if (!response?.id && id) {
		response.id = id;
	}
	// scan_orgs is unsorted by default, sort it
	if (response.scan_orgs) {
		response.scan_orgs.sort();
	}
	if (response?.last_login) {
		response.last_login = addUTCOffset(response.last_login);
	}
};

client.addUser = async ({ data, customConfig = {} }: UserRequest) => {
	if (!data) {
		throw new Error(i18n._(t`Data required`));
	}
	// get fields that should not be included in API requests
	const { id, email, last_login, scan_orgs, ...apiFields } = data;
	if (!email) {
		throw new Error(i18n._(t`Email required`));
	}

	try {
		const response = await client(`/users/${encodeURI(email)}`, {
			...customConfig,
			data: { ...apiFields },
			schema: userResponseSchema,
		});
		adjustUser(response as User);
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to add user`));
		return err;
	}
};

client.updateUser = async ({ data, customConfig = {} }: UserRequest) => {
	if (!data) {
		throw new Error(i18n._(t`Data required`));
	}
	// get fields that should not be included in API requests
	const { id, email, last_login, scan_orgs, ...apiFields } = data;
	if (!email) {
		throw new Error(i18n._(t`Email required`));
	}

	try {
		const response = await client(`/users/${encodeURI(email)}`, {
			...customConfig,
			data: { ...apiFields },
			schema: userResponseSchema,
			method: "PUT",
		});
		adjustUser(response as User);
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to update user`));
		return err;
	}
};

client.deleteUser = async ({
	email,
	customConfig = {},
}: UserByIdRequest): Promise<User["email"]> => {
	if (!email) {
		throw new Error(i18n._(t`Email required`));
	}

	try {
		await client(`/users/${encodeURI(email)}`, {
			...customConfig,
			method: "DELETE",
		});
		// 204/No Content
		return email;
	} catch (err: any) {
		// formatError throws an exception, return here is just to make TS happy
		// "not all code paths return a value"
		_formatError(err, i18n._(t`Unable to remove user`));
		return err;
	}
};

client.getUserById = async (
	email: User["email"],
	{ meta, customConfig = {} }: Client
): Promise<User> => {
	if (!email) {
		throw new Error(i18n._(t`Email required`));
	}

	try {
		const response = await client(`/users/${encodeURI(email)}`, {
			...customConfig,
			meta,
			schema: userResponseSchema,
			method: "GET",
		});
		adjustUser(response as User);
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get user details`));
		return err;
	}
};

client.getUsersSelf = async ({
	meta,
	customConfig = {},
}: Client = {}): Promise<User> => {
	try {
		const response = await client("/users/self", {
			...customConfig,
			meta,
			schema: userResponseSchema,
			method: "GET",
		});
		adjustUser(response as User, "self");
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get current user details`));
		return err;
	}
};

client.getUsers = async ({
	meta,
	customConfig = {},
}: Client): Promise<UsersResponse> => {
	try {
		const response: UsersResponse = await client("/users", {
			...customConfig,
			meta,
			schema: usersResponseSchema,
			method: "GET",
		});
		response.results.forEach((result: User) => {
			adjustUser(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get users`));
		return err;
	}
};

const addUTCOffset = (dateField: string) => {
	if (!dateField.endsWith("+00:00") && !dateField.endsWith("Z")) {
		return (dateField += "+00:00");
	}
	return dateField;
};

// ensure scan object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustScanHistory = (response: ScanHistory) => {
	// ensure times include UTC offset
	if (response?.timestamps.start) {
		response.timestamps.start = addUTCOffset(response.timestamps.start);
	}
	if (response?.timestamps.queued) {
		response.timestamps.queued = addUTCOffset(response.timestamps.queued);
	}
	if (response?.timestamps.end) {
		response.timestamps.end = addUTCOffset(response.timestamps.end);
	}
	if (response?.status_detail.plugin_start_time) {
		response.status_detail.plugin_start_time = addUTCOffset(
			response.status_detail.plugin_start_time
		);
	}
	// scan history doesn't provide separate scan_id field, it's appended to repo field
	// split it out so we have a separate id for use in CreateEntityAdapter
	if (!response?.scan_id) {
		const parts = response.repo.split("/");
		response.scan_id = parts.pop();
		response.repo = parts.join("/");
	}
};

const adjustScan = (response: AnalysisReport) => {
	if (response?.application_metadata) {
		adjustMetadata(response?.application_metadata);
	}
	adjustScanHistory(response);
};

client.getScanById = async (
	url: string,
	{ meta, customConfig = {} }: Client
): Promise<AnalysisReport> => {
	try {
		const response: AnalysisReport = await client(url, {
			...customConfig,
			meta,
			schema: analysisReportResponseSchema,
			method: "GET",
		});
		adjustScan(response);
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get scan by id`));
		return err;
	}
};

client.getCurrentScan = ({
	meta,
	customConfig = {},
}: Client = {}): Promise<AnalysisReport> => {
	// if user has initiated a scan recently, return it from cached URI
	if (!currentScan) {
		currentScan = sessionStorage.getItem(STORAGE_SESSION_SCAN);
	}
	if (currentScan) {
		return client.getScanById(encodeURI(currentScan), {
			...customConfig,
			meta,
		});
	}
	throw new Error(i18n._(t`No current scan`));
};

client.addScan = async ({
	data,
	customConfig = {},
}: ScanRequest): Promise<AnalysisReport> => {
	const scanOpts: ScanOptions = {};
	const parts = data.vcsOrg ? data.vcsOrg.split("/") : []; // vcs/org

	// we only check vcsOrg here and not also repo (which is also required)
	// b/c TypeScript is ensuring repo is required/not null
	// but b/c vcsOrg is a drop-down selector, it can also return null,
	// so need to validate it's not null
	if (!data.vcsOrg) {
		throw new Error(i18n._(t`VCS/Org required`));
	}

	// Calculates removed plugins by subtraction
	// (AllKnownPlugins) - (RemainingUICheckedPlugins) = (ThePluginsTheUserUnchecked)
	// We have to do this because formik only reports the checked checkboxes, whereas we want to know the unchecked ones
	const getRemovedPlugins = (
		allPlugins: string[],
		checkedPlugins: string[]
	) => {
		const removedPlugins: string[] = [];

		allPlugins.forEach((pluginName) => {
			if (!checkedPlugins.includes(pluginName)) {
				removedPlugins.push(`-${pluginName}`);
			}
		});

		return removedPlugins;
	};

	// convert scan options flat object form from web form
	// to format expected by REST API
	if (data.branch) {
		scanOpts.branch = data.branch;
	}
	if (data.depth) {
		scanOpts.depth = data.depth;
	}
	if (data.includeDev) {
		scanOpts.include_dev = data.includeDev;
	}
	if (data.includePaths) {
		scanOpts.include_paths = [];
		data.includePaths.split(SPLIT_MULTILINE_CN_REGEX).forEach((p) => {
			const path = p.trim();
			if (path.length > 0 && scanOpts.include_paths) {
				scanOpts.include_paths.push(path);
			}
		});
	}
	if (data.excludePaths) {
		scanOpts.exclude_paths = [];
		data.excludePaths.split(SPLIT_MULTILINE_CN_REGEX).forEach((p) => {
			const path = p.trim();
			if (path.length > 0 && scanOpts.exclude_paths) {
				scanOpts.exclude_paths.push(path);
			}
		});
	}

	scanOpts.categories = [
		data.inventory ? "inventory" : "-inventory",
		data.secrets ? "secret" : "-secret",
		data.staticAnalysis ? "static_analysis" : "-static_analysis",
		data.vulnerability ? "vulnerability" : "-vulnerability",
		data.sbom ? "sbom" : "-sbom",
	];
	if (data.inventory) {
		scanOpts.plugins = [
			...getRemovedPlugins(techPlugins, data.techPlugins || []),
		];
	} else {
		scanOpts.plugins = [...(data.techPlugins ?? [])];
	}
	if (data.secrets) {
		scanOpts.plugins = [
			...scanOpts.plugins,
			...getRemovedPlugins(secretPlugins, data.secretPlugins || []),
		];
	} else {
		scanOpts.plugins = [...scanOpts.plugins, ...(data.secretPlugins ?? [])];
	}
	if (data.staticAnalysis) {
		scanOpts.plugins = [
			...scanOpts.plugins,
			...getRemovedPlugins(staticPlugins, data.staticPlugins || []),
		];
	} else {
		scanOpts.plugins = [...scanOpts.plugins, ...(data.staticPlugins ?? [])];
	}
	if (data.vulnerability) {
		scanOpts.plugins = [
			...scanOpts.plugins,
			...getRemovedPlugins(vulnPlugins, data.vulnPlugins || []),
		];
	} else {
		scanOpts.plugins = [...scanOpts.plugins, ...(data.vulnPlugins ?? [])];
	}
	if (data.sbom) {
		scanOpts.plugins = [
			...scanOpts.plugins,
			...getRemovedPlugins(sbomPlugins, data.sbomPlugins || []),
		];
	} else {
		scanOpts.plugins = [...scanOpts.plugins, ...(data.sbomPlugins ?? [])];
	}

	try {
		const postResponse = await client(
			encodeURI(data.vcsOrg) + "/" + encodeURI(data.repo),
			{
				...customConfig,
				data: scanOpts,
				schema: scanQueueResponseSchema,
			}
		);

		// Note: we are creating scans 1-at-a-time as user clicks "Start Scan",
		// not queueing a batch of them
		// therefore, returned queue and failed arrays will only have 1 item
		// for this single scan

		// scan now queued or failed, if queued, get scan details by returned id
		if (postResponse.failed.length) {
			// disregard "repo" key, as there's only 1 item in queue,
			// just return the error message
			throw new Error(postResponse.failed[0].error);
		}

		// use only queued item (0)
		// store current scan in session storage that will survive a reload
		// but not a browser restart
		currentScan = "/" + encodeURI(parts[0]); // VCS field
		// add separator between VCS/org if queued scan string doesn't contain a separator
		if (!postResponse.queued[0].startsWith("/")) {
			currentScan += "/";
		}
		currentScan += postResponse.queued[0];
		// store URI for this latest scan so we can display it as user's current scan in a history list
		sessionStorage.setItem(STORAGE_SESSION_SCAN, currentScan);

		let excludePaths = scanOpts?.exclude_paths ?? [];
		// if include_paths defined but exclude_paths undefined, set exclude_paths to "*" (all)
		// this is only for initial scan status display purposes, the API will do the same for subsequent scan fetch results
		if (
			scanOpts?.include_paths &&
			scanOpts.include_paths.length > 0 &&
			(!scanOpts?.exclude_paths || scanOpts?.exclude_paths.length === 0)
		) {
			excludePaths = ["*"];
		}

		// don't immediately get the queued scan info by calling getCurrentScan
		// if that fails for any reason then it will fail the entire addScan process
		// and getCurrentScan won't be called subsequently to update scan details
		// instead, return minimal info on the queued scan
		// and allow subsequent calls to getCurrentScan to update status with latest details
		return {
			scan_id: postResponse.queued[0].split("/").pop(), // scan_id = elt after last /
			branch: data.branch || null,
			status: "queued",
			timestamps: {
				queued: DateTime.utc().toISO(),
				start: null, // start time null when queued
				end: null,
			},
			// we don't get full scan info back from the create scan call
			// so augment with options requested for the scan so that the UI
			// displays the correct scan indicators (e.g., having include/exclude paths)
			// before the full scan data is fetched when scan starts
			scan_options: {
				include_paths: scanOpts?.include_paths ?? [],
				exclude_paths: excludePaths,
			},
		} as AnalysisReport;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to queue new scan`));
		return err;
	}
};

client.getScanHistory = async ({
	data,
	meta,
	customConfig = {},
}: ScanRequest): Promise<ScanHistoryResponse> => {
	// we only check vcsOrg here and not also repo (which is also required)
	// b/c TypeScript is ensuring repo is required/not null
	// but b/c vcsOrg is a drop-down selector, it can also return null,
	// so need to validate it's not null
	if (!data.vcsOrg) {
		throw new Error(i18n._(t`VCS/Org required`));
	}

	try {
		const response: ScanHistoryResponse = await client(
			encodeURI(data.vcsOrg) + "/" + encodeURI(data.repo) + "/history",
			{
				...customConfig,
				meta,
				schema: scanHistoryResponseSchema,
				method: "GET",
			}
		);
		response.results.forEach((result: ScanHistory) => {
			adjustScanHistory(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get scan history`));
		return err;
	}
};

// ensure hidden finding object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustHiddenFinding = (response: HiddenFinding) => {
	// ensure times include UTC offset and represented in Luxon DateFime format
	if (response?.expires) {
		response.expires = addUTCOffset(response.expires);
	}
	if (response?.created) {
		response.created = addUTCOffset(response.created);
	}
	if (response?.updated) {
		response.updated = addUTCOffset(response.updated);
	}
};

// ensure hidden finding API URL ends with /whitelist
const validateHiddenFindingUrl = (url: string) => {
	return url.endsWith("/whitelist") ? url : url + "/whitelist";
};

client.addHiddenFinding = async ({
	url,
	data,
	customConfig = {},
}: HiddenFindingsRequest): Promise<HiddenFinding | HiddenFinding[]> => {
	if (!data) {
		throw new Error(i18n._(t`Data required`));
	}

	// any id, created_by fields should be removed from API data
	const { id, created_by, ...requestData } = data;

	try {
		const response: HiddenFinding | HiddenFinding[] = await client(
			validateHiddenFindingUrl(url),
			{
				...customConfig,
				data: requestData,
				schema: hiddenFindingsResponseSchema,
			}
		);

		// legacy: POST API doesn't return created_by user
		// so add current user if not returned
		if (Array.isArray(response)) {
			response.forEach((hf) => {
				if (!("created_by" in hf)) {
					hf.created_by = created_by;
				}
				if (!("created" in hf)) {
					hf.created = new Date().toISOString();
				}
				adjustHiddenFinding(hf);
			});
		} else {
			if (!("created_by" in response)) {
				response.created_by = created_by;
			}
			if (!("created" in response)) {
				response.created = new Date().toISOString();
			}
			adjustHiddenFinding(response);
		}
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to add hidden finding`));
		return err;
	}
};

client.deleteHiddenFinding = async ({
	url,
	customConfig = {},
}: HiddenFindingsRequest): Promise<HiddenFinding["id"]> => {
	try {
		await client(url, {
			...customConfig,
			method: "DELETE",
		});
		// 204/No Content
		const id: HiddenFinding["id"] = url.split("/").pop();
		return id;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to remove hidden finding`));
		return err;
	}
};

client.getHiddenFindings = async (
	repoUrl: string,
	{ meta, customConfig = {} }: Client
): Promise<HiddenFinding[]> => {
	try {
		const response: HiddenFinding[] = await client(
			validateHiddenFindingUrl(repoUrl),
			{
				...customConfig,
				meta,
				schema: hiddenFindingsResponseSchema,
				method: "GET",
			}
		);
		if (Array.isArray(response)) {
			response.forEach((result: HiddenFinding) => {
				adjustHiddenFinding(result);
			});
			return response;
		}
		return [] as HiddenFinding[];
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get repo hidden findings`));
		return err;
	}
};

client.updateHiddenFinding = async ({
	url,
	data,
	customConfig = {},
}: HiddenFindingsRequest): Promise<HiddenFinding[]> => {
	if (!data) {
		throw new Error(i18n._(t`Data required`));
	}
	// remove existing id, created_by fields
	// we need these to return the full object
	// but API doesn't need these for save
	const { id, created_by, created, updated_by, updated, ...requestData } = data;

	try {
		await client(url, {
			...customConfig,
			data: requestData,
			// no schema checking required, returns 204/No Content
			method: "PUT",
		});
		// success returns 204/No Content
		// so return data passed-in and add an "updated" field with current date
		// no adjustHiddenFinding necessary since data not coming back from API
		return [
			{
				...data,
				updated: new Date().toISOString(),
			},
		];
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to update hidden finding`));
		return err;
	}
};

client.addUserKey = async ({
	url,
	data,
	customConfig = {},
}: UserKeyRequest) => {
	if (!data) {
		throw new Error(i18n._(t`Data required`));
	}

	try {
		const response = await client(url, {
			...customConfig,
			data: data,
			schema: addKeyResponseSchema,
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to add user key`));
		return err;
	}
};

client.deleteUserKey = async ({
	url,
	customConfig = {},
}: UserKeyRequest): Promise<Key["id"]> => {
	try {
		await client(url, {
			...customConfig,
			method: "DELETE",
		});
		// 204/No Content
		const id: Key["id"] = url.split("/").pop();
		return id;
	} catch (err: any) {
		// formatError throws an exception, return here is just to make TS happy
		// "not all code paths return a value"
		_formatError(err, i18n._(t`Unable to remove user key`));
		return err;
	}
};

// ensure user api key object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustKey = (response: Key) => {
	// ensure times include UTC offset and represented in Luxon DateFime format
	if (response?.created) {
		response.created = addUTCOffset(response.created);
	}
	if (response?.last_used) {
		response.last_used = addUTCOffset(response.last_used);
	}
	if (response?.expires) {
		response.expires = addUTCOffset(response.expires);
	}
};

client.getUserKeys = async ({
	meta,
	customConfig = {},
}: Client = {}): Promise<KeysResponse> => {
	const id = "self";
	try {
		const response = await client(`/users/${id}/keys`, {
			...customConfig,
			meta,
			schema: keysResponseSchema,
			method: "GET",
		});
		response.results.forEach((result: Key) => {
			adjustKey(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get user keys`));
		return err;
	}
};

client.linkUserService = async ({
	url,
	data,
	customConfig = {},
}: UserServiceRequest) => {
	if (!data) {
		throw new Error(i18n._(t`Data required`));
	}

	try {
		const response = await client(url, {
			...customConfig,
			data: data,
			schema: vcsServicesAddResponseSchema,
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to link user service`));
		return err;
	}
};

client.unlinkUserService = async ({
	url,
	customConfig = {},
}: UserServiceRequest): Promise<string | undefined> => {
	try {
		await client(url, {
			...customConfig,
			method: "DELETE",
		});
		// 204/No Content
		// return the service removed
		return url.split("/").pop();
	} catch (err: any) {
		// formatError throws an exception, return here is just to make TS happy
		// "not all code paths return a value"
		_formatError(err, i18n._(t`Unable to unlink user service`));
		return err;
	}
};

// ensure user service object fields match formats expected by UI for value display
// note: this function will mutate response object fields
const adjustService = (response: VcsService) => {
	// ensure times include UTC offset and represented in Luxon DateFime format
	if (response?.linked) {
		response.linked = addUTCOffset(response.linked);
	}
};

client.getUserServices = async ({
	meta,
	customConfig = {},
}: Client = {}): Promise<VcsServicesGetResponse> => {
	const id = "self";
	try {
		const response = await client(`/users/${id}/services`, {
			...customConfig,
			meta,
			schema: vcsServicesGetResponseSchema,
			method: "GET",
		});
		response.forEach((result: VcsService) => {
			adjustService(result);
		});
		return response;
	} catch (err: any) {
		_formatError(err, i18n._(t`Unable to get user services`));
		return err;
	}
};

export default client;

export const exportsForTesting = {
	_redirect: _redirect,
	_formatError: _formatError,
};
