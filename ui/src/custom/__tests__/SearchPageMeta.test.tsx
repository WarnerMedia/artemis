import { render, screen, waitFor } from "test-utils";
import axios, { AxiosRequestConfig } from "axios";
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
import SearchPage from "pages/SearchPage";
import {
	mockStoreEmpty,
	mockSearchComponents,
	mockSearchRepos,
} from "../../../testData/testMockData";
import {
	DEFAULT_SEARCH_OPTION,
	SEARCH_OPTIONS,
	testFieldLength,
	validateSelect,
} from "pages/SearchPageTestCommon";

// REPLACE ME: MODIFY THESE TESTS TO MATCH YOUR SEARCH application_metadata IMPLEMENTATION
// SEE ALSO: SearchMetaField.tsx, searchMetaSchemas.ts

let mockAppState: any;
let mockLocation: any;
let mockRequest: any;
let mockGetComponents: any;
let mockGetRepos: any;
let mockHistory: any[] = [];
let globalWindow: any;
let promiseSearchRepo: any;
let promiseSearchComponent: any;

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
	jest.setTimeout(90000);

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
		mockGetRepos = jest.spyOn(client, "getRepos");
		mockRequest = jest.spyOn(axios, "request");
		promiseSearchComponent = Promise.resolve({ data: mockSearchComponents });
		promiseSearchRepo = Promise.resolve({ data: mockSearchRepos });
		mockRequest.mockImplementation((url: AxiosRequestConfig) => {
			if (url.url === "/search/repositories") {
				return promiseSearchRepo;
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
		mockGetRepos.mockRestore();
		mockRequest.mockRestore();
		jest.restoreAllMocks();
		promiseSearchComponent = null;
		promiseSearchRepo = null;
		//console.log("Ending test: ", expect.getState().currentTestName);
	});

	describe("Form fields and defaults", () => {
		describe("Repositories form", () => {
			describe("Validate expected fields and default options", () => {
				// test select input fields
				test.each([
					[
						"Meta Data Field1 Match",
						/meta data field1 match/i,
						["No Meta Data Field", "Any Meta Data Field", "Contains", "Exact"],
						"Contains",
						false,
					],
					[
						"Meta Data Field2 Match",
						/meta data field2 match/i,
						["No Meta Data Field", "Any Meta Data Field", "Contains", "Exact"],
						"Exact",
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
							selectOption: "Repositories",
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
					["Meta Data Field1", /meta data field1/i, "", ""],
					["Meta Data Field2", /meta data field2/i, "", ""],
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
							selectOption: "Repositories",
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

				// this test generates the warning: An update to SearchPage inside a test was not wrapped in act(...)
				it("Form fields disabled on submit", async () => {
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
						selectOption: "Repositories",
						user,
					});

					const field1Match = screen.getByRole("button", {
						name: /meta data field1 match contains/i,
					});
					const field1 = screen.getByRole("textbox", {
						name: /meta data field1/i,
					});
					const field2Match = screen.getByRole("button", {
						name: /meta data field2 match exact/i,
					});
					const field2 = screen.getByRole("textbox", {
						name: /meta data field2/i,
					});

					const submitButton = screen.getByRole("button", {
						name: /^search$/i,
					});

					// Mui selecion elements use aria-disabled instead of disabled attribute
					expect(field1Match).not.toHaveAttribute("aria-disabled");
					expect(field1).not.toBeDisabled();
					expect(field2Match).not.toHaveAttribute("aria-disabled");
					expect(field2).not.toBeDisabled();

					await user.click(submitButton);

					// check loading indicator when results being fetched
					await waitFor(() => {
						screen.queryByText(/fetching results.../);
					});
					await waitFor(() => {
						expect(screen.queryByRole("progressbar")).toBeInTheDocument();
					});

					// check all form fields disabled
					expect(field1Match).toHaveAttribute("aria-disabled", "true");
					expect(field1).toBeDisabled();
					expect(field2Match).toHaveAttribute("aria-disabled", "true");
					expect(field2).toBeDisabled();

					jest.runOnlyPendingTimers();
					jest.useRealTimers();
				});
			});

			describe("Validate field bounds", () => {
				test.each([
					[
						"Meta Data Field1",
						20,
						"Meta data field1 must be less than 20 characters",
					],
					[
						"Meta Data Field2",
						30,
						"Meta data field2 must be less than 30 characters",
					],
				])(
					"%p field not longer than %p characters",
					async (fieldName, maxLength, expectedError) => {
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
							selectOption: "Repositories",
							user,
						});
						await testFieldLength(fieldName, maxLength, expectedError, user);
					}
				);
			});

			// ... DEFINE ADDITIONAL TESTS, SEE SearchPage.test.tsx FOR SOME EXAMPLES
		});
	});
});
