import queryString from "query-string";
import { render, screen, waitFor, within } from "test-utils";
import { FILTER_PREFIX_SECRET, SecretsTabContent } from "pages/ResultsPage";
import { mockCurrentUser, mockScan001 } from "../../../testData/testMockData";
import { AnalysisReport, SecretValidity } from "features/scans/scansSchemas";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import { validateSelect } from "pages/SearchPageTestCommon";
import { act } from "react";

const HASH_PREFIX = FILTER_PREFIX_SECRET;
const mockSaveFilters = jest.fn();

// hiddenFindings you can override in tests
let hiddenFindings: HiddenFinding[] = [];
// use first secret result from test data - click this row in the results table
const secretFile = Object.keys(mockScan001.results.secrets)[0];

const openSecretsDialog = async () => {
	const { user } = render(
		<SecretsTabContent
			scan={mockScan001 as AnalysisReport}
			hiddenFindings={hiddenFindings}
			currentUser={mockCurrentUser}
			saveFilters={mockSaveFilters}
		/>
	);

	// this data should be in the dialog title
	// first finding for this file (0)
	const secretType = Object.entries(mockScan001.results.secrets).filter(
		([key]) => key === secretFile
	)[0][1][0].type;

	const cell = screen.getByRole("rowheader", {
		name: secretFile,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	await waitFor(() => screen.getByRole("dialog"));
	expect(screen.getByRole("dialog")).toHaveTextContent(secretType);
	return user;
};

// close dialog by clicking ok
const closeSecretsDialog = async (user: any) => {
	// clicking the ok button should close the dialog
	const okButton = screen.getByRole("button", { name: /^ok$/i });
	expect(okButton).toBeInTheDocument();
	await user.click(okButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("SecretsTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	afterEach(() => {
		mockSaveFilters.mockReset();
	});

	describe("secretDialogContent", () => {
		it("contains no findings", () => {
			const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
			// clear scan results sections
			if (scan?.results_summary) {
				scan.results_summary.secrets = null;
			}
			if (scan?.results) {
				scan.results.secrets = {};
			}

			render(
				<SecretsTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={mockCurrentUser}
					saveFilters={mockSaveFilters}
				/>
			);

			expect(screen.queryByRole("row")).not.toBeInTheDocument();
			expect(screen.getByText(/no secrets found/i)).toBeInTheDocument();
		});

		it("contains 'hide this finding' button", async () => {
			hiddenFindings = []; // no findings hidden
			const user = await openSecretsDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^hide this finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeSecretsDialog(user);
		});

		it("contains 'modify hidden finding' button if the finding is already hidden", async () => {
			// hide secret we are going to open dialog for
			// first finding for this file (0)
			const secretFinding = Object.entries(mockScan001.results.secrets).filter(
				([key]) => key === secretFile
			)[0][1][0];

			hiddenFindings = [
				{
					id: "123-1234-123456",
					type: "secret",
					value: {
						filename: secretFile,
						line: secretFinding.line,
						commit: secretFinding.commit,
					},
					expires: null,
					reason: "test existing hidden finding, secret",
					created_by: "Catelyn.Stark@example.com",
				},
			];
			const user = await openSecretsDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^modify hidden finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeSecretsDialog(user);
		});

		it("dialog contains expected fields", async () => {
			const user = await openSecretsDialog();
			const dialog = screen.getByRole("dialog");
			const finding = Object.entries(mockScan001.results.secrets).filter(
				([key]) => key === secretFile
			)[0][1][0];

			within(dialog).getByText("Found in Source File");
			within(dialog).getByText(`${secretFile} (Line ${finding.line})`);
			within(dialog).getByText("Commit");
			within(dialog).getByText(finding.commit);

			await closeSecretsDialog(user);
		});

		describe("filters", () => {
			it("contains column filters for each column", () => {
				render(
					<SecretsTabContent
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
				expect(
					within(filterGroup).getByRole("textbox", { name: /commit/i })
				).toHaveAttribute("placeholder", "Contains");

				expect(
					within(filterGroup).getByRole("button", { name: /validity/i })
				).toBeInTheDocument()
			});

			it("filters add to url hash parameters", async () => {
				jest.useFakeTimers(); // use fake timers since filter input is debounced with setTimeout()

				const { user } = render(
					<SecretsTabContent
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
				const fileFilter = within(filterGroup).getByRole("textbox", {
					name: /file/i,
				});
				const fileValue = "/path/to/a/new/@library/file-name-1.0.3b6";
				await act(async () => await user.type(fileFilter, fileValue));

				jest.runOnlyPendingTimers();
				await waitFor(() => expect(fileFilter).toHaveDisplayValue(fileValue));

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

				await validateSelect({
					label: /validity/i,
					withinElement: filterGroup,
					options: [
						"None",
						"Active",
						"Inactive",
						"Unknown",
					],
					defaultOption: "",
					disabled: false,
					selectOption: "Unknown",
					user,
				});

				const commitFilter = await within(filterGroup).findByRole("textbox", {
					name: /commit/i,
				});
				const commitValue = "hashhashhashhashhashhashhashhashhashhash";
				await act(async () => await user.type(commitFilter, commitValue));
				jest.runOnlyPendingTimers();
				await waitFor(() =>
					expect(commitFilter).toHaveDisplayValue(commitValue)
				);

				expect(mockSaveFilters).toHaveBeenLastCalledWith(HASH_PREFIX, {
					filename: { filter: fileValue },
					line: {
						filter: lineValue,
						match: "exact",
					},
					resource: { filter: typeValue },
					commit: { filter: commitValue },
					validity: {
						filter: SecretValidity.Unknown,
						match: "exact",
					},
				});

				jest.useRealTimers();
			});

			it("Url hash params populate filters", async () => {
				const fileValue = "/path/to/a/new/@library/file-name-1.0.3b6";
				const lineValue = "1234";
				const typeValue = "a great type";
				const commitValue = "hashhashhashhashhashhashhashhashhashhash";
				const validityValue = "unknown";

				const obj: any = {};
				obj[`${HASH_PREFIX}filename`] = fileValue;
				obj[`${HASH_PREFIX}line`] = lineValue;
				obj[`${HASH_PREFIX}resource`] = typeValue;
				obj[`${HASH_PREFIX}commit`] = commitValue;
				obj[`${HASH_PREFIX}validity`] = validityValue;
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
					<SecretsTabContent
						scan={mockScan001 as AnalysisReport}
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
					label: /validity/i,
					withinElement: filterGroup,
					options: [
						"None",
						"Active",
						"Inactive",
						"Unknown",
					],
					defaultOption: validityValue,
					disabled: false,
					user,
				});

				const commitFilter = await within(filterGroup).findByRole("textbox", {
					name: /commit/i,
				});
				await waitFor(() =>
					expect(commitFilter).toHaveDisplayValue(commitValue)
				);

				global.window ??= globalWindow;
			});
		});
	});
});
