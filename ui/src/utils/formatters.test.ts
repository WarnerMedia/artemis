import { vcsHotLink } from "utils/formatters";
import { Settings } from "luxon";
import {
	formatDate,
	capitalize,
	compareButIgnoreLeadingDashes,
} from "./formatters";
import { RowDef } from "components/EnhancedTable";
import { analysisRow } from "../../testData/testMockData";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("formatters", () => {
	describe("formatDate", () => {
		it("no args, empty results", () => {
			expect(formatDate(null)).toEqual("");
		});

		it("invalid date value, displays value as-is", () => {
			expect(formatDate("foo")).toEqual("foo");
		});

		it("valid date, short (default) format", () => {
			expect(formatDate("2021-08-11T22:46:24.518Z")).toEqual(
				"2021-08-11 6:46 PM EDT"
			);
		});

		it("valid date, long format", () => {
			expect(formatDate("2021-08-11T22:46:24.518Z", "long")).toEqual(
				"Wednesday, August 11, 2021, 6:46:24 PM EDT"
			);
		});
	});

	describe("capitalize", () => {
		it("empty arg, empty results", () => {
			expect(capitalize("")).toEqual("");
		});

		it("lowercase arg, capitalized first character", () => {
			expect(capitalize("testing")).toEqual("Testing");
		});

		it("UPPERCASE arg, remains capitalized", () => {
			expect(capitalize("TESTING")).toEqual("TESTING");
		});
	});

	describe("compareButIgnoreLeadingDashes", () => {
		it("aaa < bbb", () => {
			expect(compareButIgnoreLeadingDashes("aaa", "bbb")).toEqual(-1);
		});

		it("bbb > aaa", () => {
			expect(compareButIgnoreLeadingDashes("bbb", "aaa")).toEqual(1);
		});

		it("aaa == aaa", () => {
			expect(compareButIgnoreLeadingDashes("aaa", "aaa")).toEqual(0);
		});

		it("-aaa < bbb", () => {
			expect(compareButIgnoreLeadingDashes("-aaa", "bbb")).toEqual(-1);
		});

		it("-bbb > aaa", () => {
			expect(compareButIgnoreLeadingDashes("-bbb", "aaa")).toEqual(1);
		});

		it("-aaa == aaa", () => {
			expect(compareButIgnoreLeadingDashes("-aaa", "aaa")).toEqual(0);
		});
	});

	describe("validatevcsHotLink", () => {
		let rows: RowDef[] = [];
		rows.push({
			service: "",
			repo: "",
			branch: "",
			commit: "",
			filename: "",
			line: "",
		});
		let service = analysisRow.service;
		let repo = analysisRow.repo;
		let branch = analysisRow.branch;
		let commit = analysisRow.commit;
		let filename = analysisRow.filename;
		let line_no = analysisRow.line;

		// note: each test builds on the prior one by filling-in required row fields (e.g. service, repo)
		// since modifications are made to row object, changes are persisted to subsequent test
		it("No HotLink for unknown Service", () => {
			expect(vcsHotLink(rows[0])).toHaveLength(0);
		});

		it("No HotLink for unknown Repo", () => {
			rows[0]["service"] = service;
			expect(vcsHotLink(rows[0])).toHaveLength(0);
		});

		it("Hotlink for unknown filename returns service/repo without branch/file", () => {
			rows[0]["repo"] = repo;
			const link = vcsHotLink(rows[0]);
			expect(link).toMatch(new RegExp(`/${service}.com/${repo}`));
		});

		it("HotLink for unknown branch uses HEAD", () => {
			rows[0]["filename"] = filename;
			expect(vcsHotLink(rows[0])).toMatch(new RegExp(`/HEAD/`));
		});

		//https://<server>/<repo>/blob/<commit>/<filename_path>#L<line_number>
		//https://<server>/<repo>/<filename_path>#L<line_number>
		it("HotLink for unknown GitHub commit", () => {
			rows[0]["branch"] = branch;
			rows[0]["commit"] = "";
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/blob/${branch}/${filename}`)
			);
		});

		it("HotLink for target Line GitHub", () => {
			rows[0]["commit"] = "";
			rows[0]["line"] = line_no;
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/blob/${branch}/${filename}#L${line_no}`)
			);
		});

		it("HotLink for known GitHub commit", () => {
			rows[0]["commit"] = commit;
			rows[0]["line"] = "";
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/blob/${commit}/${filename}`)
			);
		});

		//https://<server>/<repo>/-/blob/<branch>/<commit>/<filename_path>#L<line_number>
		//https://<server>/<repo>/<filename_path>#L<line_number>
		it("HotLink for unknown GitLab commit", () => {
			rows[0]["service"] = "gitlab";
			rows[0]["commit"] = "";
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/-/blob/${branch}/${filename}`)
			);
		});

		it("HotLink for target Line GitLab", () => {
			rows[0]["service"] = "gitlab";
			rows[0]["commit"] = "";
			rows[0]["line"] = line_no;
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/-/blob/${branch}/${filename}#L${line_no}`)
			);
		});

		it("HotLink for known GitLab commit", () => {
			rows[0]["commit"] = commit;
			rows[0]["line"] = "";
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/-/blob/${commit}/${filename}`)
			);
		});

		//https://<server>/<repo>/src/<commit>/<filename_path>#lines-<line_number>
		//https://<server>/<repo>/src/<branch>/<filename_path>#lines-<line_number>
		it("HotLink for unknown BitBucket commit", () => {
			rows[0]["service"] = "bitbucket";
			rows[0]["commit"] = "";
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/src/${branch}/${filename}`)
			);
		});

		it("HotLink for target Line BitBucket", () => {
			rows[0]["service"] = "bitbucket";
			rows[0]["commit"] = "";
			rows[0]["line"] = line_no;
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/src/${branch}/${filename}#lines-${line_no}`)
			);
		});

		it("HotLink for known BitBucket commit", () => {
			rows[0]["commit"] = commit;
			rows[0]["line"] = "";
			expect(vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/src/${commit}/${filename}`)
			);
		});
	});
});
