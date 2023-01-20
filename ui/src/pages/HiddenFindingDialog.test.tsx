import { DateTime, Settings } from "luxon";
import { render, screen, waitFor, within } from "test-utils";
import { HiddenFindingDialog } from "./ResultsPage";
import {
	analysisRow,
	findingAnalysisRow,
	findingSecretRow,
	findingSecretRawRow,
	secretRow,
	vulnRow,
	findingVulnRawRow,
} from "../../testData/testMockData";
import { capitalize, formatDate } from "utils/formatters";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

const formatDateForExpirationField = (dateIsoString: string) => {
	return DateTime.fromISO(dateIsoString).toFormat("yyyy/LL/dd HH:mm");
};

const formatSourceLine = (filePath: string, fileLine: number) => {
	return `${filePath} (Line ${fileLine})`;
};

describe("HiddenFindingDialog component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(60000);

	const dialogAddTitle = "Hide This Finding";
	const dialogEditTitle = "Modify Hidden Finding";
	const unresolvedFormError =
		"This form contains unresolved errors. Please resolve these errors";
	const fieldReasonLabel = "Reason";
	const fieldHideForLabel = "Hide For";
	const fieldExpiresLabel = "Expires (optional)";
	const fieldSecretStringLabel =
		"String to exclude from secret findings (future scans only)";
	const buttonAddLabel = "Add";
	const buttonUpdateLabel = "Update";
	const buttonRemoveLabel = "Remove";
	const buttonCancelLabel = "Cancel";
	const findingLabelHiddenBy = "Hidden finding created by:";
	const findingLabelHiddenDate = "Hidden finding created:";
	const findingLabelUpdatedBy = "Hidden finding last updated by:";
	const findingLabelUpdatedDate = "Hidden finding last updated:";
	const findingLabelCategory = "Category:";
	const findingLabelCommit = "Commit:";
	const findingLabelSeverity = "Severity:";
	const findingLabelVulnerability = "Vulnerability:";
	const findingLabelComponent = "Component:";
	const findingLabelSourceFound = new RegExp(/^Found in source file/);
	const findingLabelSourceHidden = new RegExp(/^Hidden in source file/);
	const findingLabelSourceNotHidden = new RegExp(
		/^Source files not covered by this hidden finding/
	);
	const findingLabelType = "Type:";
	const findingTypeAnalysis = "Static Analysis";
	const findingTypeSecret = "Secret";
	const findingTypeSecretRaw = "Secret Raw";
	const findingTypeVuln = "Vulnerability";
	const findingTypeVulnRaw = "Vulnerability Raw";
	const severityCritical = "Critical";
	const severityHigh = "High";
	const severityMedium = "Medium";
	const anyValue = "Any";
	const handleClose = jest.fn();

	afterEach(() => {
		handleClose.mockClear(); // reset counters
	});

	it("displays no dialog if open = false", () => {
		render(
			<HiddenFindingDialog row={vulnRow} open={false} onClose={handleClose} />
		);
		expect(
			screen.queryByRole("dialog", { name: dialogEditTitle })
		).not.toBeInTheDocument();
		expect(handleClose).toHaveBeenCalledTimes(0);
	});

	describe("general tests applicable to all forms", () => {
		let user: any;
		beforeEach(async () => {
			// remove hidden findings in mock data to put form into "add" mode
			const vuln = JSON.parse(JSON.stringify(vulnRow));
			vuln.hasHiddenFindings = false;
			vuln.hiddenFindings = null;
			vuln.unhiddenFindings = [];

			// wait for dialog to open
			const renderArgs = render(
				<HiddenFindingDialog row={vuln} open={true} onClose={handleClose} />
			);
			user = renderArgs.user;
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle })
				).toBeInTheDocument();
			});

			// form doesn't start with any errors
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();
		});

		it("help accordion opens & closes", async () => {
			const helpAccordionTitle = screen.getByText("What are hidden findings?");
			expect(helpAccordionTitle).toBeInTheDocument();

			const helpMessageSnippet = new RegExp(
				/hidden findings are global to this repository/i
			);
			expect(screen.getByText(helpMessageSnippet)).not.toBeVisible();
			await user.click(helpAccordionTitle);
			await waitFor(() => {
				expect(screen.queryByText(helpMessageSnippet)).toBeVisible();
			});
			await user.click(helpAccordionTitle);
			await waitFor(() => {
				expect(screen.queryByText(helpMessageSnippet)).not.toBeVisible();
			});
		});

		it("reason field is required", async () => {
			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			expect(reasonField).toHaveFocus(); // first field should have focus

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();

			// tab to next field, this should trigger form validation
			// and a form error since "reason" field is empty and is required
			await user.tab();
			expect(hideForField).toHaveFocus();
			await waitFor(() => {
				expect(screen.queryByText("Required")).toBeInTheDocument();
			});
			expect(screen.getByText(unresolvedFormError)).toBeInTheDocument();

			await user.type(reasonField, "A reason{enter}value");
			await waitFor(() => {
				expect(reasonField).toHaveValue("A reason\nvalue");
			});

			// required form field entered, error should be removed
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();
		});

		describe("expires field", () => {
			it("date min value", async () => {
				const expiresField = screen.getByLabelText(fieldExpiresLabel);
				expect(expiresField).toBeInTheDocument();
				expect(expiresField).toHaveAttribute(
					"placeholder",
					"yyyy/MM/dd HH:mm (24-hour)"
				);
				expect(expiresField).toHaveValue("");
				const now = formatDateForExpirationField(DateTime.utc().toJSON());
				await user.type(expiresField, now);
				await waitFor(() => {
					expect(expiresField).toHaveValue(now);
				});
				await waitFor(() => {
					expect(screen.getByText("Must be a future date")).toBeInTheDocument();
				});

				const tomorrow = formatDateForExpirationField(
					DateTime.utc().plus({ days: 1, minutes: 5 }).toJSON()
				);
				await user.clear(expiresField); // clear the past field entry
				await user.type(expiresField, tomorrow);
				await waitFor(() => {
					expect(expiresField).toHaveValue(tomorrow);
				});
				expect(
					screen.queryByText("Must be a future date")
				).not.toBeInTheDocument();
			});

			it("date max value", async () => {
				const expiresField = screen.getByLabelText(fieldExpiresLabel);
				expect(expiresField).toBeInTheDocument();
				expect(expiresField).toHaveValue("");
				const dateMax = "2051/01/01 00:00";
				await user.type(expiresField, dateMax);
				await waitFor(() => {
					expect(expiresField).toHaveValue(dateMax);
				});
				await waitFor(() => {
					expect(
						screen.getByText("Date must be before 2050/12/31")
					).toBeInTheDocument();
				});

				await user.clear(expiresField);
				const notMax = "2050/12/29 23:59";
				await user.type(expiresField, notMax);
				await waitFor(() => {
					expect(expiresField).toHaveValue(notMax);
				});
				await waitFor(() => {
					expect(
						screen.queryByText("Date must be before 2050/12/31")
					).not.toBeInTheDocument();
				});
			});

			it("date not max value", async () => {
				const expiresField = screen.getByLabelText(fieldExpiresLabel);
				expect(expiresField).toBeInTheDocument();
				expect(expiresField).toHaveValue("");
				const notMax = "2050/12/29 23:59";
				await user.type(expiresField, notMax);
				await waitFor(() => {
					expect(expiresField).toHaveValue(notMax);
				});
				await waitFor(() => {
					expect(
						screen.queryByText("Date must be before 2050/12/31")
					).not.toBeInTheDocument();
				});
			});

			it("disallow invalid characters", async () => {
				const expiresField = screen.getByLabelText(fieldExpiresLabel);
				expect(expiresField).toBeInTheDocument();
				expect(expiresField).toHaveValue("");
				await user.type(expiresField, "testme!");
				await waitFor(() => {
					expect(expiresField).toHaveValue(""); // can't type invalid chars in field
				});
			});

			it("disallow invalid date", async () => {
				const expiresField = screen.getByLabelText(fieldExpiresLabel);
				expect(expiresField).toBeInTheDocument();
				expect(expiresField).toHaveValue("");
				await user.type(expiresField, "2030/02/31 13:00"); // Feb 31 invalid
				await waitFor(() => {
					expect(expiresField).toHaveValue("2030/02/31 13:00");
				});
				expect(screen.queryByText(/invalid date format/i)).toBeInTheDocument();
			});
		});
	});

	describe("tests for all add forms", () => {
		it("add dialog has expected elements", async () => {
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
				// check for expected title
				expect(
					screen.queryByRole("dialog", { name: dialogAddTitle })
				).toBeInTheDocument();
			});

			// check for expected buttons
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).not.toBeEnabled();

			expect(
				screen.queryByRole("button", { name: buttonRemoveLabel })
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: buttonUpdateLabel })
			).not.toBeInTheDocument();

			// cancel button enabled and calls close onClick
			const cancelButton = screen.getByRole("button", {
				name: buttonCancelLabel,
			});
			expect(cancelButton).toBeInTheDocument();
			await user.click(cancelButton);
			await waitFor(() => expect(handleClose).toHaveBeenCalledTimes(1));
		});
	});

	describe("tests for all edit forms", () => {
		it("edit dialog has expected elements", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog row={vulnRow} open={true} onClose={handleClose} />
			);
			// check for expected title
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle })
				).toBeInTheDocument();
			});

			// check for expected buttons
			expect(
				screen.queryByRole("button", { name: buttonAddLabel })
			).not.toBeInTheDocument();

			const removeButton = screen.getByRole("button", {
				name: buttonRemoveLabel,
			});
			expect(removeButton).toBeInTheDocument();
			expect(removeButton).toBeEnabled();

			const updateButton = screen.getByRole("button", {
				name: buttonUpdateLabel,
			});
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).not.toBeEnabled(); // disabled because of form errors

			// cancel button enabled and calls close onClick
			const cancelButton = screen.getByRole("button", {
				name: buttonCancelLabel,
			});
			expect(cancelButton).toBeInTheDocument();
			await user.click(cancelButton);
			await waitFor(() => expect(handleClose).toHaveBeenCalledTimes(1));
		});

		it("clicking remove opens remove dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog row={vulnRow} open={true} onClose={handleClose} />
			);
			// check for expected title
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle })
				).toBeInTheDocument();
			});

			let removeButton = screen.getByRole("button", {
				name: buttonRemoveLabel,
			});
			expect(removeButton).toBeInTheDocument();
			expect(removeButton).toBeEnabled();

			await user.click(removeButton);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: "Remove Hidden Finding" })
				).toBeInTheDocument();
			});
			expect(
				screen.getByText(/remove this hidden finding/i)
			).toBeInTheDocument();

			// verify expected buttons: remove, cancel
			removeButton = screen.getByRole("button", {
				name: buttonRemoveLabel,
			});
			expect(removeButton).toBeInTheDocument();
			expect(removeButton).toBeEnabled();

			const cancelButton = screen.getByRole("button", {
				name: buttonCancelLabel,
			});
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).toBeEnabled();

			// clicking cancel button returns to edit dialog
			await user.click(cancelButton);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle })
				).toBeInTheDocument();
			});
		});
	});

	describe("specific tests for each finding type", () => {
		it("secret add dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog
					row={secretRow}
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
			expect(within(category).getByText(findingTypeSecret)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSeverity,
				})
			).not.toBeInTheDocument();

			const type = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(type).toBeInTheDocument();
			expect(
				within(type).getByText(capitalize(secretRow.resource))
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
			await user.type(reasonField, "add secret reason");
			await waitFor(() => expect(reasonField).toHaveValue("add secret reason"));

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).not.toHaveAttribute("aria-disabled");
			expect(
				within(hideForField).getByText("This secret in THIS specific location")
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
			expect(within(category).getByText(findingTypeSecret)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSeverity,
				})
			).not.toBeInTheDocument();

			const type = screen.getByRole("listitem", {
				name: findingLabelType,
			});
			expect(type).toBeInTheDocument();
			expect(
				within(type).getByText(capitalize(secretRow.resource))
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
			await user.type(reasonField, "add secret raw reason");
			await waitFor(() =>
				expect(reasonField).toHaveValue("add secret raw reason")
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).not.toHaveAttribute("aria-disabled");
			expect(
				within(hideForField).getByText("This secret in THIS specific location")
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
						"This secret ANYWHERE in this repository"
					)
				).toBeInTheDocument();
			});

			// changing Hide For value to "any" should change several finding details values
			expect(
				within(category).getByText(findingTypeSecretRaw)
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
			expect(screen.getByLabelText(fieldExpiresLabel)).toHaveFocus();
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
				screen.getByText("Must be 4 or more characters")
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
				screen.queryByText("Must be 4 or more characters")
			).not.toBeInTheDocument();
			expect(screen.queryByText(unresolvedFormError)).not.toBeInTheDocument();

			// add button should be enabled
			const addButton = screen.queryByRole("button", { name: buttonAddLabel });
			expect(addButton).toBeInTheDocument();
			expect(addButton).toBeEnabled();
		});

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

		it("secret edit dialog", async () => {
			// wait for dialog to open
			render(
				<HiddenFindingDialog
					row={findingSecretRow}
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
					name: findingSecretRow.createdBy,
				})
			).toBeInTheDocument();

			// test created, updated fields not in row data are not displayed
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
			expect(within(category).getByText(findingTypeSecret)).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSeverity,
				})
			).not.toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelType,
				})
			).not.toBeInTheDocument();

			const commit = screen.getByRole("listitem", {
				name: findingLabelCommit,
			});
			expect(commit).toBeInTheDocument();
			expect(
				within(commit).getByText(
					findingSecretRow.hiddenFindings[0].value.commit
				)
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
				findingSecretRow.hiddenFindings[0].value.line
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
				findingSecretRow.hiddenFindings[0].reason
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText("This secret in THIS specific location")
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
					name: findingSecretRawRow.createdBy,
				})
			).toBeInTheDocument();

			const createdDate = screen.getByRole("listitem", {
				name: findingLabelHiddenDate,
			});
			expect(createdDate).toBeInTheDocument();
			expect(
				within(createdDate).getByText(
					formatDate(findingSecretRawRow.hiddenFindings[0].created, "long")
				)
			).toBeInTheDocument();

			// test updated fields not in row data are not displayed
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
				within(category).getByText(findingTypeSecretRaw)
			).toBeInTheDocument();

			expect(
				screen.queryByRole("listitem", {
					name: findingLabelSeverity,
				})
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
				findingSecretRawRow.hiddenFindings[0].reason
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText(
					"This secret ANYWHERE in this repository"
				)
			).toBeInTheDocument();

			// secret string field hidden in "this" hide for mode
			const secretStringField = screen.getByLabelText(fieldSecretStringLabel);
			expect(secretStringField).toBeInTheDocument();
			expect(secretStringField).toHaveValue(
				findingSecretRawRow.hiddenFindings[0].value.value
			);
		});

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
			expect(
				within(createdDate).getByText(
					formatDate(findingAnalysisRow.hiddenFindings[0].created, "long")
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
			expect(
				within(updatedDate).getByText(
					formatDate(findingAnalysisRow.hiddenFindings[0].updated, "long")
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

		it("vulnerability edit dialog", async () => {
			// wait for dialog to open
			const { user } = render(
				<HiddenFindingDialog row={vulnRow} open={true} onClose={handleClose} />
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle })
				).toBeInTheDocument();
			});

			// check expected fields for an update vuln hidden findings dialog with some warnings
			const createdBy = screen.getByRole("listitem", {
				name: findingLabelHiddenBy,
			});
			expect(createdBy).toBeInTheDocument();
			expect(
				within(createdBy).getByRole("link", { name: vulnRow.createdBy })
			).toBeInTheDocument();

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
				within(vulnerability).getByRole("link", { name: vulnRow.id })
			).toBeInTheDocument();

			const component = screen.getByRole("listitem", {
				name: findingLabelComponent,
			});
			expect(component).toBeInTheDocument();
			expect(
				within(component).getByText(vulnRow.component)
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
				vulnRow.hiddenFindings.length
			);

			const unhiddenSource = screen.getByRole("listitem", {
				name: findingLabelSourceNotHidden,
			});
			expect(unhiddenSource).toBeInTheDocument();
			expect(within(unhiddenSource).getAllByRole("listitem")).toHaveLength(
				vulnRow.unhiddenFindings.length
			);

			// warning badge displayed for unhiddenSource
			expect(
				screen.queryByLabelText(
					'Click the "Update" button to add these source files to this hidden finding'
				)
			).toBeInTheDocument();

			const reasonField = screen.getByLabelText(fieldReasonLabel);
			expect(reasonField).toBeInTheDocument();
			expect(reasonField).toHaveFocus(); // first field should have focus
			expect(reasonField).toHaveValue(vulnRow.hiddenFindings[0].reason);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText("This vulnerability in THIS component")
			).toBeInTheDocument();

			const expiresField = screen.getByLabelText(fieldExpiresLabel);
			expect(expiresField).toBeInTheDocument();
			expect(expiresField).toHaveValue(
				formatDateForExpirationField(vulnRow.hiddenFindings[0].expires)
			);
			expect(screen.getByText("Must be a future date")).toBeInTheDocument();

			// fix date error
			const tomorrow = formatDateForExpirationField(
				DateTime.utc().plus({ days: 1, minutes: 5 }).toJSON()
			);
			await user.clear(expiresField); // clear prior entry
			await user.type(expiresField, tomorrow);
			await waitFor(() => {
				expect(expiresField).toHaveValue(tomorrow);
			});
			expect(
				screen.queryByText("Must be a future date")
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
				/>
			);
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: dialogEditTitle })
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
				})
			).toBeInTheDocument();

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
				within(category).getByText(findingTypeVulnRaw)
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
				})
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
				findingVulnRawRow.hiddenFindings[0].reason
			);

			const hideForField = screen.getByLabelText(fieldHideForLabel);
			expect(hideForField).toBeInTheDocument();
			expect(hideForField).toHaveAttribute("aria-disabled", "true");
			expect(
				within(hideForField).getByText("This vulnerability in ALL components")
			).toBeInTheDocument();

			const expiresField = screen.getByLabelText(fieldExpiresLabel);
			expect(expiresField).toBeInTheDocument();
			expect(expiresField).toHaveValue(
				formatDateForExpirationField(
					findingVulnRawRow.hiddenFindings[0].expires
				)
			);
			expect(screen.getByText("Must be a future date")).toBeInTheDocument();

			// fix date error
			const tomorrow = formatDateForExpirationField(
				DateTime.utc().plus({ days: 1, minutes: 5 }).toJSON()
			);
			await user.clear(expiresField); // clear prior entry
			await user.type(expiresField, tomorrow);
			await waitFor(() => {
				expect(expiresField).toHaveValue(tomorrow);
			});
			expect(
				screen.queryByText("Must be a future date")
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
