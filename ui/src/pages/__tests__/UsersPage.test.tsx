import { render, screen, waitFor, within } from "test-utils";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import UsersPage from "pages/UsersPage";
import { mockStoreEmpty, mockUsers } from "../../../testData/testMockData";
import { deleteUser } from "features/users/usersSlice";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

describe("UsersPage component", () => {
	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
	});
	afterEach(() => {
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
	});

	it("page title should include 'user management'", async () => {
		const globalWindow = global.window;
		global.window ??= Object.create(window);

		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<UsersPage />);

		const resultsTitle = await screen.findByText(/^Users$/);
		expect(resultsTitle).toBeInTheDocument();

		// check the page title
		expect(global.window.document.title).toMatch("User Management");
		global.window ??= globalWindow;
	});

	it("page should have a back button", () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<UsersPage />);
		expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
	});

	describe("no users", () => {
		it("should display no results message", () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<UsersPage />);
			expect(screen.getByText(/no users found/i)).toBeInTheDocument();
		});

		it("should display the Add User FAB", () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<UsersPage />);
			const string = "Add New User";
			expect(screen.getByRole("button", { name: string })).toBeInTheDocument();
		});
	});

	describe("user list", () => {
		it("should display the Add User FAB", () => {
			mockAppState = JSON.parse(JSON.stringify(mockUsers));
			render(<UsersPage />);
			const string = "Add New User";
			expect(screen.getByRole("button", { name: string })).toBeInTheDocument();
		});

		describe("table tests", () => {
			it("should not display no results message", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockUsers));
				render(<UsersPage />);
				expect(screen.queryByText(/no users found/i)).not.toBeInTheDocument();
			});

			it("displays expected table columns", () => {
				mockAppState = JSON.parse(JSON.stringify(mockUsers));
				render(<UsersPage />);
				expect(
					screen.getByRole("columnheader", { name: /email/i })
				).toBeInTheDocument();
				expect(
					screen.getByRole("columnheader", { name: /scope/i })
				).toBeInTheDocument();
				expect(
					screen.getByRole("columnheader", { name: /admin/i })
				).toBeInTheDocument();
				expect(
					screen.getByRole("columnheader", { name: /last login/i })
				).toBeInTheDocument();
				expect(
					screen.getByRole("columnheader", { name: /actions/i })
				).toBeInTheDocument();
			});

			// since there is nothing else on the users page, default to 20 items in table instead of 10
			it("should default to 20 items per page", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockUsers));
				const defaultRowsPerPage = 20;
				render(<UsersPage />);
				const rowsPerPageButton = screen.getByRole("button", {
					name: "Rows per page: " + String(defaultRowsPerPage),
				});
				expect(rowsPerPageButton).toBeInTheDocument();
			});

			describe("table actions", () => {
				jest.setTimeout(60000);

				it("cancelling a delete should not remove a user", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockUsers));
					// make a single user so it's easier to test locating and deleting it
					const id = mockUsers.users.ids[0];
					mockAppState.users.ids = [id];
					mockAppState.users.entities = {};
					mockAppState.users.entities[id] = { ...mockUsers.users.entities[id] };
					const { user } = render(<UsersPage />);
					const string = "Remove User";
					const deleteButton = screen.getByRole("button", { name: string });
					expect(deleteButton).toBeInTheDocument();

					await user.click(deleteButton);
					await waitFor(() => {
						expect(
							screen.getByText(`Remove user "${id}"?`)
						).toBeInTheDocument();
					});

					const cancelButton = screen.getByRole("button", { name: "Cancel" });
					expect(cancelButton).toBeInTheDocument();
					const confirmDelete = screen.getByRole("button", { name: "Remove" });
					expect(confirmDelete).toBeInTheDocument();

					// cancelling a deletion should not remove the item
					await user.click(cancelButton);
					expect(mockDispatch).not.toHaveBeenCalledWith(
						deleteUser({
							email: id as string,
						})
					);

					// collapsible row should be collapsed
					await waitFor(() => {
						expect(
							screen.queryByText(`Remove user "${id}"?`)
						).not.toBeInTheDocument();
					});
				});
			});
		});
	});

	describe("manage user", () => {
		Element.prototype.scrollTo = () => {};

		describe("add user dialog", () => {
			it("click Add New User should display Add New User Dialog", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockUsers));
				const { user } = render(<UsersPage />);

				const addNewUserButton = screen.getByRole("button", {
					name: "Add New User",
				});
				await user.click(addNewUserButton);

				const dialogTitle = "Add New User";

				await waitFor(() => {
					expect(
						screen.queryByRole("dialog", { name: dialogTitle })
					).toBeInTheDocument();
				});
				const addNewUserDialog = screen.getByRole("dialog", {
					name: dialogTitle,
				});
				expect(addNewUserDialog).toBeInTheDocument();
				const addNewUserHeading = screen.getByRole("heading", {
					name: "Add New User",
				});
				expect(addNewUserHeading).toBeInTheDocument();
				const addScopeSpan = screen.getByRole("textbox", { name: "Add Scope" });
				expect(addScopeSpan).toBeInTheDocument();
				const emailLabel = screen.getByRole("textbox", {
					name: "Email Address",
				});
				expect(emailLabel).toBeInTheDocument();
				const administratorCheckbox = screen.getByRole("checkbox", {
					name: "Administrator",
				});
				expect(administratorCheckbox).toBeInTheDocument();

				if (process.env.REACT_APP_AQUA_ENABLED === "true") {
					console.log("Snyk feature enabled, testing it is enabled...");
					expect(
						screen.getByRole("checkbox", {
							name: "Snyk Vulnerability Detection Plugin",
						})
					).toBeInTheDocument();
				} else {
					console.log("Snyk feature disabled, testing it is disabled...");
					expect(
						screen.queryByRole("checkbox", {
							name: "Snyk Vulnerability Detection Plugin",
						})
					).not.toBeInTheDocument();
				}

				const addItemToScopeButton = screen.getByRole("button", {
					name: "Add this item to scope",
				});
				expect(addItemToScopeButton).toBeInTheDocument();
				const addButton = screen.getByRole("button", { name: "Add" });
				expect(addButton).toBeInTheDocument();
				const cancelButton = screen.getByRole("button", { name: "Cancel" });
				expect(cancelButton).toBeInTheDocument();
			});

			it("email field validates input", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UsersPage />);

				const dialogTitle = "Add New User";
				const addButton = screen.getByRole("button", {
					name: dialogTitle,
				});
				expect(addButton).toBeInTheDocument();
				await user.click(addButton);
				await waitFor(() => {
					expect(
						screen.queryByRole("dialog", { name: dialogTitle })
					).toBeInTheDocument();
				});

				const dialog = screen.getByRole("dialog", {
					name: dialogTitle,
				});

				const emailField = within(dialog).getByLabelText("Email Address");
				expect(emailField).toBeInTheDocument();
				expect(emailField).toBeEnabled();
				expect(emailField).toHaveFocus();

				expect(
					within(dialog).getByLabelText("Administrator")
				).toBeInTheDocument();

				const invalidInput = "test@";
				await user.type(emailField, invalidInput);
				await user.tab();

				await waitFor(() => {
					expect(screen.getByText("Invalid email address")).toBeInTheDocument();
				});

				const validInput = "test@example.com";
				await user.clear(emailField);
				await user.type(emailField, validInput);
				await user.tab();

				await waitFor(() => {
					expect(
						screen.queryByText("Invalid email address")
					).not.toBeInTheDocument();
				});
			});

			it("focuses email field", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UsersPage />);

				const dialogTitle = "Add New User";
				const addButton = screen.getByRole("button", {
					name: dialogTitle,
				});
				expect(addButton).toBeInTheDocument();
				await user.click(addButton);
				await waitFor(() => {
					expect(
						screen.queryByRole("dialog", { name: dialogTitle })
					).toBeInTheDocument();
				});

				const dialog = screen.getByRole("dialog", {
					name: dialogTitle,
				});

				const emailField = within(dialog).getByLabelText("Email Address");
				expect(emailField).toBeInTheDocument();
				expect(emailField).toBeEnabled();
				expect(emailField).toHaveFocus(); // first field should have focus

				const adminField = within(dialog).getByLabelText("Administrator");
				expect(adminField).toBeInTheDocument();
				expect(adminField).not.toHaveFocus();
			});

			it("copy-to-clipboard should appear when there are scopes", async () => {
				const globalWindow = global.window;
				global.window ??= Object.create(window);
				global.scrollTo = jest.fn();
				document.execCommand = jest.fn((commandId, showUI, value) => true);

				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UsersPage />, null, { skipHover: true });

				const dialogTitle = "Add New User";
				const addButton = screen.getByRole("button", {
					name: dialogTitle,
				});
				expect(addButton).toBeInTheDocument();
				await user.click(addButton);
				await waitFor(() => {
					expect(
						screen.queryByRole("dialog", { name: dialogTitle })
					).toBeInTheDocument();
				});

				const dialog = screen.getByRole("dialog", {
					name: dialogTitle,
				});

				// no scope, no copy-to-clipboard button
				const copyString = "Copy to clipboard";
				let copyButton = within(dialog).queryByRole("button", {
					name: copyString,
				});
				expect(copyButton).not.toBeInTheDocument();

				const scopeInput = "ANewScope";
				const addScopeField = within(dialog).getByLabelText("Add Scope");
				expect(addScopeField).toBeInTheDocument();
				await user.type(addScopeField, scopeInput);

				const addScopeButton = within(dialog).getByRole("button", {
					name: "Add this item to scope",
				});
				expect(addScopeButton).toBeInTheDocument();
				await user.click(addScopeButton);
				expect(
					within(dialog).getByDisplayValue(scopeInput)
				).toBeInTheDocument();

				// there is a known issue in user-events v4 where if you fire an event on an actve element after
				// visting a disabled element, the event (click, type, etc.) will fail with the error:
				//   "Unable to perform pointer interaction as the element has `pointer-events: none"
				//
				// this is what happens here, because after adding a scope the "addScopeButton" is disabled
				// when we try to find and click the copy-to-clipboard button it indicates that the
				// prior selected element (add scope button) is disabled
				// workaround is to pass { skipHover: true } to userEvent.setup called by 3rd argument to render() above
				//
				// see: https://github.com/testing-library/user-event/issues/922#issuecomment-1117732440

				// now that a scope has been added the copy-to-clipboard option should be visible
				copyButton = within(dialog).getByRole("button", {
					name: copyString,
				});
				expect(copyButton).toBeInTheDocument();
				await user.click(copyButton);
				expect(document.execCommand).toHaveBeenCalledWith("copy");

				// remove scope
				const removeScopeButton = within(dialog).getByRole("button", {
					name: "Remove this scope item",
				});
				expect(removeScopeButton).toBeInTheDocument();
				await user.click(removeScopeButton);
				expect(within(dialog).queryByText(scopeInput)).not.toBeInTheDocument();

				// copy-to-clipboard button should be removed
				copyButton = within(dialog).queryByRole("button", {
					name: copyString,
				});
				expect(copyButton).not.toBeInTheDocument();

				global.window ??= globalWindow;
			});
		});

		describe("edit user dialog", () => {
			it("selected row should display Modify User Dialog", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockUsers));
				// make a single user so it's easier to test locating and modifying it
				const id = mockUsers.users.ids[0];
				mockAppState.users.ids = [id];
				mockAppState.users.entities = {};
				mockAppState.users.entities[id] = {
					...mockUsers.users.entities[id],
				};
				mockAppState.users.entities[id].features = {
					...mockAppState.users.entities[id].features,
					feature1: true,
					feature2: false,
				};
				const { user } = render(<UsersPage />);

				const row = screen.getByText(id);
				expect(row).toBeInTheDocument();
				await user.click(row);

				const dialogTitle = "Modify User";
				await waitFor(() => {
					expect(
						screen.queryByRole("dialog", { name: dialogTitle })
					).toBeInTheDocument();
				});

				const editUserDialog = screen.getByRole("dialog", {
					name: dialogTitle,
				});
				expect(editUserDialog).toBeInTheDocument();

				const editUserHeading = screen.getByRole("heading", {
					name: "Modify User",
				});
				expect(editUserHeading).toBeInTheDocument();

				const addScopeSpan = screen.getByRole("textbox", { name: "Add Scope" });
				expect(addScopeSpan).toBeInTheDocument();

				const emailLabel: HTMLTextAreaElement = screen.getByRole("textbox", {
					name: "Email Address",
				});
				expect(emailLabel).toBeInTheDocument();
				expect(emailLabel.value).toEqual(mockAppState.users.entities[id].email);

				const administratorCheckbox = screen.getByRole("checkbox", {
					name: "Administrator",
				});
				expect(administratorCheckbox).toBeInTheDocument();

				if (process.env.REACT_APP_AQUA_ENABLED === "true") {
					console.log("Snyk feature enabled, testing it is enabled...");
					expect(
						screen.getByRole("checkbox", {
							name: "Snyk Vulnerability Detection Plugin",
						})
					).toBeInTheDocument();
				} else {
					console.log("Snyk feature disabled, testing it is disabled...");
					expect(
						screen.queryByRole("checkbox", {
							name: "Snyk Vulnerability Detection Plugin",
						})
					).not.toBeInTheDocument();
				}

				const feature1Checkbox = screen.getByRole("checkbox", {
					name: "Feature1",
				});
				expect(feature1Checkbox).toBeChecked();

				const feature2Checkbox = screen.getByRole("checkbox", {
					name: "Feature2",
				});
				expect(feature2Checkbox).not.toBeChecked();

				const addItemToScopeButton = screen.getByRole("button", {
					name: "Add this item to scope",
				});
				expect(addItemToScopeButton).toBeInTheDocument();

				const addButton = screen.getByRole("button", { name: "Update" });
				expect(addButton).toBeInTheDocument();

				const cancelButton = screen.getByRole("button", { name: "Cancel" });
				expect(cancelButton).toBeInTheDocument();
			});

			it("focuses admin field", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockUsers));
				// make a single user so it's easier to test locating and modifying it
				const id = mockUsers.users.ids[0];
				mockAppState.users.ids = [id];
				mockAppState.users.entities = {};
				mockAppState.users.entities[id] = {
					...mockUsers.users.entities[id],
				};
				const { user } = render(<UsersPage />);

				const row = screen.getByText(id);
				expect(row).toBeInTheDocument();
				await user.click(row);

				const dialogTitle = "Modify User";
				await waitFor(() => {
					expect(
						screen.queryByRole("dialog", { name: dialogTitle })
					).toBeInTheDocument();
				});

				const dialog = screen.getByRole("dialog", {
					name: dialogTitle,
				});

				const emailField = within(dialog).getByLabelText("Email Address");
				expect(emailField).toBeInTheDocument();
				expect(emailField).toBeDisabled();
				expect(emailField).not.toHaveFocus(); // disabled field should not have focus

				const adminField = within(dialog).getByLabelText("Administrator");
				expect(adminField).toBeInTheDocument();
				expect(adminField).toHaveFocus(); // first enabled field should have focus
			});
		});
	});
});
