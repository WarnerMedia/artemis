import { DateTime } from "luxon";
import { browserLanguage } from "App";
import { serviceMap } from "app/services";
import { RowDef } from "components/EnhancedTable";

// format ISO date string as locale-aware string for display in UI
// format = short (default)|long
// short format uses ISO Date (YYYY-MM-dd) + Localized Time + Localized Time Zone
// long format uses Long Weekday (e.g. "Friday") + DATETIME_FULL_WITH_SECONDS
//
// if the dateString is not a valid date, the dateString will be returned as output
export const formatDate = (
	dateString: string | null,
	format: "short" | "long" = "short"
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
	let aClean = a.startsWith("-") ? a.slice(1) : a;
	let bClean = b.startsWith("-") ? b.slice(1) : b;

	return aClean.localeCompare(bClean);
};

export const vcsHotLink = (row: RowDef) => {
	let url = "";
	if (
		row &&
		row.service &&
		row.service.length > 0 &&
		row.repo &&
		row.repo.length > 0
	) {
		const branch =
			!row.branch || row.branch.length === 0 ? "HEAD" : row.branch.toString();
		let service = String(row.service);
		if (serviceMap.has(service)) {
			let serviceInfo = serviceMap.get(service);
			let repo = row.repo.toString();
			let filename =
				row.filename && row.repo.length > 0 ? row.filename.toString() : null;
			let commit = row.commit ? row.commit.toString() : null;
			let line_no = row.line ? row.line.toString() : null;
			switch (serviceInfo?.type) {
				case "ado":
					//https://<server>/<repo>/blob/<commit>/<filename_path>#L<line_number>
					//https://<server>/<repo>/<filename_path>#L<line_number>
					url = `${serviceInfo?.url ?? ""}/${repo}`;
					if (filename) {
						url += `/_git${commit ? `/${commit}` : `/${branch}`}/${filename}${
							line_no ? `#L${line_no}` : ""
						}`;
					}
					break;
				case "bitbucket":
					//https://<server>/<repo>/src/<commit>/<filename_path>#lines-<line_number>
					//https://<server>/<repo>/src/<branch>/<filename_path>#lines-<line_number>
					url = `${serviceInfo?.url ?? ""}/${repo}`;
					if (filename) {
						url += `/src${commit ? `/${commit}` : `/${branch}`}/${filename}${
							line_no ? `#lines-${line_no}` : ""
						}`;
					}
					break;
				case "gitlab":
					//https://<server>/<repo>/-/blob/<branch>/<commit>/<filename_path>#L<line_number>
					//https://<server>/<repo>/<filename_path>#L<line_number>
					url = `${serviceInfo?.url ?? ""}/${repo}`;
					if (filename) {
						url += `/-/blob${commit ? `/${commit}` : `/${branch}`}/${filename}${
							line_no ? `#L${line_no}` : ""
						}`;
					}
					break;
				case "github":
					//https://<server>/<repo>/blob/<commit>/<filename_path>#L<line_number>
					//https://<server>/<repo>/<filename_path>#L<line_number>
					url = `${serviceInfo?.url ?? ""}/${repo}`;
					if (filename) {
						url += `/blob${commit ? `/${commit}` : `/${branch}`}/${filename}${
							line_no ? `#L${line_no}` : ""
						}`;
					}
					break;
				default:
					console.error(`Unsupported repository: ${repo}`);
			}
		}
	}
	return url;
};
