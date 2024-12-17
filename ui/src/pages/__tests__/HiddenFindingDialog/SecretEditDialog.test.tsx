import { Settings } from "luxon";
import {
	getDefaultNormalizer,
	render,
	screen,
	waitFor,
	within,
} from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import {
	findingSecretRow,
	findingSecretRawRow,
} from "../../../../testData/testMockData";
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
	const fieldSecretStringLabel =
		"String to exclude from secret findings (future scans only)";
	const buttonUpdateLabel = "Update";
	const findingLabelHiddenBy = "Hidden finding created by:";
	const findingLabelHiddenDate = "Hidden finding created:";
	const findingLabelUpdatedBy = "Hidden finding last updated by:";
	const findingLabelUpdatedDate = "Hidden finding last updated:";
	const findingLabelCategory = "Category:";
	const findingLabelCommit = "Commit:";
	const findingLabelSeverity = "Severity:";
	const findingLabelSourceFound = new RegExp(/^Found in source file/);
	const findingLabelSourceHidden = new RegExp(/^Hidden in source file/);
	const findingLabelSourceNotHidden = new RegExp(
		/^Source files not covered by this hidden finding/,
	);
	const findingLabelType = "Type:";
	const findingTypeSecret = "Secret";
	const findingTypeSecretRaw = "Secret Raw";
	const anyValue = "Any";
	const handleClose = jest.fn();

	afterEach(() => {
		handleClose.mockClear(); // reset counters
	});

	describe("specific tests for each finding type", () => {
		it("secret edit dialog", async () => {
			// wait for dialog to open
			render(
				<HiddenFindingDialog
					row={findingSecretRow}
					open={true}
					onClose={handleClose}
				/>,
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle }),
				).toBeInTheDocument();
			});

			// check expected fields for an edit analysis hidden findings dialog
			const createdBy = screen.getByRole("listitem", {
				name: findingLabelHiddenBy,
			});
			expect(createdBy).toBeInTheDocument();
			expect(
				within(createdBy).getByRole("link", {
					name: findingSecretRow.createdBy,
				}),
			).toBeInTheDocument();

			// test created, updated fields not in row data are not displayed
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
			expect(within(category).getByText(findingTypeSecret)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSeverity,
				}),
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelType,
				}),
			).not.toBeInTheDocument();

			const commit = screen.getByRole("listitem", {
				name: findingLabelCommit,
			});
			expect(commit).toBeInTheDocument();
			expect(
				within(commit).getByText(
					findingSecretRow.hiddenFindings[0].value.commit,
				),
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
				findingSecretRow.hiddenFindings[0].value.filename,
				findingSecretRow.hiddenFindings[0].value.line,
			);
			expect(within(hiddenSource).getByText(fileLine)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceNotHidden,
				}),
			).not.toBeInTheDocument();

			// warning badge not displayed for unhiddenSource
			expect(
				screen.queryByLabelText(
					'Click the "Update" button to add these source files to this hidden finding',
				),
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
				findingSecretRow.hiddenFindings[0].reason,
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText("This secret in THIS specific location"),
			).toBeInTheDocument();

			// secret string field hidden in "this" hide for mode
			const secretStringField = screen.queryByLabelText(fieldSecretStringLabel);
			expect(secretStringField).not.toBeInTheDocument();
		});

		it("secret raw edit dialog", async () => {
			// wait for dialog to open
			render(
				<HiddenFindingDialog
					row={findingSecretRawRow}
					open={true}
					onClose={handleClose}
				/>,
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle }),
				).toBeInTheDocument();
			});

			// check expected fields for an edit analysis hidden findings dialog
			const createdBy = screen.getByRole("listitem", {
				name: findingLabelHiddenBy,
			});
			expect(createdBy).toBeInTheDocument();
			expect(
				within(createdBy).getByRole("link", {
					name: findingSecretRawRow.createdBy,
				}),
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
					formatDate(findingSecretRawRow.hiddenFindings[0].created, "long"),
					{ normalizer: getDefaultNormalizer({ collapseWhitespace: false }) },
				),
			).toBeInTheDocument();

			// test updated fields not in row data are not displayed
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
				within(category).getByText(findingTypeSecretRaw),
			).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSeverity,
				}),
			).not.toBeInTheDocument();

			const typeField = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(typeField).toBeInTheDocument();
			expect(within(typeField).getByText(anyValue)).toBeInTheDocument();

			const commit = screen.getByRole("listitem", {
				name: findingLabelCommit,
			});
			expect(commit).toBeInTheDocument();
			expect(within(commit).getByText(anyValue)).toBeInTheDocument();

			const sourceFiles = screen.queryByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).not.toBeInTheDocument();

			const hiddenSource = screen.getByRole("listitem", {
				name: findingLabelSourceHidden,
			});
			expect(hiddenSource).toBeInTheDocument();
			expect(within(hiddenSource).getByText(anyValue)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceNotHidden,
				}),
			).not.toBeInTheDocument();

			// warning badge not displayed for unhiddenSource
			expect(
				screen.queryByLabelText(
					'Click the "Update" button to add these source files to this hidden finding',
				),
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
				findingSecretRawRow.hiddenFindings[0].reason,
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText(
					"This secret ANYWHERE in this repository",
				),
			).toBeInTheDocument();

			// secret string field hidden in "this" hide for mode
			const secretStringField = screen.getByLabelText(fieldSecretStringLabel);
			expect(secretStringField).toBeInTheDocument();
			expect(secretStringField).toHaveValue(
				findingSecretRawRow.hiddenFindings[0].value.value,
			);
		});
	});
});
