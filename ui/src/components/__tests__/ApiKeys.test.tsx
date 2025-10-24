import { fireEvent, render, screen, waitFor, within } from "test-utils";
import { DateTime, Settings } from "luxon";
import { useSelector, useDispatch } from "react-redux";
import ApiKeys from "components/ApiKeys";
import { deleteUserKey } from "features/keys/keysSlice";
import {
	mockStoreApiKeys,
	mockStoreEmpty,
} from "../../../testData/testMockData";
import { User } from "features/users/usersSchemas";
import client from "api/client";

// Mock the redux hooks
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));

// Mock the API client
jest.mock("api/client", () => ({
	__esModule: true,
	default: {
		addUserKey: jest.fn(),
	},
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();
// client is mocked directly in test cases

let mockAppState: any;
const DATE_FORMAT = "yyyy/LL/dd HH:mm";

describe("ApiKeys component", () => {
	beforeAll(() => {
		// Ensure consistent timezone for tests
		Settings.defaultZone = "America/New_York";
	});

	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
	});

	afterEach(() => {
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		mockDispatch.mockClear();
	});

	describe("when no API keys exist", () => {
		beforeEach(() => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		});

		it("should display no results message", () => {
			render(<ApiKeys />);
			expect(
				screen.getByText(
					"No API keys found. Click the + button to add a new API key",
				),
			).toBeInTheDocument();
		});

		it("should display the Add API key FAB for current user", () => {
			render(<ApiKeys />);
			const string = "Add API key";
			expect(screen.getByRole("button", { name: string })).toBeInTheDocument();
		});

		it("should not display the Add API key FAB for other users", () => {
			const otherUser: User = {
				email: "other.user@example.com",
				id: "other.user@example.com",
				admin: false,
				scan_orgs: [],
				features: {},
			};

			render(<ApiKeys user={otherUser} />);
			const string = "Add API key";
			expect(
				screen.queryByRole("button", { name: string }),
			).not.toBeInTheDocument();
		});

		it("should show appropriate message for other users", () => {
			const otherUser: User = {
				email: "other.user@example.com",
				id: "other.user@example.com",
				admin: false,
				scan_orgs: [],
				features: {},
			};

			render(<ApiKeys user={otherUser} />);
			expect(
				screen.getByText("No API keys found for this user."),
			).toBeInTheDocument();
		});
	});

	describe("with API keys", () => {
		beforeEach(() => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
		});

		it("should not display the no results message", () => {
			render(<ApiKeys />);
			expect(screen.queryByText(/no api keys found/i)).not.toBeInTheDocument();
		});

		it("displays expected table columns", () => {
			render(<ApiKeys />);
			expect(
				screen.getByRole("columnheader", { name: /name/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /scope/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /created/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /expires/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /last used/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /actions/i }),
			).toBeInTheDocument();
		});

		it("displays the key name in the table", () => {
			render(<ApiKeys />);
			const id = mockAppState.keys.ids[0];
			const name = mockAppState.keys.entities[id]?.name;
			expect(screen.getByText(name)).toBeInTheDocument();
		});

		describe("table actions", () => {
			jest.setTimeout(60000);

			it("cancelling a delete should not remove an API key", async () => {
				const id = mockAppState.keys.ids[0];
				const name = mockAppState.keys.entities[id]?.name ?? "";
				const { user } = render(<ApiKeys />);

				const deleteButton = screen.getByRole("button", {
					name: /remove api key/i,
				});
				expect(deleteButton).toBeInTheDocument();

				await user.click(deleteButton);
				await waitFor(() => {
					expect(
						screen.getByText(`Remove API key named "${name}"?`),
					).toBeInTheDocument();
				});

				const cancelButton = screen.getByRole("button", { name: "Cancel" });
				expect(cancelButton).toBeInTheDocument();
				const confirmDelete = screen.getByRole("button", { name: "Remove" });
				expect(confirmDelete).toBeInTheDocument();

				// cancelling a deletion should not remove the item
				await user.click(cancelButton);
				expect(mockDispatch).not.toHaveBeenCalledWith(
					deleteUserKey({
						url: `/users/self/keys/${id}`,
					}),
				);

				// collapsible row should be collapsed
				await waitFor(() => {
					expect(
						screen.queryByText(`Remove API key named "${name}"?`),
					).not.toBeInTheDocument();
				});
			});

			it("confirming a delete should remove an API key", async () => {
				const id = mockAppState.keys.ids[0];
				const name = mockAppState.keys.entities[id]?.name ?? "";
				const { user } = render(<ApiKeys />);

				const deleteButton = screen.getByRole("button", {
					name: /remove api key/i,
				});
				expect(deleteButton).toBeInTheDocument();

				await user.click(deleteButton);
				await waitFor(() => {
					expect(
						screen.getByText(`Remove API key named "${name}"?`),
					).toBeInTheDocument();
				});

				const confirmDelete = screen.getByRole("button", { name: "Remove" });
				expect(confirmDelete).toBeInTheDocument();

				// confirming a deletion should remove the item
				await user.click(confirmDelete);
				expect(mockDispatch).toHaveBeenCalledWith(
					deleteUserKey({
						url: `/users/self/keys/${id}`,
					}),
				);
			});

			it("should use the user ID when deleting keys for another user", async () => {
				const id = mockAppState.keys.ids[0];
				// We don't need the name here but keep id for URL verification
				const otherUser: User = {
					email: "other.user@example.com",
					id: "other.user@example.com",
					admin: false,
					scan_orgs: [],
					features: {},
				};

				const { user } = render(<ApiKeys user={otherUser} />);

				const deleteButton = screen.getByRole("button", {
					name: /remove api key/i,
				});
				await user.click(deleteButton);

				const confirmDelete = screen.getByRole("button", { name: "Remove" });
				await user.click(confirmDelete);

				expect(mockDispatch).toHaveBeenCalledWith(
					deleteUserKey({
						url: `/users/${otherUser.id}/keys/${id}`,
					}),
				);
			});
		});

		describe("view key details", () => {
			it("should open key details dialog when a row is clicked", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
				const { user } = render(<ApiKeys />);

				// Get the first key's name
				const id = mockAppState.keys.ids[0];
				const name = mockAppState.keys.entities[id]?.name;

				// Click on the row (usually clicking on the name cell works)
				const nameCell = screen.getByText(name);
				await user.click(nameCell);

				// Check that dialog opens with correct title
				await waitFor(() => {
					const dialog = screen.getByRole("dialog");
					expect(dialog).toBeInTheDocument();
					expect(
						within(dialog).getByText(name, { exact: false }),
					).toBeInTheDocument();
				});

				// Check for key details in the dialog
				expect(screen.getByText("Created Date")).toBeInTheDocument();
				expect(screen.getByText("Expiration Date")).toBeInTheDocument();
				expect(screen.getByText("Last Used Date")).toBeInTheDocument();

				// If the scope is '*', it needs to be handled specially since it's a special character in regex
				const scope = mockAppState.keys.entities[id]?.scope[0] || "";
				if (scope === "*") {
					// Using getAllByText since '*' might appear multiple times
					const scopeElements = screen.getAllByText("*");
					expect(scopeElements.length).toBeGreaterThan(0);
				} else {
					expect(screen.getByText(scope)).toBeInTheDocument();
				}
			});

			it("should close the details dialog when clicking the OK button", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
				const { user } = render(<ApiKeys />);

				// Get the first key's name
				const id = mockAppState.keys.ids[0];
				const name = mockAppState.keys.entities[id]?.name;

				// Click on the row
				const nameCell = screen.getByText(name);
				await user.click(nameCell);

				// Verify dialog is open
				await waitFor(() => {
					expect(screen.getByRole("dialog")).toBeInTheDocument();
				});

				// Find and click the OK button
				const okButton = screen.getByRole("button", { name: "OK" });
				await user.click(okButton);

				// Verify dialog is closed
				await waitFor(() => {
					expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
				});
			});
		});
	});

	describe("adding API keys", () => {
		beforeEach(() => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		});

		it("displays the add API key dialog when clicking the add button", async () => {
			const { user } = render(<ApiKeys />);
			const addButton = screen.getByRole("button", { name: /add api key/i });
			await user.click(addButton);

			expect(
				screen.getByRole("dialog", { name: /add new api key/i }),
			).toBeInTheDocument();
		});

		it("requires a name for the API key", async () => {
			const error =
				"This form contains unresolved errors. Please resolve these errors";

			const { user } = render(<ApiKeys />);

			const addButton = screen.getByRole("button", { name: /add api key/i });
			await user.click(addButton);
			const dialog = await screen.findByRole("dialog", {
				name: /add new api key/i,
			});

			const nameField = within(dialog).getByRole("textbox", {
				name: /name/i,
			});
			const addKeyButton = within(dialog).getByRole("button", {
				name: "Add",
			});

			// click another field to trigger the form error
			const expiresField = within(dialog).getByTestId("expires_date_input");
			await user.click(expiresField);

			await within(dialog).findByText("Required");
			expect(addKeyButton).toBeDisabled();
			within(dialog).getByText(error);

			await user.type(nameField, "testme");
			// Fill in a valid future date for expires
			const futureDate = DateTime.now()
				.plus({ days: 10 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);
			await user.type(expiresField, futureDate);
			await waitFor(() => expect(expiresField).toHaveDisplayValue(futureDate));
			expect(within(dialog).queryByText("Required")).not.toBeInTheDocument();
			expect(addKeyButton).not.toBeDisabled();
			expect(within(dialog).queryByText(error)).not.toBeInTheDocument();
		});

		it("requires the expiration date to be in the future", async () => {
			// We don't need to check for this error message in this test

			const { user } = render(<ApiKeys />);

			const addButton = screen.getByRole("button", { name: /add api key/i });
			await user.click(addButton);
			const dialog = await screen.findByRole("dialog", {
				name: /add new api key/i,
			});

			const nameField = within(dialog).getByRole("textbox", {
				name: /name/i,
			});
			await user.type(nameField, "testme");

			const expiresField = within(dialog).getByTestId("expires_date_input");
			// Use a past date
			const pastDate = DateTime.now().minus({ days: 10 }).toFormat(DATE_FORMAT);

			fireEvent.change(expiresField, {
				target: { value: pastDate },
			});

			await waitFor(() => {
				expect(
					within(dialog).getByText(/must be a future date/i),
				).toBeInTheDocument();
			});

			// Fix with a future date
			const futureDate = DateTime.now()
				.plus({ days: 10 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);

			fireEvent.change(expiresField, {
				target: { value: futureDate },
			});

			await waitFor(() => {
				expect(
					within(dialog).queryByText(/must be a future date/i),
				).not.toBeInTheDocument();
			});
		});

		it("displays title correctly based on prop", () => {
			const customTitle = "Custom API Keys Title";
			render(<ApiKeys title={customTitle} />);
			expect(screen.getByText(customTitle)).toBeInTheDocument();
		});

		it("displays different title for another user", () => {
			const otherUser: User = {
				email: "other.user@example.com",
				id: "other.user@example.com",
				admin: false,
				scan_orgs: [],
				features: {},
			};

			render(
				<ApiKeys user={otherUser} title={`API Keys - ${otherUser.email}`} />,
			);
			expect(
				screen.getByText(`API Keys - ${otherUser.email}`),
			).toBeInTheDocument();
		});
	});

	describe("key creation", () => {
		beforeEach(() => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			// Make sure the mock state has a valid self user with proper attributes
			if (!mockAppState.users) {
				mockAppState.users = {
					entities: {
						self: {
							id: "self",
							email: "self@example.com",
							admin: false,
							features: {},
							scan_orgs: [],
						},
					},
					ids: ["self"],
				};
			}
			// Reset mocks for each test
			jest.clearAllMocks();
			// Setup the client.addUserKey mock
			(client.addUserKey as jest.Mock).mockResolvedValue({
				key: "test-new-api-key-123",
			});
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it("should create a new API key and show it in a dialog", async () => {
			const { user } = render(<ApiKeys />);

			// Open add key dialog
			const addButton = screen.getByRole("button", { name: /add api key/i });
			await user.click(addButton);
			const dialog = await screen.findByRole("dialog", {
				name: /add new api key/i,
			});

			// Fill out the form
			const nameField = within(dialog).getByRole("textbox", { name: /name/i });
			await user.type(nameField, "My Test Key");

			const expiresField = within(dialog).getByRole("group", {
				name: /expires/i,
			});
			const futureDate = DateTime.now()
				.plus({ days: 10 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);
			await user.type(expiresField, futureDate);

			// Submit the form
			const addKeyButton = within(dialog).getByRole("button", { name: "Add" });
			await user.click(addKeyButton);

			// Check that the key is displayed
			await waitFor(() => {
				expect(
					screen.getByRole("dialog", { name: /api key added/i }),
				).toBeInTheDocument();
				expect(screen.getByText("test-new-api-key-123")).toBeInTheDocument();
				expect(
					screen.getByText(
						/this will be the only time this key will be displayed/i,
					),
				).toBeInTheDocument();
			});

			// Check for copy to clipboard button
			expect(
				screen.getByRole("button", { name: /copy to clipboard/i }),
			).toBeInTheDocument();

			// Verify API was called correctly
			expect(client.addUserKey).toHaveBeenCalledWith({
				url: "/users/self/keys",
				data: expect.objectContaining({
					name: "My Test Key",
					admin: false,
				}),
			});

			// Should dispatch getUserKeys to refresh the list
			expect(mockDispatch).toHaveBeenCalledWith(
				expect.objectContaining({
					type: expect.stringContaining("getUserKeys"),
				}),
			);
		});

		it("should handle API errors during key creation", async () => {
			// Override the mock to reject for this test only
			(client.addUserKey as jest.Mock).mockRejectedValueOnce(
				new Error("API Key creation failed"),
			);

			const { user } = render(<ApiKeys />);

			// Open add key dialog
			const addButton = screen.getByRole("button", { name: /add api key/i });
			await user.click(addButton);
			const dialog = await screen.findByRole("dialog", {
				name: /add new api key/i,
			});

			// Fill out the form
			const nameField = within(dialog).getByRole("textbox", { name: /name/i });
			await user.type(nameField, "My Test Key");

			const expiresField = within(dialog).getByRole("group", {
				name: /expires/i,
			});
			const futureDate = DateTime.now()
				.plus({ days: 10 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);
			await user.type(expiresField, futureDate);

			// Submit the form
			const addKeyButton = within(dialog).getByRole("button", { name: "Add" });
			await user.click(addKeyButton);

			// Should show error message
			await waitFor(() => {
				expect(
					screen.getByText(/API Key creation failed/i),
				).toBeInTheDocument();
			});
		});

		it("should create a key with admin privileges when admin checkbox is checked", async () => {
			// Setup a proper mock state with admin user
			mockAppState = {
				...mockAppState,
				users: {
					entities: {
						self: {
							id: "self",
							email: "self@example.com",
							admin: true, // This is what makes the admin checkbox appear
							features: {},
							scan_orgs: [],
						},
					},
					ids: ["self"],
				},
			};

			const { user } = render(<ApiKeys />);

			// Open add key dialog
			const addButton = screen.getByRole("button", { name: /add api key/i });
			await user.click(addButton);
			const dialog = await screen.findByRole("dialog", {
				name: /add new api key/i,
			});

			// Fill out the form
			const nameField = within(dialog).getByRole("textbox", { name: /name/i });
			await user.type(nameField, "Admin Test Key");

			// Since we properly set up the user as an admin, the checkbox should exist
			const adminCheckbox = within(dialog).getByRole("switch", {
				name: /create a user administrator api key/i,
			});
			await user.click(adminCheckbox);

			const expiresField = within(dialog).getByRole("group", {
				name: /expires/i,
			});
			const futureDate = DateTime.now()
				.plus({ days: 10 })
				.set({ second: 0, millisecond: 0 })
				.toFormat(DATE_FORMAT);
			await user.type(expiresField, futureDate);

			// Submit the form
			const addKeyButton = within(dialog).getByRole("button", { name: "Add" });
			await user.click(addKeyButton);

			// Check that the admin parameter was properly set to true in the API call
			await waitFor(() => {
				expect(client.addUserKey).toHaveBeenCalledWith(
					expect.objectContaining({
						url: "/users/self/keys",
						data: expect.objectContaining({
							admin: true, // Check that admin was set to true
						}),
					}),
				);
			});
		});
	});
});
