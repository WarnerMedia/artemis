import { Settings } from "luxon";
import {
	render,
	screen,
	waitFor,
	within,
} from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import {
	analysisRow,
} from "../../../../testData/testMockData";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

const formatSourceLine = (filePath: string, fileLine: number) => {
	return `${filePath} (Line ${fileLine})`;
};

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
	const findingLabelSourceFound = new RegExp(/^Found in source file/);
	const findingLabelSourceHidden = new RegExp(/^Hidden in source file/);
	const findingLabelSourceNotHidden = new RegExp(
		/^Source files not covered by this hidden finding/
	);
	const findingLabelType = "Type:";
	const findingTypeAnalysis = "Static Analysis";
	const severityCritical = "Critical";
	const handleClose = jest.fn();

	afterEach(() => {
		handleClose.mockClear(); // reset counters
	});

	describe("specific tests for each finding type", () => {
		it("static analysis add dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog
					row={analysisRow}
					open={true}
					onClose={handleClose}
				/>
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle })
				).toBeInTheDocument();
			});

			// check expected fields for an add analysis hidden findings dialog
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
			expect(
				within(category).getByText(findingTypeAnalysis)
			).toBeInTheDocument();

			const severity = screen.getByRole("listitem", {
				name: findingLabelSeverity,
			});
			expect(severity).toBeInTheDocument();
			expect(within(severity).getByText(severityCritical)).toBeInTheDocument();

			const type = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(type).toBeInTheDocument();
			expect(within(type).getByText(analysisRow.resource)).toBeInTheDocument();

			const sourceFiles = screen.getByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).toBeInTheDocument();
			const fileLine = formatSourceLine(analysisRow.filename, analysisRow.line);
			expect(within(sourceFiles).getByText(fileLine)).toBeInTheDocument();

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
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).not.toBeEnabled();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			await user.type(reasonField, "add vuln reason");
			await waitFor(() => expect(reasonField).toHaveValue("add vuln reason"));

			// Hide for field not in static analysis dialog
			const hideForField = screen.queryByLabelText(fieldHideForLabel);
			expect(hideForField).not.toBeInTheDocument();

			// add button should be enabled
			expect(addButton).toBeEnabled();
		});
	});
});
