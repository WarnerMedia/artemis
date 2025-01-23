import { DateTime, Settings } from "luxon";
import { act, render, screen, waitFor, within } from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import { vulnRow, findingVulnRawRow } from "../../../../testData/testMockData";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

const formatDateForExpirationField = (dateIsoString: string | null) => {
	return DateTime.fromISO(dateIsoString ?? "").toFormat("yyyy/LL/dd HH:mm");
};

const DATE_FORMAT = "yyyy/LL/dd HH:mm";

describe("HiddenFindingDialog component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	const dialogEditTitle = "Modify Hidden Finding";
	const unresolvedFormError =
		"This form contains unresolved errors. Please resolve these errors";
	const fieldReasonLabel = "Reason";
	const fieldHideForLabel = "Hide For";
	const fieldExpiresLabel = "Expires (optional)";
	const buttonUpdateLabel = "Update";
	const findingLabelHiddenBy = "Hidden finding created by:";
	const findingLabelHiddenDate = "Hidden finding created:";
	const findingLabelUpdatedBy = "Hidden finding last updated by:";
	const findingLabelUpdatedDate = "Hidden finding last updated:";
	const findingLabelCategory = "Category:";
	const findingLabelSeverity = "Severity:";
	const findingLabelVulnerability = "Vulnerability:";
	const findingLabelComponent = "Component:";
	const findingLabelSourceFound = new RegExp(/^Found in source file/);
	const findingLabelSourceHidden = new RegExp(/^Hidden in source file/);
	const findingLabelSourceNotHidden = new RegExp(
		/^Source files not covered by this hidden finding/,
	);
	const findingTypeVuln = "Vulnerability";
	const findingTypeVulnRaw = "Vulnerability Raw";
	const severityCritical = "Critical";
	const severityHigh = "High";
	const anyValue = "Any";
	const handleClose = jest.fn();

	afterEach(() => {
		handleClose.mockClear(); // reset counters
	});
	describe("specific tests for each finding type", () => {
		it("vulnerability edit dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog row={vulnRow} open={true} onClose={handleClose} />,
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle }),
				).toBeInTheDocument();
			});

			// check expected fields for an update vuln hidden findings dialog with some warnings
			const createdBy = screen.getByRole("listitem", {
				name: findingLabelHiddenBy,
			});
			expect(createdBy).toBeInTheDocument();
			expect(
				within(createdBy).getByRole("link", { name: vulnRow.createdBy }),
			).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenDate }),
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedBy }),
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedDate }),
			).not.toBeInTheDocument();

			const category = screen.getByRole("listitem", {
				name: findingLabelCategory,
			});
			expect(category).toBeInTheDocument();
			expect(within(category).getByText(findingTypeVuln)).toBeInTheDocument();

			const severity = screen.getByRole("listitem", {
				name: findingLabelSeverity,
			});
			expect(severity).toBeInTheDocument();
			expect(within(severity).getByText(severityHigh)).toBeInTheDocument();

			const vulnerability = screen.getByRole("listitem", {
				name: findingLabelVulnerability,
			});
			expect(vulnerability).toBeInTheDocument();
			expect(
				within(vulnerability).getByRole("link", { name: vulnRow.id }),
			).toBeInTheDocument();

			const component = screen.getByRole("listitem", {
				name: findingLabelComponent,
			});
			expect(component).toBeInTheDocument();
			expect(
				within(component).getByText(vulnRow.component),
			).toBeInTheDocument();

			const sourceFiles = screen.queryByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).not.toBeInTheDocument();

			const hiddenSource = screen.getByRole("listitem", {
				name: findingLabelSourceHidden,
			});
			expect(hiddenSource).toBeInTheDocument();
			expect(within(hiddenSource).getAllByRole("listitem")).toHaveLength(
				vulnRow.hiddenFindings.length,
			);

			const unhiddenSource = screen.getByRole("listitem", {
				name: findingLabelSourceNotHidden,
			});
			expect(unhiddenSource).toBeInTheDocument();
			expect(within(unhiddenSource).getAllByRole("listitem")).toHaveLength(
				vulnRow.unhiddenFindings.length,
			);

			// warning badge displayed for unhiddenSource
			expect(
				screen.queryByLabelText(
					'Click the "Update" button to add these source files to this hidden finding',
				),
			).toBeInTheDocument();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			expect(reasonField).toHaveFocus(); // first field should have focus
			expect(reasonField).toHaveValue(vulnRow.hiddenFindings[0].reason);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText("This vulnerability in THIS component"),
			).toBeInTheDocument();

			const expiresField = screen.getByLabelText(fieldExpiresLabel);
			expect(expiresField).toBeInTheDocument();
			expect(expiresField).toHaveValue(
				formatDateForExpirationField(vulnRow.hiddenFindings[0].expires),
			);
			expect(screen.getByText("Must be a future date")).toBeInTheDocument();

			// fix date error
			// const tomorrow = formatDateForExpirationField(
			// 	DateTime.utc().plus({ days: 1, minutes: 5 }).toJSON(),
			// );
			const tomorrow = DateTime.now()
				.plus({ days: 1, minutes: 5 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);
			act(() => {
				/* fire events that update state */
				user.clear(expiresField); // clear prior entry
				user.type(expiresField, tomorrow);
			});

			await waitFor(() => {
				expect(expiresField).toHaveValue(tomorrow);
			});
			expect(
				screen.queryByText("Must be a future date"),
			).not.toBeInTheDocument();

			// no form errors after fixing field errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			// update button should be enabled
			const updateButton = screen.queryByRole("button", {
				name: buttonUpdateLabel,
			});
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeEnabled();
		});

		it("vulnerability raw edit dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog
					row={findingVulnRawRow}
					open={true}
					onClose={handleClose}
				/>,
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle }),
				).toBeInTheDocument();
			});

			// check expected fields for an update vuln hidden findings dialog with some warnings
			const createdBy = screen.getByRole("listitem", {
				name: findingLabelHiddenBy,
			});
			expect(createdBy).toBeInTheDocument();
			expect(
				within(createdBy).getByRole("link", {
					name: findingVulnRawRow.createdBy,
				}),
			).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenDate }),
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedBy }),
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedDate }),
			).not.toBeInTheDocument();

			const category = screen.getByRole("listitem", {
				name: findingLabelCategory,
			});
			expect(category).toBeInTheDocument();
			expect(
				within(category).getByText(findingTypeVulnRaw),
			).toBeInTheDocument();

			const severity = screen.getByRole("listitem", {
				name: findingLabelSeverity,
			});
			expect(severity).toBeInTheDocument();
			expect(within(severity).getByText(severityCritical)).toBeInTheDocument();

			const vulnerability = screen.getByRole("listitem", {
				name: findingLabelVulnerability,
			});
			expect(vulnerability).toBeInTheDocument();
			expect(
				within(vulnerability).getByRole("link", {
					name: findingVulnRawRow.location,
				}),
			).toBeInTheDocument();

			const component = screen.getByRole("listitem", {
				name: findingLabelComponent,
			});
			expect(component).toBeInTheDocument();
			expect(within(component).getByText(anyValue)).toBeInTheDocument();

			// "found in source files" => "hidden in source files" in edit
			const sourceFiles = screen.queryByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).not.toBeInTheDocument();

			const hiddenSource = screen.getByRole("listitem", {
				name: findingLabelSourceHidden,
			});
			expect(hiddenSource).toBeInTheDocument();
			expect(within(hiddenSource).getByText(anyValue)).toBeInTheDocument();

			// all source files are hidden for vuln_raw
			const unhiddenSource = screen.queryByRole("listitem", {
				name: findingLabelSourceNotHidden,
			});
			expect(unhiddenSource).not.toBeInTheDocument();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			expect(reasonField).toHaveFocus(); // first field should have focus
			expect(reasonField).toHaveValue(
				findingVulnRawRow.hiddenFindings[0].reason,
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText("This vulnerability in ALL components"),
			).toBeInTheDocument();

			const expiresField = screen.getByLabelText(fieldExpiresLabel);
			expect(expiresField).toBeInTheDocument();
			expect(expiresField).toHaveValue(
				formatDateForExpirationField(
					findingVulnRawRow.hiddenFindings[0].expires,
				),
			);
			expect(screen.getByText("Must be a future date")).toBeInTheDocument();

			// fix date error
			// const tomorrow = formatDateForExpirationField(
			// 	DateTime.utc().plus({ days: 1, minutes: 5 }).toJSON(),
			// );
			const tomorrow = DateTime.now()
				.plus({ days: 1, minutes: 5 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);

			act(() => {
				/* fire events that update state */
				user.clear(expiresField); // clear prior entry
				user.type(expiresField, tomorrow);
			});
			await waitFor(() => {
				expect(expiresField).toHaveValue(tomorrow);
			});
			expect(
				screen.queryByText("Must be a future date"),
			).not.toBeInTheDocument();

			// no form errors after fixing field errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			// update button should be enabled
			const updateButton = screen.queryByRole("button", {
				name: buttonUpdateLabel,
			});
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeEnabled();
		});
	});
});
