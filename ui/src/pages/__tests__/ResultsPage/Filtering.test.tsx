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
	useLocation: jest.fn(),
}));
jest.mock("pages/MainPage", () => ({
	...(jest.requireActual("pages/MainPage") as any),
	__esModule: true,
	startScan: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
/* eslint-disable */
import { useLocation } from "react-router-dom";
import * as Yup from "yup";
import ResultsPage, {
	getResultFilters,
	setResultFilters,
} from "pages/ResultsPage";
import {
	mockHiddenFindings003,
	mockScan001,
	mockStoreSingleScan,
} from "../../../../testData/testMockData";
import { FilterDef } from "api/client";

let mockAppState: any;
let mockLocation: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;
const mockDispatch = jest.fn();

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("ResultsPage component", () => {
	jest.setTimeout(60000);

	beforeEach(() => {
		mockUseLocation.mockImplementation(() => {
			return mockLocation;
		});
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
	});
	afterEach(() => {
		mockUseLocation.mockClear();
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
	});
	describe("Filtering", () => {
		it("Filterng on Hidden Findings tab", async () => {
			const scan = JSON.parse(JSON.stringify(mockScan001));
			const id = scan.scan_id;

			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.ids.push(id);
			mockAppState.scans.entities[id] = scan;
			mockAppState.scans.totalRecords = 2;

			// add some hidden findings
			mockAppState.hiddenFindings = {
				ids: [],
				entities: {}, // entity added below
				status: "succeeded",
				error: null,
				totalRecords: 0,
			};
			mockHiddenFindings003.forEach((finding) => {
				if (finding.id) {
					mockAppState.hiddenFindings.ids.push(finding.id);
					mockAppState.hiddenFindings.entities[finding.id] = JSON.parse(
						JSON.stringify(finding)
					);
					mockAppState.hiddenFindings.totalRecords += 1;
				}
			});

			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const repo = scan.repo;
			const service = scan.service;

			// page needs query params to get the scan
			// tab=6 (hidden findings)
			mockLocation = {
				search: `?id=${encodeURIComponent(id)}&repo=${encodeURIComponent(
					repo
				)}&service=${encodeURIComponent(service)}&tab=6`,
			};
			const { user } = render(<ResultsPage />);

			// tab 6 passed in queryString, should select hidden findings tab
			let findingCount = 9;
			const tab = await screen.findByRole("tab", {
				name: `${findingCount} Hidden Findings`, // 13 allow-listed items, but some are rolled-up to a single vuln
			});
			expect(tab).toBeInTheDocument();
			expect(tab).toHaveAttribute("aria-selected", "true");

			// check nothing is filtered
			expect(screen.getAllByRole("checkbox")).toHaveLength(findingCount);
			expect(
				screen.getByText(`1–${findingCount} of ${findingCount}`)
			).toBeInTheDocument();
			expect(
				screen.queryByLabelText("This column is filtered")
			).not.toBeInTheDocument();

			// filter by critical severity
			const severityColumn = screen.getByRole("button", { name: "Severity" });
			const severityFilterField = screen.getByLabelText("Severity");
			await user.type(severityFilterField, "critical{enter}");
			await waitFor(() => {
				expect(
					within(severityFilterField).queryByText("Critical: 2")
				).toBeInTheDocument();
			});

			// check table filtered by severity
			findingCount = 2;
			expect(screen.getAllByRole("checkbox")).toHaveLength(findingCount);
			expect(
				screen.getByText(`1–${findingCount} of ${findingCount}`)
			).toBeInTheDocument();

			// check column now has a filter indicator
			expect(
				within(severityColumn).queryByLabelText("This column is filtered")
			).toBeInTheDocument();

			// filter category by vulnerability
			const categoryColumn = screen.getByRole("button", {
				name: "Category sorted ascending",
			});
			const categoryFilterField = screen.getByLabelText("Category");
			await user.type(categoryFilterField, "vulnerability{enter}");
			await waitFor(() => {
				expect(
					within(categoryFilterField).queryByText("Vulnerability: 3")
				).toBeInTheDocument();
			});

			// check table filtered by severity
			findingCount = 1;
			expect(screen.getAllByRole("checkbox")).toHaveLength(findingCount);
			expect(
				screen.getByText(`1–${findingCount} of ${findingCount}`)
			).toBeInTheDocument();

			// check column now has a filter indicator
			expect(
				within(categoryColumn).queryByLabelText("This column is filtered")
			).toBeInTheDocument();

			// reset category field back to "None"
			await user.type(categoryFilterField, "none{enter}");
			await waitFor(() => {
				expect(
					within(categoryFilterField).queryByText("Vulnerability: 3")
				).not.toBeInTheDocument();
			});

			// check table filtered by severity
			findingCount = 2;
			expect(screen.getAllByRole("checkbox")).toHaveLength(findingCount);
			expect(
				screen.getByText(`1–${findingCount} of ${findingCount}`)
			).toBeInTheDocument();

			// check column filter indicator removed
			expect(
				within(categoryColumn).queryByLabelText("This column is filtered")
			).not.toBeInTheDocument();

			// filter file by "dockerfile""
			const fileColumn = screen.getByRole("button", { name: "File" });
			const fileFilterField = screen.getByLabelText("File");
			await user.type(fileFilterField, "dockerfile");

			// check column now has a filter indicator
			await waitFor(() => {
				expect(
					within(fileColumn).queryByLabelText("This column is filtered")
				).toBeInTheDocument();
			});

			// check table filtered by file name
			findingCount = 1;
			expect(screen.getAllByRole("checkbox")).toHaveLength(findingCount);
			expect(
				screen.getByText(`1–${findingCount} of ${findingCount}`)
			).toBeInTheDocument();

			// use clear all filters button to clear all filters
			await user.click(
				screen.getByRole("button", { name: "Clear all filters" })
			);

			// check all colum filter indicators removed
			await waitFor(() => {
				expect(
					screen.queryByLabelText("This column is filtered")
				).not.toBeInTheDocument();
			});

			// check nothing is filtered
			findingCount = 9;
			expect(screen.getAllByRole("checkbox")).toHaveLength(findingCount);
			expect(
				screen.getByText(`1–${findingCount} of ${findingCount}`)
			).toBeInTheDocument();
		});
	});

	describe("getResultFilters", () => {
		let globalWindow: any;
		const mockNavigate = jest.fn();

		beforeEach(() => {
			globalWindow = global.window;
			global.window ??= Object.create(window);
		});

		afterEach(() => {
			global.window ??= globalWindow;
			mockNavigate.mockClear();
		});

		it("Modifies filters if all hash params are valid", () => {
			const schema = Yup.object().shape({
				test_a_string: Yup.string(),
				test_a_number: Yup.number(),
			});
			const prefix = "test_";
			const filters: FilterDef = {
				a_string: {
					filter: "",
				},
				a_number: {
					filter: "",
					match: "exact",
				},
			};

			const hash = `#${prefix}a_string=stringValue&${prefix}a_number=1234`;
			Object.defineProperty(window, "location", {
				value: {
					hash: hash,
				},
				writable: true,
			});

			const results = getResultFilters(schema, prefix, filters);
			expect(results).toEqual({
				a_string: {
					filter: "stringValue",
				},
				a_number: {
					filter: "1234",
					match: "exact",
				},
			});
		});

		it("Does not modify filters if any hash params are invalid", () => {
			const schema = Yup.object().shape({
				test_a_string: Yup.string(),
				test_a_number: Yup.number(),
			});
			const prefix = "test_";
			const filters: FilterDef = {
				a_string: {
					filter: "origStringValue",
				},
				a_number: {
					filter: "origNumberValue",
					match: "exact",
				},
			};

			const hash = `#${prefix}a_string=stringValue&${prefix}a_number=anotherStringValue`;
			Object.defineProperty(window, "location", {
				value: {
					hash: hash,
				},
				writable: true,
			});

			const results = getResultFilters(schema, prefix, filters);
			expect(results).toEqual(filters); // no filter change since "anotherStringValue" !== number
		});
	});

	describe("setResultFilters", () => {
		let globalWindow: any;
		const mockNavigate = jest.fn();

		beforeEach(() => {
			globalWindow = global.window;
			global.window ??= Object.create(window);
		});

		afterEach(() => {
			global.window ??= globalWindow;
			mockNavigate.mockClear();
		});

		it("adds filters to url hash", () => {
			const prefix = "test_";
			const filters: FilterDef = {
				testFilter: {
					filter: "testValue",
				},
			};
			const hash = "";
			const pathname = "testPath";
			const search = "?testSearch";
			const state = {
				testState: "testValue",
			};

			Object.defineProperty(window, "location", {
				value: {
					hash: hash,
					pathname: pathname,
					search: search,
				},
				writable: true,
			});
			mockLocation = {
				hash: hash,
				pathname: pathname,
				search: search,
				state: state,
			};
			setResultFilters(prefix, filters, mockLocation, mockNavigate);
			expect(mockNavigate).toHaveBeenLastCalledWith(
				`${pathname}${search}#${prefix}testFilter=${filters["testFilter"].filter}`,
				{ preventScrollReset: true, replace: true, state: state }
			);
		});

		it("removes filters matching prefix before adding new filters", () => {
			const prefix = "test_";
			const filters: FilterDef = {
				testFilter: {
					filter: "testValue",
				},
				testFilter2: {
					filter: "testValue2",
				},
			};
			const hash = `#${prefix}testFilter=oldValue&${prefix}testFilter2=oldValue2`;
			const pathname = "testPath";
			const search = "?testSearch";
			const state = {
				testState: "testValue",
			};

			Object.defineProperty(window, "location", {
				value: {
					hash: hash,
					pathname: pathname,
					search: search,
				},
				writable: true,
			});
			mockLocation = {
				hash: hash,
				pathname: pathname,
				search: search,
				state: state,
			};
			setResultFilters(prefix, filters, mockLocation, mockNavigate);
			expect(mockNavigate).toHaveBeenLastCalledWith(
				`${pathname}${search}#${prefix}testFilter=${filters["testFilter"].filter}&${prefix}testFilter2=${filters["testFilter2"].filter}`,
				{ preventScrollReset: true, replace: true, state: state }
			);
		});

		it("does not navigate if hash filters don't change", () => {
			const prefix = "test_";
			const filters: FilterDef = {
				testFilter: {
					filter: "testValue",
				},
				testFilter2: {
					filter: "testValue2",
				},
			};
			const hash = `#${prefix}testFilter=testValue&${prefix}testFilter2=testValue2`;
			const pathname = "testPath";
			const search = "?testSearch";
			const state = {
				testState: "testValue",
			};

			Object.defineProperty(window, "location", {
				value: {
					hash: hash,
					pathname: pathname,
					search: search,
				},
				writable: true,
			});
			mockLocation = {
				hash: hash,
				pathname: pathname,
				search: search,
				state: state,
			};
			setResultFilters(prefix, filters, mockLocation, mockNavigate);
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});
});
