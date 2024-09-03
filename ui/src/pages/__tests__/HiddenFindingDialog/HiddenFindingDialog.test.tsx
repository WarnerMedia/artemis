import { DateTime, Settings } from "luxon";
import {
	render,
	screen,
	waitFor,
} from "test-utils";
import { HiddenFindingDialog } from "pages/ResultsPage";
import {
	vulnRow,
} from "../../../../testData/testMockData";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

const formatDateForExpirationField = (dateIsoString: string | null) => {
	return DateTime.fromISO(dateIsoString ?? "").toFormat("yyyy/LL/dd HH:mm");
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
	const buttonAddLabel = "Add";
	const buttonUpdateLabel = "Update";
	const buttonRemoveLabel = "Remove";
	const buttonCancelLabel = "Cancel";
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
});
