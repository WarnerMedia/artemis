import { render, screen, waitFor, within } from "test-utils";
import axios, { AxiosRequestConfig } from "axios";
import queryString from "query-string";
import client from "api/client";
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
	useLocation: jest.fn(),
	useNavigate: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
/* eslint-disable */
import { useLocation, useNavigate } from "react-router-dom";
import { pluginCatalog, vulnPlugins } from "app/scanPlugins";
import SearchPage from "pages/SearchPage";
import {
	mockStoreEmpty,
	mockSearchVulnerabilities,
	mockSearchRepos as mockSearchVulnerabilityRepos,
} from "../../../testData/testMockData";
import {
	DEFAULT_SEARCH_OPTION,
	SEARCH_OPTIONS,
	SEARCH_OPTION_VULNS,
	testFieldLength,
	validateSelect,
} from "pages/SearchPageTestCommon";

let mockAppState: any;
let mockLocation: any;
let mockRequest: any;
let mockGetVulnerabilities: any;
let mockGetVulnerabilityRepos: any;
let mockHistory: any[] = [];
let globalWindow: any;
let promiseSearchVulnerabilities: any;
let promiseSearchVulnerabilityRepos: any;

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;
const mockUseNavigate = useNavigate as jest.Mock;
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("SearchPage component", () => {
	jest.setTimeout(140000);

	beforeEach(() => {
		mockUseLocation.mockImplementation(() => {
			return mockLocation;
		});
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);

		// spyOn getComponents, getRepos to ensure they are called and check params
		// but don't mock them since we need them to run to transform the data for the data table
		// spy and mock axios.request for this
		mockGetVulnerabilities = jest.spyOn(client, "getVulnerabilities");
		mockGetVulnerabilityRepos = jest.spyOn(client, "getVulnerabilityRepos");
		mockRequest = jest.spyOn(axios, "request");
		promiseSearchVulnerabilities = Promise.resolve({
			data: mockSearchVulnerabilities,
		});
		promiseSearchVulnerabilityRepos = Promise.resolve({
			data: mockSearchVulnerabilityRepos,
		});
		mockRequest.mockImplementation((url: AxiosRequestConfig) => {
			if (url.url?.startsWith("/search/vulnerabilities/")) {
				return promiseSearchVulnerabilityRepos;
			}
			// assume /search/repositories
			return promiseSearchVulnerabilities;
		});
		mockUseNavigate.mockImplementation(() => mockNavigate);
		globalWindow = global.window;
		global.window ??= Object.create(window);
		Object.defineProperty(window, "history", {
			get() {
				return mockHistory;
			},
		});
		//console.log("Starting test: ", expect.getState().currentTestName);
	});

	afterEach(async () => {
		await promiseSearchVulnerabilities;
		await promiseSearchVulnerabilityRepos;
		mockAppState = null;
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
		mockGetVulnerabilities.mockRestore();
		mockGetVulnerabilityRepos.mockRestore();
		mockRequest.mockRestore();
		jest.restoreAllMocks();
		promiseSearchVulnerabilities = null;
		promiseSearchVulnerabilityRepos = null;
		//console.log("Ending test: ", expect.getState().currentTestName);
	});

	describe("Form fields and defaults", () => {
		describe("Vulnerabilities form", () => {
			describe("Validate expected fields and default options", () => {
				// test select input fields
				test.each([
					[
						"Vulnerability Match",
						/vulnerability match/i,
						["Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Description Match",
						/description match/i,
						["Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Remediation Match",
						/remediation match/i,
						["Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Component Name Match",
						/component name match/i,
						["Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Component Version Match",
						/component version match/i,
						["Contains", "Exact"],
						"Contains",
						false,
					],
				])(
					"%p field Match select field options and expected default",
					async (_fieldName, label, options, defaultOptions, disabled) => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const { user } = render(<SearchPage />);

						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_VULNS,
							user,
						});
						await validateSelect({
							label: label,
							options: options,
							defaultOption: defaultOptions,
							disabled: disabled,
							user,
						});
					}
				);

				// test text input fields
				test.each([
					["Vulnerability", "Vulnerability", "", ""],
					["Description", "Description", "", ""],
					["Remediation", "Remediation", "", ""],
					["Component Name", "Component Name", "", ""],
					["Component Version", "Component Version", "", ""],
				])(
					"%p text field",
					async (_fieldName, label, defaultValue, placeholder) => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const { user } = render(<SearchPage />);

						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_VULNS,
							user,
						});
						const field = screen.getByRole("textbox", {
							name: label,
						});
						expect(field).not.toBeDisabled();
						expect(field).toHaveDisplayValue(defaultValue);
						if (placeholder) {
							expect(field).toHaveAttribute("placeholder", placeholder);
						}
					}
				);

				it("Severity field checkbox options", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					const severityField = screen.getByText("Severity");
					expect(severityField).toBeInTheDocument();
					if (severityField.parentElement) {
						within(severityField.parentElement).getByRole("checkbox", {
							name: "None",
						});
						within(severityField.parentElement).getByRole("checkbox", {
							name: "Negligible",
						});
						within(severityField.parentElement).getByRole("checkbox", {
							name: "Low",
						});
						within(severityField.parentElement).getByRole("checkbox", {
							name: "Medium",
						});
						within(severityField.parentElement).getByRole("checkbox", {
							name: "High",
						});
						within(severityField.parentElement).getByRole("checkbox", {
							name: "Critical",
						});
					} else {
						fail("Severity field has no options");
					}
				});

				// auto-complete field is a special use-case because it's an auto-complete
				// field that should have certain values, so validate that separately
				it("Discovered By Plugin field checkbox options", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					const pluginGroup = screen.getByRole("group", {
						name: "Discovered by Plugin",
					});

					const category = "vulnerability";
					const categoryCheckbox = within(pluginGroup).getByRole("checkbox", {
						name: pluginCatalog[category].displayName,
					});
					expect(categoryCheckbox).not.toBeChecked();

					// expand plugin accordion
					const pluginAccordion = within(pluginGroup).getByRole("button", {
						name: `Show ${pluginCatalog[category].displayName} plugins`,
					});
					await user.click(pluginAccordion);
					// region name changed since accordion expanded
					const pluginsRegion = within(pluginGroup).getByRole("region", {
						name: `Hide ${pluginCatalog[category].displayName} plugins`,
					});

					// ensure all plugins exist and are unchecked
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						expect(pluginCheckbox).not.toBeChecked();
					});
				});

				it("Form submit/reset buttons exist", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).not.toBeDisabled(); // buttons are enabled by default when all fields are blank

					const resetButton = screen.getByRole("button", {
						name: /reset filters/i,
					});
					expect(resetButton).not.toBeDisabled();
				});

				it("Results table empty initially", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					screen.getByRole("heading", { name: /results/i });
					screen.getByText(/no results match current filters/i);
					expect(
						screen.queryByRole("button", {
							name: /copy link to these search results/i,
						})
					).not.toBeInTheDocument();
				});

				it("Results table vulns search action", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					// accordion open on load
					expect(
						screen.getByRole("button", { name: /search filters/i })
					).toHaveAttribute("aria-expanded", "true");
					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					await user.click(submitButton);

					// check loading indicator when results being fetched
					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					// accordion closed on submit
					expect(
						screen.getByRole("button", { name: /search filters/i })
					).toHaveAttribute("aria-expanded", "false");

					// "vuln" should not be included in filters
					// it determines that API call client.getRepos should be called for a vuln search
					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=vuln"
					);

					// sortable columns are buttons, vuln search results table has no sortable columns
					// unsortable columns are columnheaders
					screen.getByRole("columnheader", { name: "Vulnerabilities" });
					screen.getByRole("columnheader", { name: "Severity" });
					screen.getByRole("columnheader", { name: "Components" });
					screen.getByRole("columnheader", { name: "Discovered By Plugins" });

					// results should have a copy button
					screen.getByRole("button", {
						name: /copy link to these search results/i,
					});

					// check table row count matches result data
					// role = checkbox matches an entire row in the table
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchVulnerabilities.results.length);

					// validate a result row contains correctly rendered values
					within(rows[0]).getByText("CVE-2022-0101 + 1 more");
					within(rows[0]).getByText(
						"component1-name (1.0.0, 1.0.1, 1.0.2) + 1 more"
					);
					within(rows[0]).getByText("A_totes_new_plugin + 6 more");
				});

				// this test generates the warning: An update to SearchPage inside a test was not wrapped in act(...)
				it("All form fields disabled on submit", async () => {
					jest.useFakeTimers();
					mockGetVulnerabilities.mockImplementation(() => {
						// add a mock to wait on submit while form fields can be tested
						return new Promise((res) => setTimeout(res, 30000));
					});
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />, null, {
						advanceTimers: jest.advanceTimersByTime,
					});

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					const vulnMatch = screen.getByRole("button", {
						name: /vulnerability match contains/i,
					});
					const vuln = screen.getByRole("textbox", {
						name: "Vulnerability",
					});
					const descMatch = screen.getByRole("button", {
						name: /description match contains/i,
					});
					const desc = screen.getByRole("textbox", {
						name: "Description",
					});
					const remedyMatch = screen.getByRole("button", {
						name: /remediation match contains/i,
					});
					const remedy = screen.getByRole("textbox", {
						name: "Remediation",
					});
					const nameMatch = screen.getByRole("button", {
						name: /component name match contains/i,
					});
					const name = screen.getByRole("textbox", {
						name: "Component Name",
					});
					const versionMatch = screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const version = screen.getByRole("textbox", {
						name: "Component Version",
					});

					const severityField = screen.getByText("Severity");
					let sevNone, sevLow, sevMedium, sevHigh, sevCritical;
					if (severityField.parentElement) {
						sevNone = within(severityField.parentElement).getByRole(
							"checkbox",
							{
								name: "None",
							}
						);
						sevLow = within(severityField.parentElement).getByRole("checkbox", {
							name: "Low",
						});
						sevMedium = within(severityField.parentElement).getByRole(
							"checkbox",
							{
								name: "Medium",
							}
						);
						sevHigh = within(severityField.parentElement).getByRole(
							"checkbox",
							{
								name: "High",
							}
						);
						sevCritical = within(severityField.parentElement).getByRole(
							"checkbox",
							{
								name: "Critical",
							}
						);
					} else {
						fail("Severity field has no options");
					}

					// plugins
					const pluginGroup = screen.getByRole("group", {
						name: "Discovered by Plugin",
					});
					const category = "vulnerability";
					const categoryCheckbox = within(pluginGroup).getByRole("checkbox", {
						name: pluginCatalog[category].displayName,
					});

					const pluginAccordion = within(pluginGroup).getByRole("button", {
						name: `Show ${pluginCatalog[category].displayName} plugins`,
					});
					await user.click(pluginAccordion);
					// region name changed since accordion expanded
					const pluginsRegion = within(pluginGroup).getByRole("region", {
						name: `Hide ${pluginCatalog[category].displayName} plugins`,
					});

					const pluginCheckboxen: HTMLElement[] = [];
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						pluginCheckboxen.push(pluginCheckbox);
					});

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});

					// Mui selecion elements use aria-disabled instead of disabled attribute
					expect(vulnMatch).not.toHaveAttribute("aria-disabled");
					expect(vuln).not.toBeDisabled();
					expect(descMatch).not.toHaveAttribute("aria-disabled");
					expect(desc).not.toBeDisabled();
					expect(remedyMatch).not.toHaveAttribute("aria-disabled");
					expect(remedy).not.toBeDisabled();
					expect(nameMatch).not.toHaveAttribute("aria-disabled");
					expect(name).not.toBeDisabled();
					expect(versionMatch).not.toHaveAttribute("aria-disabled");
					expect(version).not.toBeDisabled();

					// Mui chips, again uses aria-disabled
					expect(sevNone).not.toHaveAttribute("aria-disabled");
					expect(sevLow).not.toHaveAttribute("aria-disabled");
					expect(sevMedium).not.toHaveAttribute("aria-disabled");
					expect(sevHigh).not.toHaveAttribute("aria-disabled");
					expect(sevCritical).not.toHaveAttribute("aria-disabled");

					expect(categoryCheckbox).not.toBeDisabled();
					pluginCheckboxen.forEach((plugin) => {
						expect(plugin).not.toBeDisabled();
					});

					expect(submitButton).not.toBeDisabled();
					await user.click(submitButton);

					// check loading indicator when results being fetched
					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					// check all form fields disabled
					expect(vulnMatch).toHaveAttribute("aria-disabled", "true");
					expect(vuln).toBeDisabled();
					expect(descMatch).toHaveAttribute("aria-disabled", "true");
					expect(desc).toBeDisabled();
					expect(remedyMatch).toHaveAttribute("aria-disabled", "true");
					expect(remedy).toBeDisabled();
					expect(nameMatch).toHaveAttribute("aria-disabled", "true");
					expect(name).toBeDisabled();
					expect(versionMatch).toHaveAttribute("aria-disabled", "true");
					expect(version).toBeDisabled();

					expect(sevNone).toHaveAttribute("aria-disabled", "true");
					expect(sevLow).toHaveAttribute("aria-disabled", "true");
					expect(sevMedium).toHaveAttribute("aria-disabled", "true");
					expect(sevHigh).toHaveAttribute("aria-disabled", "true");
					expect(sevCritical).toHaveAttribute("aria-disabled", "true");

					expect(categoryCheckbox).toBeDisabled();
					pluginCheckboxen.forEach((plugin) => {
						expect(plugin).toBeDisabled();
					});

					jest.runOnlyPendingTimers();
					jest.useRealTimers();
				});

				it("Filters and URL search params match default matchers", async () => {
					const vulnValue = "CVE-0000-0000";
					const descValue = "a description";
					const remedyValue = "a remedy `~!@#$%^&*()_-+=}}{{]][[|\\:;\"'<,>.?/";
					const remedyValueExpected =
						"a remedy `~!@#$%^&*()_-+=}}{]][|\\:;\"'<,>.?/"; // same as remedy value but with values removed that are interpreted/removed by user-event, e.g. {[
					const componentValue = "component";
					const versionValue = "1.0.0b4-7";

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					// fill-out all form fields, leave each mater field default value (usually "Contains")
					const vulnField = await screen.findByRole("textbox", {
						name: /^vulnerability$/i,
					});
					await user.type(vulnField, vulnValue);
					const descField = await screen.findByRole("textbox", {
						name: /^description$/i,
					});
					await user.type(descField, descValue);
					const remedyField = await screen.findByRole("textbox", {
						name: /^remediation$/i,
					});
					await user.type(remedyField, remedyValue);
					const componentField = await screen.findByRole("textbox", {
						name: /^component name$/i,
					});
					await user.type(componentField, componentValue);
					const versionField = await screen.findByRole("textbox", {
						name: /^component version$/i,
					});
					await user.type(versionField, versionValue);

					// select all severity values
					["None", "Low", "Medium", "High", "Critical"].forEach(
						async (severity: string) => {
							const severityCheckbox = screen.getByRole("checkbox", {
								name: severity,
							});
							await user.click(severityCheckbox);
							expect(severityCheckbox).toBeChecked();
						}
					);

					// select all plugins by checking vuln category checkbox
					const pluginGroup = screen.getByRole("group", {
						name: "Discovered by Plugin",
					});
					const category = "vulnerability";
					const categoryCheckbox = within(pluginGroup).getByRole("checkbox", {
						name: pluginCatalog[category].displayName,
					});
					await user.click(categoryCheckbox);
					expect(categoryCheckbox).toBeChecked();

					const pluginAccordion = within(pluginGroup).getByRole("button", {
						name: `Show ${pluginCatalog[category].displayName} plugins`,
					});
					await user.click(pluginAccordion);

					// region name changed since accordion expanded
					const pluginsRegion = within(pluginGroup).getByRole("region", {
						name: `Hide ${pluginCatalog[category].displayName} plugins`,
					});

					// ensure all plugins checked
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						expect(pluginCheckbox).toBeChecked();
					});

					// submit form
					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					await user.click(submitButton);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					const severities = ["", "low", "medium", "high", "critical"];
					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								component_name: {
									filter: componentValue,
									match: "icontains",
								},
								component_version: {
									filter: versionValue,
									match: "icontains",
								},
								description: {
									filter: descValue,
									match: "icontains",
								},
								plugin: {
									filter: [...vulnPlugins],
									match: "exact",
								},
								remediation: {
									filter: remedyValueExpected,
									match: "icontains",
								},
								severity: {
									filter: [...severities],
									match: "exact",
								},
								vuln_id: {
									filter: vulnValue,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
						},
					});
					const qs =
						"/search?" +
						queryString.stringify({
							category: "vuln",
							component_name__icontains: componentValue,
							component_version__icontains: versionValue,
							description__icontains: descValue,
							plugin: vulnPlugins,
							remediation__icontains: remedyValueExpected,
							severity: severities,
							vuln_id__icontains: vulnValue,
						});
					expect(mockNavigate).toHaveBeenLastCalledWith(qs);
				});

				it("Filters and URL search params match secondary matchers", async () => {
					const vulnValue = "CVE-0000-0000";
					const descValue = "a description";
					const remedyValue = "a remedy `~!@#$%^&*()_-+=}}{{]][[|\\:;\"'<,>.?/";
					const remedyValueExpected =
						"a remedy `~!@#$%^&*()_-+=}}{]][|\\:;\"'<,>.?/"; // same as remedy value but with values removed that are interpreted/removed by user-event, e.g. {[
					const componentValue = "component";
					const versionValue = "1.0.0b4-7";

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					// fill-out all form fields, switch matcher to secondary option
					await validateSelect({
						label: /vulnerability match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const vulnField = await screen.findByRole("textbox", {
						name: /^vulnerability$/i,
					});
					await user.type(vulnField, vulnValue);

					await validateSelect({
						label: /description match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const descField = await screen.findByRole("textbox", {
						name: /^description$/i,
					});
					await user.type(descField, descValue);

					await validateSelect({
						label: /remediation match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const remedyField = await screen.findByRole("textbox", {
						name: /^remediation$/i,
					});
					await user.type(remedyField, remedyValue);

					await validateSelect({
						label: /component name match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const componentField = await screen.findByRole("textbox", {
						name: /^component name$/i,
					});
					await user.type(componentField, componentValue);

					await validateSelect({
						label: /component version match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const versionField = await screen.findByRole("textbox", {
						name: /^component version$/i,
					});
					await user.type(versionField, versionValue);

					// select no severity or plugin values

					// submit form
					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					await user.click(submitButton);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								component_name: {
									filter: componentValue,
									match: "exact",
								},
								component_version: {
									filter: versionValue,
									match: "exact",
								},
								description: {
									filter: descValue,
									match: "exact",
								},
								remediation: {
									filter: remedyValueExpected,
									match: "exact",
								},
								vuln_id: {
									filter: vulnValue,
									match: "exact",
								},
							},
							itemsPerPage: 50,
						},
					});
					const qs =
						"/search?" +
						queryString.stringify({
							category: "vuln",
							component_name: componentValue,
							component_version: versionValue,
							description: descValue,
							remediation: remedyValueExpected,
							vuln_id: vulnValue,
						});
					expect(mockNavigate).toHaveBeenLastCalledWith(qs);
				});

				describe("Severity field clear all button", () => {
					let sevNone: any,
						sevLow: any,
						sevMedium: any,
						sevHigh: any,
						sevCritical: any;
					let user: any;

					beforeEach(async () => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const renderProps = render(<SearchPage />);
						user = renderProps.user;

						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_VULNS,
							user,
						});

						const sevField = screen.getByText("Severity");
						if (sevField.parentElement) {
							sevNone = within(sevField.parentElement).getByRole("checkbox", {
								name: "None",
							});
							sevLow = within(sevField.parentElement).getByRole("checkbox", {
								name: "Low",
							});
							sevMedium = within(sevField.parentElement).getByRole("checkbox", {
								name: "Medium",
							});
							sevHigh = within(sevField.parentElement).getByRole("checkbox", {
								name: "High",
							});
							sevCritical = within(sevField.parentElement).getByRole(
								"checkbox",
								{
									name: "Critical",
								}
							);
						} else {
							fail("Severity field has no options");
						}

						expect(sevNone).not.toBeChecked();
						await user.click(sevNone);
						await waitFor(() => expect(sevNone).toBeChecked());

						expect(sevLow).not.toBeChecked();
						await user.click(sevLow);
						await waitFor(() => expect(sevLow).toBeChecked());

						expect(sevMedium).not.toBeChecked();
						await user.click(sevMedium);
						await waitFor(() => expect(sevMedium).toBeChecked());

						expect(sevHigh).not.toBeChecked();
						await user.click(sevHigh);
						await waitFor(() => expect(sevHigh).toBeChecked());

						expect(sevCritical).not.toBeChecked();
						await user.click(sevCritical);
						await waitFor(() => expect(sevCritical).toBeChecked());
					});

					it("Button click clears all severity options", async () => {
						const clearButton = screen.getByRole("button", {
							name: /clear options/i,
						});
						expect(clearButton).toBeInTheDocument();
						await user.click(clearButton);
						await waitFor(() => expect(sevNone).not.toBeChecked());
						expect(sevLow).not.toBeChecked();
						expect(sevMedium).not.toBeChecked();
						expect(sevHigh).not.toBeChecked();
						expect(sevCritical).not.toBeChecked();
					});

					it("Spacebar key clears all severity options", async () => {
						const clearButton = screen.getByRole("button", {
							name: /clear options/i,
						});
						expect(clearButton).toBeInTheDocument();
						await user.keyboard(" "); // space
						await waitFor(() => expect(sevNone).not.toBeChecked());
						expect(sevLow).not.toBeChecked();
						expect(sevMedium).not.toBeChecked();
						expect(sevHigh).not.toBeChecked();
						expect(sevCritical).not.toBeChecked();
					});

					it("Enter key clears all severity options", async () => {
						const clearButton = screen.getByRole("button", {
							name: /clear options/i,
						});
						expect(clearButton).toBeInTheDocument();
						await user.keyboard("{enter}");
						await waitFor(() => expect(sevNone).not.toBeChecked());
						expect(sevLow).not.toBeChecked();
						expect(sevMedium).not.toBeChecked();
						expect(sevHigh).not.toBeChecked();
						expect(sevCritical).not.toBeChecked();
					});
				});
			});

			describe("URL query params pre-populate form fields", () => {
				it("Valid default matchers populate form", async () => {
					const vulnValue = "CVE-0000-0000";
					const descValue = "a description";
					const remedyValue = "a remedy `~!@#$%^&*()_-+=}}{]][|\\:;\"'<,>.?/";
					const componentValue = "component";
					const versionValue = "1.0.0b4-7";

					const severities = ["", "low", "medium", "high", "critical"];
					const qs =
						"?" +
						queryString.stringify({
							category: "vuln",
							component_name__icontains: componentValue,
							component_version__icontains: versionValue,
							description__icontains: descValue,
							plugin: vulnPlugins,
							remediation__icontains: remedyValue,
							severity: severities,
							vuln_id__icontains: vulnValue,
						});
					mockLocation = {
						search: qs,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					// all form fields populated with url query params
					screen.getByRole("button", {
						name: /vulnerability match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^vulnerability$/i,
						})
					).toHaveDisplayValue(vulnValue);

					screen.getByRole("button", {
						name: /description match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^description$/i,
						})
					).toHaveDisplayValue(descValue);

					screen.getByRole("button", {
						name: /remediation match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^remediation$/i,
						})
					).toHaveDisplayValue(remedyValue);

					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component name$/i,
						})
					).toHaveDisplayValue(componentValue);

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component version$/i,
						})
					).toHaveDisplayValue(versionValue);

					// validate all severity values checked
					["None", "Low", "Medium", "High", "Critical"].forEach(
						(severity: string) => {
							const severityCheckbox = screen.getByRole("checkbox", {
								name: severity,
							});
							expect(severityCheckbox).toBeChecked();
						}
					);

					// validate all vuln plugins checked
					const pluginGroup = screen.getByRole("group", {
						name: "Discovered by Plugin",
					});
					const category = "vulnerability";
					const categoryCheckbox = within(pluginGroup).getByRole("checkbox", {
						name: pluginCatalog[category].displayName,
					});
					expect(categoryCheckbox).toBeChecked();

					const pluginAccordion = within(pluginGroup).getByRole("button", {
						name: `Show ${pluginCatalog[category].displayName} plugins`,
					});
					await user.click(pluginAccordion);

					// region name changed since accordion expanded
					const pluginsRegion = within(pluginGroup).getByRole("region", {
						name: `Hide ${pluginCatalog[category].displayName} plugins`,
					});

					// ensure all plugins checked
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						expect(pluginCheckbox).toBeChecked();
					});

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								component_name: {
									filter: componentValue,
									match: "icontains",
								},
								component_version: {
									filter: versionValue,
									match: "icontains",
								},
								description: {
									filter: descValue,
									match: "icontains",
								},
								plugin: {
									filter: [...vulnPlugins],
									match: "exact",
								},
								remediation: {
									filter: remedyValue,
									match: "icontains",
								},
								severity: {
									filter: [...severities],
									match: "exact",
								},
								vuln_id: {
									filter: vulnValue,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchVulnerabilities.results.length);
				});

				it("Valid secondary matchers populate form", async () => {
					const vulnValue = "CVE-0000-0000";
					const descValue = "a description";
					const remedyValue = "a remedy `~!@#$%^&*()_-+=}}{]][|\\:;\"'<,>.?/";
					const componentValue = "component";
					const versionValue = "1.0.0b4-7";

					const qs =
						"?" +
						queryString.stringify({
							category: "vuln",
							component_name: componentValue,
							component_version: versionValue,
							description: descValue,
							remediation: remedyValue,
							vuln_id: vulnValue,
						});
					mockLocation = {
						search: qs,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					// all form fields populated with url query params
					screen.getByRole("button", {
						name: /vulnerability match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^vulnerability$/i,
						})
					).toHaveDisplayValue(vulnValue);

					screen.getByRole("button", {
						name: /description match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^description$/i,
						})
					).toHaveDisplayValue(descValue);

					screen.getByRole("button", {
						name: /remediation match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^remediation$/i,
						})
					).toHaveDisplayValue(remedyValue);

					screen.getByRole("button", {
						name: /component name match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component name$/i,
						})
					).toHaveDisplayValue(componentValue);

					screen.getByRole("button", {
						name: /component version match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component version$/i,
						})
					).toHaveDisplayValue(versionValue);

					// validate no severity values checked
					["None", "Low", "Medium", "High", "Critical"].forEach(
						(severity: string) => {
							const severityCheckbox = screen.getByRole("checkbox", {
								name: severity,
							});
							expect(severityCheckbox).not.toBeChecked();
						}
					);

					// validate no vuln plugins checked
					const pluginGroup = screen.getByRole("group", {
						name: "Discovered by Plugin",
					});
					const category = "vulnerability";
					const categoryCheckbox = within(pluginGroup).getByRole("checkbox", {
						name: pluginCatalog[category].displayName,
					});
					expect(categoryCheckbox).not.toBeChecked();

					const pluginAccordion = within(pluginGroup).getByRole("button", {
						name: `Show ${pluginCatalog[category].displayName} plugins`,
					});
					await user.click(pluginAccordion);

					// region name changed since accordion expanded
					const pluginsRegion = within(pluginGroup).getByRole("region", {
						name: `Hide ${pluginCatalog[category].displayName} plugins`,
					});

					// ensure all plugins checked
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						expect(pluginCheckbox).not.toBeChecked();
					});

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								component_name: {
									filter: componentValue,
									match: "exact",
								},
								component_version: {
									filter: versionValue,
									match: "exact",
								},
								description: {
									filter: descValue,
									match: "exact",
								},
								remediation: {
									filter: remedyValue,
									match: "exact",
								},
								vuln_id: {
									filter: vulnValue,
									match: "exact",
								},
							},
							itemsPerPage: 50,
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchVulnerabilities.results.length);
				});

				it("Reset button resets form", async () => {
					const vulnValue = "CVE-0000-0000";
					const descValue = "a description";
					const remedyValue = "a remedy `~!@#$%^&*()_-+=}}{]][|\\:;\"'<,>.?/";
					const componentValue = "component";
					const versionValue = "1.0.0b4-7";

					const severities = ["", "low", "medium", "high", "critical"];
					const qs =
						"?" +
						queryString.stringify({
							category: "vuln",
							component_name: componentValue,
							component_version: versionValue,
							description: descValue,
							plugin: vulnPlugins,
							remediation: remedyValue,
							severity: severities,
							vuln_id: vulnValue,
						});
					mockLocation = {
						search: qs,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					// all form fields populated with url query params
					screen.getByRole("button", {
						name: /vulnerability match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^vulnerability$/i,
						})
					).toHaveDisplayValue(vulnValue);

					screen.getByRole("button", {
						name: /description match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^description$/i,
						})
					).toHaveDisplayValue(descValue);

					screen.getByRole("button", {
						name: /remediation match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^remediation$/i,
						})
					).toHaveDisplayValue(remedyValue);

					screen.getByRole("button", {
						name: /component name match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component name$/i,
						})
					).toHaveDisplayValue(componentValue);

					screen.getByRole("button", {
						name: /component version match exact/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component version$/i,
						})
					).toHaveDisplayValue(versionValue);

					// validate all severity values checked
					["None", "Low", "Medium", "High", "Critical"].forEach(
						(severity: string) => {
							const severityCheckbox = screen.getByRole("checkbox", {
								name: severity,
							});
							expect(severityCheckbox).toBeChecked();
						}
					);

					// validate all vuln plugins checked
					const pluginGroup = screen.getByRole("group", {
						name: "Discovered by Plugin",
					});
					const category = "vulnerability";
					const categoryCheckbox = within(pluginGroup).getByRole("checkbox", {
						name: pluginCatalog[category].displayName,
					});
					expect(categoryCheckbox).toBeChecked();

					const pluginAccordion = within(pluginGroup).getByRole("button", {
						name: `Show ${pluginCatalog[category].displayName} plugins`,
					});
					await user.click(pluginAccordion);

					// region name changed since accordion expanded
					const pluginsRegion = within(pluginGroup).getByRole("region", {
						name: `Hide ${pluginCatalog[category].displayName} plugins`,
					});

					// ensure all plugins checked
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						expect(pluginCheckbox).toBeChecked();
					});

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					const resetButton = screen.getByRole("button", {
						name: /^reset filters$/i,
					});
					expect(resetButton).toBeEnabled();
					await user.click(resetButton);

					// ensure all values reset to default state
					screen.getByRole("button", {
						name: /vulnerability match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^vulnerability$/i,
						})
					).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /description match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^description$/i,
						})
					).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /remediation match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^remediation$/i,
						})
					).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component name$/i,
						})
					).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					expect(
						screen.getByRole("textbox", {
							name: /^component version$/i,
						})
					).toHaveDisplayValue("");

					// validate all severity values unchecked
					["None", "Low", "Medium", "High", "Critical"].forEach(
						(severity: string) => {
							const severityCheckbox = screen.getByRole("checkbox", {
								name: severity,
							});
							expect(severityCheckbox).not.toBeChecked();
						}
					);

					// validate all vuln plugins unchecked
					expect(categoryCheckbox).not.toBeChecked();
					// expand accordion to check individual plugins
					await user.click(pluginAccordion);

					// ensure all plugins unchecked
					pluginCatalog[category].plugins.forEach((plugin) => {
						const pluginCheckbox = within(pluginsRegion).getByRole("checkbox", {
							name: plugin.displayName,
						});
						expect(pluginCheckbox).not.toBeChecked();
					});
				});
			});

			describe("Validate field bounds", () => {
				test.each([
					[
						"Vulnerability",
						100,
						"Vulnerability id must be less than 100 characters",
					],
					["Description", 100, "Description must be less than 100 characters"],
					["Remediation", 100, "Remediation must be less than 100 characters"],
					[
						"Component Name",
						100,
						"Component name must be less than 100 characters",
					],
					[
						"Component Version",
						32,
						"Component version must be less than 32 characters",
					],
				])(
					"%p field not longer than %p characters",
					async (fieldName, maxLength, expectedError) => {
						// set scan_orgs empty to make it easier to test matched service values
						// we'll only match our entered field value and not also user service names from scan_orgs
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].scan_orgs = [];
						const { user } = render(<SearchPage />);
						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_VULNS,
							user,
						});
						await testFieldLength(fieldName, maxLength, expectedError, user);
					}
				);
			});

			describe("Dialog contains expected fields and values", () => {
				const dialogTitle = "CVE-2022-0101 + 1 more Copy to clipboard";

				it("Details page", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					await user.click(submitButton);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=vuln"
					);

					// find item and click row to open dialog
					const vuln = mockSearchVulnerabilities.results[0];
					const item = "CVE-2022-0101 + 1 more";
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("rowheader", {
						name: /CVE-2022-0101.*/,
					});
					await user.click(row);

					const dialog = await screen.findByRole("dialog", {
						name: dialogTitle,
					});

					within(dialog).getByRole("heading", {
						name: `${item} Copy to clipboard`,
					});

					within(dialog).getByText("High");

					within(dialog).getByText(
						`Vulnerability IDs (${vuln.advisory_ids.length})`
					);
					vuln.advisory_ids.sort().forEach((advisory) => {
						const link = within(dialog).getByRole("link", {
							name: advisory,
						});

						// link should have expected safety attributes (nofollow, noreferrer, etc.)
						expect(link).toHaveAttribute("target", "_blank");
						expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
					});

					within(dialog).getByText("Description");
					within(dialog).getByText(vuln.description);

					within(dialog).getByText("Remediation");
					within(dialog).getByText(vuln.remediation);

					within(dialog).getByText(
						`Components (${Object.keys(vuln.components).length})`
					);
					within(dialog).getByText("component1-name (1.0.0, 1.0.1, 1.0.2)");
					within(dialog).getByText("component2-name (2.0.0, 2.0.1, 2.0.2)");

					within(dialog).getByText(
						`Discovered By Plugins (${vuln.source_plugins.length})`
					);
					within(dialog).getByText("A_totes_new_plugin");
					within(dialog).getByText("Aqua CLI Scanner (Docker)");
					within(dialog).getByText("NPM Audit (NodeJS)");
					within(dialog).getByText("Snyk");
					within(dialog).getByText("Trivy Container Image");
					within(dialog).getByText("Veracode SCA");
					within(dialog).getByText("Youve_never_seen_this_plugin_before");

					within(dialog).getByRole("button", { name: /repositories/i });

					// ok button closes dialog
					const okButton = within(dialog).getByRole("button", { name: /ok/i });
					await user.click(okButton);
					await waitFor(() =>
						expect(
							screen.queryByRole("dialog", {
								name: dialogTitle,
							})
						).not.toBeInTheDocument()
					);
				});

				it("Repositories page", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// 1. search for vuln results without filters
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_VULNS,
						user,
					});

					const vulnSearchButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					await user.click(vulnSearchButton);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 }
					);

					expect(mockGetVulnerabilities).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=vuln"
					);

					// 2. click a vuln result row to open a vuln dialog
					const vuln = mockSearchVulnerabilities.results[0];
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("rowheader", {
						name: /CVE-2022-0101.*/,
					});
					await user.click(row);
					const dialog = await screen.findByRole("dialog", {
						name: dialogTitle,
					});

					// 3. switch to the repositories page
					const repoButton = within(dialog).getByRole("button", {
						name: /repositories/i,
					});
					await user.click(repoButton);
					await within(dialog).findByRole("heading", { name: /repositories/i });

					await waitFor(() => {
						within(dialog).queryByText(/fetching results.../);
					});
					await waitFor(() => {
						expect(
							within(dialog).queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});

					// vuln/repos API should have been called
					expect(mockGetVulnerabilityRepos).toHaveBeenLastCalledWith(vuln.id, {
						meta: {
							currentPage: 0,
							filters: {}, // no initial filters
							itemsPerPage: 10,
							orderBy: "service",
						},
					});
					// url should remain the same
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=vuln"
					);

					// check vuln>repos form for all the things
					// check populated repo results table with no initial filters
					// sortable columns are buttons
					// await table to be populated with loaded data
					await within(dialog).findByRole("button", {
						name: /service sorted ascending/i,
					}); // default sort by name ascending
					within(dialog).getByRole("button", { name: "Repository" });

					// not sortable columns
					within(dialog).getByRole("columnheader", { name: "Risk" });
					within(dialog).getByRole("columnheader", {
						name: "Last Qualified Scan",
					});

					let repoTable = within(dialog).getByRole("table", {
						name: "results table",
					});
					let rows = within(repoTable).getAllByRole("checkbox");
					expect(rows).toHaveLength(
						mockSearchVulnerabilityRepos.results.length
					);

					// check repo filter form exists & has expected fields
					//
					// note: this is a shallow test, it does not test every repo form field
					// this dialog re-uses the RepoFiltersForm component that is already tested
					// extensively in repo search tests
					const repoFilterAccordion = within(dialog).getByRole("button", {
						name: /search filters/i,
					});
					// expand filters accordion
					await user.click(repoFilterAccordion);

					await within(dialog).findByRole("button", {
						name: /service match exact/i,
					});
					within(dialog).getByRole("combobox", {
						name: "Service",
					});
					within(dialog).getByRole("button", {
						name: /repository match contains/i,
					});
					const repoField = within(dialog).getByRole("textbox", {
						name: "Repository",
					});
					within(dialog).getByRole("button", {
						name: /last qualified scan time match before/i,
					});
					within(dialog).getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					const repoSearchButton = within(dialog).getByRole("button", {
						name: /^search$/i,
					});
					within(dialog).getByRole("button", {
						name: /^reset filters$/i,
					});

					// 4. apply a repo search filter
					const repoValue = "tv/dev";
					await user.type(repoField, repoValue);
					await user.click(repoSearchButton);

					await waitFor(() => {
						within(dialog).queryByText(/fetching results.../);
					});
					await waitFor(() => {
						expect(
							within(dialog).queryByText(/fetching results.../)
						).not.toBeInTheDocument();
					});

					// vuln/repos API should have been called
					// wait for table filters change to trigger onDataLoad & API call
					await waitFor(() =>
						expect(mockGetVulnerabilityRepos).toHaveBeenLastCalledWith(
							vuln.id,
							{
								meta: {
									currentPage: 0,
									filters: {
										repo: {
											match: "icontains",
											filter: repoValue,
										},
									},
									itemsPerPage: 10,
									orderBy: "service",
								},
							}
						)
					);
					// url should remain the same
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=vuln"
					);

					// check populated repo results table
					repoTable = await within(dialog).findByRole("table", {
						name: "results table",
					});
					rows = within(repoTable).getAllByRole("checkbox");
					expect(rows).toHaveLength(
						mockSearchVulnerabilityRepos.results.length
					);

					// 5. clicking a result row should swap search filters with repo details (not open a new dialog)
					// repo details close should not exist yet
					expect(
						within(dialog).queryByRole("button", {
							name: /close repository details/i,
						})
					).not.toBeInTheDocument();

					const repoRow = within(repoTable).getByRole("cell", {
						name: repoValue,
					});
					await user.click(repoRow);

					// dialog window should stay the same (title)
					await screen.findByRole("dialog", {
						name: dialogTitle,
					});

					// search filters accordion should be replaced with repo details
					// check an item in the details that's not displayed in the table, e.g., VCS link
					//
					// note: this is a shallow test, it does not test every repo detail element
					// this dialog re-uses the RepoDialogContent component that is already tested
					// extensively in repo search tests
					within(dialog).getByRole("link", {
						name: /view in version control/i,
					});

					// 6. closing the repo details should re-display to search filters
					const closeRepoDetails = within(dialog).getByRole("button", {
						name: /close repository details/i,
					});
					await user.click(closeRepoDetails);

					expect(
						within(dialog).queryByRole("link", {
							name: /view in version control/i,
						})
					).not.toBeInTheDocument();
					expect(
						within(dialog).queryByRole("button", {
							name: /close repository details/i,
						})
					).not.toBeInTheDocument();
					// search filters are visible again
					within(dialog).getByRole("button", {
						name: /search filters/i,
					});

					// 7. clicking "details" button takes user back to (first) vuln details page
					const detailsButton = within(dialog).getByRole("button", {
						name: "Details",
					});
					await user.click(detailsButton);

					// repos header removed
					await waitFor(() =>
						expect(
							within(dialog).queryByRole("heading", { name: /repositories/i })
						).not.toBeInTheDocument()
					);

					// back on details page, verify an expected field
					expect(
						within(dialog).getByText(/Vulnerability IDs.*/i)
					).toBeInTheDocument();
				});
			});
		});
	});
});
