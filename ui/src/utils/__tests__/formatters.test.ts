import { Settings } from "luxon";
/* eslint-disable */
import { APP_EXPORT_CLASSIFICATION } from "app/globals";
import formatters from "utils/formatters";
import { analysisRow } from "../../../testData/testMockData";

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
				/2021-08-11 6:46[ \u202f]PM EDT/,
			);
		});

		it("valid date, long format", () => {
			// https://github.com/moment/luxon/issues/1262
			// depending on browser ICU version support,
			// dates/times may be combined with either ", " (comma) or " at "
			// allow either
			// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
			expect(formatters.formatDate("2021-08-11T22:46:24.518Z", "long")).toMatch(
				/Wednesday, August 11, 2021(,| at) 6:46:24[ \u202f]PM EDT/,
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
				-1,
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
				-1,
			);
		});

		it("-bbb > aaa", () => {
			expect(formatters.compareButIgnoreLeadingDashes("-bbb", "aaa")).toEqual(
				1,
			);
		});

		it("-aaa == aaa", () => {
			expect(formatters.compareButIgnoreLeadingDashes("-aaa", "aaa")).toEqual(
				0,
			);
		});
	});

	describe("validate vcsHotLink", () => {
		const service = analysisRow.service;
		const repo = analysisRow.repo;
		const branch = analysisRow.branch;
		const commit = analysisRow.commit;
		const filename = analysisRow.filename;
		const line_no = analysisRow.line;

		it("No HotLink for unknown Service", () => {
			const row = {
				...analysisRow,
				service: "",
			};

			expect(formatters.vcsHotLink(row)).toHaveLength(0);
		});

		it("No HotLink for unknown Repo", () => {
			const row = {
				...analysisRow,
				repo: "",
			};

			expect(formatters.vcsHotLink(row)).toHaveLength(0);
		});

		it("Hotlink for unknown filename returns service/repo without branch/file", () => {
			const row = {
				...analysisRow,
				branch: "",
				filename: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${service}.com/${repo}`),
			);
		});

		it("HotLink for unknown branch and commit uses HEAD", () => {
			const row = {
				...analysisRow,
				branch: "",
				commit: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(new RegExp(`/HEAD/`));
		});

		//https://<server>/<repo>/blob/<commit>/<filename_path>#L<line_number>
		//https://<server>/<repo>/<filename_path>#L<line_number>
		it("HotLink for unknown GitHub commit", () => {
			const row = {
				...analysisRow,
				commit: "",
				line_no: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/blob/${branch}/${filename}`),
			);
		});

		it("HotLink for target Line GitHub", () => {
			const row = {
				...analysisRow,
				commit: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/blob/${branch}/${filename}#L${line_no}`),
			);
		});

		it("HotLink for known GitHub commit", () => {
			const row = {
				...analysisRow,
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/blob/${commit}/${filename}`),
			);
		});

		it("HotLink for GitHub commit message", () => {
			const row = {
				...analysisRow,
				filename: "Commit Message",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/blob/${commit}`),
			);
		});

		//https://<server>/<repo>/-/blob/<branch>/<commit>/<filename_path>#L<line_number>
		//https://<server>/<repo>/<filename_path>#L<line_number>
		it("HotLink for unknown GitLab commit", () => {
			const row = {
				...analysisRow,
				service: "gitlab",
				commit: "",
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/-/blob/${branch}/${filename}`),
			);
		});

		it("HotLink for target Line GitLab", () => {
			const row = {
				...analysisRow,
				service: "gitlab",
				commit: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/-/blob/${branch}/${filename}#L${line_no}`),
			);
		});

		it("HotLink for known GitLab commit", () => {
			const row = {
				...analysisRow,
				service: "gitlab",
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/-/blob/${commit}/${filename}`),
			);
		});

		it("HotLink for GitLab commit message", () => {
			const row = {
				...analysisRow,
				service: "gitlab",
				filename: "Commit Message",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/-/blob/${commit}`),
			);
		});

		//https://<server>/<repo>/src/<commit>/<filename_path>#lines-<line_number>
		//https://<server>/<repo>/src/<branch>/<filename_path>#lines-<line_number>
		it("HotLink for unknown BitBucket commit", () => {
			const row = {
				...analysisRow,
				service: "bitbucket",
				commit: "",
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/src/${branch}/${filename}`),
			);
		});

		it("HotLink for target Line BitBucket", () => {
			const row = {
				...analysisRow,
				service: "bitbucket",
				commit: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/src/${branch}/${filename}#lines-${line_no}`),
			);
		});

		it("HotLink for known BitBucket commit", () => {
			const row = {
				...analysisRow,
				service: "bitbucket",
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/src/${commit}/${filename}`),
			);
		});

		it("HotLink for BitBucket commit message", () => {
			const row = {
				...analysisRow,
				service: "bitbucket",
				filename: "Commit Message",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/src/${commit}`),
			);
		});

		//https://<server>/<repo>/_git/<commit>/<filename_path>#lines-<line_number>
		//https://<server>/<repo>/_git/<branch>/<filename_path>#lines-<line_number>
		it("HotLink for unknown Azure commit", () => {
			const row = {
				...analysisRow,
				service: "azure",
				commit: "",
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/_git/${branch}/${filename}`),
			);
		});

		it("HotLink for target Line Azure", () => {
			const row = {
				...analysisRow,
				service: "azure",
				commit: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/_git/${branch}/${filename}#L${line_no}`),
			);
		});

		it("HotLink for known Azure commit", () => {
			const row = {
				...analysisRow,
				service: "azure",
				line: "",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/_git/${commit}/${filename}`),
			);
		});

		it("HotLink for Azure commit message", () => {
			const row = {
				...analysisRow,
				service: "azure",
				filename: "Commit Message",
			};

			expect(formatters.vcsHotLink(row)).toMatch(
				new RegExp(`/${repo}/_git/${commit}`),
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
			global.window ??= Object.create(window);
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

			global.window ??= globalWindow;
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
