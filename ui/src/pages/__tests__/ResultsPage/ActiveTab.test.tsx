import { render, screen } from "test-utils";
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
import ResultsPage from "pages/ResultsPage";
import {
	mockScan001,
	mockStoreSingleScan,
} from "../../../../testData/testMockData";

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

	describe("Active Tab", () => {
		it("Overview tab active", async () => {
			const scan = JSON.parse(JSON.stringify(mockScan001));
			const id = scan.scan_id;
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.ids.push(id);
			mockAppState.scans.entities[id] = scan;
			mockAppState.scans.totalRecords = 2;
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const repo = scan.repo;
			const service = scan.service;

			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${encodeURIComponent(id)}&repo=${encodeURIComponent(
					repo,
				)}&service=${encodeURIComponent(service)}`,
			};
			render(<ResultsPage />);

			// no tab passed in queryString, should select default, tab 0 (Overview)
			const tab = await screen.findByRole("tab", { name: "Overview" });
			expect(tab).toHaveAttribute("aria-selected", "true");
		});

		it("Secrets tab active", async () => {
			const scan = JSON.parse(JSON.stringify(mockScan001));
			const id = scan.scan_id;
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.ids.push(id);
			mockAppState.scans.entities[id] = scan;
			mockAppState.scans.totalRecords = 2;
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const repo = scan.repo;
			const service = scan.service;

			// page needs query params to get the scan
			// tab=3 (secrets)
			mockLocation = {
				search: `?id=${encodeURIComponent(id)}&repo=${encodeURIComponent(
					repo,
				)}&service=${encodeURIComponent(service)}&tab=3`,
			};
			render(<ResultsPage />);

			// tab 3 passed in queryString, should select secrets tab
			const tab = await screen.findByRole("tab", {
				name: `${scan.results_summary.secrets} Secrets`,
			});
			expect(tab).toBeInTheDocument();
			expect(tab).toHaveAttribute("aria-selected", "true");
		});

		it("Defaults to Overview if tab invalid", async () => {
			const scan = JSON.parse(JSON.stringify(mockScan001));
			const id = scan.scan_id;
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.ids.push(id);
			mockAppState.scans.entities[id] = scan;
			mockAppState.scans.totalRecords = 2;
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const repo = scan.repo;
			const service = scan.service;

			// page needs query params to get the scan
			// tab=2 (static_analysis)
			mockLocation = {
				search: `?id=${encodeURIComponent(id)}&repo=${encodeURIComponent(
					repo,
				)}&service=${encodeURIComponent(service)}&tab=2`,
			};
			render(<ResultsPage />);

			// tab 2 passed in queryString, but there aren't any static analysis results, so default to Overview tab (0) instead
			const tab = await screen.findByRole("tab", { name: "Overview" });
			expect(tab).toBeInTheDocument();
			expect(tab).toHaveAttribute("aria-selected", "true");
		});
	});
});
