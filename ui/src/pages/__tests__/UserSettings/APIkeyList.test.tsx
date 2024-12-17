import { render, screen, waitFor, within } from "test-utils";
import { Settings } from "luxon";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
	...(jest.requireActual("react-router-dom") as any),
	__esModule: true,
	useNavigate: jest.fn(),
	useLocation: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import UserSettings from "pages/UserSettings";
import {
	mockStoreApiKeys,
	mockStoreEmpty,
} from "../../../../testData/testMockData";
import { deleteUserKey } from "features/keys/keysSlice";
import { STORAGE_LOCAL_WELCOME } from "app/globals";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

const mockUseLocation = useLocation as jest.Mock;
const mockUseNavigate = useNavigate as jest.Mock;
const mockNavigate = jest.fn();
let mockHistory: any[] = [];
let globalWindow: any;
let mockLocation: any;

let origHideWelcome: string | null;

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
	origHideWelcome = localStorage.getItem(STORAGE_LOCAL_WELCOME);
});
afterAll(() => {
	if (origHideWelcome) {
		localStorage.setItem(STORAGE_LOCAL_WELCOME, origHideWelcome);
	} else {
		localStorage.removeItem(STORAGE_LOCAL_WELCOME);
	}
});

describe("UserSettings component", () => {
	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
		mockUseNavigate.mockImplementation(() => mockNavigate);
		mockUseLocation.mockImplementation(() => {
			return mockLocation;
		});
		globalWindow = global.window;
		global.window ??= Object.create(window);
		Object.defineProperty(window, "history", {
			get() {
				return mockHistory;
			},
		});
		mockLocation = {
			pathname: "/settings",
			search: "",
		};
	});
	afterEach(() => {
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
		mockUseLocation.mockClear();
		mockUseNavigate.mockClear();
		mockNavigate.mockClear();
		global.window ??= globalWindow;
	});
	describe("API keys component", () => {
		describe("API key list", () => {
			it("should display the Add User FAB", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
				render(<UserSettings />);
				const string = "Add API key";
				expect(
					screen.getByRole("button", { name: string }),
				).toBeInTheDocument();
			});

			describe("table tests", () => {
				it("should not display no results message", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
					render(<UserSettings />);
					expect(
						screen.queryByText(/no api keys found/i),
					).not.toBeInTheDocument();
				});

				it("displays expected table columns", () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
					render(<UserSettings />);
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

				describe("table actions", () => {
					jest.setTimeout(60000);

					it("cancelling a delete should not remove an API key", async () => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
						const id = mockAppState.keys.ids[0];
						const name = mockAppState.keys.entities[id]?.name ?? "";
						const { user } = render(<UserSettings />);
						const string = "Remove API key";
						const deleteButton = screen.getByRole("button", { name: string });
						expect(deleteButton).toBeInTheDocument();

						await user.click(deleteButton);
						await waitFor(() => {
							expect(
								screen.getByText(`Remove API key named "${name}"?`),
							).toBeInTheDocument();
						});

						const cancelButton = screen.getByRole("button", { name: "Cancel" });
						expect(cancelButton).toBeInTheDocument();
						const confirmDelete = screen.getByRole("button", {
							name: "Remove",
						});
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
						mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
						const id = mockAppState.keys.ids[0];
						const name = mockAppState.keys.entities[id]?.name ?? "";
						const { user } = render(<UserSettings />);
						const string = "Remove API key";
						const deleteButton = screen.getByRole("button", { name: string });
						expect(deleteButton).toBeInTheDocument();

						await user.click(deleteButton);
						await waitFor(() => {
							expect(
								screen.getByText(`Remove API key named "${name}"?`),
							).toBeInTheDocument();
						});

						const cancelButton = screen.getByRole("button", { name: "Cancel" });
						expect(cancelButton).toBeInTheDocument();
						const confirmDelete = screen.getByRole("button", {
							name: "Remove",
						});
						expect(confirmDelete).toBeInTheDocument();

						// cancelling a deletion should not remove the item
						await user.click(confirmDelete);
						expect(mockDispatch).toHaveBeenCalledWith(
							deleteUserKey({
								url: `/users/self/keys/${id}`,
							}),
						);
					});
				});

				describe("API key features match user features", () => {
					it("Snyk unavailable does not display API key Snyk feature option", async () => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].features = {}; // empty features
						const { user } = render(<UserSettings />);

						const addButton = screen.getByRole("button", {
							name: "Add API key",
						});
						expect(addButton).toBeInTheDocument();
						await user.click(addButton);

						await waitFor(() => {
							expect(
								screen.queryByRole("dialog", { name: "Add New API Key" }),
							).toBeInTheDocument();
						});

						const dialog = screen.getByRole("dialog", {
							name: "Add New API Key",
						});

						expect(
							within(dialog).queryByText("Features"),
						).not.toBeInTheDocument();
						expect(
							within(dialog).queryByLabelText("Snyk Vulnerability Plugin"),
						).not.toBeInTheDocument();
					});

					it("Snyk false does not display API key Snyk feature option", async () => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].features = {
							snyk: false,
						}; // snyk off
						const { user } = render(<UserSettings />);

						const addButton = screen.getByRole("button", {
							name: "Add API key",
						});
						expect(addButton).toBeInTheDocument();
						await user.click(addButton);

						await waitFor(() => {
							expect(
								screen.queryByRole("dialog", { name: "Add New API Key" }),
							).toBeInTheDocument();
						});

						const dialog = screen.getByRole("dialog", {
							name: "Add New API Key",
						});

						expect(
							within(dialog).queryByText("Features"),
						).not.toBeInTheDocument();
						expect(
							within(dialog).queryByLabelText("Snyk Vulnerability Plugin"),
						).not.toBeInTheDocument();
					});

					it("Snyk true displays API key Snyk feature option if Snyk enabled", async () => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].features = { snyk: true }; // snyk on
						const { user } = render(<UserSettings />);

						const addButton = screen.getByRole("button", {
							name: "Add API key",
						});
						expect(addButton).toBeInTheDocument();
						await user.click(addButton);

						await waitFor(() => {
							expect(
								screen.queryByRole("dialog", { name: "Add New API Key" }),
							).toBeInTheDocument();
						});

						const dialog = screen.getByRole("dialog", {
							name: "Add New API Key",
						});

						if (process.env.REACT_APP_AQUA_ENABLED === "true") {
							console.log("Snyk feature enabled, testing it is enabled...");
							expect(within(dialog).getByText("Features")).toBeInTheDocument();
							expect(
								within(dialog).getByLabelText("Snyk Vulnerability Plugin"),
							).toBeInTheDocument();
						} else {
							console.log("Snyk feature disabled, testing it is disabled...");
							expect(
								within(dialog).queryByText("Features"),
							).not.toBeInTheDocument();
							expect(
								within(dialog).queryByLabelText("Snyk Vulnerability Plugin"),
							).not.toBeInTheDocument();
						}
					});
				});
			});
		});
	});
});
