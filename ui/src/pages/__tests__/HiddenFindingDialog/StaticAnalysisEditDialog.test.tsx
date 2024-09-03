import { Settings } from "luxon";
import {
	getDefaultNormalizer,
	render,
	screen,
	waitFor,
	within,
} from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import { findingAnalysisRow } from "../../../../testData/testMockData";
import { formatDate } from "utils/formatters";

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

	const dialogEditTitle = "Modify Hidden Finding";
	const unresolvedFormError =
		"This form contains unresolved errors. Please resolve these errors";
	const fieldReasonLabel = "Reason";
	const fieldHideForLabel = "Hide For";
	const buttonUpdateLabel = "Update";
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
	const severityMedium = "Medium";
	const handleClose = jest.fn();

	afterEach(() => {
		handleClose.mockClear(); // reset counters
	});

	describe("specific tests for each finding type", () => {
		it("static analysis edit dialog", async () => {
			// wait for dialog to open
			render(
				<HiddenFindingDialog
					row={findingAnalysisRow}
					open={true}
					onClose={handleClose}
				/>
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle })
				).toBeInTheDocument();
			});

			// check expected fields for an edit analysis hidden findings dialog
			const createdBy = screen.getByRole("listitem", {
				name: findingLabelHiddenBy,
			});
			expect(createdBy).toBeInTheDocument();
			expect(
				within(createdBy).getByRole("link", {
					name: findingAnalysisRow.createdBy,
				})
			).toBeInTheDocument();

			const createdDate = screen.getByRole("listitem", {
				name: findingLabelHiddenDate,
			});
			expect(createdDate).toBeInTheDocument();
			// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
			// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
			// using: replace(/\s+/g, ' ')
			// causing the match to break
			// so don't collapseWhitespace in the normalizer for comparing dates here
			expect(
				within(createdDate).getByText(
					formatDate(findingAnalysisRow.hiddenFindings[0].created, "long"),
					{ normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }
				)
			).toBeInTheDocument();

			const updatedBy = screen.getByRole("listitem", {
				name: findingLabelUpdatedBy,
			});
			expect(updatedBy).toBeInTheDocument();
			expect(
				within(updatedBy).getByRole("link", {
					name: findingAnalysisRow.hiddenFindings[0].updated_by,
				})
			).toBeInTheDocument();

			const updatedDate = screen.getByRole("listitem", {
				name: findingLabelUpdatedDate,
			});
			expect(updatedDate).toBeInTheDocument();
			// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
			// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
			// using: replace(/\s+/g, ' ')
			// causing the match to break
			// so don't collapseWhitespace in the normalizer for comparing dates here
			expect(
				within(updatedDate).getByText(
					formatDate(findingAnalysisRow.hiddenFindings[0].updated, "long"),
					{ normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }
				)
			).toBeInTheDocument();

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
			expect(within(severity).getByText(severityMedium)).toBeInTheDocument();

			const type = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(type).toBeInTheDocument();
			expect(
				within(type).getByText(findingAnalysisRow.component)
			).toBeInTheDocument();

			const sourceFiles = screen.queryByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).not.toBeInTheDocument();

			const hiddenSource = screen.getByRole("listitem", {
				name: findingLabelSourceHidden,
			});
			expect(hiddenSource).toBeInTheDocument();
			const fileLine = formatSourceLine(
				findingAnalysisRow.hiddenFindings[0].value.filename,
				findingAnalysisRow.hiddenFindings[0].value.line
			);
			expect(within(hiddenSource).getByText(fileLine)).toBeInTheDocument();

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

			// form doesn't have errors with this data
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();
			const updateButton = screen.queryByRole("button", {
				name: buttonUpdateLabel,
			});
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeEnabled();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			expect(reasonField).toHaveValue(
				findingAnalysisRow.hiddenFindings[0].reason
			);

			// Hide for field not in static analysis dialog
			const hideForField = screen.queryByLabelText(fieldHideForLabel);
			expect(hideForField).not.toBeInTheDocument();
		});
	});
});
