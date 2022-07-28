import { getByText, render, screen, waitFor, within } from "test-utils";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import ActivityTable from "./ActivityTable";
import AppGlobals, { APP_RELOAD_INTERVAL } from "app/globals";
import { Settings } from "luxon";
import { ScanOptionsForm } from "features/scans/scansSchemas";
import {
	mockStoreScanId,
	mockStoreEmpty,
	mockStoreSingleScan,
	mockStore50Scans,
} from "../../testData/testMockData";

// data passed from the form on MainPage
const formData: ScanOptionsForm = {
	branch: "",
	includeDev: false,
	inventory: true,
	repo: "repo",
	secrets: true,
	staticAnalysis: true,
	vcsOrg: "goodVcs/goodOrg",
	vulnerability: true,
	submitContext: "scan", // "scan" or "view"
};

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("ActivityTable component", () => {
	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
	});
	afterEach(() => {
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
	});

	it("should display no scans table", () => {
		const mockOnDataLoad = jest.fn((meta) => meta);
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<ActivityTable data={null} onDataLoad={mockOnDataLoad} />);

		expect(screen.getByText(/no matching scans/i)).toBeInTheDocument();
		expect(
			screen.queryByRole("table", { name: /scans table/i })
		).not.toBeInTheDocument();
		// callback should not have been called to fetch data if form (data) wasn't passed
		expect(mockOnDataLoad.mock.calls.length).toBe(0);
	});

	it("should display table with scans", () => {
		const data = JSON.parse(JSON.stringify(formData));
		const mockOnDataLoad = jest.fn((meta) => meta);
		mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
		render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

		expect(screen.queryByText(/no matching scans/i)).not.toBeInTheDocument();
		// check table has expected title, refresh buttons, & column titles
		expect(
			screen.getByRole("table", { name: /scans table/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /refresh/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: /auto refresh/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /actions/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /branch/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /start/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /end/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /status/i })
		).toBeInTheDocument();
	});

	// All subsequent tests are testing a single running scan
	// i.e. when submitContext = "submit"
	// NOT viewing all scans for the repo
	describe("Branch column", () => {
		it("should display branch if set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].branch = "test-branch-name";
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			expect(
				screen.queryByRole("cell", {
					name: mockAppState.scans.entities[mockStoreScanId].branch,
				})
			).toBeInTheDocument();
		});

		// we don't hide this column anymore if there is no branch, we just display the column with a blank value
		it("should not display branch if not set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].branch = "";
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			expect(
				screen.queryByRole("cell", {
					name: mockAppState.scans.entities[mockStoreScanId].branch,
				})
			).toBeInTheDocument();
		});
	});

	describe("Start column", () => {
		it("should display start date if set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].timestamps.start =
				"20200101T11:00:00Z";
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			// note: start date from API is in GMT, so displayed date in GMT should be 5 hours earlier
			// since we are in EST on Jan 1 (GMT-0500)
			const dateField = screen.getByTitle(
				"Wednesday, January 1, 2020, 6:00:00 AM EST"
			);
			expect(dateField).toBeInTheDocument();
			// also check the long date tooltip exists
			expect(
				getByText(dateField, "2020-01-01 6:00 AM EST")
			).toBeInTheDocument();
		});
	});

	describe("End column", () => {
		it("should display end date if set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].timestamps.end =
				"20200101T13:00:00Z";
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			// note: start date from API is in GMT, so displayed date in GMT should be 5 hours earlier
			// since we are in EST on Jan 1 (GMT-0500)
			const dateField = screen.getByTitle(
				"Wednesday, January 1, 2020, 8:00:00 AM EST"
			);
			expect(dateField).toBeInTheDocument();
			// also check the long date tooltip exists
			expect(
				getByText(dateField, "2020-01-01 8:00 AM EST")
			).toBeInTheDocument();
		});
	});

	describe("Actions column", () => {
		it("should display 3 success action items", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan completed with successful status
			mockAppState.scans.entities[mockStoreScanId].status = "completed";
			mockAppState.scans.entities[mockStoreScanId].success = true;
			const { user } = render(
				<ActivityTable data={data} onDataLoad={mockOnDataLoad} />
			);

			expect(
				screen.getByRole("button", { name: /^view successful report$/i })
			).toBeInTheDocument();
			// MUI "buttons" with href attrs are really a href link components
			const reportNewTabLink = screen.getByRole("link", {
				name: /^view successful report in new tab$/i,
			}) as HTMLAnchorElement;
			expect(reportNewTabLink).toBeInTheDocument();
			expect(reportNewTabLink.href).toMatch(/\/results\?/);
			expect(reportNewTabLink.target).toBe("_blank"); // opens in new window
			const shareButton = screen.getByRole("button", {
				name: /^copy link to this report$/i,
			});
			expect(shareButton).toBeInTheDocument();
			await user.click(shareButton);
			expect(document.execCommand).toHaveBeenCalledWith("copy");
		});

		it("should display 3 failure action items", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan completed with unsuccessful status
			mockAppState.scans.entities[mockStoreScanId].status = "completed";
			mockAppState.scans.entities[mockStoreScanId].success = false;
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			expect(
				screen.getByRole("button", { name: /^view failed report$/i })
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /^view failed report in new tab$/i })
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /^copy link to this report$/i })
			).toBeInTheDocument();
		});

		it("should be disabled if success is unavailable", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].status = "completed";
			// remove success field
			delete mockAppState.scans.entities[mockStoreScanId].success;
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			const disabledButtons = screen.getAllByRole("button", {
				name: /report status/i,
			});
			expect(disabledButtons).toHaveLength(2);
			expect(disabledButtons[0]).toBeDisabled();
			expect(disabledButtons[1]).toBeDisabled();
			const disabledLink = screen.getByRole("link", { name: /report status/i });
			expect(disabledLink).toBeInTheDocument();
			// link, so uses aria-disabled instead of a disabled attribute like a button
			expect(disabledLink).toHaveAttribute("aria-disabled", "true");
		});
	});

	describe("Table auto refresh", () => {
		it("should reload data every 30 seconds if scan running (queued, running)", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "queued";

			jest.useFakeTimers();
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);
			expect(mockOnDataLoad.mock.calls.length).toBe(1); // called once as data initially loaded

			// check default auto-reload toggle state is checked/enabled
			const checkbox = screen.getByRole("checkbox", {
				name: /auto refresh/i,
			}) as HTMLInputElement;
			expect(checkbox.checked).toEqual(true);

			jest.advanceTimersByTime(APP_RELOAD_INTERVAL + 1); // advance timers past reload interval
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			jest.advanceTimersByTime(APP_RELOAD_INTERVAL + 1); // advance timers past another reload interval
			expect(mockOnDataLoad.mock.calls.length).toBe(3);
			jest.useRealTimers();
		});

		it("should not reload if scan not running (completed, terminated, failed)", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "completed";

			jest.useFakeTimers();
			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);
			expect(mockOnDataLoad.mock.calls.length).toBe(1); // called once as data initially loaded

			// check default auto-reload toggle state is checked/enabled
			const checkbox = screen.getByRole("checkbox", {
				name: /auto refresh/i,
			}) as HTMLInputElement;
			expect(checkbox.checked).toEqual(true);

			jest.advanceTimersByTime(APP_RELOAD_INTERVAL + 1); // advance timers past reload interval
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			jest.advanceTimersByTime(APP_RELOAD_INTERVAL + 1); // advance timers past another reload interval
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			jest.useRealTimers();
		});

		it("should not reload if auto-reload toggle is off", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "queued";

			// because fake timers are used in test, these need to be added to userEvent setup config, see:
			// https://github.com/testing-library/user-event/issues/959#issuecomment-1127781872
			jest.useFakeTimers();
			const { user } = render(
				<ActivityTable data={data} onDataLoad={mockOnDataLoad} />,
				null,
				{
					advanceTimers: jest.advanceTimersByTime,
				}
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1); // called once as data initially loaded

			// check default auto-reload toggle state is checked/enabled
			const checkbox = screen.getByRole("checkbox", {
				name: /auto refresh/i,
			}) as HTMLInputElement;
			expect(checkbox.checked).toEqual(true);

			// disable the auto-reload toggle
			await user.click(checkbox);
			expect(checkbox.checked).toEqual(false);

			jest.advanceTimersByTime(APP_RELOAD_INTERVAL + 1); // advance timers past reload interval
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			jest.advanceTimersByTime(APP_RELOAD_INTERVAL + 1); // advance timers past another reload interval
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			jest.useRealTimers();
		});
	});

	describe("Table manual refresh", () => {
		it("should reload the table data", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "queued";

			const { user } = render(
				<ActivityTable data={data} onDataLoad={mockOnDataLoad} />
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1); // called once as data initially loaded

			// check default auto-reload toggle state is checked/enabled
			const checkbox = screen.getByRole("checkbox", {
				name: /auto refresh/i,
			}) as HTMLInputElement;
			expect(checkbox.checked).toEqual(true);

			// disable the auto-reload toggle
			await user.click(checkbox);
			expect(checkbox.checked).toEqual(false);

			// now manually reload the table using the refresh button
			const refreshButton = screen.getByRole("button", {
				name: /refresh now/i,
			});
			await user.click(refreshButton);
			expect(mockOnDataLoad.mock.calls.length).toBe(2);

			// refresh again (to ensure it wasn't a mistake or an auto-reload before we could disable)
			await user.click(refreshButton);
			expect(mockOnDataLoad.mock.calls.length).toBe(3);
		});

		it("when scan loading, button should be disabled and tooltip should indicate refreshing", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.status = "loading";

			render(<ActivityTable data={data} onDataLoad={mockOnDataLoad} />);

			const reloadButton = screen.getByRole("button", {
				name: /refreshing.../i,
			});
			expect(reloadButton).toBeDisabled();
		});
	});

	describe("Table paging", () => {
		jest.setTimeout(80000);

		it("should show correct rows-per-page", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			// load several pages of scans
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			const { user } = render(
				<ActivityTable data={data} onDataLoad={mockOnDataLoad} />
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1); // load data should be called once

			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			const rowsPerPageButton = screen.getByRole("button", {
				name: "Rows per page: " + String(defaultRowsPerPage),
			});
			expect(rowsPerPageButton).toBeInTheDocument();
			await user.click(rowsPerPageButton);

			await waitFor(() => {
				expect(
					screen.queryByRole("listbox", { name: /rows per page/i })
				).toBeInTheDocument();
			});

			const popup = screen.getByRole("listbox", { name: /rows per page/i });
			const items20 = within(popup).getByText("20");
			expect(items20).toBeInTheDocument();
			await user.click(items20);

			// ensure mock callback called again with 20 itemsPerPage
			expect(mockOnDataLoad.mock.calls.length).toBe(2); // load data should be called once
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: 20,
			});

			// ensure Rows per page changes to 20
			await waitFor(() => {
				const rowsPerPageButton = screen.getByRole("button", {
					name: "Rows per page: " + String(20),
				});
				expect(rowsPerPageButton).toBeInTheDocument();
			});
		});
	});

	// note: we don't need to test the status cell because
	// that is being tested independently in the StatusCell component tests
});
