import queryString from "query-string";
import { render, screen, waitFor, within } from "test-utils";
import { FILTER_PREFIX_VULN, VulnTabContent } from "pages/ResultsPage";
import { mockCurrentUser, mockScan001 } from "../../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import { validateSelect } from "pages/SearchPageTestCommon";
import { act } from "react-dom/test-utils";

const HASH_PREFIX = FILTER_PREFIX_VULN;
const mockSaveFilters = jest.fn();

// hiddenFindings you can override in tests
let hiddenFindings: HiddenFinding[] = [];

// select a vuln that's critical so it will sort to first page of results table
// so test will "see" this row when table is rendered
const vulnComponent = Object.keys(mockScan001.results.vulnerabilities)[4];
const cveId = Object.keys(
	Object.entries(mockScan001.results.vulnerabilities).filter(
		([key]) => key === vulnComponent
	)[0][1]
)[0]; // first component vuln

const openVulnDialog = async () => {
	const { user } = render(
		<VulnTabContent
			scan={mockScan001 as AnalysisReport}
			hiddenFindings={hiddenFindings}
			currentUser={mockCurrentUser}
			saveFilters={mockSaveFilters}
		/>
	);

	const cell = screen.getByRole("rowheader", {
		name: vulnComponent,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open & check title is vuln id : component
	const re = new RegExp(`${cveId} : ${vulnComponent}`, "i");
	await waitFor(() => screen.getByRole("dialog", { name: re }));
	return user;
};

// close dialog by clicking ok
const closeVulnDialog = async (user: any) => {
	// clicking the ok button should close the dialog
	const okButton = screen.getByRole("button", { name: /^ok$/i });
	expect(okButton).toBeInTheDocument();
	await user.click(okButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("VulnTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	describe("vulnDialogContent", () => {
		it("contains no findings", () => {
			const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
			// clear scan results sections
			if (scan?.results_summary) {
				scan.results_summary.vulnerabilities = null;
			}
			if (scan?.results) {
				scan.results.vulnerabilities = {};
			}

			render(
				<VulnTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={mockCurrentUser}
					saveFilters={mockSaveFilters}
				/>
			);

			expect(screen.queryByRole("row")).not.toBeInTheDocument();
			expect(screen.getByText(/no vulnerabilities found/i)).toBeInTheDocument();
		});

		it("contains 'hide this finding' button", async () => {
			hiddenFindings = []; // no findings hidden
			const user = await openVulnDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^hide this finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeVulnDialog(user);
		});

		it("contains 'modify hidden finding' button if the finding is already hidden", async () => {
			// hide vulnerability we are going to open dialog for
			const vulnFinding = Object.values(
				Object.values(
					Object.entries(mockScan001.results.vulnerabilities).filter(
						([key]) => key === vulnComponent
					)[0]
				)[1]
			)[0];

			// 2 items / 1-per-source-file
			hiddenFindings = [
				{
					id: "123-1234-123456",
					type: "vulnerability",
					value: {
						id: cveId,
						source: vulnFinding.source[0],
						component: vulnComponent,
					},
					expires: null,
					reason: "test existing hidden finding 1, vulnerability",
					created_by: "Catelyn.Stark@example.com",
				},
				{
					id: "456-4567-456789",
					type: "vulnerability",
					value: {
						id: cveId,
						source: vulnFinding.source[1],
						component: vulnComponent,
					},
					expires: null,
					reason: "test existing hidden finding 2, vulnerability",
					created_by: "Bronn@example.com",
				},
			];
			const user = await openVulnDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^modify hidden finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeVulnDialog(user);
		});

		it("dialog contains expected fields", async () => {
			const user = await openVulnDialog();
			const dialog = screen.getByRole("dialog");
			const finding = Object.values(
				Object.values(
					Object.entries(mockScan001.results.vulnerabilities).filter(
						([key]) => key === vulnComponent
					)[0]
				)[1]
			)[0];

			within(dialog).getByText("Critical");
			within(dialog).getByRole("link", {
				name: "View in the National Vulnerability Database",
			});
			within(dialog).getByText("Description");
			within(dialog).getByText(finding.description);
			within(dialog).getByText("Remediation");
			within(dialog).getByText(finding.remediation);
			within(dialog).getByText(
				`Found in Source Files (${finding.source.length})`
			);
			finding.source.forEach((source: string) => {
				within(dialog).getByText(source);
			});
			within(dialog).getByText(
				`Discovered By Plugins (${finding.source_plugins.length})`
			);
			finding.source_plugins.forEach((plugin: string) => {
				within(dialog).getByText(plugin);
			});

			await closeVulnDialog(user);
		});

		describe("filters", () => {
			it("contains column filters for each column", () => {
				render(
					<VulnTabContent
						scan={mockScan001 as AnalysisReport}
						hiddenFindings={hiddenFindings}
						currentUser={mockCurrentUser}
						saveFilters={mockSaveFilters}
					/>
				);

				const filterGroup = screen.getByRole("group", {
					name: /filter results/i,
				});
				const firstFilter = within(filterGroup).getByRole("textbox", {
					name: /component/i,
				});
				expect(firstFilter).toHaveFocus();
				expect(firstFilter).toHaveAttribute("placeholder", "Contains");
				expect(
					within(filterGroup).getByRole("textbox", { name: /vulnerability/i })
				).toHaveAttribute("placeholder", "Contains");
				within(filterGroup).getByRole("button", { name: /severity /i });
			});

			it("filters add to url hash parameters", async () => {
				jest.useFakeTimers(); // use fake timers since filter input is debounced with setTimeout()

				const { user } = render(
					<VulnTabContent
						scan={mockScan001 as AnalysisReport}
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
				const componentFilter = within(filterGroup).getByRole("textbox", {
					name: /component/i,
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
						`Negligible: ${mockScan001.results_summary.vulnerabilities.negligible}`,
						`Low: ${mockScan001.results_summary.vulnerabilities.low}`,
						`Medium: ${mockScan001.results_summary.vulnerabilities.medium}`,
						`High: ${mockScan001.results_summary.vulnerabilities.high}`,
						`Critical: ${mockScan001.results_summary.vulnerabilities.critical}`,
					],
					defaultOption: "",
					disabled: false,
					selectOption: `Critical: ${mockScan001.results_summary.vulnerabilities.critical}`,
					user,
				});

				const vulnFilter = await within(filterGroup).findByRole("textbox", {
					name: /vulnerability/i,
				});
				const vulnValue = "https://example.com/vulnid/description/remediation";
				await act(async () => await user.type(vulnFilter, vulnValue));
				jest.runOnlyPendingTimers();
				await waitFor(() => expect(vulnFilter).toHaveDisplayValue(vulnValue));

				expect(mockSaveFilters).toHaveBeenLastCalledWith(HASH_PREFIX, {
					component: { filter: componentValue },
					id: {
						filter: vulnValue,
					},
					severity: { filter: "critical" },
				});

				jest.useRealTimers();
			});

			it("Url hash params populate filters", async () => {
				const componentValue = "@library/component-name-1.0.3b6";
				const severityValue = `Critical: ${mockScan001.results_summary.vulnerabilities.critical}`;
				const vulnValue = "https://example.com/vulnid/description/remediation";

				const obj: any = {};
				obj[`${HASH_PREFIX}component`] = componentValue;
				obj[`${HASH_PREFIX}severity`] = "critical";
				obj[`${HASH_PREFIX}id`] = vulnValue;
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
					<VulnTabContent
						scan={mockScan001 as AnalysisReport}
						hiddenFindings={hiddenFindings}
						currentUser={mockCurrentUser}
						saveFilters={mockSaveFilters}
					/>
				);

				const filterGroup = screen.getByRole("group", {
					name: /filter results/i,
				});
				const componentFilter = within(filterGroup).getByRole("textbox", {
					name: /component/i,
				});
				await waitFor(() =>
					expect(componentFilter).toHaveDisplayValue(componentValue)
				);

				const vulnFilter = await within(filterGroup).findByRole("textbox", {
					name: /vulnerability/i,
				});
				await waitFor(() => expect(vulnFilter).toHaveDisplayValue(vulnValue));

				await validateSelect({
					label: /severity/i,
					withinElement: filterGroup,
					options: [
						"None",
						`Negligible: ${mockScan001.results_summary.vulnerabilities.negligible}`,
						`Low: ${mockScan001.results_summary.vulnerabilities.low}`,
						`Medium: ${mockScan001.results_summary.vulnerabilities.medium}`,
						`High: ${mockScan001.results_summary.vulnerabilities.high}`,
						`Critical: ${mockScan001.results_summary.vulnerabilities.critical}`,
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
