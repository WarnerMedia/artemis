// application-wide global variables
import CustomAppGlobals from "custom/globals";

export const APP_CUSTOM_LOGO: string = process.env.REACT_APP_CUSTOM_LOGO ?? "";

export const APP_EMAIL_AUTHOR: string =
	process.env.REACT_APP_EMAIL_AUTHOR ?? "";

export const APP_DEMO_USER_VCSORG: string =
	process.env.REACT_APP_DEMO_USER_VCSORG ?? "";

export const APP_DEMO_USER_REPO: string =
	process.env.REACT_APP_DEMO_USER_REPO ?? "";

export const APP_DOC_URL_USAGE: string =
	process.env.REACT_APP_DOC_URL_USAGE ?? "";

export const APP_URL_PROVISION: string =
	process.env.REACT_APP_URL_PROVISION ?? "";

export const APP_VERSION: string = process.env.REACT_APP_VERSION ?? "0.0.1";

// milliseconds
export const APP_MAINT_CHECK_INTERVAL: number = process.env
	.REACT_APP_MAINT_CHECK_INTERVAL
	? parseInt(process.env.REACT_APP_MAINT_CHECK_INTERVAL, 10)
	: 300000;

// milliseconds
export const APP_NOTIFICATION_DELAY: number = process.env
	.REACT_APP_NOTIFICATION_DELAY
	? parseInt(process.env.REACT_APP_NOTIFICATION_DELAY, 10)
	: 6000;

// milliseconds
export const APP_RELOAD_INTERVAL: number = process.env.REACT_APP_RELOAD_INTERVAL
	? parseInt(process.env.REACT_APP_RELOAD_INTERVAL, 10)
	: 30000;

export const APP_SERVICE_GITHUB_URL: string = process.env
	.REACT_APP_SERVICE_GITHUB_URL
	? process.env.REACT_APP_SERVICE_GITHUB_URL
	: "https://github.com/login/oauth/authorize?client_id=";

export const APP_TABLE_ROWS_PER_PAGE_DEFAULT: number = process.env
	.REACT_APP_TABLE_ROWS_PER_PAGE_DEFAULT
	? parseInt(process.env.REACT_APP_TABLE_ROWS_PER_PAGE_DEFAULT, 10)
	: 10;

export const APP_TABLE_ROWS_PER_PAGE_OPTIONS: number[] = process.env
	.REACT_APP_TABLE_ROWS_PER_PAGE_OPTIONS
	? process.env.REACT_APP_TABLE_ROWS_PER_PAGE_OPTIONS.split(",").map(Number)
	: [5, 10, 20];

// API batch size when fetching a large number of records
export const APP_API_BATCH_SIZE: number = process.env.REACT_APP_API_BATCH_SIZE
	? parseInt(process.env.REACT_APP_API_BATCH_SIZE, 10)
	: 20;

// maximum number of records to fetch as part of exporting table data
export const APP_TABLE_EXPORT_MAX: number = process.env
	.REACT_APP_TABLE_EXPORT_MAX
	? parseInt(process.env.REACT_APP_TABLE_EXPORT_MAX, 10)
	: 5000;

// add row to exported data indicating classiciation or other information
export const APP_EXPORT_CLASSIFICATION: string =
	process.env.REACT_APP_EXPORT_CLASSIFICATION ?? "";

export const APP_AQUA_ENABLED: boolean =
	process.env.REACT_APP_AQUA_ENABLED === "true";
export const APP_SNYK_ENABLED: boolean =
	process.env.REACT_APP_SNYK_ENABLED === "true";
export const APP_VERACODE_ENABLED: boolean =
	process.env.REACT_APP_VERACODE_ENABLED === "true";

// DEV vars
// milliseconds - delay to add to requests when testing in development
// has no effect in production
export const APP_DEV_REQUEST_DELAY: number = process.env
	.REACT_APP_DEV_REQUEST_DELAY
	? parseInt(process.env.REACT_APP_DEV_REQUEST_DELAY, 10)
	: 0;

export const STORAGE_LOCAL_THEME = "theme";
export const STORAGE_LOCAL_WELCOME = "hide-welcome";
export const STORAGE_LOCAL_EXPORT_ACKNOWLEDGE = "hide-export-acknowledge";
export const STORAGE_SESSION_SCAN = "currentScan";

export const PREFIX_CVEID = "CVE-";
export const PREFIX_GHSA = "https://github.com/advisories/GHSA-";
export const PREFIX_NVD = "https://nvd.nist.gov/vuln/detail/";

const AppGlobals = {
	APP_API_BATCH_SIZE,
	APP_CUSTOM_LOGO,
	APP_DEMO_USER_VCSORG,
	APP_DEMO_USER_REPO,
	APP_DOC_URL_USAGE,
	APP_EMAIL_AUTHOR,
	APP_MAINT_CHECK_INTERVAL,
	APP_NOTIFICATION_DELAY,
	APP_RELOAD_INTERVAL,
	APP_SERVICE_GITHUB_URL,
	APP_EXPORT_CLASSIFICATION,
	APP_TABLE_EXPORT_MAX,
	APP_TABLE_ROWS_PER_PAGE_DEFAULT,
	APP_TABLE_ROWS_PER_PAGE_OPTIONS,
	APP_URL_PROVISION,
	APP_VERSION,
	STORAGE_LOCAL_EXPORT_ACKNOWLEDGE,
	STORAGE_LOCAL_THEME,
	STORAGE_LOCAL_WELCOME,
	STORAGE_SESSION_SCAN,
	PREFIX_CVEID,
	PREFIX_GHSA,
	PREFIX_NVD,
	APP_AQUA_ENABLED,
	APP_SNYK_ENABLED,
	APP_VERACODE_ENABLED,
	APP_DEV_REQUEST_DELAY,
	...CustomAppGlobals,
};
export default AppGlobals;

export * from "custom/globals";
