import queryString from "query-string";
import { render, screen, waitFor, within } from "test-utils";
import { AnalysisTabContent, FILTER_PREFIX_ANALYSIS } from "pages/ResultsPage";
import { mockCurrentUser, mockScan002 } from "../../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import { validateSelect } from "pages/SearchPageTestCommon";
import { act } from "react-dom/test-utils";

const HASH_PREFIX = FILTER_PREFIX_ANALYSIS;
const mockSaveFilters = jest.fn();

// hiddenFindings you can override in tests
let hiddenFindings: HiddenFinding[] = [];

// note: node/some/path/here/anotherone.js (item #4 from test data) was selected
// since it's the first item in the list due to sorting by severity
// first item in the actual data (auth.json) won't appear on first page of results
// thus, won't be "found" in the table (unless you page)
const analysisFile = Object.keys(mockScan002.results.static_analysis)[4];

const openAnalysisDialog = async () => {
	const { user } = render(
		<AnalysisTabContent
			scan={mockScan002 as AnalysisReport}
			hiddenFindings={hiddenFindings}
			currentUser={mockCurrentUser}
			saveFilters={mockSaveFilters}
		/>
	);

	// this data should be in the dialog title
	// first finding for this file (0)
	const analysisType =
		Object.entries(mockScan002.results.static_analysis).filter(
			([key]) => key === analysisFile
		)[0][1][0].type || "No Type";

	const cell = screen.getByRole("rowheader", {
		name: analysisFile,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	await waitFor(() => screen.getByRole("dialog"));
	expect(screen.getByRole("dialog")).toHaveTextContent(analysisType);
	return user;
};

// close dialog by clicking ok
const closeAnalysisDialog = async (user: any) => {
	// clicking the ok button should close the dialog
	const okButton = screen.getByRole("button", { name: /^ok$/i });
	expect(okButton).toBeInTheDocument();
	await user.click(okButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("AnalysisTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	afterEach(() => {
		mockSaveFilters.mockReset();
	});

	describe("analysisDialogContent", () => {
		it("contains no findings", () => {
			const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan002));
			// clear scan results sections
			if (scan?.results_summary) {
				scan.results_summary.static_analysis = null;
			}
			if (scan?.results) {
				scan.results.static_analysis = {};
			}

			render(
				<AnalysisTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={mockCurrentUser}
					saveFilters={mockSaveFilters}
				/>
			);

			expect(screen.queryByRole("row")).not.toBeInTheDocument();
			expect(
				screen.getByText(/no static analysis findings/i)
			).toBeInTheDocument();
		});

		it("contains 'hide this finding' button", async () => {
			hiddenFindings = []; // no findings hidden
			const user = await openAnalysisDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^hide this finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeAnalysisDialog(user);
		});

		it("contains 'modify hidden finding' button if the finding is already hidden", async () => {
			// hide analysis we are going to open dialog for
			// first finding for this file (0)
			const analysisFinding = Object.entries(
				mockScan002.results.static_analysis
			).filter(([key]) => key === analysisFile)[0][1][0];

			hiddenFindings = [
				{
					id: "123-1234-123456",
					type: "static_analysis",
					value: {
						filename: analysisFile,
						line: analysisFinding.line,
						type: analysisFinding.type,
					},
					expires: null,
					reason: "test existing hidden finding, static analysis",
					created_by: "Catelyn.Stark@example.com",
				},
			];
			const user = await openAnalysisDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^modify hidden finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeAnalysisDialog(user);
		});

		it("dialog contains expected fields", async () => {
			const user = await openAnalysisDialog();
			const dialog = screen.getByRole("dialog");
			const finding = Object.entries(
				mockScan002.results.static_analysis
			).filter(([key]) => key === analysisFile)[0][1][0];

			within(dialog).getByText("Medium");
			within(dialog).getByText("Found in Source File");
			within(dialog).getByText(`${analysisFile} (Line ${finding.line})`);
			within(dialog).getByText("Details");
			within(dialog).getByText(finding.message);

			await closeAnalysisDialog(user);
		});

		describe("filters", () => {
			it("contains column filters for each column", () => {
				render(
					<AnalysisTabContent
						scan={mockScan002 as AnalysisReport}
						hiddenFindings={hiddenFindings}
						currentUser={mockCurrentUser}
						saveFilters={mockSaveFilters}
					/>
				);

				const filterGroup = screen.getByRole("group", {
					name: /filter results/i,
				});
				const firstFilter = within(filterGroup).getByRole("textbox", {
					name: /file/i,
				});
				expect(firstFilter).toHaveFocus();
				expect(firstFilter).toHaveAttribute("placeholder", "Contains");
				expect(
					within(filterGroup).getByRole("textbox", { name: /line/i })
				).toHaveAttribute("placeholder", "Exact");
				expect(
					within(filterGroup).getByRole("textbox", { name: /type/i })
				).toHaveAttribute("placeholder", "Contains");
				within(filterGroup).getByRole("button", { name: /severity /i });
			});

			it("filters add to url hash parameters", async () => {
				jest.useFakeTimers(); // use fake timers since filter input is debounced with setTimeout()

				const { user } = render(
					<AnalysisTabContent
						scan={mockScan002 as AnalysisReport}
						hiddenFindings={hiddenFindings}
						currentUser={mockCurrentUser}
						saveFilters={mockSaveFilters}
					/>,
					null,
					{
						advanceTimers: jest.advanceTimersByTime,
					}
				);

				const filterGroup = screen.getByRole("group", {
					name: /filter results/i,
				});
				const fileFilter = within(filterGroup).getByRole("textbox", {
					name: /file/i,
				});
				const fileValue = "/path/to/a/new/@library/file-name-1.0.3b6";
				await act(async () => await user.type(fileFilter, fileValue));

				jest.runOnlyPendingTimers();
				await waitFor(() => expect(fileFilter).toHaveDisplayValue(fileValue));

				await validateSelect({
					label: /severity/i,
					withinElement: filterGroup,
					options: [
						"None",
						`Negligible: ${mockScan002.results_summary.static_analysis.negligible}`,
						`Low: ${mockScan002.results_summary.static_analysis.low}`,
						`Medium: ${mockScan002.results_summary.static_analysis.medium}`,
						`High: ${mockScan002.results_summary.static_analysis.high}`,
						`Critical: ${mockScan002.results_summary.static_analysis.critical}`,
					],
					defaultOption: "",
					disabled: false,
					selectOption: `Critical: ${mockScan002.results_summary.static_analysis.critical}`,
					user,
				});

				const lineFilter = await within(filterGroup).findByRole("textbox", {
					name: /line/i,
				});
				const lineValue = "1234";
				await act(async () => await user.type(lineFilter, lineValue));
				jest.runOnlyPendingTimers();
				await waitFor(() => expect(lineFilter).toHaveDisplayValue(lineValue));

				const typeFilter = await within(filterGroup).findByRole("textbox", {
					name: /type/i,
				});
				const typeValue = "a great type";
				await act(async () => await user.type(typeFilter, typeValue));
				jest.runOnlyPendingTimers();
				await waitFor(() => expect(typeFilter).toHaveDisplayValue(typeValue));

				expect(mockSaveFilters).toHaveBeenLastCalledWith(HASH_PREFIX, {
					filename: { filter: fileValue },
					line: { filter: lineValue, match: "exact" },
					resource: {
						filter: typeValue,
					},
					severity: { filter: "critical" },
				});

				jest.useRealTimers();
			});

			it("Url hash params populate filters", async () => {
				const fileValue = "/path/to/a/new/@library/file-name-1.0.3b6";
				const lineValue = "1234";
				const typeValue = "a great type";
				const severityValue = `Critical: ${mockScan002.results_summary.vulnerabilities.critical}`;

				const obj: any = {};
				obj[`${HASH_PREFIX}filename`] = fileValue;
				obj[`${HASH_PREFIX}severity`] = "critical";
				obj[`${HASH_PREFIX}line`] = lineValue;
				obj[`${HASH_PREFIX}resource`] = typeValue;
				const hash = queryString.stringify(obj);

				// mock window.location.reload
				const globalWindow = global.window;
				global.window ??= Object.create(window);
				Object.defineProperty(window, "location", {
					value: {
						hash,
					},
				});

				const { user } = render(
					<AnalysisTabContent
						scan={mockScan002 as AnalysisReport}
						hiddenFindings={hiddenFindings}
						currentUser={mockCurrentUser}
						saveFilters={mockSaveFilters}
					/>
				);

				const filterGroup = screen.getByRole("group", {
					name: /filter results/i,
				});
				const fileFilter = within(filterGroup).getByRole("textbox", {
					name: /file/i,
				});
				await waitFor(() => expect(fileFilter).toHaveDisplayValue(fileValue));

				const lineFilter = await within(filterGroup).findByRole("textbox", {
					name: /line/i,
				});
				await waitFor(() => expect(lineFilter).toHaveDisplayValue(lineValue));

				const typeFilter = await within(filterGroup).findByRole("textbox", {
					name: /type/i,
				});
				await waitFor(() => expect(typeFilter).toHaveDisplayValue(typeValue));

				await validateSelect({
					label: /severity/i,
					withinElement: filterGroup,
					options: [
						"None",
						`Negligible: ${mockScan002.results_summary.static_analysis.negligible}`,
						`Low: ${mockScan002.results_summary.static_analysis.low}`,
						`Medium: ${mockScan002.results_summary.static_analysis.medium}`,
						`High: ${mockScan002.results_summary.static_analysis.high}`,
						`Critical: ${mockScan002.results_summary.static_analysis.critical}`,
					],
					defaultOption: severityValue,
					disabled: false,
					user,
				});

				global.window ??= globalWindow;
			});
		});
	});
});
