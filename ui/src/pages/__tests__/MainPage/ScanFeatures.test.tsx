import { fireEvent, render, screen, waitFor, within } from "test-utils";
import MainPage from "pages/MainPage";
import { MAX_PATH_LENGTH } from "features/scans/scansSchemas";

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
import { mockStoreEmpty } from "../../../../testData/testMockData";
import { STORAGE_LOCAL_WELCOME } from "app/globals";
import { pluginCatalog, sbomPlugins } from "app/scanPlugins";

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
});
