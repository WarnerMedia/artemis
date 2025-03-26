import { DateTime } from "luxon";
import { browserLanguage } from "App";
import { APP_EXPORT_CLASSIFICATION } from "app/globals";
import { IServiceMapValue, serviceMap } from "app/services";
import { RowDef } from "components/EnhancedTable";
import { t } from "@lingui/macro";
import { i18n } from "@lingui/core";

// split multiline strings on comma, newline, (& space)
export const SPLIT_MULTILINE_CSN_REGEX = /\s*[,\s]/gm;
export const SPLIT_MULTILINE_CN_REGEX = /[,\n]/gm;

export const DELETED_REGEX = new RegExp(/_DELETED_[0-9]+$/);

// format ISO date string as locale-aware string for display in UI
// format = short (default)|long
// short format uses ISO Date (YYYY-MM-dd) + Localized Time + Localized Time Zone
// long format uses Long Weekday (e.g. "Friday") + DATETIME_FULL_WITH_SECONDS
//
// if the dateString is not a valid date, the dateString will be returned as output
export const formatDate = (
	dateString: string | null,
	format: "short" | "long" = "short",
) => {
	if (!dateString) {
		return "";
	}
	const dt = DateTime.fromISO(dateString);
	if (!dt.isValid) {
		return dateString;
	}
	if (format === "long") {
		return (
			dt.setLocale(browserLanguage).toFormat("cccc") +
			", " +
			dt
				.setLocale(browserLanguage)
				.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)
		);
	}
	return (
		dt.toFormat("yyyy-LL-dd") +
		" " +
		dt.setLocale(browserLanguage).toLocaleString(DateTime.TIME_SIMPLE) +
		" " +
		dt.setLocale(browserLanguage).toFormat("ZZZZ")
	);
};

export const capitalize = (str: string): string => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const compareButIgnoreLeadingDashes = (a: string, b: string) => {
	const aClean = a.startsWith("-") ? a.slice(1) : a;
	const bClean = b.startsWith("-") ? b.slice(1) : b;

	return aClean.localeCompare(bClean);
};

interface IGetVcsUrlUniversalParams {
	serviceInfo: IServiceMapValue | undefined;
	repo: string;
	filename: string | undefined;
	branch: string | undefined;
	commit: string | undefined;
	line_no: string | undefined;
}

interface IGetVcsUrlServiceParams {
	commitBase: string; // The string that goes between repo and commit in the url
	lineParam: string; // The string that goes before the line number in the url
}

const nonFileLocations = new Set(["Commit Message"]);

const getVcsUrl = (
	universal: IGetVcsUrlUniversalParams,
	service: IGetVcsUrlServiceParams,
) => {
	const base = `${universal.serviceInfo?.url ?? ""}/${universal.repo}`;
	const refPath = universal.commit || universal.branch;
	const lineText =
		universal?.line_no !== "0"
			? `#${service.lineParam}${universal.line_no}`
			: "";

	if (!universal.filename) {
		return base;
	} else if (nonFileLocations.has(universal.filename)) {
		// Link to the commit directly if filename is special
		return `${base}/${service.commitBase}/${refPath}`;
	} else {
		return `${base}/${service.commitBase}/${refPath}/${universal.filename}${lineText}`;
	}
};

export const vcsHotLink = (row: RowDef) => {
	let url = "";
	if (row?.service?.length > 0 && row?.repo?.length > 0) {
		const branch =
			!row.branch || row.branch.length === 0 ? "HEAD" : row.branch.toString();
		const service = String(row.service);
		if (serviceMap.has(service)) {
			const serviceInfo = serviceMap.get(service);
			const repo = row.repo.toString();
			const filename =
				row.filename && row.repo.length > 0 ? row.filename.toString() : null;
			const commit = row.commit ? row.commit.toString() : null;
			const line_no = row.line ? row.line.toString() : null;

			const universalParams: IGetVcsUrlUniversalParams = {
				serviceInfo,
				repo,
				branch,
				filename,
				commit,
				line_no,
			};

			switch (serviceInfo?.type) {
				case "ado":
					//https://<server>/<repo>//<commit>/<filename_path>#L<line_number>
					//https://<server>/<repo>/<filename_path>#L<line_number>
					url = getVcsUrl(universalParams, {
						commitBase: "_git",
						lineParam: "L",
					});
					break;
				case "bitbucket":
					//https://<server>/<repo>/src/<commit>/<filename_path>#lines-<line_number>
					//https://<server>/<repo>/src/<branch>/<filename_path>#lines-<line_number>
					url = getVcsUrl(universalParams, {
						commitBase: "src",
						lineParam: "lines-",
					});
					break;
				case "gitlab":
					//https://<server>/<repo>/-/blob/<branch>/<commit>/<filename_path>#L<line_number>
					//https://<server>/<repo>/<filename_path>#L<line_number>
					url = getVcsUrl(universalParams, {
						commitBase: "-/blob",
						lineParam: "L",
					});
					break;
				case "github":
					//https://<server>/<repo>/blob/<commit>/<filename_path>#L<line_number>
					//https://<server>/<repo>/<filename_path>#L<line_number>
					url = getVcsUrl(universalParams, {
						commitBase: "blob",
						lineParam: "L",
					});
					break;
				default:
					console.error(`Unsupported repository: ${repo}`);
			}
		}
	}
	return url;
};

