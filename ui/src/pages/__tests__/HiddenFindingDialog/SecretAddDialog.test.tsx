import { Settings } from "luxon";
import { render, screen, waitFor, within } from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import { secretRow } from "../../../../testData/testMockData";
import { capitalize } from "utils/formatters";

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
	const fieldSecretStringLabel =
		"String to exclude from secret findings (future scans only)";
	const buttonAddLabel = "Add";
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
		it("secret add dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog
					row={secretRow}
					open={true}
					onClose={handleClose}
				/>,
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle }),
				).toBeInTheDocument();
			});

			// check expected fields for an add analysis hidden findings dialog
			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenBy }),
			).not.toBeInTheDocument();

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

			const type = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(type).toBeInTheDocument();
			expect(
				within(type).getByText(capitalize(secretRow.resource)),
			).toBeInTheDocument();

			const commit = screen.getByRole("listitem", {
				name: findingLabelCommit,
			});
			expect(commit).toBeInTheDocument();
			expect(within(commit).getByText(secretRow.commit)).toBeInTheDocument();

			const sourceFiles = screen.getByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).toBeInTheDocument();
			const fileLine = formatSourceLine(secretRow.filename, secretRow.line);
			expect(within(sourceFiles).getByText(fileLine)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceHidden,
				}),
			).not.toBeInTheDocument();

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

			// form doesn't start with any errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).not.toBeEnabled();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			await user.type(reasonField, "add secret reason");
			await waitFor(() => expect(reasonField).toHaveValue("add secret reason"));

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).not.toHaveAttribute("aria-disabled");
			expect(
				within(hideForField).getByText("This secret in THIS specific location"),
			).toBeInTheDocument();

			// secret string field hidden in "this" hide for mode
			const secretStringField = screen.queryByLabelText(fieldSecretStringLabel);
			expect(secretStringField).not.toBeInTheDocument();

			// add button should be enabled
			expect(addButton).toBeEnabled();
		});

		// secret add dialog where "anywhere" is selected for Hide For field
		it("secret raw add dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog
					row={secretRow}
					open={true}
					onClose={handleClose}
				/>,
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle }),
				).toBeInTheDocument();
			});

			// check expected fields for an add analysis hidden findings dialog
			expect(
				screen.queryByRole("listitem", { name: findingLabelHiddenBy }),
			).not.toBeInTheDocument();

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

			const type = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(type).toBeInTheDocument();
			expect(
				within(type).getByText(capitalize(secretRow.resource)),
			).toBeInTheDocument();

			const commit = screen.getByRole("listitem", {
				name: findingLabelCommit,
			});
			expect(commit).toBeInTheDocument();
			expect(within(commit).getByText(secretRow.commit)).toBeInTheDocument();

			const sourceFiles = screen.getByRole("listitem", {
				name: findingLabelSourceFound,
			});
			expect(sourceFiles).toBeInTheDocument();
			const fileLine = formatSourceLine(secretRow.filename, secretRow.line);
			expect(within(sourceFiles).getByText(fileLine)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSourceHidden,
				}),
			).not.toBeInTheDocument();

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

			// form doesn't start with any errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			await user.type(reasonField, "add secret raw reason");
			await waitFor(() =>
				expect(reasonField).toHaveValue("add secret raw reason"),
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).not.toHaveAttribute("aria-disabled");
			expect(
				within(hideForField).getByText("This secret in THIS specific location"),
			).toBeInTheDocument();

			// secret string field hidden in "this" hide for mode
			let secretStringField = screen.queryByLabelText(fieldSecretStringLabel);
			expect(secretStringField).not.toBeInTheDocument();

			// select 2nd item in selection field
			// used instead of react-select-event because MUI select component doesn't use an underlying select element
			await user.type(hideForField, "{arrowdown}{enter}");
			await waitFor(() => {
				expect(
					within(hideForField).queryByText(
						"This secret ANYWHERE in this repository",
					),
				).toBeInTheDocument();
			});

			// changing Hide For value to "any" should change several finding details values
			expect(
				within(category).getByText(findingTypeSecretRaw),
			).toBeInTheDocument(); // changed to secret raw

			expect(within(type).getByText(anyValue)).toBeInTheDocument(); // changed to Any
			expect(within(commit).getByText(anyValue)).toBeInTheDocument(); // changed to Any
			expect(within(sourceFiles).getByText(anyValue)).toBeInTheDocument(); // changed to Any

			secretStringField = screen.getByLabelText(fieldSecretStringLabel); // should be shown now
			expect(secretStringField).toBeInTheDocument();
			expect(secretStringField).toHaveValue("");

			// tab past secret string field to produce validation warning ("required")
			await user.tab();
			expect(secretStringField).toHaveFocus();
			await user.tab();
			expect(
				screen.getByRole("spinbutton", {
					name: "Year",
				}),
			).toHaveFocus();
			await waitFor(() => {
				expect(screen.queryByText("Required")).toBeInTheDocument();
			});
			expect(screen.getByText(unresolvedFormError)).toBeInTheDocument();

			// secret string field requires > 3 characters
			await user.type(secretStringField, "123");
			await waitFor(() => {
				expect(secretStringField).toHaveValue("123");
			});
			expect(
				screen.getByText("Must be 4 or more characters"),
			).toBeInTheDocument();
			expect(screen.getByText(unresolvedFormError)).toBeInTheDocument();

			// 4 characters passes validation
			await user.clear(secretStringField); // clear prior entry
			await user.type(secretStringField, "pass");
			await waitFor(() => {
				expect(secretStringField).toHaveValue("pass");
			});
			expect(screen.queryByText("Required")).not.toBeInTheDocument();
			expect(
				screen.queryByText("Must be 4 or more characters"),
			).not.toBeInTheDocument();
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			// add button should be enabled
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).toBeEnabled();
		});
	});
});
