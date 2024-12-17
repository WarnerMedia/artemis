import { render, screen, waitFor, within } from "test-utils";
import axios, { AxiosRequestConfig } from "axios";
import client from "api/client";
import { DateTime, Settings } from "luxon";
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
import SearchPage from "pages/SearchPage";
import {
	mockStoreEmpty,
	mockSearchComponents,
	mockSearchComponentRepos,
	mockSearchRepos,
} from "../../../../testData/testMockData";
import {
	DATE_FORMAT,
	DATE_PLACEHOLDER,
	DEFAULT_SEARCH_OPTION,
	SEARCH_OPTIONS,
	testFieldInvalid,
	testFieldLength,
	testFieldValid,
	validateSelect,
} from "pages/SearchPageTestCommon";

let mockAppState: any;
let mockLocation: any;
let mockRequest: any;
let mockGetComponents: any;
let mockGetComponentRepos: any;
let mockGetRepos: any;
let mockHistory: any[] = [];
let globalWindow: any;
let promiseSearchRepo: any;
let promiseSearchComponent: any;
let promiseSearchComponentRepo: any;

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
	jest.setTimeout(120000);

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
		mockGetComponents = jest.spyOn(client, "getComponents");
		mockGetComponentRepos = jest.spyOn(client, "getComponentRepos");
		mockGetRepos = jest.spyOn(client, "getRepos");
		mockRequest = jest.spyOn(axios, "request");
		promiseSearchComponent = Promise.resolve({ data: mockSearchComponents });
		promiseSearchRepo = Promise.resolve({ data: mockSearchRepos });
		promiseSearchComponentRepo = Promise.resolve({
			data: mockSearchComponentRepos,
		});
		mockRequest.mockImplementation((url: AxiosRequestConfig) => {
			if (url.url === "/search/repositories") {
				return promiseSearchRepo;
			} else if (url.url?.startsWith("/sbom/components/")) {
				return promiseSearchComponentRepo;
			}
			// assume /sbom/components
			return promiseSearchComponent;
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
		await promiseSearchComponent;
		await promiseSearchRepo;
		await promiseSearchComponentRepo;
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
		mockGetComponents.mockRestore();
		mockGetComponentRepos.mockRestore();
		mockGetRepos.mockRestore();
		mockRequest.mockRestore();
		jest.restoreAllMocks();
		promiseSearchComponent = null;
		promiseSearchRepo = null;
		promiseSearchComponentRepo = null;
		//console.log("Ending test: ", expect.getState().currentTestName);
	});

	it("Page title should include 'search'", async () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<SearchPage />);

		// wait for page to render (findBy...)
		await screen.findByRole("heading", { name: "Search" });

		// check the page title
		expect(global.window.document.title).toMatch(/search/i);
	});

	it("Page contains Back button", async () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<SearchPage />);

		await screen.findByRole("button", { name: "Back" });
	});

	describe("Form fields and defaults", () => {
		it("Search For select field options and 'Components or Licenses' default", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<SearchPage />);

			await validateSelect({
				label: /search for/i,
				options: SEARCH_OPTIONS,
				defaultOption: DEFAULT_SEARCH_OPTION,
				disabled: false,
				focused: true,
				user,
			});
		});

		describe("Components or Licenses form", () => {
			describe("Validate expected fields and default options", () => {
				// test select input fields
				test.each([
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
					[
						"License Match",
						/license match/i,
						["No License", "Any License", "Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Service Match",
						/service match/i,
						["Contains", "Exact"],
						"Exact",
						false,
					],
					[
						"Repository Match",
						/repository match/i,
						["Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Scan Time Match",
						/scan time match/i,
						//["No Qualified Scans", "Before", "After"],
						["Before", "After"],
						"Before",
						false,
					],
				])(
					"%p field Match select field options and expected default",
					async (_fieldName, label, options, defaultOptions, disabled) => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const { user } = render(<SearchPage />);

						await validateSelect({
							label: label,
							options: options,
							defaultOption: defaultOptions,
							disabled: disabled,
							user,
						});
					},
				);

				// test text input fields
				test.each([
					["Component Name", /component name/i, "", ""],
					["Component Version", /component version/i, "", ""],
					["License", /license/i, "", ""],
					["Repository", /repository/i, "", ""],
					["Scan Time", /scan time/i, "", DATE_PLACEHOLDER],
				])(
					"%p text field",
					async (_fieldName, label, defaultValue, placeholder) => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						render(<SearchPage />);

						const field = await screen.findByRole("textbox", {
							name: label,
						});
						expect(field).not.toBeDisabled();
						expect(field).toHaveDisplayValue(defaultValue);
						if (placeholder) {
							expect(field).toHaveAttribute("placeholder", placeholder);
						}
					},
				);

				// auto-complete field is a special use-case because it's an auto-complete
				// field that should have certain values, so validate that separately
				it("Service autocomplete field options and default", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const options: string[] = [
						...new Set(
							(mockAppState.currentUser.entities["self"].scan_orgs as string[])
								? (
										mockAppState.currentUser.entities["self"]
											.scan_orgs as string[]
									).map((org: string) => org.split("/", 1)[0])
								: [],
						),
					];
					const { user } = render(<SearchPage />);

					await validateSelect({
						role: "combobox",
						label: /service/i,
						options: options,
						defaultOption: "",
						disabled: false,
						user,
					});
				});

				// components search form should not have this field
				it("Risk field is not visible on Component search form", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					const riskField = screen.queryByText(/risk/i);
					expect(riskField).not.toBeInTheDocument();
				});

				it("Form submit/reset buttons exist", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					// submit/reset buttons enabled by default when all fields are blank
					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).not.toBeDisabled();

					const resetButton = screen.getByRole("button", {
						name: /reset filters/i,
					});
					expect(resetButton).not.toBeDisabled();
				});

				it("Results table empty initially", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await screen.findByRole("heading", { name: /results/i });
					screen.getByText(/no results match current filters/i);
					expect(
						screen.queryByRole("button", {
							name: /copy link to these search results/i,
						}),
					).not.toBeInTheDocument();
				});

				it("Results table components search action", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// accordion open on load
					const accordion = await screen.findByRole("button", {
						name: /search filters/i,
					});
					expect(accordion).toHaveAttribute("aria-expanded", "true");

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					await user.click(submitButton);

					// check loading indicator when results being fetched
					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// accordion closed on submit
					expect(accordion).toHaveAttribute("aria-expanded", "false");

					// sortable columns are role button
					await screen.findByRole("button", { name: /name sorted ascending/i }); // default sort by name ascending

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=component",
					);

					screen.getByRole("button", { name: "Version" });
					// unsortable columns are role columnheaders
					screen.getByRole("columnheader", { name: /licenses/i });

					// results should have a copy button
					screen.getByRole("button", {
						name: /copy link to these search results/i,
					});

					// check table row count matches expected result data length
					// role = checkbox matches an entire row in the table
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);

					// for multiple licenses, expect tooltip with all license names
					// role = cell matches a particular data cell in the table
					screen.getByRole("cell", {
						name: "The First License, The Second License, The Third License",
					});

					// for multiple licenses, expect format: <License Name> + # more
					screen.getByText("The First License + 2 more");
				});

				// this test generates the warning: An update to SearchPage inside a test was not wrapped in act(...)
				it("All form fields disabled on submit", async () => {
					// mock getComponents to pause on submit while form fields can be tested
					jest.useFakeTimers();
					mockGetComponents.mockImplementation(() => {
						return new Promise((res) => setTimeout(res, 30000));
					});
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));

					// because fake timers are used in test, these need to be added to userEvent setup config, see:
					// https://github.com/testing-library/user-event/issues/959#issuecomment-1127781872
					const { user } = render(<SearchPage />, null, {
						advanceTimers: jest.advanceTimersByTime,
					});

					const componentNameMatch = await screen.findByRole("button", {
						name: /component name match contains/i,
					});
					const componentName = screen.getByRole("textbox", {
						name: /component name/i,
					});
					const componentVersionMatch = screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const componentVersion = screen.getByRole("textbox", {
						name: /component version/i,
					});
					const licenseMatch = screen.getByRole("button", {
						name: /license match contains/i,
					});
					const license = screen.getByRole("textbox", { name: /license/i });
					const serviceMatch = screen.getByRole("button", {
						name: /service match exact/i,
					});
					const service = screen.getByRole("combobox", { name: /service/i });
					const repoMatch = screen.getByRole("button", {
						name: /repository match contains/i,
					});
					const repo = screen.getByRole("textbox", { name: /repository/i });
					const scanTimeMatch = screen.getByRole("button", {
						name: /scan time match before/i,
					});
					const scanTime = screen.getByRole("textbox", { name: /scan time/i });
					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});

					// Mui selecion elements use aria-disabled instead of disabled attribute
					expect(componentNameMatch).not.toHaveAttribute("aria-disabled");
					expect(componentName).not.toBeDisabled();
					expect(componentVersionMatch).not.toHaveAttribute("aria-disabled");
					expect(componentVersion).not.toBeDisabled();
					expect(licenseMatch).not.toHaveAttribute("aria-disabled");
					expect(license).not.toBeDisabled();
					expect(serviceMatch).not.toHaveAttribute("aria-disabled");
					expect(service).not.toBeDisabled();
					expect(repoMatch).not.toHaveAttribute("aria-disabled");
					expect(repo).not.toBeDisabled();
					expect(scanTimeMatch).not.toHaveAttribute("aria-disabled");
					expect(scanTime).not.toBeDisabled();
					expect(submitButton).not.toBeDisabled();

					await user.click(submitButton);

					// check loading indicator when results being fetched
					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					// check all form fields disabled
					expect(componentNameMatch).toHaveAttribute("aria-disabled", "true");
					expect(componentName).toBeDisabled();
					expect(componentVersionMatch).toHaveAttribute(
						"aria-disabled",
						"true",
					);
					expect(componentVersion).toBeDisabled();
					expect(licenseMatch).toHaveAttribute("aria-disabled", "true");
					expect(license).toBeDisabled();
					expect(serviceMatch).toHaveAttribute("aria-disabled", "true");
					expect(service).toBeDisabled();
					expect(repoMatch).toHaveAttribute("aria-disabled", "true");
					expect(repo).toBeDisabled();
					expect(scanTimeMatch).toHaveAttribute("aria-disabled", "true");
					expect(scanTime).toBeDisabled();
					expect(submitButton).toBeDisabled();

					jest.runOnlyPendingTimers();
					jest.useRealTimers();
				});

				it("Filters and URL search params match default matchers", async () => {
					const componentNameValue = "component_name_value";
					const componentVersionValue = "component_version_value";
					const licenseValue = "license_value";
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the form fields
					const componentNameField = await screen.findByRole("textbox", {
						name: /component name/i,
					});
					await user.type(componentNameField, componentNameValue);

					const componentVersionField = await screen.findByRole("textbox", {
						name: /component version/i,
					});
					await user.type(componentVersionField, componentVersionValue);

					const licenseField = await screen.findByRole("textbox", {
						name: /license/i,
					});
					await user.type(licenseField, licenseValue);

					const serviceField = await screen.findByRole("combobox", {
						name: /service/i,
					});
					await user.type(serviceField, `${serviceValue}{enter}`); // enter to select match in list

					const repoField = await screen.findByRole("textbox", {
						name: /repository/i,
					});
					await user.type(repoField, repoValue);

					const scanTimeField = await screen.findByRole("textbox", {
						name: /scan time/i,
					});
					await user.type(scanTimeField, dt.toFormat(DATE_FORMAT));
					await waitFor(() => {
						expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
								license: {
									filter: licenseValue,
									match: "icontains",
								},
								name: {
									filter: componentNameValue,
									match: "icontains",
								},
								repo: {
									filter: repoValue,
									match: "icontains",
								},
								service: {
									filter: serviceValue,
									match: "exact",
								},
								version: {
									filter: componentVersionValue,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&last_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}&license__icontains=${licenseValue}&name__icontains=${componentNameValue}&repo__icontains=${repoValue}&service=${serviceValue}&version__icontains=${componentVersionValue}`,
					);
				});

				it("Filters and URL search params match secondary matchers", async () => {
					const componentNameValue = "component_name_value";
					const componentVersionValue = "component_version_value";
					const licenseValue = "license_value";
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the form fields
					await validateSelect({
						label: /component name match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const componentNameField = await screen.findByRole("textbox", {
						name: /component name/i,
					});
					await user.type(componentNameField, componentNameValue);

					await validateSelect({
						label: /component version match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const componentVersionField = await screen.findByRole("textbox", {
						name: /component version/i,
					});
					await user.type(componentVersionField, componentVersionValue);

					await validateSelect({
						label: /license match/i,
						options: ["No License", "Any License", "Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const licenseField = await screen.findByRole("textbox", {
						name: /license/i,
					});
					await user.type(licenseField, licenseValue);

					await validateSelect({
						label: /service match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Exact",
						disabled: false,
						selectOption: "Contains",
						user,
					});
					const serviceField = await screen.findByRole("combobox", {
						name: /service/i,
					});
					await user.type(serviceField, `${serviceValue}{enter}`); // enter to select match in list

					await validateSelect({
						label: /repository match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Exact",
						user,
					});
					const repoField = await screen.findByRole("textbox", {
						name: /repository/i,
					});
					await user.type(repoField, repoValue);

					/* components API doesn't support last_scan__null filter
					 * we test scan before/after in other tests, so omit this until it's supported
					await validateSelect({
						label: /scan time match/i,
						options: ["No Qualified Scans", "Before", "After"],
						defaultOption: "Before",
						disabled: false,
						selectOption: "No Qualified Scans",
					});

					// matcher = no qualified scans
					// so scan time field should be disabled
					const scanTimeField = await screen.findByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toBeDisabled();
					*/

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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								/*
								last_scan: {
									filter: "true",
									match: "null",
								},
								*/
								license: {
									filter: licenseValue,
									match: "exact",
								},
								name: {
									filter: componentNameValue,
									match: "exact",
								},
								repo: {
									filter: repoValue,
									match: "exact",
								},
								service: {
									filter: serviceValue,
									match: "icontains",
								},
								version: {
									filter: componentVersionValue,
									match: "exact",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						// when last_scan__null supported, change to: `/search?category=component&last_scan__null=&license=...
						`/search?category=component&license=${licenseValue}&name=${componentNameValue}&repo=${repoValue}&service__icontains=${serviceValue}&version=${componentVersionValue}`,
					);
				});

				it("Filters and URL search params match No License", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the license form field
					await validateSelect({
						label: /license match/i,
						options: ["No License", "Any License", "Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "No License",
						user,
					});
					const licenseField = await screen.findByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toBeDisabled();

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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								license: {
									filter: "true",
									match: "null",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&license__null=true`,
					);
				});

				it("Filters and URL search params match Any License", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the license form field
					await validateSelect({
						label: /license match/i,
						options: ["No License", "Any License", "Contains", "Exact"],
						defaultOption: "Contains",
						disabled: false,
						selectOption: "Any License",
						user,
					});
					const licenseField = await screen.findByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toBeDisabled();

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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								license: {
									filter: "false",
									match: "null",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&license__null=false`,
					);
				});

				it("Filters and URL search params with Scan Time Before match", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the form fields
					await validateSelect({
						label: /scan time match/i,
						//options: ["No Qualified Scans", "Before", "After"],
						options: ["Before", "After"],
						defaultOption: "Before",
						disabled: false,
						selectOption: "Before",
						user,
					});

					const scanTimeField = await screen.findByRole("textbox", {
						name: /scan time/i,
					});
					await user.type(scanTimeField, dt.toFormat(DATE_FORMAT));
					await waitFor(() => {
						expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&last_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}`,
					);
				});

				it("Filters and URL search params with Scan Time After match", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the form fields
					await validateSelect({
						label: /scan time match/i,
						//options: ["No Qualified Scans", "Before", "After"],
						options: ["Before", "After"],
						defaultOption: "Before",
						disabled: false,
						selectOption: "After",
						user,
					});

					const scanTimeField = await screen.findByRole("textbox", {
						name: /scan time/i,
					});
					await user.type(scanTimeField, dt.toFormat(DATE_FORMAT));
					await waitFor(() => {
						expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "gt",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&last_scan__gt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}`,
					);
				});

				it("Component Name field is URI component encoded", async () => {
					const value = "@component/name";

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the form fields
					const field = await screen.findByRole("textbox", {
						name: /component name/i,
					});
					await user.type(field, value);

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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								name: {
									filter: value,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&name__icontains=${encodeURIComponent(
							value,
						)}`,
					);
				});

				it("Component Version field is URI component encoded", async () => {
					const value = "@component/version";

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fill-out the form fields
					const field = await screen.findByRole("textbox", {
						name: /component version/i,
					});
					await user.type(field, value);

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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								version: {
									filter: value,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=component&version__icontains=${encodeURIComponent(
							value,
						)}`,
					);
				});
			});

			describe("URL query params pre-populate form fields", () => {
				it("Valid default matchers populate form", async () => {
					const componentNameValue = "component_name_value";
					const componentVersionValue = "component_version_value";
					const licenseValue = "license_value";
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=component&last_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}&license__icontains=${licenseValue}&name__icontains=${componentNameValue}&repo__icontains=${repoValue}&service=${serviceValue}&version__icontains=${componentVersionValue}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue(componentNameValue);

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue(
						componentVersionValue,
					);

					screen.getByRole("button", { name: /license match contains/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toHaveDisplayValue(licenseValue);

					screen.getByRole("button", { name: /service match exact/i });
					const serviceField = screen.getByRole("combobox", {
						name: /service/i,
					});
					expect(serviceField).toHaveDisplayValue(serviceValue);

					screen.getByRole("button", { name: /repository match contains/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue(repoValue);

					screen.getByRole("button", { name: /scan time match before/i });
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					expect(scanTimeField).toBeEnabled();

					// form valid, submit form enabled
					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
								license: {
									filter: licenseValue,
									match: "icontains",
								},
								name: {
									filter: componentNameValue,
									match: "icontains",
								},
								repo: {
									filter: repoValue,
									match: "icontains",
								},
								service: {
									filter: serviceValue,
									match: "exact",
								},
								version: {
									filter: componentVersionValue,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Valid secondary matchers populate form", async () => {
					const componentNameValue = "component_name_value";
					const componentVersionValue = "component_version_value";
					const licenseValue = "license_value";
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";

					mockLocation = {
						// when last_scan__null supported, change to:
						// search: `?category=component&last_scan__null=&license=...
						search: `?category=component&license=${licenseValue}&name=${componentNameValue}&repo=${repoValue}&service__icontains=${serviceValue}&version=${componentVersionValue}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component name match exact/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue(componentNameValue);

					screen.getByRole("button", {
						name: /component version match exact/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue(
						componentVersionValue,
					);

					screen.getByRole("button", { name: /license match exact/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toHaveDisplayValue(licenseValue);

					screen.getByRole("button", { name: /service match contains/i });
					const serviceField = screen.getByRole("combobox", {
						name: /service/i,
					});
					expect(serviceField).toHaveDisplayValue(serviceValue);

					screen.getByRole("button", { name: /repository match exact/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue(repoValue);

					screen.getByRole("button", {
						name: /scan time match before/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue("");
					expect(scanTimeField).toBeEnabled();

					/*
					screen.getByRole("button", {
						name: /scan time match no qualified scans/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue("");
					expect(scanTimeField).not.toBeEnabled(); // "no qualified scans" matcher doesn't expect a value so this field is disabled
					*/

					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								/*
								last_scan: {
									filter: "true",
									match: "null",
								},
								*/
								license: {
									filter: licenseValue,
									match: "exact",
								},
								name: {
									filter: componentNameValue,
									match: "exact",
								},
								repo: {
									filter: repoValue,
									match: "exact",
								},
								service: {
									filter: serviceValue,
									match: "icontains",
								},
								version: {
									filter: componentVersionValue,
									match: "exact",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Valid No License matcher populates form", async () => {
					mockLocation = {
						search: `?category=component&license__null=true`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", { name: /license match no license/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toBeDisabled();

					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								license: {
									filter: "true",
									match: "null",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Valid Any License matcher populates form", async () => {
					mockLocation = {
						search: `?category=component&license__null=false`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", { name: /license match any license/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toBeDisabled();

					const submitButton = await screen.findByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								license: {
									filter: "false",
									match: "null",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Reset button resets form", async () => {
					const componentNameValue = "component_name_value";
					const componentVersionValue = "component_version_value";
					const licenseValue = "license_value";
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=component&last_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}&license=${licenseValue}&name=${componentNameValue}&repo=${repoValue}&service__icontains=${serviceValue}&version=${componentVersionValue}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component name match exact/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue(componentNameValue);

					screen.getByRole("button", {
						name: /component version match exact/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue(
						componentVersionValue,
					);

					screen.getByRole("button", { name: /license match exact/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toHaveDisplayValue(licenseValue);

					screen.getByRole("button", { name: /service match contains/i });
					const serviceField = screen.getByRole("combobox", {
						name: /service/i,
					});
					expect(serviceField).toHaveDisplayValue(serviceValue);

					screen.getByRole("button", { name: /repository match exact/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue(repoValue);

					screen.getByRole("button", {
						name: /scan time match before/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					expect(scanTimeField).toBeEnabled();

					const resetButton = await screen.findByRole("button", {
						name: /^reset filters$/i,
					});
					expect(resetButton).toBeEnabled();
					await user.click(resetButton);

					// form should be in default state after reset
					await screen.findByRole("button", {
						name: /component name match contains/i,
					});
					expect(componentNameField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					expect(componentVersionField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /license match contains/i });
					expect(licenseField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /service match exact/i });
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /repository match contains/i });
					expect(repoField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /scan time match before/i,
					});
					expect(scanTimeField).toHaveDisplayValue("");
					expect(scanTimeField).toBeEnabled();
				});

				it("Valid Scan Time Before match populates form", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=component&last_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /license match contains/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /service match exact/i });
					const serviceField = screen.getByRole("combobox", {
						name: /service/i,
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /repository match contains/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /scan time match before/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					expect(scanTimeField).toBeEnabled();

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Valid Scan Time After match populates form", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=component&last_scan__gt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /license match contains/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /service match exact/i });
					const serviceField = screen.getByRole("combobox", {
						name: /service/i,
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /repository match contains/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /scan time match after/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					expect(scanTimeField).toBeEnabled();

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "gt",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Invalid value will not populate form", async () => {
					const nameValue = "valid";
					const repoValue = "invalid!!"; // invalid repo field
					mockLocation = {
						search: `?category=component&name__icontains=${nameValue}&repo__icontains=${repoValue}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					// don't await data loading indicator because url query params invalid

					// all form fields are defaults (empty with default matchers)
					await screen.findByRole("button", {
						name: /component name match contains/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /license match contains/i });
					const licenseField = screen.getByRole("textbox", {
						name: /license/i,
					});
					expect(licenseField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /service match exact/i });
					const serviceField = screen.getByRole("combobox", {
						name: /service/i,
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("button", { name: /repository match contains/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue("");

					screen.getByRole("button", {
						name: /scan time match before/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue("");
					expect(scanTimeField).toBeEnabled();

					// url params were invalid but blank form generated is blank + valid
					// submit not disabled
					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// submit has not been called
					expect(mockGetComponents).toHaveBeenCalledTimes(0);

					// no result rows
					expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
				});

				it("Valid field populated, invalid field matcher skipped", async () => {
					const validValue = "valid";
					mockLocation = {
						search: `?category=component&name__icontains=${validValue}&repo__invalidmatcher=${validValue}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// valid field will be populated
					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue(validValue);

					// field with invalid matcher will use default values
					screen.getByRole("button", { name: /repository match contains/i });
					const repoField = screen.getByRole("textbox", {
						name: /repository/i,
					});
					expect(repoField).toHaveDisplayValue("");

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								name: {
									filter: validValue,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponents.results.length);
				});

				it("Valid URL-encoded Component Name populates form", async () => {
					const value = "@component/name";
					mockLocation = {
						search: `?category=component&name__icontains=${encodeURIComponent(
							value,
						)}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component name match contains/i,
					});
					const componentNameField = screen.getByRole("textbox", {
						name: /component name/i,
					});
					expect(componentNameField).toHaveDisplayValue(value);

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								name: {
									filter: value,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
				});

				it("Valid URL-encoded Component Version populates form", async () => {
					const value = "@component/version";
					mockLocation = {
						search: `?category=component&version__icontains=${encodeURIComponent(
							value,
						)}`,
					};
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					render(<SearchPage />);

					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					await waitFor(() => {
						expect(
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					screen.getByRole("button", {
						name: /component version match contains/i,
					});
					const componentVersionField = screen.getByRole("textbox", {
						name: /component version/i,
					});
					expect(componentVersionField).toHaveDisplayValue(value);

					// form has been submitted
					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								version: {
									filter: value,
									match: "icontains",
								},
							},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
				});
			});

			describe("Validate field bounds", () => {
				test.each([
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
					[
						"License",
						120,
						"Component license must be less than 120 characters",
					],
				])(
					"%p field not longer than %p characters",
					async (fieldName, maxLength, expectedError) => {
						// set scan_orgs empty to make it easier to test matched service values
						// we'll only match our entered field value and not also user service names from scan_orgs
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].scan_orgs = [];
						const { user } = render(<SearchPage />);
						await testFieldLength(fieldName, maxLength, expectedError, user);
					},
				);

				test.each([
					[
						"Service",
						/service/i,
						"abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ.0123456789",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Repository",
						/repository/i,
						"abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ.0123456789_/",
						"Invalid repository name",
						"textbox" as const,
					],
				])(
					"%p field allows valid input",
					async (_fieldName, label, validInput, unexpectedError, role) => {
						// set scan_orgs empty to make it easier to test matched service values
						// we'll only match our entered field value and not also user service names from scan_orgs
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].scan_orgs = [];
						const { user } = render(<SearchPage />);
						await testFieldValid(
							label,
							validInput,
							unexpectedError,
							role,
							user,
						);
					},
				);

				it('"Scan Time" field allows valid datetime', async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					const testComponent = await screen.findByRole("textbox", {
						name: "Scan Time",
					});

					const dt = DateTime.now()
						.minus({ minute: 5 }) // past
						.set({ second: 0, millisecond: 0 })
						.toFormat(DATE_FORMAT);
					await user.type(testComponent, dt);
					await waitFor(() => expect(testComponent).toHaveDisplayValue(dt));
					await waitFor(() =>
						expect(
							screen.queryByText("Scan time can not be in the future"),
						).not.toBeInTheDocument(),
					);

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).not.toBeDisabled();
				});

				test.each([
					// break-up invalid character testing into a few discrete "bundles"
					// this prevents the test from timing out
					[
						"Service",
						/^service$/i,
						"!@#$%^&*()+=",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Service",
						/^service$/i,
						" \\:;\"'<,>?/",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Service",
						/^service$/i,
						"{}[]|",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Repository",
						/^repository$/i,
						"!@#$%^&*()+=",
						"Invalid repository name",
						"textbox" as const,
					],
					[
						"Repository",
						/^repository$/i,
						" \\:;\"'<,>?",
						"Invalid repository name",
						"textbox" as const,
					],
					[
						"Repository",
						/repository/i,
						"{}[]|",
						"Invalid repository name",
						"textbox" as const,
					],
				])(
					"%p field disallows invalid input",
					async (_fieldName, label, invalidInput, expectedError, role) => {
						// set scan_orgs empty to make it easier to test matched service values
						// we'll only match our entered field value and not also user service names from scan_orgs
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						mockAppState.currentUser.entities["self"].scan_orgs = [];
						const { user } = render(<SearchPage />);
						await testFieldInvalid(
							label,
							invalidInput,
							expectedError,
							role,
							user,
						);
					},
				);

				it('"Scan Time" field disallows invalid datetime', async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					const testComponent = await screen.findByRole("textbox", {
						name: "Scan Time",
					});

					const dt = DateTime.now()
						.plus({ minute: 5 }) // future
						.set({ second: 0, millisecond: 0 })
						.toFormat(DATE_FORMAT);
					await user.type(testComponent, dt);
					await waitFor(() => expect(testComponent).toHaveDisplayValue(dt));
					await waitFor(() =>
						expect(
							screen.getByText("Scan time can not be in the future"),
						).toBeInTheDocument(),
					);

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeDisabled();
				});
			});

			describe("Component dialog contains expected fields and values", () => {
				it("For a component with no licenses", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fetch the data
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=component",
					);

					const componentName = "awesome-zazz";
					const componentVersion = "99.0.1";

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("rowheader", {
						name: componentName,
					});
					await user.click(row);

					// find open dialog with component name + - + component version
					const dialogTitle = `${componentName}-${componentVersion}`;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					// dialog title should have a copy-to-clipboard button
					within(dialog).getByRole("heading", {
						name: `${dialogTitle} Copy to clipboard`,
					});

					const componentNameField =
						within(dialog).getByText(/component name/i);
					within(componentNameField).getByRole("button", {
						name: /copy to clipboard/i,
					});
					if (componentNameField.parentElement) {
						expect(
							within(componentNameField.parentElement).getByText(componentName),
						).toBeInTheDocument();
					} else {
						fail("Component Name value missing");
					}

					const componenVersionField =
						within(dialog).getByText(/component version/i);
					within(componenVersionField).getByRole("button", {
						name: /copy to clipboard/i,
					});
					if (componenVersionField.parentElement) {
						expect(
							within(componenVersionField.parentElement).getByText(
								componentVersion,
							),
						).toBeInTheDocument();
					} else {
						fail("Component Version value missing");
					}

					const licenseCount = 0;
					const licenseField = within(dialog).getByText(
						`Licenses (${licenseCount})`,
					);
					// no copy-to-clipbard button since there are no licenses
					expect(
						within(licenseField).queryByRole("button", {
							name: /copy to clipboard/i,
						}),
					).not.toBeInTheDocument();
					if (licenseField.parentElement) {
						expect(
							within(licenseField.parentElement).queryAllByRole("listitem"),
						).toHaveLength(licenseCount);
					} else {
						fail("Licenses value missing");
					}

					within(dialog).getByRole("button", { name: /repositories/i });
					within(dialog).getByRole("button", { name: /ok/i });
				});

				it("For a component with multiple licenses", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fetch the data
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=component",
					);

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: "The First License, The Second License, The Third License",
					});
					await user.click(row);

					// find dialog with component name + - + component version
					const componentName = "super-duper-software";
					const componentVersion = "1.3.4b";
					const dialogTitle = `${componentName}-${componentVersion}`;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					// dialog title should have a copy-to-clipboard button
					within(dialog).getByRole("heading", {
						name: `${dialogTitle} Copy to clipboard`,
					});

					const componentNameField =
						within(dialog).getByText(/component name/i);
					within(componentNameField).getByRole("button", {
						name: /copy to clipboard/i,
					});
					if (componentNameField.parentElement) {
						expect(
							within(componentNameField.parentElement).getByText(componentName),
						).toBeInTheDocument();
					} else {
						fail("Component Name value missing");
					}

					const componenVersionField =
						within(dialog).getByText(/component version/i);
					within(componenVersionField).getByRole("button", {
						name: /copy to clipboard/i,
					});
					if (componenVersionField.parentElement) {
						expect(
							within(componenVersionField.parentElement).getByText(
								componentVersion,
							),
						).toBeInTheDocument();
					} else {
						fail("Component Version value missing");
					}

					const licenseCount = 3;
					const licenseField = within(dialog).getByText(
						`Licenses (${licenseCount})`,
					);
					within(licenseField).getByRole("button", {
						name: /copy to clipboard/i,
					});
					if (licenseField.parentElement) {
						expect(
							within(licenseField.parentElement).getAllByRole("listitem"),
						).toHaveLength(licenseCount);
					} else {
						fail("Licenses value missing");
					}

					within(dialog).getByRole("button", { name: /repositories/i });
					within(dialog).getByRole("button", { name: /ok/i });
				});

				it("Clicking OK button closes dialog", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fetch the data
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=component",
					);

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: "The First License, The Second License, The Third License",
					});
					await user.click(row);

					// find dialog with component name + - + component version
					const componentName = "super-duper-software";
					const componentVersion = "1.3.4b";
					const dialogTitle = `${componentName}-${componentVersion}`;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					const okButton = within(dialog).getByRole("button", { name: /ok/i });
					await user.click(okButton);

					await waitFor(() =>
						expect(
							screen.queryByRole("dialog", { name: new RegExp(dialogTitle) }),
						).not.toBeInTheDocument(),
					);
				});

				it("Clicking Repositories button switches to repos dialog page", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// fetch the data
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
							screen.queryByText(/fetching results.../),
						).not.toBeInTheDocument();
					});
					await waitFor(
						() => {
							expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					);

					// "component" should not be included in filters
					// it determines that API call client.getComponents should be called for a components search
					expect(mockGetComponents).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "name",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=component",
					);

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: "The First License, The Second License, The Third License",
					});
					await user.click(row);

					// find dialog with component name + - + component version
					const componentName = "super-duper-software";
					const componentVersion = "1.3.4b";
					const dialogTitle = `${componentName}-${componentVersion}`;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					const reposButton = within(dialog).getByRole("button", {
						name: /repositories/i,
					});
					await user.click(reposButton);

					await within(dialog).findByRole("heading", { name: /repositories/i });

					// check loading indicator when results being fetched
					await waitFor(() => {
						within(dialog).queryByText(/fetching repositories.../);
					});
					await waitFor(
						() => {
							expect(
								within(dialog).queryByText(/fetching repositories.../),
							).not.toBeInTheDocument();
						},
						{ timeout: 6000 },
					); // this sometimes times-out with default 1000ms timeout

					expect(mockGetComponentRepos).toHaveBeenLastCalledWith(
						componentName,
						componentVersion,
						{
							meta: {
								currentPage: 0,
								filters: {},
								itemsPerPage: 10, // subpage has 10 results per page instead of 50
								orderBy: "service",
							},
						},
					);

					// sortable columns are buttons
					await within(dialog).findByRole("button", {
						name: /service sorted ascending/i,
					}); // default sort by name ascending
					within(dialog).getByRole("button", { name: "Repository" });

					// not sortable columns
					within(dialog).getByRole("columnheader", { name: "Risk" });

					const repoTable = within(dialog).getByRole("table", {
						name: "results table",
					});
					const rows = within(repoTable).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchComponentRepos.results.length);

					// clicking a row in this table should not open a new dialog
					const repoRow = within(repoTable).getByRole("cell", {
						name: "cartoons-we-love",
					});
					await user.click(repoRow);

					// dialog window should stay the same (title)
					await screen.findByRole("dialog", { name: new RegExp(dialogTitle) });

					// there should be no (search) form fields on this dialog page
					expect(within(dialog).queryAllByRole("textbox")).toHaveLength(0);

					// clicking details button takes user back to (first) components details page
					const detailsButton = within(dialog).getByRole("button", {
						name: /details/i,
					});
					await user.click(detailsButton);

					// repos header removed
					await waitFor(() =>
						expect(
							within(dialog).queryByRole("heading", { name: /repositories/i }),
						).not.toBeInTheDocument(),
					);
					// component name field on the page
					expect(
						within(dialog).getByText(/component name/i),
					).toBeInTheDocument();
				});
			});
		});
	});
});