interface DownloadFileI {
	data: any;
	fileName: string;
	fileType: string;
}

// forces a file download by creating a temporary link element with blob data on dom, clicking it, then removing it
// based on: https://theroadtoenterprise.com/blog/how-to-download-csv-and-json-files-in-react
export const downloadFile = ({ data, fileName, fileType }: DownloadFileI) => {
	const blob = new Blob([data], { type: fileType });

	const a = document.createElement("a");
	a.download = fileName;
	a.href = window.URL.createObjectURL(blob);
	a.click();
	a.remove();
	setTimeout(() => {
		window.URL.revokeObjectURL(a.href);
	}, 100);
};

export const exportToJson = (fileName: string, data: any) => {
	// we call this in our module so tests can mock/spyOn download
	// see: https://medium.com/@DavideRama/mock-spy-exported-functions-within-a-single-module-in-jest-cdf2b61af642
	let exportData: any = null;
	if (Array.isArray(data)) {
		exportData = APP_EXPORT_CLASSIFICATION
			? [{ __classification__: APP_EXPORT_CLASSIFICATION }, ...data]
			: [...data];
	} else if (typeof data === "object" && data !== null) {
		exportData = APP_EXPORT_CLASSIFICATION
			? { __classification__: APP_EXPORT_CLASSIFICATION, ...data }
			: { ...data };
	}
	formatters.downloadFile({
		data: JSON.stringify(exportData),
		fileName: `${fileName}.json`,
		fileType: "text/json",
	});
};

export type ToCsvFormat = (data: any) => any; // format object fields for CSV

export const exportToCsv = (
	fileName: string,
	data: RowDef[],
	toCsv?: ToCsvFormat,
) => {
	let headers = [""];
	if (data.length > 0) {
		headers = [Object.keys(toCsv ? toCsv(data[0]) : data[0]).join(",")];
	}

	const csvData = data.reduce((acc: string[], row: RowDef) => {
		const r = [];
		const formatted = toCsv ? toCsv(row) : row;
		for (const v of Object.values(formatted)) {
			let val: string = "";
			if (typeof v === "number" || typeof v === "string") {
				val = String(v);
			} else if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") {
				val = v.join(", ");
			} else if (
				v !== null &&
				v !== undefined &&
				(!Array.isArray(v) || v.length > 0)
			) {
				val = JSON.stringify(v);
			}
			if (typeof val === "string") {
				r.push(`"${val.replace(/"/g, '""')}"`); // quote each csv field and escape any quotes (" => "")
			} else {
				console.debug("Field must be a string to export to CSV:", v);
			}
		}
		acc.push([r].join(","));
		return acc;
	}, []);
	if (APP_EXPORT_CLASSIFICATION && csvData.length > 0) {
		csvData.push(`# ${APP_EXPORT_CLASSIFICATION}`);
	}

	// we call this in our module so tests can mock/spyOn download
	// see: https://medium.com/@DavideRama/mock-spy-exported-functions-within-a-single-module-in-jest-cdf2b61af642
	formatters.downloadFile({
		data: [...headers, ...csvData].join("\n"),
		fileName: `${fileName}.csv`,
		fileType: "text/csv",
	});
};

export const formatLocationName = (location: string): string => {
	switch (location) {
		case "commit_message":
			return i18n._(t`Commit Message`);
		case "discussion_body":
			return i18n._(t`Discussion Body`);
		case "discussion_comment":
			return i18n._(t`Discussion Comment`);
		case "discussion_title":
			return i18n._(t`Discussion Title`);
		case "issue_body":
			return i18n._(t`Issue Body`);
		case "issue_comment":
			return i18n._(t`Issue Comment`);
		case "issue_title":
			return i18n._(t`Issue Title`);
		case "pull_request_body":
			return i18n._(t`Pull Request Body`);
		case "pull_request_comment":
			return i18n._(t`Pull Request Comment`);
		case "pull_request_review":
			return i18n._(t`Pull Request Review`);
		case "pull_request_review_comment":
			return i18n._(t`Pull Request Review Comment`);
		case "pull_request_title":
			return i18n._(t`Pull Request Title`);
		case "wiki_commit":
			return i18n._(t`Wiki Commit`);
		default:
			return location;
	}
};

const formatters = {
	formatDate: formatDate,
	formatLocationName: formatLocationName,
	capitalize: capitalize,
	compareButIgnoreLeadingDashes: compareButIgnoreLeadingDashes,
	vcsHotLink: vcsHotLink,
	downloadFile: downloadFile,
	exportToJson: exportToJson,
	exportToCsv: exportToCsv,
};
export default formatters;
