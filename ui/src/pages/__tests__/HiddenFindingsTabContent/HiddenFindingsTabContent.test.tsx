import queryString from "query-string";
import {
	getDefaultNormalizer,
	render,
	screen,
	waitFor,
	within,
} from "test-utils";
import {
	FILTER_PREFIX_HIDDEN,
	HiddenFindingsTabContent,
} from "pages/ResultsPage";
import {
	mockHFRows003,
	mockHFSummary003,
	mockHiddenFindingsSummaryNone,
} from "../../../../testData/testMockData";
import { formatDate } from "utils/formatters";
import { validateSelect } from "pages/SearchPageTestCommon";
import { act } from "react";

const HASH_PREFIX = FILTER_PREFIX_HIDDEN;
const mockSaveFilters = jest.fn();

const filterFindingsById = (vulnId: string | number) => {
	return mockHFRows003.filter((finding) => finding.location === vulnId);
};

const openFindingDialog = async () => {
	const { user } = render(
		<HiddenFindingsTabContent
			hiddenFindingsConsolidatedRows={mockHFRows003}
			hiddenFindingsSummary={mockHFSummary003}
			saveFilters={mockSaveFilters}
		/>
	);

	// + "" to force string
	const cveId = String(filterFindingsById("CVE-2018-00000")[0].location);
	const cell = screen.getByRole("cell", {
		name: cveId,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	await waitFor(() =>
		screen.getByRole("dialog", { name: /modify hidden finding/i })
	);
	return user;
};

// close dialog by clicking ok
const closeFindingDialog = async (user: any) => {
	// clicking the ok button should close the dialog
	const cancelButton = screen.getByRole("button", { name: /^cancel$/i });
	expect(cancelButton).toBeInTheDocument();
	await user.click(cancelButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("HiddenFindingsTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	afterEach(() => {
		mockSaveFilters.mockReset();
	});

	it("contains no findings", () => {
		render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={[]}
				hiddenFindingsSummary={mockHiddenFindingsSummaryNone}
				saveFilters={mockSaveFilters}
			/>
		);

		expect(screen.queryByRole("row")).not.toBeInTheDocument();
		expect(screen.getByText(/no hidden findings/i)).toBeInTheDocument();
	});

	it("contains 'modify hidden finding' title since all hidden findings are hidden", async () => {
		const user = await openFindingDialog();
		const dialog = screen.getByRole("dialog", {
			name: /modify hidden finding/i,
		});
		expect(
			within(dialog).getByRole("link", { name: "CVE-2018-00000" })
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: /^remove$/i })
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: /^update$/i })
		).toBeInTheDocument();
		await closeFindingDialog(user);
	});

	it("contains global hidden finding exclusion warning", () => {
		render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={mockHFRows003}
				hiddenFindingsSummary={mockHFSummary003}
				saveFilters={mockSaveFilters}
			/>
		);

		expect(
			screen.getByText(
				/these findings will be excluded from all results for this repository, including all branches/i
			)
		).toBeInTheDocument();
		expect(screen.getAllByRole("checkbox")).toHaveLength(mockHFRows003.length);
		expect(screen.getAllByLabelText(/this item has expired/i)).toHaveLength(4);
	});

	it("single finding has expected row cells and warnings", () => {
		const summary = {
			...mockHiddenFindingsSummaryNone,
			critical: 0,
			high: 1,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
			secret: 0,
			secret_raw: 0,
			static_analysis: 0,
			vulnerability: 1,
			vulnerability_raw: 0,
		};
		render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={filterFindingsById("CVE-2019-00000")}
				hiddenFindingsSummary={summary}
				saveFilters={mockSaveFilters}
			/>
		);

		const rows = screen.getAllByRole("checkbox");

		expect(rows).toHaveLength(1);
		expect(within(rows[0]).getByText("CVE-2019-00000")).toBeInTheDocument();
		expect(within(rows[0]).getByText("component1")).toBeInTheDocument();
		expect(within(rows[0]).getByText(/vulnerability/i)).toBeInTheDocument();
		expect(within(rows[0]).getByText(/high/i)).toBeInTheDocument();
		expect(
			within(rows[0]).getByLabelText(
				/30 source files not covered by this hidden finding/i
			)
		).toBeInTheDocument();
		expect(
			within(rows[0]).getByLabelText(/this item has expired/i)
		).toBeInTheDocument();
	});

	it("severities sort as expected", async () => {
		const { user } = render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={mockHFRows003}
				hiddenFindingsSummary={mockHFSummary003}
				saveFilters={mockSaveFilters}
			/>
		);

		const header = screen.getByRole("button", { name: "Severity" });
		expect(header).toBeInTheDocument();
		await user.click(header);
		expect(within(header).getByText(/sorted ascending/i)).toBeInTheDocument();

		// finding ids sorted highest severity (critical) to lowest ("")
		const idOrder = [
			"CVE-2020-0000",
			"CVE-2021-0101",
			33,
			"CVE-2019-00000",
			"CVE-2018-00000",
			14,
			17,
			177,
			"test.me",
		];

		// get new row results after re-order
		let rows = screen.getAllByRole("checkbox");
		let r = 0;
		idOrder.forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].severity) {
					expect(
						within(cols[3]).getByText(finding[0].severity, { exact: false })
					).toBeInTheDocument(); // col 4 = severity
				}
				r += 1;
			}
		});

		// test descending sorting
		await user.click(header);
		expect(within(header).getByText(/sorted descending/i)).toBeInTheDocument();

		rows = screen.getAllByRole("checkbox");
		r = 0;
		idOrder.reverse().forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].severity) {
					expect(
						within(cols[3]).getByText(finding[0].severity, { exact: false })
					).toBeInTheDocument(); // col 4 = severity
				}
				r += 1;
			}
		});
	});

	it("expires sort as expected", async () => {
		const { user } = render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={mockHFRows003}
				hiddenFindingsSummary={mockHFSummary003}
				saveFilters={mockSaveFilters}
			/>
		);

		const header = screen.getByRole("button", { name: "Expires" });
		expect(header).toBeInTheDocument();
		await user.click(header);
		expect(within(header).getByText(/sorted ascending/i)).toBeInTheDocument();

		// finding ids sorted highest expires (oldest) to lowest (never)
		const idOrder = [
			"CVE-2018-00000",
			"CVE-2019-00000",
			"CVE-2021-0101",
			33,
			"CVE-2020-0000",
			17,
			177,
			"test.me",
			14,
		];

		// get new row results after re-order
		let rows = screen.getAllByRole("checkbox");
		let r = 0;
		idOrder.forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].expires) {
					const dt = formatDate(finding[0].expires);
					// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
					// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
					// using: replace(/\s+/g, ' ')
					// causing the match to break
					// so don't collapseWhitespace in the normalizer for comparing dates here
					expect(
						within(cols[4]).getByText(dt, {
							exact: false,
							normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
						})
					).toBeInTheDocument(); // col 5 = expires
				}
				r += 1;
			}
		});

		// test descending sorting
		await user.click(header);
		expect(within(header).getByText(/sorted descending/i)).toBeInTheDocument();

		rows = screen.getAllByRole("checkbox");
		r = 0;
		idOrder.reverse().forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].expires) {
					const dt = formatDate(finding[0].expires);
					// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
					// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
					// using: replace(/\s+/g, ' ')
					// causing the match to break
					// so don't collapseWhitespace in the normalizer for comparing dates here
					expect(
						within(cols[4]).getByText(dt, {
							exact: false,
							normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
						})
					).toBeInTheDocument(); // col 5 = expires
				}
				r += 1;
			}
		});
	});

	describe("filters", () => {
		it("contains column filters for each column", () => {
			render(
				<HiddenFindingsTabContent
					hiddenFindingsConsolidatedRows={mockHFRows003}
					hiddenFindingsSummary={mockHFSummary003}
					saveFilters={mockSaveFilters}
				/>
			);

			const filterGroup = screen.getByRole("group", {
				name: /filter results/i,
			});
			const firstFilter = within(filterGroup).getByRole("button", {
				name: /category /i,
			});
			expect(firstFilter).toHaveFocus();
			expect(
				within(filterGroup).getByRole("textbox", { name: /file/i })
			).toHaveAttribute("placeholder", "Contains");
			expect(
				within(filterGroup).getByRole("textbox", { name: /id\/line/i })
			).toHaveAttribute("placeholder", "Contains");
			expect(
				within(filterGroup).getByRole("textbox", { name: /component\/commit/i })
			).toHaveAttribute("placeholder", "Contains");
			within(filterGroup).getByRole("button", { name: /severity /i });
		});

		it("filters add to url hash parameters", async () => {
			jest.useFakeTimers(); // use fake timers since filter input is debounced with setTimeout()

			const { user } = render(
				<HiddenFindingsTabContent
					hiddenFindingsConsolidatedRows={mockHFRows003}
					hiddenFindingsSummary={mockHFSummary003}
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
			await validateSelect({
				label: /category/i,
				withinElement: filterGroup,
				options: [
					"None",
					`Secret: ${mockHFSummary003.secret}`,
					`Secret Raw: ${mockHFSummary003.secret_raw}`,
					`Static Analysis: ${mockHFSummary003.static_analysis}`,
					`Vulnerability: ${mockHFSummary003.vulnerability}`,
					`Vulnerability Raw: ${mockHFSummary003.vulnerability_raw}`,
				],
				defaultOption: "",
				disabled: false,
				selectOption: `Vulnerability: ${mockHFSummary003.vulnerability}`,
				user,
			});

			const componentFilter = within(filterGroup).getByRole("textbox", {
				name: /component\/commit/i,
			});
			const componentValue = "@library/component-name-1.0.3b6";
			await act(async () => await user.type(componentFilter, componentValue));

			jest.runOnlyPendingTimers();
			await waitFor(() =>
				expect(componentFilter).toHaveDisplayValue(componentValue)
			);

			await validateSelect({
				label: /severity/i,
				withinElement: filterGroup,
				options: [
					"None",
					`Negligible: ${mockHFSummary003.negligible}`,
					`Low: ${mockHFSummary003.low}`,
					`Medium: ${mockHFSummary003.medium}`,
					`High: ${mockHFSummary003.high}`,
					`Critical: ${mockHFSummary003.critical}`,
				],
				defaultOption: "",
				disabled: false,
				selectOption: `Critical: ${mockHFSummary003.critical}`,
				user,
			});

			const vulnFilter = await within(filterGroup).findByRole("textbox", {
				name: /id\/line/i,
			});
			const vulnValue = "https://example.com/vulnid/description/remediation";
			await act(async () => await user.type(vulnFilter, vulnValue));
			jest.runOnlyPendingTimers();
			await waitFor(() => expect(vulnFilter).toHaveDisplayValue(vulnValue));

			const fileFilter = await within(filterGroup).findByRole("textbox", {
				name: /file/i,
			});
			const fileValue = "/path/to/a/new/@library/file-name-1.0.3b6";
			await act(async () => await user.type(fileFilter, fileValue));
			jest.runOnlyPendingTimers();
			await waitFor(() => expect(fileFilter).toHaveDisplayValue(fileValue));

			expect(mockSaveFilters).toHaveBeenLastCalledWith(HASH_PREFIX, {
				component: { filter: componentValue },
				location: {
					filter: vulnValue,
				},
				source: {
					filter: fileValue,
				},
				severity: { filter: "critical" },
				type: { filter: "vulnerability", match: "exact" },
			});

			jest.useRealTimers();
		});

		it("Url hash params populate filters", async () => {
			const componentValue = "@library/component-name-1.0.3b6";
			const categoryValue = `Vulnerability: ${mockHFSummary003.vulnerability}`;
			const severityValue = `Critical: ${mockHFSummary003.critical}`;
			const vulnValue = "https://example.com/vulnid/description/remediation";
			const fileValue = "/path/to/a/new/@library/file-name-1.0.3b6";

			const obj: any = {};
			obj[`${HASH_PREFIX}component`] = componentValue;
			obj[`${HASH_PREFIX}severity`] = "critical";
			obj[`${HASH_PREFIX}location`] = vulnValue;
			obj[`${HASH_PREFIX}type`] = "vulnerability";
			obj[`${HASH_PREFIX}source`] = fileValue;
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
				<HiddenFindingsTabContent
					hiddenFindingsConsolidatedRows={mockHFRows003}
					hiddenFindingsSummary={mockHFSummary003}
					saveFilters={mockSaveFilters}
				/>
			);

			const filterGroup = await screen.findByRole("group", {
				name: /filter results/i,
			});
			const componentFilter = within(filterGroup).getByRole("textbox", {
				name: /component\/commit/i,
			});
			await waitFor(() =>
				expect(componentFilter).toHaveDisplayValue(componentValue)
			);

			const vulnFilter = await within(filterGroup).findByRole("textbox", {
				name: /id\/line/i,
			});
			await waitFor(() => expect(vulnFilter).toHaveDisplayValue(vulnValue));

			const fileFilter = await within(filterGroup).findByRole("textbox", {
				name: /file/i,
			});
			await waitFor(() => expect(fileFilter).toHaveDisplayValue(fileValue));

			await validateSelect({
				label: /severity/i,
				withinElement: filterGroup,
				options: [
					"None",
					`Negligible: ${mockHFSummary003.negligible}`,
					`Low: ${mockHFSummary003.low}`,
					`Medium: ${mockHFSummary003.medium}`,
					`High: ${mockHFSummary003.high}`,
					`Critical: ${mockHFSummary003.critical}`,
				],
				defaultOption: severityValue,
				disabled: false,
				user,
			});

			await validateSelect({
				label: /category/i,
				withinElement: filterGroup,
				options: [
					"None",
					`Secret: ${mockHFSummary003.secret}`,
					`Secret Raw: ${mockHFSummary003.secret_raw}`,
					`Static Analysis: ${mockHFSummary003.static_analysis}`,
					`Vulnerability: ${mockHFSummary003.vulnerability}`,
					`Vulnerability Raw: ${mockHFSummary003.vulnerability_raw}`,
				],
				defaultOption: categoryValue,
				disabled: false,
				user,
			});

			global.window ??= globalWindow;
		});
	});
});
