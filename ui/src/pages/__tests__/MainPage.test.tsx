import { fireEvent, render, screen, waitFor, within } from "test-utils";
import MainPage, { startScan } from "pages/MainPage";
import { APP_DEMO_USER_REPO, APP_DEMO_USER_VCSORG } from "app/globals";
import {
	AnalysisReport,
	MAX_PATH_LENGTH,
	ScanOptionsForm,
} from "features/scans/scansSchemas";

jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
	...(jest.requireActual("react-router-dom") as any),
	__esModule: true,
	useLocation: jest.fn(),
	useNavigate: jest.fn(),
}));
jest.mock("api/client", () => ({
	...(jest.requireActual("api/client") as any),
	__esModule: true,
	handleException: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
/* eslint-disable */
import { useLocation, useNavigate } from "react-router-dom";
import {
	mockStoreEmpty,
	mockStoreScanId,
	mockStoreSingleScan,
} from "../../../testData/testMockData";
import { STORAGE_LOCAL_WELCOME } from "app/globals";
import store from "app/store";
import { addScan, getScanHistory } from "features/scans/scansSlice";
import { pluginCatalog, sbomPlugins } from "app/scanPlugins";
import { User } from "features/users/usersSchemas";
import { handleException } from "api/client";

let mockAppState: any;
let mockLocation: any;
let mockHistory: any[] = [];
let globalWindow: any;
const mockUseLocation = useLocation as jest.Mock;
const mockUseNavigate = useNavigate as jest.Mock;
const mockNavigate = jest.fn();
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

let origHideWelcome: string | null;
let localStorageSetItemSpy: any;

describe("MainPage component", () => {
	jest.setTimeout(120000);

	beforeAll(() => {
		origHideWelcome = localStorage.getItem(STORAGE_LOCAL_WELCOME);
	});
	afterAll(() => {
		if (origHideWelcome) {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, origHideWelcome);
		} else {
			localStorage.removeItem(STORAGE_LOCAL_WELCOME);
		}
	});

	beforeEach(() => {
		mockUseLocation.mockImplementation(() => {
			return mockLocation;
		});
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
		localStorageSetItemSpy = jest.spyOn(
			window.localStorage.__proto__,
			"setItem"
		);
		mockLocation = {
			search: "",
		};
		mockUseNavigate.mockImplementation(() => mockNavigate);
		globalWindow = global.window;
		global.window ??= Object.create(window);
		Object.defineProperty(window, "history", {
			get() {
				return mockHistory;
			},
		});
	});
	afterEach(() => {
		mockLocation = "";
		mockUseLocation.mockClear();
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
		mockUseNavigate.mockClear();
		mockNavigate.mockClear();
		global.window ??= globalWindow;
		localStorageSetItemSpy.mockRestore();
	});

	describe("WelcomeDialog", () => {
		test("hide-welcome unset, should display welcome dialog", async () => {
			localStorage.removeItem(STORAGE_LOCAL_WELCOME);
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
		});

		test("hide-welcome off, should display welcome dialog", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
		});

		test("value false if welcome dialog closed with 'don't show' option unchecked", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
			await user.click(screen.getByRole("button", { name: /ok/i }));

			// no change to hide-welcome setting
			expect(localStorageSetItemSpy).toHaveBeenCalledWith(
				STORAGE_LOCAL_WELCOME,
				"0"
			);
		});

		test("value true if welcome dialog closed with 'don't show' option checked", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
			await user.click(
				screen.getByRole("checkbox", { name: /don't show this dialog/i })
			);
			await user.click(screen.getByRole("button", { name: /ok/i }));

			// hide-welcome setting changed to true
			expect(localStorageSetItemSpy).toHaveBeenCalledWith(
				STORAGE_LOCAL_WELCOME,
				"1"
			);
		});

		test("hide-welcome on, should not display welcome dialog", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);

			// no welcome dialog
			expect(
				screen.queryByRole("heading", { name: /welcome to artemis/i })
			).not.toBeInTheDocument();
		});
	});

	describe("Skip WelcomeDialog", () => {
		beforeAll(() => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1"); // hide welcome dialog
		});

		test("contains a header", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);
			expect(
				screen.getByRole("heading", { name: /scan information/i })
			).toBeInTheDocument();
		});

		test("vcs field loads options", async () => {
			jest.useFakeTimers();
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			mockAppState.currentUser.status = "loading";

			const { rerender, user } = render(<MainPage />, null, {
				advanceTimers: jest.advanceTimersByTime,
			});
			// initial field state
			const initialField = screen.getByLabelText(/loading options/i);
			expect(initialField).toBeInTheDocument();
			expect(initialField).toBeDisabled();
			expect(initialField).not.toHaveFocus();

			// user now loaded
			mockAppState.currentUser.status = "succeeded";
			rerender(<MainPage />);
			jest.runOnlyPendingTimers();

			// after options loaded
			// findBy* = async
			const loadedField = await screen.findByRole("combobox", {
				name: "Version Control System",
			});
			expect(loadedField).toBeInTheDocument();
			expect(loadedField).toBeEnabled();
			expect(loadedField).toHaveFocus(); // first form element focused

			// user clicks next field without entering a value for vcs field
			await user.click(loadedField);
			await user.tab();

			// should generate a validation error vcs field required
			const validationErrors = await screen.findByText("Required");
			expect(validationErrors).toBeInTheDocument();

			// actions should be disabled
			screen.getByRole("button", { name: /start scan/i });

			jest.useRealTimers();
		});

		test("onboarding link exists", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<MainPage />);

			// 1. onboarding link appears when form first loaded
			const onboardingLink = screen.getByRole("link", {
				name: "Missing an option? Request access",
			});
			expect(onboardingLink).toBeInTheDocument();

			// 2. onboarding link remains there are no vcs validation errors
			await screen.findByRole("combobox", { name: "Version Control System" });
			const loadedField = screen.getByRole("combobox", {
				name: "Version Control System",
			});
			expect(loadedField).toBeInTheDocument();
			expect(loadedField).toBeEnabled();
			await user.type(
				loadedField,
				`${mockAppState.currentUser.entities["self"].scan_orgs[2]}{enter}`
			);

			// user clicks next field after entering a valid value for vcs field
			await user.click(screen.getByRole("textbox", { name: "Repository" }));

			// there should be no validation errors
			expect(screen.queryByText("Required")).not.toBeInTheDocument();

			expect(onboardingLink).toBeInTheDocument();

			// 3. onboarding link should remain when there are vcs validation errors
			await user.click(loadedField);
			await user.clear(loadedField);
			await user.click(screen.getByRole("textbox", { name: "Repository" }));
			await screen.findAllByText("Required");

			expect(onboardingLink).toBeInTheDocument();
		});

		test("For users with demo-only scope, the demo repo is prepopulated in the form, and the button is live.", async () => {
			// setup a currentUser which has only demo scope
			const demoOnly = {
				scan_orgs: [APP_DEMO_USER_VCSORG],
				email: "DemoOnly@example.com",
				last_login: "2021-03-28T19:23:41+00:00",
				admin: false,
				scope: [`${APP_DEMO_USER_VCSORG}/${APP_DEMO_USER_REPO}`],
				features: { feature1: true, feature2: false },
				id: "self",
			};

			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			mockAppState.currentUser.entities.self = demoOnly;
			// ensure user data is loaded so we have the current user's scope(s)
			mockAppState.currentUser.status = "succeeded";
			render(<MainPage />);

			// wait for form to render
			await screen.findByRole("combobox", { name: "Version Control System" });

			// get the inputs, and assert they have the demo values prepopulated
			expect(
				screen.getByRole("combobox", {
					name: "Version Control System",
				})
			).toHaveValue(APP_DEMO_USER_VCSORG);

			expect(screen.getByLabelText("Repository")).toHaveValue(
				APP_DEMO_USER_REPO
			);

			// assert the button is live
			const startScanButton = screen.getByRole("button", {
				name: /start scan/i,
			});

			expect(startScanButton).not.toBeDisabled();
		});
	});

	describe("Page titles", () => {
		beforeAll(() => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1"); // hide welcome dialog
		});

		describe("Form submission", () => {
			test("Title is Artemis before form is submitted", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				expect(global.window.document.title).toMatch("Artemis");
			});

			test("Title contains repo when vcsOrg does not contain an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				const vcsOrg = "goodVcs.goodOrg.com";
				const repo = "org/repo";
				await user.type(vcsField, `${vcsOrg}{enter}`);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				await user.type(repoField, repo);

				const viewScansButton = screen.getByRole("button", {
					name: /view scans/i,
				});
				await user.click(viewScansButton);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(`Artemis: ${repo}`)
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						})
					)
				);

				await waitFor(() =>
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/?repo=${encodeURIComponent(
							repo
						)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
						{ replace: true }
					)
				);
			});

			test("Title contains org/repo name when vcsOrg contains an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				const vcsOrg = "goodVcs/goodOrg";
				const repo = "repo";
				await user.type(vcsField, `${vcsOrg}{enter}`);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				await user.type(repoField, repo);

				const viewScansButton = screen.getByRole("button", {
					name: /view scans/i,
				});
				await user.click(viewScansButton);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`Artemis: ${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`
					)
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						})
					)
				);

				await waitFor(() =>
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/?repo=${encodeURIComponent(
							repo
						)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
						{ replace: true }
					)
				);
			});

			test("Title contains org/repo name when vcsOrg contains path with an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				const vcsOrg = "goodVcs/goodOrg/org/path";
				const repo = "repo";
				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				await user.type(vcsField, `${vcsOrg}{enter}`);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				await user.type(repoField, repo);

				const viewScansButton = screen.getByRole("button", {
					name: /view scans/i,
				});
				await user.click(viewScansButton);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`
					)
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						})
					)
				);

				await waitFor(() =>
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/?repo=${encodeURIComponent(
							repo
						)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
						{ replace: true }
					)
				);
			});
		});

		describe("URL query params", () => {
			test("Title contains repo when vcsOrg does not contain an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const vcsOrg = "goodVcs.goodOrg.com";
				const repo = "org/repo";
				mockLocation = {
					search: `?repo=${encodeURIComponent(
						repo
					)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				};
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				expect(vcsField).toHaveDisplayValue(vcsOrg);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				expect(repoField).toHaveDisplayValue(repo);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(`Artemis: ${repo}`)
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						})
					)
				);
			});

			test("Title contains org/repo name when vcsOrg contains an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const vcsOrg = "goodVcs/goodOrg";
				const repo = "repo";
				mockLocation = {
					search: `?repo=${encodeURIComponent(
						repo
					)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				};
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				expect(vcsField).toHaveDisplayValue(vcsOrg);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				expect(repoField).toHaveDisplayValue(repo);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`Artemis: ${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`
					)
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						})
					)
				);
			});

			test("Title contains org/repo name when vcsOrg contains path with an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const vcsOrg = "goodVcs/goodOrg/org/path";
				const repo = "repo";
				mockLocation = {
					search: `?repo=${encodeURIComponent(
						repo
					)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				};
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/)
					).not.toBeInTheDocument()
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				expect(vcsField).toHaveDisplayValue(vcsOrg);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				expect(repoField).toHaveDisplayValue(repo);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`
					)
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						})
					)
				);
			});
		});
	});

	describe("Scan features", () => {
		let user: any;
		let optionsRegion: HTMLElement;

		beforeAll(() => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1"); // hide welcome dialog
		});

		beforeEach(async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const renderOpts = render(<MainPage />);
			user = renderOpts.user;

			// wait for current user info to load
			await waitFor(() =>
				expect(screen.queryByText(/^loading options$/)).not.toBeInTheDocument()
			);

			const optionsAccordion = screen.getByRole("button", {
				name: /new scan options/i,
			});
			await user.click(optionsAccordion);

			optionsRegion = screen.getByRole("region", {
				name: /new scan options/i,
			});
		});

		test("all scan categories except sbom enabled by default", async () => {
			// check each scan category and plugins enabled (disabled for sbom)
			for (const [name, values] of Object.entries(pluginCatalog)) {
				if (sbomPlugins.length === 0 && name === "sbom") {
					continue;
				}

				const categoryCheckbox = within(optionsRegion).getByRole("checkbox", {
					name: values.displayName,
				});
				// all categories should be checked by default except sbom
				if (name === "sbom") {
					expect(categoryCheckbox).not.toBeChecked();
				} else {
					expect(categoryCheckbox).toBeChecked();
				}
			}
		});

		const pluginsToTest = [
			["secret", "enabled"],
			["static_analysis", "enabled"],
			["inventory", "enabled"],
			["vulnerability", "enabled"],
		];
		if (sbomPlugins.length > 0) {
			pluginsToTest.push(["sbom", "disabled"]);
		}

		test.each(pluginsToTest)(
			"all %p plugins %p by default",
			async (category, enabled) => {
				// expand plugin accordion
				const pluginAccordion = within(optionsRegion).getByRole("button", {
					name: `Show ${pluginCatalog[category].displayName} plugins`,
				});
				await user.click(pluginAccordion);
				// region name changed since accordion expanded
				const pluginsRegion = within(optionsRegion).getByRole("region", {
					name: `Hide ${pluginCatalog[category].displayName} plugins`,
				});

				// ensure all plugin checkbox states match category
				pluginCatalog[category].plugins.forEach((plugin) => {
					const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
						name: plugin.displayName,
					});
					if (enabled === "enabled" && plugin.apiName !== "nodejsscan") {
						expect(pluginCheckbox).toBeChecked();
					} else {
						expect(pluginCheckbox).not.toBeChecked();
					}
				});
			}
		);

		test("if all scan categories and plugins disabled, display error", async () => {
			// disable all scan categories
			expect(
				within(optionsRegion).queryByText(
					/at least one scan feature or plugin must be enabled/i
				)
			).not.toBeInTheDocument();

			for (const [name, values] of Object.entries(pluginCatalog)) {
				if (sbomPlugins.length === 0 && name === "sbom") {
					continue;
				}

				const categoryCheckbox = within(optionsRegion).getByRole("checkbox", {
					name: values.displayName,
				});
				// all categories should be checked by default except sbom
				if (name !== "sbom") {
					expect(categoryCheckbox).toBeChecked();
					await user.click(categoryCheckbox);
					expect(categoryCheckbox).not.toBeChecked();
				}
			}

			const commitHistory = within(optionsRegion).getByRole("spinbutton", {
				name: /commit history \(optional\)/i,
			});
			await user.click(commitHistory);
			await waitFor(() => {
				expect(
					within(optionsRegion).getByText(
						/at least one scan feature or plugin must be enabled/i
					)
				).toBeInTheDocument();
			});

			const category = Object.keys(pluginCatalog)[0];

			// enable single plugin to clear error
			const pluginAccordion = within(optionsRegion).getByRole("button", {
				name: `Show ${pluginCatalog[category].displayName} plugins`,
			});
			await user.click(pluginAccordion);
			// region name changed since accordion expanded
			const pluginsRegion = within(optionsRegion).getByRole("region", {
				name: `Hide ${pluginCatalog[category].displayName} plugins`,
			});

			const plugin = pluginCatalog[category].plugins[0];
			const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
				name: plugin.displayName,
			});
			expect(pluginCheckbox).not.toBeChecked();
			await user.click(pluginCheckbox);
			expect(pluginCheckbox).toBeChecked();

			// error cleared
			await waitFor(() => {
				expect(
					within(optionsRegion).queryByText(
						/at least one scan feature or plugin must be enabled/i
					)
				).not.toBeInTheDocument();
			});
		});

		describe.each([
			["include paths", /include paths \(optional\)/i],
			["exclude paths", /exclude paths \(optional\)/i],
		])("Test %p field", (_title, fieldRegex) => {
			test("allows valid relative paths newline or comma separated", async () => {
				const testPaths = [
					"src",
					"dev",
					"dir/*",
					"thing/**/otherthing",
					"    spaces    ",
					"ending_slash/",
				];
				const field = within(optionsRegion).getByLabelText(fieldRegex);
				await user.type(field, testPaths.join("{enter}"));
				fireEvent.blur(field);
				await waitFor(() =>
					expect(screen.queryByText(/invalid path/i)).not.toBeInTheDocument()
				);

				await user.type(field, testPaths.join(", "));
				fireEvent.blur(field);
				await waitFor(() =>
					expect(screen.queryByText(/invalid path/i)).not.toBeInTheDocument()
				);
			});

			test("disallows paths over 4096 chars", async () => {
				const maxInput = "x".repeat(MAX_PATH_LENGTH);
				const field = within(optionsRegion).getByLabelText(fieldRegex);
				// paste requires focusing the field
				field.focus();
				// paste the input instead of using .type() as type times-out on long input
				await user.paste(maxInput);
				fireEvent.blur(field);
				await waitFor(() =>
					expect(screen.queryByText(/invalid path/i)).not.toBeInTheDocument()
				);

				// add 1 extra character to exceed max path length
				await user.clear(field);
				field.focus();
				await user.paste(maxInput + "x");
				fireEvent.blur(field);
				await waitFor(() =>
					expect(
						screen.getByText(/invalid path, longer than/i)
					).toBeInTheDocument()
				);
			});

			test.each([[".."], ["\\0"], ["$"]])(
				"disallows paths that include invalid character: %p",
				async (chars) => {
					const field = within(optionsRegion).getByLabelText(fieldRegex);
					await user.clear(field);
					await waitFor(() =>
						expect(
							screen.queryByText(
								/invalid path, must be relative to repository/i
							)
						).not.toBeInTheDocument()
					);
					await user.type(field, chars);
					fireEvent.blur(field);
					await waitFor(() => expect(field).toHaveDisplayValue(chars));
					await waitFor(() =>
						expect(
							screen.getByText(/invalid path, must be relative to repository/i)
						).toBeInTheDocument()
					);
				}
			);

			test.each([["./"], ["/"]])(
				"disallows paths that start with: %p",
				async (chars) => {
					const field = within(optionsRegion).getByLabelText(fieldRegex);
					await user.clear(field);
					await waitFor(() =>
						expect(
							screen.queryByText(
								/invalid path, must be relative to repository/i
							)
						).not.toBeInTheDocument()
					);

					// test only these chars - should produce error
					await user.type(field, chars);
					fireEvent.blur(field);
					await waitFor(() => expect(field).toHaveDisplayValue(chars));
					await waitFor(() =>
						expect(
							screen.getByText(/invalid path, must be relative to repository/i)
						).toBeInTheDocument()
					);

					// string doesn't start with these characters - should produce no errors
					await user.clear(field);
					await user.type(field, "startstring" + chars);
					fireEvent.blur(field);
					await waitFor(() =>
						expect(field).toHaveDisplayValue("startstring" + chars)
					);
					await waitFor(() =>
						expect(
							screen.queryByText(
								/invalid path, must be relative to repository/i
							)
						).not.toBeInTheDocument()
					);

					// test starts with these characters - should produce error
					await user.clear(field);
					await user.type(field, chars + "endstring");
					fireEvent.blur(field);
					await waitFor(() =>
						expect(field).toHaveDisplayValue(chars + "endstring")
					);
					await waitFor(() =>
						expect(
							screen.getByText(/invalid path, must be relative to repository/i)
						).toBeInTheDocument()
					);
				}
			);
		});
	});

	describe("startScan", () => {
		const vcsOrg = "goodVcs/goodOrg";
		const repo = "repo";
		let formValues: ScanOptionsForm;
		let currentUser: User;

		beforeEach(() => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const scan: AnalysisReport = mockAppState.scans.entities[mockStoreScanId];

			currentUser = mockAppState.currentUser.entities["self"];
			formValues = {
				vcsOrg: vcsOrg,
				repo: repo,
				branch: scan.branch ?? "",
				secrets: scan.scan_options.categories?.includes("secret") ?? true,
				staticAnalysis:
					scan.scan_options.categories?.includes("static_analysis") ?? true,
				inventory: scan.scan_options.categories?.includes("inventory") ?? true,
				vulnerability:
					scan.scan_options.categories?.includes("vulnerability") ?? true,
				sbom: scan.scan_options.categories?.includes("sbom") ?? true,
				depth: scan.scan_options?.depth ?? "",
				includeDev: scan.scan_options?.include_dev ?? false,
				secretPlugins: [],
				staticPlugins: [],
				techPlugins: [],
				vulnPlugins: [],
				sbomPlugins: [],
				includePaths: scan.scan_options?.include_paths
					? scan.scan_options?.include_paths.join(", ")
					: "",
				excludePaths: scan.scan_options?.exclude_paths
					? scan.scan_options?.exclude_paths.join(", ")
					: "",
			};
		});

		test("validates values", async () => {
			const mockNavigate = jest.fn();
			const dispatchSpy = jest.spyOn(store, "dispatch");
			currentUser.scan_orgs = [];

			startScan(mockNavigate, formValues, currentUser);
			expect(handleException).toHaveBeenCalled();

			expect(dispatchSpy).not.toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		test("calls addScan and navigate", async () => {
			const mockNavigate = jest.fn();
			const dispatchSpy = jest.spyOn(store, "dispatch");
			startScan(mockNavigate, formValues, currentUser);

			expect(dispatchSpy).toHaveBeenLastCalledWith(addScan(formValues));

			expect(mockNavigate).toHaveBeenLastCalledWith(
				`/?repo=${encodeURIComponent(
					repo
				)}&submitContext=scan&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				{ replace: true }
			);
		});
	});
});
