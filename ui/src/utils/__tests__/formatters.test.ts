import { Settings } from "luxon";
/* eslint-disable */
import formatters from "utils/formatters";
import { RowDef } from "components/EnhancedTable";
import { analysisRow } from "../../../testData/testMockData";
import { APP_EXPORT_CLASSIFICATION } from "app/globals";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("formatters", () => {
	describe("formatDate", () => {
		it("no args, empty results", () => {
			expect(formatters.formatDate(null)).toEqual("");
		});

		it("invalid date value, displays value as-is", () => {
			expect(formatters.formatDate("foo")).toEqual("foo");
		});

		it("valid date, short (default) format", () => {
			// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
			expect(formatters.formatDate("2021-08-11T22:46:24.518Z")).toMatch(
				/2021-08-11 6:46[ \u202f]PM EDT/
			);
		});

		it("valid date, long format", () => {
			// https://github.com/moment/luxon/issues/1262
			// depending on browser ICU version support,
			// dates/times may be combined with either ", " (comma) or " at "
			// allow either
			// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
			expect(formatters.formatDate("2021-08-11T22:46:24.518Z", "long")).toMatch(
				/Wednesday, August 11, 2021(,| at) 6:46:24[ \u202f]PM EDT/
			);
		});
	});

	describe("capitalize", () => {
		it("empty arg, empty results", () => {
			expect(formatters.capitalize("")).toEqual("");
		});

		it("lowercase arg, capitalized first character", () => {
			expect(formatters.capitalize("testing")).toEqual("Testing");
		});

		it("UPPERCASE arg, remains capitalized", () => {
			expect(formatters.capitalize("TESTING")).toEqual("TESTING");
		});
	});

	describe("compareButIgnoreLeadingDashes", () => {
		it("aaa < bbb", () => {
			expect(formatters.compareButIgnoreLeadingDashes("aaa", "bbb")).toEqual(
				-1
			);
		});

		it("bbb > aaa", () => {
			expect(formatters.compareButIgnoreLeadingDashes("bbb", "aaa")).toEqual(1);
		});

		it("aaa == aaa", () => {
			expect(formatters.compareButIgnoreLeadingDashes("aaa", "aaa")).toEqual(0);
		});

		it("-aaa < bbb", () => {
			expect(formatters.compareButIgnoreLeadingDashes("-aaa", "bbb")).toEqual(
				-1
			);
		});

		it("-bbb > aaa", () => {
			expect(formatters.compareButIgnoreLeadingDashes("-bbb", "aaa")).toEqual(
				1
			);
		});

		it("-aaa == aaa", () => {
			expect(formatters.compareButIgnoreLeadingDashes("-aaa", "aaa")).toEqual(
				0
			);
		});
	});

	describe("validatevcsHotLink", () => {
		const rows: RowDef[] = [];
		rows.push({
			service: "",
			repo: "",
			branch: "",
			commit: "",
			filename: "",
			line: "",
		});
		const service = analysisRow.service;
		const repo = analysisRow.repo;
		const branch = analysisRow.branch;
		const commit = analysisRow.commit;
		const filename = analysisRow.filename;
		const line_no = analysisRow.line;

		// note: each test builds on the prior one by filling-in required row fields (e.g. service, repo)
		// since modifications are made to row object, changes are persisted to subsequent test
		it("No HotLink for unknown Service", () => {
			expect(formatters.vcsHotLink(rows[0])).toHaveLength(0);
		});

		it("No HotLink for unknown Repo", () => {
			rows[0]["service"] = service;
			expect(formatters.vcsHotLink(rows[0])).toHaveLength(0);
		});

		it("Hotlink for unknown filename returns service/repo without branch/file", () => {
			rows[0]["repo"] = repo;
			const link = formatters.vcsHotLink(rows[0]);
			expect(link).toMatch(new RegExp(`/${service}.com/${repo}`));
		});

		it("HotLink for unknown branch uses HEAD", () => {
			rows[0]["filename"] = filename;
			expect(formatters.vcsHotLink(rows[0])).toMatch(new RegExp(`/HEAD/`));
		});

		//https://<server>/<repo>/blob/<commit>/<filename_path>#L<line_number>
		//https://<server>/<repo>/<filename_path>#L<line_number>
		it("HotLink for unknown GitHub commit", () => {
			rows[0]["branch"] = branch;
			rows[0]["commit"] = "";
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/blob/${branch}/${filename}`)
			);
		});

		it("HotLink for target Line GitHub", () => {
			rows[0]["commit"] = "";
			rows[0]["line"] = line_no;
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/blob/${branch}/${filename}#L${line_no}`)
			);
		});

		it("HotLink for known GitHub commit", () => {
			rows[0]["commit"] = commit;
			rows[0]["line"] = "";
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/blob/${commit}/${filename}`)
			);
		});

		//https://<server>/<repo>/-/blob/<branch>/<commit>/<filename_path>#L<line_number>
		//https://<server>/<repo>/<filename_path>#L<line_number>
		it("HotLink for unknown GitLab commit", () => {
			rows[0]["service"] = "gitlab";
			rows[0]["commit"] = "";
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/-/blob/${branch}/${filename}`)
			);
		});

		it("HotLink for target Line GitLab", () => {
			rows[0]["service"] = "gitlab";
			rows[0]["commit"] = "";
			rows[0]["line"] = line_no;
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/-/blob/${branch}/${filename}#L${line_no}`)
			);
		});

		it("HotLink for known GitLab commit", () => {
			rows[0]["commit"] = commit;
			rows[0]["line"] = "";
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/-/blob/${commit}/${filename}`)
			);
		});

		//https://<server>/<repo>/src/<commit>/<filename_path>#lines-<line_number>
		//https://<server>/<repo>/src/<branch>/<filename_path>#lines-<line_number>
		it("HotLink for unknown BitBucket commit", () => {
			rows[0]["service"] = "bitbucket";
			rows[0]["commit"] = "";
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/src/${branch}/${filename}`)
			);
		});

		it("HotLink for target Line BitBucket", () => {
			rows[0]["service"] = "bitbucket";
			rows[0]["commit"] = "";
			rows[0]["line"] = line_no;
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/src/${branch}/${filename}#lines-${line_no}`)
			);
		});

		it("HotLink for known BitBucket commit", () => {
			rows[0]["commit"] = commit;
			rows[0]["line"] = "";
			expect(formatters.vcsHotLink(rows[0])).toMatch(
				new RegExp(`/${repo}/src/${commit}/${filename}`)
			);
		});
	});

	describe("downloadFile", () => {
		it("downloads a file using a blob", () => {
			const link = {
				click: jest.fn(),
				remove: jest.fn(),
			};
			const globalWindow = global.window;
			global.window = Object.create(window);
			global.URL.createObjectURL = jest.fn(() => "http://localhost/blob");
			global.URL.revokeObjectURL = jest.fn((href) => href);
			// @ts-ignore
			global.Blob = jest.fn((blobParts, options) => {
				return { blobParts, options };
			});
			const createEltSpy = jest
				.spyOn(document, "createElement")
				// @ts-ignore
				.mockImplementation((elt) => link);

			jest.useFakeTimers();
			jest.spyOn(global, "setTimeout");

			const data = {
				var1: "val1",
				var2: "val2",
			};
			const fileName = "fileName.json";
			formatters.downloadFile({
				data: JSON.stringify(data),
				fileName: fileName,
				fileType: "text/json",
			});

			// @ts-ignore
			expect(link.download).toBe(fileName);
			// @ts-ignore
			expect(link.href).toBe("http://localhost/blob");
			expect(link.click).toHaveBeenCalledTimes(1);
			expect(link.remove).toHaveBeenCalledTimes(1);
			expect(createEltSpy).toHaveBeenCalledWith("a");

			jest.runOnlyPendingTimers();
			expect(setTimeout).toHaveBeenCalledTimes(1);
			expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 100);
			// @ts-ignore
			expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(link.href);

			global.window = globalWindow;
		});

		it("exportToJson formats JSON and sets mime type", () => {
			const spy = jest
				.spyOn(formatters, "downloadFile")
				.mockImplementation(({ data, fileName, fileType }) => {
					return { data, fileName, fileType };
				});
			const data = {
				var1: "val1",
				var2: "val2",
			};
			const fileName = "fileName";
			formatters.exportToJson(fileName, data);

			expect(spy).toHaveBeenCalledWith({
				data: `{\"__classification__\":\"${APP_EXPORT_CLASSIFICATION}\",\"var1\":\"val1\",\"var2\":\"val2\"}`,
				fileName: `${fileName}.json`,
				fileType: "text/json",
			});
		});

		it("exportToCsv formats CSV and sets mime type", () => {
			const spy = jest
				.spyOn(formatters, "downloadFile")
				.mockImplementation(({ data, fileName, fileType }) => {
					return { data, fileName, fileType };
				});
			const data = [
				{
					string: "string",
					null: null, // ""
					undefined: undefined, // ""
					emptyString: "",
					arrayOfStrings: ["1", "2", "3"], // "1, 2, 3"
					object: { var1: "val1", var2: "val2" }, // JSON.stringify
					arrayOfArrays: [["9"], ["8"], ["7"]], // JSON.stringify
					emptyArray: [], // ""
				},
			];
			const fileName = "fileName";
			formatters.exportToCsv(fileName, data);

			// each comma-separated value escaped with ""
			const csvData =
				"string,null,undefined,emptyString,arrayOfStrings,object,arrayOfArrays,emptyArray\n" +
				'"string","","","","1, 2, 3","{""var1"":""val1"",""var2"":""val2""}","[[""9""],[""8""],[""7""]]",""\n' +
				`# ${APP_EXPORT_CLASSIFICATION}`;

			expect(spy).toHaveBeenCalledWith({
				data: csvData,
				fileName: `${fileName}.csv`,
				fileType: "text/csv",
			});
		});

		it("exportToCsv formats content and header using toCsv", () => {
			const spy = jest
				.spyOn(formatters, "downloadFile")
				.mockImplementation(({ data, fileName, fileType }) => {
					return { data, fileName, fileType };
				});
			const data = [
				{
					string: "string",
					null: null, // ""
					undefined: undefined, // ""
					emptyString: "",
					arrayOfStrings: ["1", "2", "3"], // "1, 2, 3"
					object: { var1: "val1", var2: "val2" }, // JSON.stringify
					arrayOfArrays: [["9"], ["8"], ["7"]], // JSON.stringify
					emptyArray: [], // ""
				},
			];
			const fileName = "fileName";
			const toCsv = (data: any) => {
				return {
					string: data.string,
					arrayOfStrings: data.arrayOfStrings.join("."),
					"object.var1": data.object.var1,
					"object.var2": data.object.var2,
				};
			};
			formatters.exportToCsv(fileName, data, toCsv);

			// expect headers from toCsv object
			const csvData =
				"string,arrayOfStrings,object.var1,object.var2\n" +
				'"string","1.2.3","val1","val2"\n' +
				`# ${APP_EXPORT_CLASSIFICATION}`;

			expect(spy).toHaveBeenCalledWith({
				data: csvData,
				fileName: `${fileName}.csv`,
				fileType: "text/csv",
			});
		});
	});
});
