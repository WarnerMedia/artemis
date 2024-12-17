import { getDefaultNormalizer, render, screen, within } from "test-utils";
import { Settings } from "luxon";
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
import { mockStoreEmpty } from "../../../../testData/testMockData";
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
					}),
				).toBeInTheDocument();
			}

			const scopeField = screen.getByText(
				`Scope (${mockAppState.currentUser.entities.self.scope.length})`,
			);
			expect(scopeField).toBeInTheDocument();
			mockAppState.currentUser.entities.self.scope.forEach((scope: string) => {
				if (scopeField.parentElement) {
					expect(
						within(scopeField.parentElement).getByText(scope),
					).toBeInTheDocument();
				}
			});

			const scanOrgField = screen.getByText(
				`Scan Organizations (${mockAppState.currentUser.entities.self.scan_orgs.length})`,
			);
			expect(scanOrgField).toBeInTheDocument();
			mockAppState.currentUser.entities.self.scan_orgs.forEach(
				(org: string) => {
					if (scanOrgField.parentElement) {
						expect(
							within(scanOrgField.parentElement).getByText(org),
						).toBeInTheDocument();
					}
				},
			);

			// linked account functionality tested more thoroughly in LinkedAccounts.test.tsx
			// this just checks for existence on this page
			const accountsField = screen.getByText("Linked Accounts");
			expect(accountsField).toBeInTheDocument();
			if (accountsField.parentElement) {
				expect(
					within(accountsField.parentElement).getByRole("button", {
						name: "Link GitHub User",
					}),
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
							"long",
						),
						{ normalizer: getDefaultNormalizer({ collapseWhitespace: false }) },
					),
				).toBeInTheDocument();
			}

			const featuresField = screen.getByText("Features");
			expect(featuresField).toBeInTheDocument();
			for (const [feature, enabled] of Object.entries(
				mockAppState.currentUser.entities.self.features,
			)) {
				if (featuresField.parentElement) {
					// feature names are capitalized, so do a case-insensitive comparison
					const featureRe = new RegExp(feature, "i");
					const featureElt = within(featuresField.parentElement).getByText(
						featureRe,
					);
					expect(featureElt).toBeInTheDocument();
					// check whether feature enabled or disabled
					if (enabled) {
						if (featureElt.parentElement) {
							expect(featureElt.parentElement).not.toHaveAttribute(
								"aria-disabled",
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
							: "Standard",
					),
				).toBeInTheDocument();
			}
		});

		describe("show welcome message", () => {
			beforeEach(() => {
				localStorageSetItemSpy = jest.spyOn(
					window.localStorage.__proto__,
					"setItem",
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
						"checkbox",
					);
					expect(toggle).toBeInTheDocument();
					expect(toggle).toBeChecked();

					await user.click(toggle);
					expect(toggle).not.toBeChecked();
					expect(localStorageSetItemSpy).toHaveBeenCalledWith(
						STORAGE_LOCAL_WELCOME,
						"1",
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
						"checkbox",
					);
					expect(toggle).toBeInTheDocument();
					expect(toggle).toBeChecked();

					await user.click(toggle);
					expect(toggle).not.toBeChecked();
					expect(localStorageSetItemSpy).toHaveBeenCalledWith(
						STORAGE_LOCAL_WELCOME,
						"1",
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
						"checkbox",
					);
					expect(toggle).toBeInTheDocument();
					expect(toggle).not.toBeChecked();

					await user.click(toggle);
					expect(toggle).toBeChecked();
					expect(localStorageSetItemSpy).toHaveBeenCalledWith(
						STORAGE_LOCAL_WELCOME,
						"0",
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
							}),
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
						{ name: /teal/i },
					);
					expect(actionableRadio).toBeInTheDocument();
					expect(actionableRadio).not.toBeChecked();

					await user.click(actionableRadio);
					expect(mockDispatch).toHaveBeenCalledWith(setTheme("teal"));
				}
			});
		});
	});
});
