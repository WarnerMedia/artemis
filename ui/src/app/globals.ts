// application-wide global variables
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

export const STORAGE_LOCAL_THEME = "theme";
export const STORAGE_LOCAL_WELCOME = "hide-welcome";
export const STORAGE_SESSION_SCAN = "currentScan";

const AppGlobals = {
	APP_CUSTOM_LOGO,
	APP_DEMO_USER_VCSORG,
	APP_DEMO_USER_REPO,
	APP_DOC_URL_USAGE,
	APP_EMAIL_AUTHOR,
	APP_MAINT_CHECK_INTERVAL,
	APP_NOTIFICATION_DELAY,
	APP_RELOAD_INTERVAL,
	APP_SERVICE_GITHUB_URL,
	APP_TABLE_ROWS_PER_PAGE_DEFAULT,
	APP_TABLE_ROWS_PER_PAGE_OPTIONS,
	APP_URL_PROVISION,
	APP_VERSION,
	STORAGE_LOCAL_THEME,
	STORAGE_LOCAL_WELCOME,
	STORAGE_SESSION_SCAN,
};
export default AppGlobals;
