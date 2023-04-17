import {
	getDefaultNormalizer,
	render,
	screen,
	waitFor,
	within,
} from "test-utils";
import { DateTime, Settings } from "luxon";
import { formatDate } from "utils/formatters";
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
import { mockStoreApiKeys, mockStoreEmpty } from "../../../testData/testMockData";
import { deleteUserKey } from "features/keys/keysSlice";
import { STORAGE_LOCAL_WELCOME } from "app/globals";
import { themeColors } from "app/colors";
import { setTheme } from "features/theme/themeSlice";

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
let localStorageSetItemSpy: any;

const DATE_FORMAT = "yyyy/LL/dd HH:mm";

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
		global.window = Object.create(window);
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
		global.window = globalWindow;
	});

	it("page title should include 'user settings'", async () => {
		const globalWindow = global.window;
		global.window = Object.create(window);

		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<UserSettings />);

		const resultsTitle = await screen.findByText(/^User Information$/);
		expect(resultsTitle).toBeInTheDocument();

		// check the page title
		expect(global.window.document.title).toMatch("User Settings");
		global.window = globalWindow;
	});

	it("page updates location to remove search params", async () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		const pathname = "/settings";
		mockLocation = {
			pathname: pathname,
		};
		render(<UserSettings />);
		expect(mockNavigate).toHaveBeenCalledWith(pathname, { replace: true });
	});

	// back button functionality tested more thoroughly in BackButton.test.tsx
	// this just checks for existence on this page and expected behavior wrt account linking
	describe("back button", () => {
		it("page should have a back button", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<UserSettings />);
			expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
		});

		it("back button should not call fromRedirect if an auth code wasn't passed in the page URL", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<UserSettings />);
			const button = screen.getByRole("button", { name: "Back" });
			expect(button).toBeInTheDocument();

			await user.click(button);
			expect(mockNavigate).toBeCalledWith("/");
		});

		it("back button should call fromRedirect if an auth code is passed in the page URL", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const pathname = "/settings";
			mockLocation = {
				pathname: pathname,
				search: `?code=abcdef1023456789abcd`,
			};
			const { user } = render(<UserSettings />);
			const button = screen.getByRole("button", { name: "Back" });
			expect(button).toBeInTheDocument();

			await user.click(button);
			expect(mockNavigate).toHaveBeenCalledTimes(2);
			expect(mockNavigate).toHaveBeenNthCalledWith(1, pathname, {
				replace: true,
			});
			expect(mockNavigate).toHaveBeenNthCalledWith(2, -2);
		});
	});

	describe("user information", () => {
		it("should contain expected fields", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<UserSettings />);

			const emailField = screen.getByText("Email");
			expect(emailField).toBeInTheDocument();
			if (emailField.parentElement) {
				expect(
					within(emailField.parentElement).getByRole("link", {
						name: mockAppState.currentUser.entities.self.email,
					})
				).toBeInTheDocument();
			}

			const scopeField = screen.getByText(
				`Scope (${mockAppState.currentUser.entities.self.scope.length})`
			);
			expect(scopeField).toBeInTheDocument();
			mockAppState.currentUser.entities.self.scope.forEach((scope: string) => {
				if (scopeField.parentElement) {
					expect(
						within(scopeField.parentElement).getByText(scope)
					).toBeInTheDocument();
				}
			});

			const scanOrgField = screen.getByText(
				`Scan Organizations (${mockAppState.currentUser.entities.self.scan_orgs.length})`
			);
			expect(scanOrgField).toBeInTheDocument();
			mockAppState.currentUser.entities.self.scan_orgs.forEach(
				(org: string) => {
					if (scanOrgField.parentElement) {
						expect(
							within(scanOrgField.parentElement).getByText(org)
						).toBeInTheDocument();
					}
				}
			);

			// linked account functionality tested more thoroughly in LinkedAccounts.test.tsx
			// this just checks for existence on this page
			const accountsField = screen.getByText("Linked Accounts");
			expect(accountsField).toBeInTheDocument();
			if (accountsField.parentElement) {
				expect(
					within(accountsField.parentElement).getByRole("button", {
						name: "Link GitHub User",
					})
				).toBeInTheDocument();
			}

			const loginField = screen.getByText("Last Login");
			expect(loginField).toBeInTheDocument();
			if (loginField.parentElement) {
				// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
				// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
				// using: replace(/\s+/g, ' ')
				// causing the match to break
				// so don't collapseWhitespace in the normalizer for comparing dates here
				expect(
					within(loginField.parentElement).getByText(
						formatDate(
							mockAppState.currentUser.entities.self.last_login,
							"long"
						),
						{ normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }
					)
				).toBeInTheDocument();
			}

			const featuresField = screen.getByText("Features");
			expect(featuresField).toBeInTheDocument();
			for (const [feature, enabled] of Object.entries(
				mockAppState.currentUser.entities.self.features
			)) {
				if (featuresField.parentElement) {
					// feature names are capitalized, so do a case-insensitive comparison
					const featureRe = new RegExp(feature, "i");
					const featureElt = within(featuresField.parentElement).getByText(
						featureRe
					);
					expect(featureElt).toBeInTheDocument();
					// check whether feature enabled or disabled
					if (enabled) {
						if (featureElt.parentElement) {
							expect(featureElt.parentElement).not.toHaveAttribute(
								"aria-disabled"
							);
						}
					} else {
						if (featureElt.parentElement) {
							expect(featureElt.parentElement).toHaveAttribute("aria-disabled");
						}
					}
				}
			}

			const categoryField = screen.getByText("User Category");
			expect(categoryField).toBeInTheDocument();
			if (categoryField.parentElement) {
				expect(
					within(categoryField.parentElement).getByText(
						mockAppState.currentUser.entities.self.admin
							? "Administrator"
							: "Standard"
					)
				).toBeInTheDocument();
			}
		});

		describe("show welcome message", () => {
			beforeEach(() => {
				localStorageSetItemSpy = jest.spyOn(
					window.localStorage.__proto__,
					"setItem"
				);
			});
			afterEach(() => {
				localStorageSetItemSpy.mockRestore();
			});

			it("toggle is on if hide-welcome unset", async () => {
				localStorage.removeItem(STORAGE_LOCAL_WELCOME);
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UserSettings />);

				const welcomeField = screen.getByText("Show Welcome Message");
				expect(welcomeField).toBeInTheDocument();
				if (welcomeField.parentElement) {
					const toggle = within(welcomeField.parentElement).getByRole(
						"checkbox"
					);
					expect(toggle).toBeInTheDocument();
					expect(toggle).toBeChecked();

					await user.click(toggle);
					expect(toggle).not.toBeChecked();
					expect(localStorageSetItemSpy).toHaveBeenCalledWith(
						STORAGE_LOCAL_WELCOME,
						"1"
					);
				}
			});

			it("toggle is on if hide-welcome false", async () => {
				localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UserSettings />);

				const welcomeField = screen.getByText("Show Welcome Message");
				expect(welcomeField).toBeInTheDocument();
				if (welcomeField.parentElement) {
					const toggle = within(welcomeField.parentElement).getByRole(
						"checkbox"
					);
					expect(toggle).toBeInTheDocument();
					expect(toggle).toBeChecked();

					await user.click(toggle);
					expect(toggle).not.toBeChecked();
					expect(localStorageSetItemSpy).toHaveBeenCalledWith(
						STORAGE_LOCAL_WELCOME,
						"1"
					);
				}
			});

			it("toggle is off if hide-welcome true", async () => {
				localStorage.setItem(STORAGE_LOCAL_WELCOME, "1");
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UserSettings />);

				const welcomeField = screen.getByText("Show Welcome Message");
				expect(welcomeField).toBeInTheDocument();
				if (welcomeField.parentElement) {
					const toggle = within(welcomeField.parentElement).getByRole(
						"checkbox"
					);
					expect(toggle).toBeInTheDocument();
					expect(toggle).not.toBeChecked();

					await user.click(toggle);
					expect(toggle).toBeChecked();
					expect(localStorageSetItemSpy).toHaveBeenCalledWith(
						STORAGE_LOCAL_WELCOME,
						"0"
					);
				}
			});
		});

		describe("theme", () => {
			it("purple theme checked by default", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<UserSettings />);

				const themeField = screen.getByText("Theme");
				expect(themeField).toBeInTheDocument();
				if (themeField.parentElement) {
					const radio = within(themeField.parentElement).getByRole("radio", {
						name: /purple/i,
					});
					expect(radio).toBeInTheDocument();
					expect(radio).toBeChecked();
				}
			});

			it("displays options for all themes", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<UserSettings />);

				const themeField = screen.getByText("Theme");
				expect(themeField).toBeInTheDocument();
				if (themeField.parentElement) {
					for (const [, palette] of Object.entries(themeColors)) {
						expect(
							within(themeField.parentElement).getByRole("radio", {
								name: palette.displayName,
							})
						).toBeInTheDocument();
					}
				}
			});

			it("dispatches theme when a different theme is clicked", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				mockAppState.theme.name = "prism";
				const { user } = render(<UserSettings />);

				const themeField = screen.getByText("Theme");
				expect(themeField).toBeInTheDocument();
				if (themeField.parentElement) {
					const radio = within(themeField.parentElement).getByRole("radio", {
						name: /prism/i,
					});
					expect(radio).toBeInTheDocument();
					expect(radio).toBeChecked();

					const actionableRadio = within(themeField.parentElement).getByRole(
						"radio",
						{ name: /teal/i }
					);
					expect(actionableRadio).toBeInTheDocument();
					expect(actionableRadio).not.toBeChecked();

					await user.click(actionableRadio);
					expect(mockDispatch).toHaveBeenCalledWith(setTheme("teal"));
				}
			});
		});
	});

	describe("API keys component", () => {
		describe("no API keys", () => {
			it("should display no results message", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<UserSettings />);
				expect(screen.getByText(/no api keys found/i)).toBeInTheDocument();
			});

			it("should display the Add API key FAB", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<UserSettings />);
				const string = "Add API key";
				expect(
					screen.getByRole("button", { name: string })
				).toBeInTheDocument();
			});
		});

		describe("API key list", () => {
			it("should display the Add User FAB", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
				render(<UserSettings />);
				const string = "Add API key";
				expect(
					screen.getByRole("button", { name: string })
				).toBeInTheDocument();
			});

			describe("table tests", () => {
				it("should not display no results message", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
					render(<UserSettings />);
					expect(
						screen.queryByText(/no api keys found/i)
					).not.toBeInTheDocument();
				});

				it("displays expected table columns", () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreApiKeys));
					render(<UserSettings />);
					expect(
						screen.getByRole("columnheader", { name: /name/i })
					).toBeInTheDocument();
					expect(
						screen.getByRole("columnheader", { name: /scope/i })
					).toBeInTheDocument();
					expect(
						screen.getByRole("columnheader", { name: /created/i })
					).toBeInTheDocument();
					expect(
						screen.getByRole("columnheader", { name: /expires/i })
					).toBeInTheDocument();
					expect(
						screen.getByRole("columnheader", { name: /last used/i })
					).toBeInTheDocument();
					expect(
						screen.getByRole("columnheader", { name: /actions/i })
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
								screen.getByText(`Remove API key named "${name}"?`)
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
							})
						);

						// collapsible row should be collapsed
						await waitFor(() => {
							expect(
								screen.queryByText(`Remove API key named "${name}"?`)
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
								screen.getByText(`Remove API key named "${name}"?`)
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
							})
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
								screen.queryByRole("dialog", { name: "Add New API Key" })
							).toBeInTheDocument();
						});

						const dialog = screen.getByRole("dialog", {
							name: "Add New API Key",
						});

						expect(
							within(dialog).queryByText("Features")
						).not.toBeInTheDocument();
						expect(
							within(dialog).queryByLabelText("Snyk Vulnerability Plugin")
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
								screen.queryByRole("dialog", { name: "Add New API Key" })
							).toBeInTheDocument();
						});

						const dialog = screen.getByRole("dialog", {
							name: "Add New API Key",
						});

						expect(
							within(dialog).queryByText("Features")
						).not.toBeInTheDocument();
						expect(
							within(dialog).queryByLabelText("Snyk Vulnerability Plugin")
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
								screen.queryByRole("dialog", { name: "Add New API Key" })
							).toBeInTheDocument();
						});

						const dialog = screen.getByRole("dialog", {
							name: "Add New API Key",
						});

						if (process.env.REACT_APP_AQUA_ENABLED === "true") {
							console.log("Snyk feature enabled, testing it is enabled...");
							expect(within(dialog).getByText("Features")).toBeInTheDocument();
							expect(
								within(dialog).getByLabelText("Snyk Vulnerability Plugin")
							).toBeInTheDocument();
						} else {
							console.log("Snyk feature disabled, testing it is disabled...");
							expect(
								within(dialog).queryByText("Features")
							).not.toBeInTheDocument();
							expect(
								within(dialog).queryByLabelText("Snyk Vulnerability Plugin")
							).not.toBeInTheDocument();
						}
					});
				});
			});
		});

		describe("API key add", () => {
			it("Name field required", async () => {
				const error =
					"This form contains unresolved errors. Please resolve these errors";

				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UserSettings />);

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
				const expiresField = within(dialog).getByRole("textbox", {
					name: /expires \(optional\)/i,
				});
				await user.click(expiresField);

				await within(dialog).findByText("Required");
				expect(addKeyButton).toBeDisabled();
				within(dialog).getByText(error);

				await user.type(nameField, "testme");
				await user.click(expiresField);
				expect(within(dialog).queryByText("Required")).not.toBeInTheDocument();
				expect(addKeyButton).not.toBeDisabled();
				expect(within(dialog).queryByText(error)).not.toBeInTheDocument();
			});

			it("Expires field must be in the future", async () => {
				const error =
					"This form contains unresolved errors. Please resolve these errors";

				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<UserSettings />);

				const addButton = screen.getByRole("button", { name: /add api key/i });
				await user.click(addButton);
				const dialog = await screen.findByRole("dialog", {
					name: /add new api key/i,
				});

				const nameField = within(dialog).getByRole("textbox", {
					name: /name/i,
				});
				await user.type(nameField, "testme");

				const expiresField = within(dialog).getByRole("textbox", {
					name: /expires \(optional\)/i,
				});
				const pastDate = DateTime.now()
					.minus({ days: 10 })
					.set({ second: 0, millisecond: 0 })
					.toFormat(DATE_FORMAT);
				await user.type(expiresField, pastDate);

				const addKeyButton = within(dialog).getByRole("button", {
					name: "Add",
				});

				await within(dialog).findByText("Must be a future date");
				expect(addKeyButton).toBeDisabled();
				within(dialog).getByText(error);

				const futureDate = DateTime.now()
					.plus({ days: 10 })
					.set({ second: 0, millisecond: 0 })
					.toFormat(DATE_FORMAT);
				await user.clear(expiresField);
				await user.type(expiresField, futureDate);
				await waitFor(() =>
					expect(expiresField).toHaveDisplayValue(futureDate)
				);
				expect(
					within(dialog).queryByText("Must be a future date")
				).not.toBeInTheDocument();
				expect(addKeyButton).not.toBeDisabled();
				expect(within(dialog).queryByText(error)).not.toBeInTheDocument();
			});

			describe("API current scope validation", () => {
				const errorDuplicate = "Duplicate scope";
				// default message when there is no error
				const errorNone =
					"Click + icon to add this value to the Current Scope list above";
				const errorMissing = "At least 1 scope is required";
				const errorAbandoned =
					"This value has not been added to the Current Scope list above. Either click the + icon to add it or the X icon to clear the field";
				const errorInvalid =
					"Scope value not within user's scan organizations or does not end with /repo or /path_name_pattern";
				const errorMissingRepo =
					"No repository or path name pattern supplied after scan organization prefix";

				it("Scan organization help lists scan organizations", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					const scopeList = within(dialog).getByRole("list", { hidden: true });
					mockAppState.currentUser.entities.self.scan_orgs.forEach(
						(org: string) => {
							within(scopeList).getByText(org);
						}
					);

					const scopeHelpButton = within(dialog).getByRole("button", {
						name: /what are my scan organizations/i,
					});
					await user.click(scopeHelpButton);
					await within(dialog).findByRole("list", { hidden: true });
				});

				it("Duplicate * scope", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// try * scope, should get a validation error this is a duplicate since field defaults to this value
					await user.type(addScopeField, "*");
					await within(dialog).findByText(errorDuplicate);
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).toBeDisabled();

					const clearNewScopeButton = within(dialog).getByRole("button", {
						name: /clear/i,
					});
					await user.click(clearNewScopeButton);

					await waitFor(() => expect(addScopeField).toHaveDisplayValue(""));

					// remove default scope
					const removeScopeItem = within(dialog).getByRole("button", {
						name: /remove this scope item/i,
					});
					await user.click(removeScopeItem);

					// check it's removed and now there's an error about 1 scope required
					await waitFor(() => expect(removeScopeItem).not.toBeInTheDocument);
					await within(dialog).findByText(errorMissing);

					// we should be able to enter * as a valid scope value
					await user.type(addScopeField, "*");
					await within(dialog).findByText(errorNone); // no error
					expect(addNewScopeButton).not.toBeDisabled();
					await user.click(addNewScopeButton);
					// scope should be added, check for it's remove button to re-appear
					await within(dialog).findByRole("button", {
						name: /remove this scope item/i,
					});
				});

				it("Leaving a scope unsaved generates an error", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// enter a single valid scope from user's scan_orgs
					await user.type(
						addScopeField,
						`${mockAppState.currentUser.entities.self.scan_orgs[0]}/*`
					);
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).not.toBeDisabled();

					// move to next form field, should generate an error that scope value was not saved
					const expiresField = within(dialog).getByRole("textbox", {
						name: /expires \(optional\)/i,
					});
					await user.click(expiresField);

					await within(dialog).findByText(errorAbandoned);
				});

				it("Multiple valid scopes can be entered separated by comma, space, newline", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					// starts with 1 scope for *
					expect(
						within(dialog).getAllByRole("button", {
							name: /remove this scope item/i,
						})
					).toHaveLength(1);

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// enter 5 additional scopes from user's scan_orgs, separated by space, comma, comma+space, & newline
					await user.type(
						addScopeField,
						`${mockAppState.currentUser.entities.self.scan_orgs[0]}/* ${mockAppState.currentUser.entities.self.scan_orgs[1]}/*,${mockAppState.currentUser.entities.self.scan_orgs[2]}/*, ${mockAppState.currentUser.entities.self.scan_orgs[3]}/*{enter}${mockAppState.currentUser.entities.self.scan_orgs[4]}/*`
					);
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).not.toBeDisabled();
					await user.click(addNewScopeButton);

					// should have 6 scopes now, original (*) + 5 more just entered
					await waitFor(() =>
						expect(
							within(dialog).getAllByRole("button", {
								name: /remove this scope item/i,
							})
						).toHaveLength(6)
					);
				});

				it("New scope outside user scan orgs generates an error", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// test invalid scope value
					await user.type(addScopeField, "testme");
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).toBeDisabled();
					await within(dialog).findByText(errorInvalid);
				});

				it("New scope doesn't contain a slash (/) separator after scan organization", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// test invalid scope value
					await user.type(
						addScopeField,
						`${mockAppState.currentUser.entities.self.scan_orgs[0]}`
					);
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).toBeDisabled();
					await within(dialog).findByText(errorInvalid);
				});

				it("New scope doesn't contain a repo or pather pattern after scan organization", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// test invalid scope value
					await user.type(
						addScopeField,
						`${mockAppState.currentUser.entities.self.scan_orgs[0]}/`
					);
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).toBeDisabled();
					await within(dialog).findByText(errorMissingRepo);
				});

				it("New scope invalid if a single scope within multiple scopes fails validation", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// start with no form errors
					expect(within(dialog).getByText(errorNone)).toBeInTheDocument();

					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});

					// 1st and 3rd scopes are valid, 2nd (middle) scope is invalid
					await user.type(
						addScopeField,
						`${mockAppState.currentUser.entities.self.scan_orgs[0]}/* invalid-scope ${mockAppState.currentUser.entities.self.scan_orgs[1]}/*`
					);
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).toBeDisabled();
					await within(dialog).findByText(errorInvalid);
				});

				it("Copy-to-clipboard should appear when there are scopes", async () => {
					const globalWindow = global.window;
					global.window = Object.create(window);
					global.scrollTo = jest.fn();
					document.execCommand = jest.fn((commandId, showUI, value) => true);

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<UserSettings />);

					const addButton = screen.getByRole("button", {
						name: /add api key/i,
					});
					await user.click(addButton);
					const dialog = await screen.findByRole("dialog", {
						name: /add new api key/i,
					});

					// initial scope exists, copy-to-clipboard button should exist
					const copyString = "Copy to clipboard";
					let copyButton: HTMLElement | null = within(dialog).getByRole(
						"button",
						{
							name: copyString,
						}
					);
					expect(copyButton).toBeInTheDocument();
					await user.click(copyButton);
					expect(document.execCommand).toHaveBeenCalledWith("copy");

					// remove default scope
					const removeScopeItem = within(dialog).getByRole("button", {
						name: /remove this scope item/i,
					});
					await user.click(removeScopeItem);

					// check it's removed and now there's an error about 1 scope required
					await waitFor(() => expect(removeScopeItem).not.toBeInTheDocument);
					await within(dialog).findByText(errorMissing);

					// copy-to-clipboard button should be removed
					copyButton = within(dialog).queryByRole("button", {
						name: copyString,
					});
					expect(copyButton).not.toBeInTheDocument();

					// we should now be able to enter * as a valid scope value
					const addScopeField = within(dialog).getByRole("textbox", {
						name: /add scope/i,
					});
					await user.type(addScopeField, "*");
					await within(dialog).findByText(errorNone); // no error
					const addNewScopeButton = within(dialog).getByRole("button", {
						name: /add this item to scope/i,
					});
					expect(addNewScopeButton).not.toBeDisabled();
					await user.click(addNewScopeButton);
					// scope should be added, check for it's remove button to re-appear
					await within(dialog).findByRole("button", {
						name: /remove this scope item/i,
					});

					// now that a scope has been added the copy-to-clipboard option should be visible
					copyButton = within(dialog).getByRole("button", {
						name: copyString,
					});
					expect(copyButton).toBeInTheDocument();

					global.window = globalWindow;
				});
			});
		});
	});
});
