import { Settings } from "luxon";
import { render, screen, waitFor, within } from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import { vulnRow } from "../../../../testData/testMockData";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("HiddenFindingDialog component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	const dialogAddTitle = "Hide This Finding";
	const unresolvedFormError =
		"This form contains unresolved errors. Please resolve these errors";
	const fieldReasonLabel = "Reason";
	const fieldHideForLabel = "Hide For";
	const buttonAddLabel = "Add";
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
		/^Source files not covered by this hidden finding/
	);
	const findingTypeVuln = "Vulnerability";
	const findingTypeVulnRaw = "Vulnerability Raw";
	const severityHigh = "High";
	const anyValue = "Any";
	const handleClose = jest.fn();

	afterEach(() => {
		handleClose.mockClear(); // reset counters
	});

	describe("specific tests for each finding type", () => {
		it("vulnerability add dialog", async () => {
			// remove hidden findings in mock data to put form into "add" mode
			const vuln = JSON.parse(JSON.stringify(vulnRow));
			vuln.hasHiddenFindings = false;
			vuln.hiddenFindings = null;
			vuln.unhiddenFindings = [];

			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog row={vuln} open={true} onClose={handleClose} />
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle })
				).toBeInTheDocument();
			});

			// check expected fields for an add vuln hidden findings dialog
			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenBy })
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenDate })
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedBy })
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedDate })
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
				within(vulnerability).getByRole("link", { name: vuln.id })
			).toBeInTheDocument();

			const component = screen.getByRole("listitem", {
				name: findingLabelComponent,
			});
			expect(component).toBeInTheDocument();
			expect(within(component).getByText(vuln.component)).toBeInTheDocument();

			const sourceFiles = screen.getByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).toBeInTheDocument();
			expect(within(sourceFiles).getAllByRole("listitem")).toHaveLength(
				vuln.source.length
			);

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceHidden,
				})
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceNotHidden,
				})
			).not.toBeInTheDocument();

			// warning badge not displayed for unhiddenSource
			expect(
				screen.queryByLabelText(
					'Click the "Update" button to add these source files to this hidden finding'
				)
			).not.toBeInTheDocument();

			// form doesn't start with any errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			await user.type(reasonField, "add vuln reason");
			await waitFor(() => expect(reasonField).toHaveValue("add vuln reason"));

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).not.toHaveAttribute("aria-disabled");
			expect(
				within(hideForField).getByText("This vulnerability in THIS component")
			).toBeInTheDocument();

			// no form errors after entering required fields
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			// add button should be enabled
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).toBeEnabled();
		});

		// vuln add dialog where "anywhere" is selected for Hide For field
		it("vulnerability raw add dialog", async () => {
			// remove hidden findings in mock data to put form into "add" mode
			const vuln = JSON.parse(JSON.stringify(vulnRow));
			vuln.hasHiddenFindings = false;
			vuln.hiddenFindings = null;
			vuln.unhiddenFindings = [];

			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog row={vuln} open={true} onClose={handleClose} />
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle })
				).toBeInTheDocument();
			});

			// check expected fields for an add vuln hidden findings dialog
			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenBy })
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenDate })
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedBy })
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", { name: findingLabelUpdatedDate })
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
				within(vulnerability).getByRole("link", { name: vuln.id })
			).toBeInTheDocument();

			const component = screen.getByRole("listitem", {
				name: findingLabelComponent,
			});
			expect(component).toBeInTheDocument();
			expect(within(component).getByText(vuln.component)).toBeInTheDocument();

			const sourceFiles = screen.getByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).toBeInTheDocument();
			expect(within(sourceFiles).getAllByRole("listitem")).toHaveLength(
				vuln.source.length
			);

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceHidden,
				})
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceNotHidden,
				})
			).not.toBeInTheDocument();

			// warning badge not displayed for unhiddenSource
			expect(
				screen.queryByLabelText(
					'Click the "Update" button to add these source files to this hidden finding'
				)
			).not.toBeInTheDocument();

			// form doesn't start with any errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			await user.type(reasonField, "add vuln raw reason");
			await waitFor(() =>
				expect(reasonField).toHaveValue("add vuln raw reason")
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).not.toHaveAttribute("aria-disabled");
			expect(
				within(hideForField).getByText("This vulnerability in THIS component")
			).toBeInTheDocument();

			await user.type(hideForField, "{arrowdown}{enter}");
			await waitFor(() => {
				expect(
					within(hideForField).queryByText(
						"This vulnerability in ALL components"
					)
				).toBeInTheDocument();
			});

			// changing Hide For value to "any" should change several finding details values
			expect(
				within(category).getByText(findingTypeVulnRaw)
			).toBeInTheDocument(); // changed to vuln raw
			expect(within(severity).getByText(severityHigh)).toBeInTheDocument(); // unchanged
			expect(
				within(vulnerability).getByRole("link", { name: vuln.id })
			).toBeInTheDocument(); // unchanged
			expect(within(component).getByText(anyValue)).toBeInTheDocument(); // changed to Any
			expect(within(sourceFiles).getByText(anyValue)).toBeInTheDocument(); // changed to Any

			// no form errors after entering required fields
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			// add button should be enabled
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).toBeEnabled();
		});
	});
});
