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
	mockSearchComponentRepos,
	mockSearchRepos,
} from "../../../../testData/testMockData";
import {
	DATE_FORMAT,
	DATE_PLACEHOLDER,
	DEFAULT_SEARCH_OPTION,
	SEARCH_OPTIONS,
	SEARCH_OPTION_REPOS,
	testFieldInvalid,
	testFieldValid,
	validateSelect,
} from "pages/SearchPageTestCommon";

let mockAppState: any;
let mockLocation: any;
let mockRequest: any;
let mockGetComponentRepos: any;
let mockGetRepos: any;
let mockHistory: any[] = [];
let globalWindow: any;
let promiseSearchRepo: any;
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

		// spyOn getRepos to ensure they are called and check params
		// but don't mock them since we need them to run to transform the data for the data table
		// spy and mock axios.request for this
		mockGetComponentRepos = jest.spyOn(client, "getComponentRepos");
		mockGetRepos = jest.spyOn(client, "getRepos");
		mockRequest = jest.spyOn(axios, "request");
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
			return promiseSearchComponentRepo;
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
		mockGetComponentRepos.mockRestore();
		mockGetRepos.mockRestore();
		mockRequest.mockRestore();
		jest.restoreAllMocks();
		promiseSearchRepo = null;
		promiseSearchComponentRepo = null;
		//console.log("Ending test: ", expect.getState().currentTestName);
	});

	describe("Form fields and defaults", () => {
		describe("Repositories form", () => {
			describe("Validate expected fields and default options", () => {
				// test select input fields
				test.each([
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
						"Last Scan Time Match",
						/last scan time match/i,
						["Before", "After"],
						"Before",
						false,
					],
					[
						"Last Qualified Scan Time Match",
						/last qualified scan time match/i,
						["No Qualified Scans", "Any Qualified Scan", "Before", "After"],
						"Before",
						false,
					],
				])(
					"%p field Match select field options and expected default",
					async (_fieldName, label, options, defaultOptions, disabled) => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const { user } = render(<SearchPage />);

						// switch to repositories form
						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_REPOS,
							user,
						});
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
					["Repository", "Repository", "", ""],
					[
						"Last Scan Time",
						/last scan time/i,
						"",
						DATE_PLACEHOLDER,
					],
					[
						"Last Qualified Scan Time",
						/last qualified scan time/i,
						"",
						DATE_PLACEHOLDER,
					],
				])(
					"%p text field",
					async (_fieldName, label, defaultValue, placeholder) => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const { user } = render(<SearchPage />);

						// switch to repositories form
						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_REPOS,
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
					},
				);

				it("Risk field checkbox options", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					const riskField = screen.getByText("Risk");
					expect(riskField).toBeInTheDocument();
					if (riskField.parentElement) {
						within(riskField.parentElement).getByRole("checkbox", {
							name: "Low",
						});
						within(riskField.parentElement).getByRole("checkbox", {
							name: "Moderate",
						});
						within(riskField.parentElement).getByRole("checkbox", {
							name: "High",
						});
						within(riskField.parentElement).getByRole("checkbox", {
							name: "Critical",
						});
						within(riskField.parentElement).getByRole("checkbox", {
							name: "Priority",
						});
					} else {
						fail("Risk field has no options");
					}
				});

				// auto-complete field is a special use-case because it's an auto-complete
				// field that should have certain values, so validate that separately
				// @TODO throws key error in validateSelect("Service")
				it("Service autocomplete field options and default", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

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
					await validateSelect({
						label: "Service",
						options: options,
						defaultOption: "",
						disabled: false,
						user,
					});
				});

				// repo search form should not have this field
				it("License field is not visible on Repo search form", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// not using *ByRole (a11y tree), so this element will exist but should be hidden at this point
					expect(
						screen.queryByRole("textbox", { name: /license/i }),
					).not.toBeInTheDocument();
				});

				it("Form submit/reset buttons exist", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
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

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					screen.getByRole("heading", { name: /results/i });
					screen.getByText(/no results match current filters/i);
					expect(
						screen.queryByRole("button", {
							name: /copy link to these search results/i,
						}),
					).not.toBeInTheDocument();
				});

				it("Results table repos search action", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// accordion open on load
					expect(
						screen.getByRole("button", { name: /search filters/i }),
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
					expect(
						screen.getByRole("button", { name: /search filters/i }),
					).toHaveAttribute("aria-expanded", "false");

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=repo",
					);

					// sortable columns are buttons
					screen.getByRole("button", { name: /service sorted ascending/i }); // default sort by service ascending
					screen.getByRole("button", { name: "Repository" });
					screen.getByRole("button", { name: "Risk" });
					// unsortable columns are columnheaders
					screen.getByRole("columnheader", { name: "Last Scan" });
					screen.getByRole("columnheader", { name: "Last Qualified Scan" });

					// results should have a copy button
					screen.getByRole("button", {
						name: /copy link to these search results/i,
					});

					// check table row count matches result data
					// role = checkbox matches an entire row in the table
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchRepos.results.length);

					const count = screen.getAllByRole("cell", {
						name: /no qualified scans/i,
					});
					expect(count.length).toBeGreaterThan(0);
				});

				// this test generates the warning: An update to SearchPage inside a test was not wrapped in act(...)
				it("All form fields disabled on submit", async () => {
					jest.useFakeTimers();
					mockGetRepos.mockImplementation(() => {
						// add a mock to wait on submit while form fields can be tested
						return new Promise((res) => setTimeout(res, 30000));
					});
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />, null, {
						advanceTimers: jest.advanceTimersByTime,
					});

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					const serviceMatch = screen.getByRole("combobox", {
						name: /service match/i,
					});
					const service = screen.getByRole("combobox", {
						name: "Service",
					});
					const repoMatch = screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repo = screen.getByRole("textbox", {
						name: "Repository",
					});

					const scanTimeMatch = screen.getByRole("combobox", {
						name: /last scan time match/i,
					});
					const scanTime = screen.getByRole("textbox", {
						name: /last scan time/i,
					});
					const qualifiedScanTimeMatch = screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const qualifiedScanTime = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});

					const riskField = screen.getByText("Risk");
					let riskLow, riskModerate, riskHigh, riskCritical, riskPriority;
					if (riskField.parentElement) {
						riskLow = within(riskField.parentElement).getByRole("checkbox", {
							name: "Low",
						});
						riskModerate = within(riskField.parentElement).getByRole(
							"checkbox",
							{
								name: "Moderate",
							},
						);
						riskHigh = within(riskField.parentElement).getByRole("checkbox", {
							name: "High",
						});
						riskCritical = within(riskField.parentElement).getByRole(
							"checkbox",
							{
								name: "Critical",
							},
						);
						riskPriority = within(riskField.parentElement).getByRole(
							"checkbox",
							{
								name: "Priority",
							},
						);
					} else {
						fail("Risk field has no options");
					}

					// Mui selecion elements use aria-disabled instead of disabled attribute
					expect(serviceMatch).not.toHaveAttribute("aria-disabled");
					expect(service).not.toBeDisabled();
					expect(repoMatch).not.toHaveAttribute("aria-disabled");
					expect(repo).not.toBeDisabled();
					expect(scanTimeMatch).not.toHaveAttribute("aria-disabled");
					expect(scanTime).not.toBeDisabled();
					expect(qualifiedScanTimeMatch).not.toHaveAttribute("aria-disabled");
					expect(qualifiedScanTime).not.toBeDisabled();
					expect(submitButton).not.toBeDisabled();

					// Mui chips, again uses aria-disabled
					expect(riskLow).not.toHaveAttribute("aria-disabled");
					expect(riskModerate).not.toHaveAttribute("aria-disabled");
					expect(riskHigh).not.toHaveAttribute("aria-disabled");
					expect(riskCritical).not.toHaveAttribute("aria-disabled");
					expect(riskPriority).not.toHaveAttribute("aria-disabled");

					await user.click(submitButton);

					// check loading indicator when results being fetched
					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});

					// check all form fields disabled
					expect(serviceMatch).toHaveAttribute("aria-disabled", "true");
					expect(service).toBeDisabled();
					expect(repoMatch).toHaveAttribute("aria-disabled", "true");
					expect(repo).toBeDisabled();
					expect(scanTimeMatch).toHaveAttribute("aria-disabled", "true");
					expect(scanTime).toBeDisabled();
					expect(qualifiedScanTimeMatch).toHaveAttribute("aria-disabled", "true");
					expect(qualifiedScanTime).toBeDisabled();
					expect(submitButton).toBeDisabled();

					expect(riskLow).toHaveAttribute("aria-disabled", "true");
					expect(riskModerate).toHaveAttribute("aria-disabled", "true");
					expect(riskHigh).toHaveAttribute("aria-disabled", "true");
					expect(riskCritical).toHaveAttribute("aria-disabled", "true");
					expect(riskPriority).toHaveAttribute("aria-disabled", "true");

					jest.runOnlyPendingTimers();
					jest.useRealTimers();
				});

				it("Filters and URL search params match default matchers", async () => {
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// fill-out the form fields
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					await user.type(serviceField, `${serviceValue}{enter}`); // enter to select match in list

					const repoField = await screen.findByRole("textbox", {
						name: /^repository$/i,
					});
					await user.type(repoField, repoValue);

					// select all risk values
					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						async (risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							await user.click(riskCheckbox);
							expect(riskCheckbox).toBeChecked();
						},
					);

					const scanTimeField = await screen.findByRole("textbox", {
						name: /last scan time/i,
					});
					await user.type(scanTimeField, dt.toFormat(DATE_FORMAT));
					await waitFor(() => {
						expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					});

					const qualifiedScanTimeField = await screen.findByRole("textbox", {
						name: /last qualified scan time/i,
					});
					await user.type(qualifiedScanTimeField, dt.toFormat(DATE_FORMAT));
					await waitFor(() => {
						expect(qualifiedScanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
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

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
								last_qualified_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
								repo: {
									filter: repoValue,
									match: "icontains",
								},
								service: {
									filter: serviceValue,
									match: "exact",
								},
								risk: {
									filter: ["low", "moderate", "high", "critical", "priority"],
									match: "exact",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					const datetimeStr = encodeURIComponent(dt.toUTC().toISO() ?? "")
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=repo&last_qualified_scan__lt=${datetimeStr}&last_scan__lt=${datetimeStr}&repo__icontains=${repoValue}&risk=low&risk=moderate&risk=high&risk=critical&risk=priority&service=${serviceValue}`,
					);
				});

				it("Filters and URL search params match secondary matchers", async () => {
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// fill-out the form fields
					await validateSelect({
						label: /service match/i,
						options: ["Contains", "Exact"],
						defaultOption: "Exact",
						disabled: false,
						selectOption: "Contains",
						user,
					});
					const serviceField = await screen.findByRole("combobox", {
						name: /^service$/i,
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
						name: /^repository$/i,
					});
					await user.type(repoField, repoValue);

					// select all risk values
					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						async (risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							await user.click(riskCheckbox);
							expect(riskCheckbox).toBeChecked();
						},
					);

					await validateSelect({
						label: /last qualified scan time match/i,
						options: [
							"No Qualified Scans",
							"Any Qualified Scan",
							"Before",
							"After",
						],
						defaultOption: "Before",
						disabled: false,
						selectOption: "No Qualified Scans",
						user,
					});
					const scanTimeField = await screen.findByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toBeDisabled(); // no qualified scans matcher should disable associated field

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

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: "true",
									match: "null",
								},
								repo: {
									filter: repoValue,
									match: "exact",
								},
								service: {
									filter: serviceValue,
									match: "icontains",
								},
								risk: {
									filter: ["low", "moderate", "high", "critical", "priority"],
									match: "exact",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=repo&last_qualified_scan__null=true&repo=${repoValue}&risk=low&risk=moderate&risk=high&risk=critical&risk=priority&service__icontains=${serviceValue}`,
					);
				});

				it("Filters and URL search params with Last Qualified Scan Time Before match", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// fill-out the form fields
					await validateSelect({
						label: /last qualified scan time match/i,
						options: [
							"No Qualified Scans",
							"Any Qualified Scan",
							"Before",
							"After",
						],
						defaultOption: "Before",
						disabled: false,
						selectOption: "Before",
						user,
					});
					const scanTimeField = await screen.findByRole("textbox", {
						name: /last qualified scan time/i,
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

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=repo&last_qualified_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}`,
					);
				});

				it("Filters and URL search params with Last Qualified Scan Time After match", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// fill-out the form fields
					await validateSelect({
						label: /last qualified scan time match/i,
						options: [
							"No Qualified Scans",
							"Any Qualified Scan",
							"Before",
							"After",
						],
						defaultOption: "Before",
						disabled: false,
						selectOption: "After",
						user,
					});
					const scanTimeField = await screen.findByRole("textbox", {
						name: /last qualified scan time/i,
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

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: dt.toUTC().toISO(),
									match: "gt",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=repo&last_qualified_scan__gt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}`,
					);
				});

				it("Filters and URL search params with Last Qualified Scan Time Any match", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					// fill-out the form fields
					await validateSelect({
						label: /last qualified scan time match/i,
						options: [
							"No Qualified Scans",
							"Any Qualified Scan",
							"Before",
							"After",
						],
						defaultOption: "Before",
						disabled: false,
						selectOption: "Any Qualified Scan",
						user,
					});
					const scanTimeField = await screen.findByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toBeDisabled();

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

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: "false",
									match: "null",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/search?category=repo&last_qualified_scan__null=false`,
					);
				});

				describe("Risk field clear all button", () => {
					let riskLow: any,
						riskModerate: any,
						riskHigh: any,
						riskCritical: any,
						riskPriority: any;
					let user: any;

					beforeEach(async () => {
						mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
						const renderProps = render(<SearchPage />);
						user = renderProps.user;

						// switch to repositories form
						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_REPOS,
							user,
						});

						const riskField = screen.getByText("Risk");
						if (riskField.parentElement) {
							riskLow = within(riskField.parentElement).getByRole("checkbox", {
								name: "Low",
							});
							riskModerate = within(riskField.parentElement).getByRole(
								"checkbox",
								{
									name: "Moderate",
								},
							);
							riskHigh = within(riskField.parentElement).getByRole("checkbox", {
								name: "High",
							});
							riskCritical = within(riskField.parentElement).getByRole(
								"checkbox",
								{
									name: "Critical",
								},
							);
							riskPriority = within(riskField.parentElement).getByRole(
								"checkbox",
								{
									name: "Priority",
								},
							);
						} else {
							fail("Risk field has no options");
						}

						expect(riskLow).not.toBeChecked();
						await user.click(riskLow);
						await waitFor(() => expect(riskLow).toBeChecked());

						expect(riskModerate).not.toBeChecked();
						await user.click(riskModerate);
						await waitFor(() => expect(riskModerate).toBeChecked());

						expect(riskHigh).not.toBeChecked();
						await user.click(riskHigh);
						await waitFor(() => expect(riskHigh).toBeChecked());

						expect(riskCritical).not.toBeChecked();
						await user.click(riskCritical);
						await waitFor(() => expect(riskCritical).toBeChecked());

						expect(riskPriority).not.toBeChecked();
						await user.click(riskPriority);
						await waitFor(() => expect(riskPriority).toBeChecked());
					});

					it("Button click clears all risk options", async () => {
						const clearButton = screen.getByRole("button", {
							name: /clear options/i,
						});
						expect(clearButton).toBeInTheDocument();
						await user.click(clearButton);
						await waitFor(() => expect(riskLow).not.toBeChecked());
						expect(riskModerate).not.toBeChecked();
						expect(riskHigh).not.toBeChecked();
						expect(riskCritical).not.toBeChecked();
						expect(riskPriority).not.toBeChecked();
					});

					it("Spacebar key clears all risk options", async () => {
						const clearButton = screen.getByRole("button", {
							name: /clear options/i,
						});
						expect(clearButton).toBeInTheDocument();
						await user.keyboard(" "); // space
						await waitFor(() => expect(riskLow).not.toBeChecked());
						expect(riskModerate).not.toBeChecked();
						expect(riskHigh).not.toBeChecked();
						expect(riskCritical).not.toBeChecked();
						expect(riskPriority).not.toBeChecked();
					});

					it("Enter key clears all risk options", async () => {
						const clearButton = screen.getByRole("button", {
							name: /clear options/i,
						});
						expect(clearButton).toBeInTheDocument();
						await user.keyboard("{enter}");
						await waitFor(() => expect(riskLow).not.toBeChecked());
						expect(riskModerate).not.toBeChecked();
						expect(riskHigh).not.toBeChecked();
						expect(riskCritical).not.toBeChecked();
						expect(riskPriority).not.toBeChecked();
					});
				});
			});

			describe("URL query params pre-populate form fields", () => {
				it("Valid default matchers populate form", async () => {
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=repo&last_qualified_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}&repo__icontains=${repoValue}&risk=low&risk=moderate&risk=high&risk=critical&risk=priority&service=${serviceValue}`,
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

					// all form fields are defaults (empty with default matchers)
					screen.getByRole("combobox", {
						name: /service match/i,
					});
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					expect(serviceField).toHaveDisplayValue(serviceValue);

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repoField = screen.getByRole("textbox", {
						name: /^repository$/i,
					});
					expect(repoField).toHaveDisplayValue(repoValue);

					// select all risk values
					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));

					// submit form
					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
								repo: {
									filter: repoValue,
									match: "icontains",
								},
								service: {
									filter: serviceValue,
									match: "exact",
								},
								risk: {
									filter: ["low", "moderate", "high", "critical", "priority"],
									match: "exact",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchRepos.results.length);
				});

				it("Valid secondary matchers populate form", async () => {
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";

					mockLocation = {
						search: `?category=repo&last_qualified_scan__null=&repo=${repoValue}&risk=low&risk=moderate&risk=high&risk=critical&risk=priority&service__icontains=${serviceValue}`,
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

					// all form fields are defaults (empty with default matchers)
					screen.getByRole("combobox", {
						name: /service match/i,
					});
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					expect(serviceField).toHaveDisplayValue(serviceValue);

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repoField = screen.getByRole("textbox", {
						name: /^repository$/i,
					});
					expect(repoField).toHaveDisplayValue(repoValue);

					// select all risk values
					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue("");

					// submit form
					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: "true",
									match: "null",
								},
								repo: {
									filter: repoValue,
									match: "exact",
								},
								service: {
									filter: serviceValue,
									match: "icontains",
								},
								risk: {
									filter: ["low", "moderate", "high", "critical", "priority"],
									match: "exact",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchRepos.results.length);
				});

				it("Reset button resets form", async () => {
					const serviceValue = "goodVcs.goodOrg.com";
					const repoValue = "repo_value";
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=repo&last_qualified_scan__lt=${encodeURIComponent(
							dt.toUTC().toISO() ?? "",
						)}&repo=${repoValue}&risk=low&risk=moderate&risk=high&risk=critical&risk=priority&service__icontains=${serviceValue}`,
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

					// all form fields are defaults (empty with default matchers)
					screen.getByRole("combobox", {
						name: /service match/i,
					});
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					expect(serviceField).toHaveDisplayValue(serviceValue);

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repoField = screen.getByRole("textbox", {
						name: /^repository$/i,
					});
					expect(repoField).toHaveDisplayValue(repoValue);

					// select all risk values
					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));

					const resetButton = screen.getByRole("button", {
						name: /^reset filters$/i,
					});
					expect(resetButton).toBeEnabled();
					await user.click(resetButton);

					// form should be in default state after reset
					await screen.findByRole("combobox", {
						name: /service match/i,
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					expect(repoField).toHaveDisplayValue("");

					// all risk values unchecked
					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).not.toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					expect(scanTimeField).toHaveDisplayValue("");
				});

				it("Valid Last Qualified Scan Time Before match populates form", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=repo&last_qualified_scan__lt=${encodeURIComponent(
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

					screen.getByRole("combobox", {
						name: /service match/i,
					});
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repoField = screen.getByRole("textbox", {
						name: /^repository$/i,
					});
					expect(repoField).toHaveDisplayValue("");

					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).not.toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					expect(scanTimeField).toBeEnabled();

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: dt.toUTC().toISO(),
									match: "lt",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchRepos.results.length);
				});

				it("Valid Last Qualified Scan Time After match populates form", async () => {
					const dt = DateTime.now()
						.minus({ days: 10 })
						.set({ second: 0, millisecond: 0 });

					mockLocation = {
						search: `?category=repo&last_qualified_scan__gt=${encodeURIComponent(
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

					screen.getByRole("combobox", {
						name: /service match/i,
					});
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repoField = screen.getByRole("textbox", {
						name: /^repository$/i,
					});
					expect(repoField).toHaveDisplayValue("");

					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).not.toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toHaveDisplayValue(dt.toFormat(DATE_FORMAT));
					expect(scanTimeField).toBeEnabled();

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: dt.toUTC().toISO(),
									match: "gt",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchRepos.results.length);
				});

				it("Valid Last Qualified Scan Time Any match populates form", async () => {
					mockLocation = {
						search: `?category=repo&last_qualified_scan__null=false`,
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

					screen.getByRole("combobox", {
						name: /service match/i,
					});
					const serviceField = screen.getByRole("combobox", {
						name: "Service",
					});
					expect(serviceField).toHaveDisplayValue("");

					screen.getByRole("combobox", {
						name: /repository match/i,
					});
					const repoField = screen.getByRole("textbox", {
						name: /^repository$/i,
					});
					expect(repoField).toHaveDisplayValue("");

					["Low", "Moderate", "High", "Critical", "Priority"].forEach(
						(risk: string) => {
							const riskCheckbox = screen.getByRole("checkbox", { name: risk });
							expect(riskCheckbox).not.toBeChecked();
						},
					);

					screen.getByRole("combobox", {
						name: /last qualified scan time match/i,
					});
					const scanTimeField = screen.getByRole("textbox", {
						name: /last qualified scan time/i,
					});
					expect(scanTimeField).toBeDisabled();

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});
					expect(submitButton).toBeEnabled();

					// form has been submitted
					// "repo" should not be included in filters
					// it determines that API call client.getRepos should be called for a repo search
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {
								last_qualified_scan: {
									filter: "false",
									match: "null",
								},
							},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});

					// table is populated with search results
					const table = screen.getByRole("table", { name: "results table" });
					const rows = within(table).getAllByRole("checkbox");
					expect(rows).toHaveLength(mockSearchRepos.results.length);
				});
			});

			describe("Validate field bounds", () => {
				test.each([
					[
						"Service",
						"Service",
						"abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ.0123456789",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Repository",
						"Repository",
						"abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ.0123456789_",
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

						// switch to repositories form
						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_REPOS,
							user,
						});
						await testFieldValid(
							label,
							validInput,
							unexpectedError,
							role,
							user,
						);
					},
				);

				it('"Last Qualified Scan Time" field allows valid datetime', async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					const testComponent = await screen.findByRole("textbox", {
						name: "Last Qualified Scan Time",
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
						"Service",
						"!@#$%^&*()+=",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Service",
						"Service",
						" \\:;\"'<,>?/",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Service",
						"Service",
						"{}[]|",
						"Must be a valid service name [azure|bitbucket|github] or hostname",
						"combobox" as const,
					],
					[
						"Repository",
						"Repository",
						"!@#$%^&*()+=",
						"Invalid repository name",
						"textbox" as const,
					],
					[
						"Repository",
						"Repository",
						" \\:;\"'<,>?",
						"Invalid repository name",
						"textbox" as const,
					],
					[
						"Repository",
						"Repository",
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

						// switch to repositories form
						await validateSelect({
							label: /search for/i,
							options: SEARCH_OPTIONS,
							defaultOption: DEFAULT_SEARCH_OPTION,
							disabled: false,
							selectOption: SEARCH_OPTION_REPOS,
							user,
						});
						await testFieldInvalid(
							label,
							invalidInput,
							expectedError,
							role,
							user,
						);
					},
				);

				it('"Last Qualified Scan Time" field disallows invalid datetime', async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

					const testComponent = await screen.findByRole("textbox", {
						name: "Last Qualified Scan Time",
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

			describe("Repo dialog contains expected fields and values", () => {
				it("For a repo with a link to repo in VCS", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

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
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=repo",
					);

					const repoName = "tv/dev";

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: repoName,
					});
					await user.click(row);

					// find dialog with repo name
					const dialogTitle = repoName;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					// dialog title should have a copy-to-clipboard button
					within(dialog).getByRole("heading", {
						name: `${dialogTitle} Copy to clipboard`,
					});

					// should have a risk chip
					within(dialog).getByText(/priority/i);

					// should have a link to source code repo
					const vcsLink = within(dialog).getByRole("link", {
						name: /view in version control/i,
					});

					// link should have expected safety attributes (nofollow, noreferrer, etc.)
					expect(vcsLink).toHaveAttribute("target", "_blank");
					expect(vcsLink).toHaveAttribute(
						"rel",
						"noopener noreferrer nofollow",
					);
				});

				it("For a repo with a last scan time", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

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
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=repo",
					);

					const repoName = "tv/dev";

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: repoName,
					});
					await user.click(row);

					// find dialog with repo name
					const dialogTitle = repoName;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					const scanTimeField = within(dialog).getByText(
						/last qualified scan time/i,
					);
					// scan time doesn't have a copy-to-clipboard, it will have a link to the scan if there a last scan time
					expect(
						within(scanTimeField).queryByRole("button", {
							name: /copy to clipboard/i,
						}),
					).not.toBeInTheDocument();
					if (scanTimeField.parentElement) {
						expect(
							within(scanTimeField.parentElement).getByText(
								/Wednesday, February 2, 2022(,| at) 9:00:00 AM EST/,
							),
						).toBeInTheDocument();

						const scanLink = within(scanTimeField.parentElement).getByRole(
							"link",
							{ name: /open this scan in a new tab/i },
						);

						// link should have expected attributes
						expect(scanLink).toHaveAttribute("target", "_blank");
						expect(scanLink).not.toHaveAttribute("rel"); // internal link so doesn't need rel attributes
					} else {
						fail("Last Qualified Scan Time value missing");
					}
				});

				it("For a repo to contain remaining expected fields/values", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

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
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=repo",
					);

					const repoName = "tv/dev";

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: repoName,
					});
					await user.click(row);

					// find dialog with repo name
					const dialogTitle = repoName;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					// dialog title should have a copy-to-clipboard button
					within(dialog).getByRole("heading", {
						name: `${dialogTitle} Copy to clipboard`,
					});

					// should have a risk chip
					within(dialog).getByText(/priority/i);

					// should have a link to source code repo
					const vcsLink = within(dialog).getByRole("link", {
						name: /view in version control/i,
					});

					// link should have expected safety attributes (nofollow, noreferrer, etc.)
					expect(vcsLink).toHaveAttribute("target", "_blank");
					expect(vcsLink).toHaveAttribute(
						"rel",
						"noopener noreferrer nofollow",
					);

					const serviceField = within(dialog).getByText(/service/i);
					within(serviceField).getByRole("button", {
						name: /copy to clipboard/i,
					});
					if (serviceField.parentElement) {
						expect(
							within(serviceField.parentElement).getByText("azure"),
						).toBeInTheDocument();
					} else {
						fail("Service value missing");
					}

					const repoField = within(dialog).getByText(/repository/i);
					within(repoField).getByRole("button", { name: /copy to clipboard/i });
					if (repoField.parentElement) {
						expect(
							within(repoField.parentElement).getByText(repoName),
						).toBeInTheDocument();
					} else {
						fail("Repository value missing");
					}
				});

				it("For a repo without last scan time", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

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
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=repo",
					);

					const repoName = "tv/qa";

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: repoName,
					});
					await user.click(row);

					// find dialog with repo name
					const dialogTitle = repoName;
					const dialog = await screen.findByRole("dialog", {
						name: new RegExp(dialogTitle),
					});

					const scanTimeField = within(dialog).getByText(
						/last qualified scan time/i,
					);
					// scan time doesn't have a copy-to-clipboard, it will have a link to the scan if there a last scan time
					expect(
						within(scanTimeField).queryByRole("button", {
							name: /copy to clipboard/i,
						}),
					).not.toBeInTheDocument();
					if (scanTimeField.parentElement) {
						expect(
							within(scanTimeField.parentElement).getByText(
								/no qualified scans/i,
							),
						).toBeInTheDocument();

						expect(
							within(scanTimeField.parentElement).queryByRole("link", {
								name: /open this scan in a new tab/i,
							}),
						).not.toBeInTheDocument();
					} else {
						fail("Last Qualified Scan Time value missing");
					}
				});

				it("Clicking OK button closes dialog", async () => {
					mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
					const { user } = render(<SearchPage />);

					// switch to repositories form
					await validateSelect({
						label: /search for/i,
						options: SEARCH_OPTIONS,
						defaultOption: DEFAULT_SEARCH_OPTION,
						disabled: false,
						selectOption: SEARCH_OPTION_REPOS,
						user,
					});

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
					expect(mockGetRepos).toHaveBeenLastCalledWith({
						meta: {
							currentPage: 0,
							filters: {},
							itemsPerPage: 50,
							orderBy: "service",
						},
					});
					expect(mockNavigate).toHaveBeenLastCalledWith(
						"/search?category=repo",
					);

					const repoName = "tv/dev";

					// find the table row with multiple licenses and click it to open the dialog
					const table = screen.getByRole("table", { name: "results table" });
					const row = within(table).getByRole("cell", {
						name: repoName,
					});
					await user.click(row);

					const dialogTitle = repoName;
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
			});
		});
	});
});
