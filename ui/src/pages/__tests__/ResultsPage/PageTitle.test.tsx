import { render, screen, waitFor } from "test-utils";
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
	mockStoreScanId,
	mockStoreEmpty,
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

	describe("Page title", () => {
		it("title should include 'scan results'", async () => {
			const globalWindow = global.window;
			global.window ??= Object.create(window);
			global.scrollTo = jest.fn();

			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const id = mockStoreScanId;
			const repo = mockAppState.scans.entities[id].repo;
			const service = mockAppState.scans.entities[id].service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}&tab=3`,
			};
			const { user } = render(<ResultsPage />);

			// wait for scan data to load
			const resultsTitle = await screen.findByText(/^Scan Results$/);
			expect(resultsTitle).toBeInTheDocument();

			// check the page title
			await waitFor(() =>
				expect(global.window.document.title).toMatch(/scan results/i),
			);

			// check share button
			const shareButton = screen.getByRole("button", {
				name: /^copy link to these scan results$/i,
			});
			expect(shareButton).toBeInTheDocument();
			await user.click(shareButton);
			expect(document.execCommand).toHaveBeenCalledWith("copy");

			global.window ??= globalWindow;
		});

		it('title should include scan repo and "default" branch if no branch defined', async () => {
			const globalWindow = global.window;
			global.window ??= Object.create(window);
			global.scrollTo = jest.fn();

			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			// must use a scan with results
			mockAppState.scans.ids.push(mockScan001.scan_id);
			mockAppState.scans.entities[mockScan001.scan_id] = JSON.parse(
				JSON.stringify(mockScan001),
			);
			mockAppState.scans.status = "success";
			mockAppState.scans.totalRecords = 1;
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const id = mockScan001.scan_id;
			const repo = mockScan001.repo;
			const service = mockScan001.service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}&tab=3`,
			};
			render(<ResultsPage />);

			// wait for scan data to load
			await waitFor(() =>
				expect(
					screen.queryByText(/^fetching scan results$/),
				).not.toBeInTheDocument(),
			);

			// check the page title contains expected repo & branch
			// branch is "default" since scan contains a null branch field
			await waitFor(() =>
				expect(global.window.document.title).toMatch(
					`Artemis - Scan Results: ${repo} (default)`,
				),
			);
			global.window ??= globalWindow;
		});

		it("title should include scan repo and branch name if branch defined", async () => {
			const globalWindow = global.window;
			global.window ??= Object.create(window);
			global.scrollTo = jest.fn();

			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			// must use a scan with results
			mockAppState.scans.ids.push(mockScan001.scan_id);
			mockAppState.scans.entities[mockScan001.scan_id] = JSON.parse(
				JSON.stringify(mockScan001),
			);
			mockAppState.scans.status = "success";
			mockAppState.scans.totalRecords = 1;
			const branch = "A Branch Name For Test";
			mockAppState.scans.entities[mockScan001.scan_id].branch = branch;
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const id = mockScan001.scan_id;
			const repo = mockScan001.repo;
			const service = mockScan001.service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}&tab=3`,
			};
			render(<ResultsPage />);

			// wait for scan data to load
			await waitFor(() =>
				expect(
					screen.queryByText(/^fetching scan results$/),
				).not.toBeInTheDocument(),
			);

			// check the page title contains expected repo & branch
			// branch is "default" since scan contains a null branch field
			await waitFor(() =>
				expect(global.window.document.title).toMatch(
					`Artemis - Scan Results: ${repo} (${branch})`,
				),
			);
			global.window ??= globalWindow;
		});
	});
});
