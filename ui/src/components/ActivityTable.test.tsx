import { getByText, render, screen, waitFor, within } from "test-utils";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
jest.mock("pages/MainPage", () => ({
	...(jest.requireActual("pages/MainPage") as any),
	__esModule: true,
	startScan: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import { Settings } from "luxon";

import ActivityTable from "./ActivityTable";
import { startScan } from "pages/MainPage";
import AppGlobals, { APP_RELOAD_INTERVAL } from "app/globals";
import { AnalysisReport, ScanOptionsForm } from "features/scans/scansSchemas";
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
		const mockExportFetch = jest.fn((meta) => meta);
		const mockToCsv = jest.fn((data) => data);
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(
			<ActivityTable
				data={null}
				onDataLoad={mockOnDataLoad}
				exportFetch={mockExportFetch}
				toCsv={mockToCsv}
			/>
		);

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
		const mockExportFetch = jest.fn((meta) => meta);
		const mockToCsv = jest.fn((data) => data);
		mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
		render(
			<ActivityTable
				data={data}
				onDataLoad={mockOnDataLoad}
				exportFetch={mockExportFetch}
				toCsv={mockToCsv}
			/>
		);

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
			screen.getByRole("columnheader", { name: /^Type$/i })
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
	describe("Type column", () => {
		it("should display on-demand indicator", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(screen.getByLabelText(/On-Demand Scan/)).toBeInTheDocument();
		});

		it("should display batch indicator without description", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].scan_options.batch_priority =
				true;
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(screen.getByLabelText("Batched Scan")).toBeInTheDocument();
		});

		it("should display batch indicator with description", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].scan_options.batch_priority =
				true;
			mockAppState.scans.entities[mockStoreScanId].batch_description =
				"A Description";
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.getByLabelText(
					`Batched Scan: ${mockAppState.scans.entities[mockStoreScanId].batch_description}`
				)
			).toBeInTheDocument();
		});

		it("should display a qualified scan indicator", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].qualified = true;
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(screen.getByLabelText("Qualified Scan")).toBeInTheDocument();
		});

		it("should display an include/exclude paths indicator with include paths", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const scan = mockAppState.scans.entities[mockStoreScanId];
			scan.scan_options.include_paths = ["include1", "include2", "include3"];
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.getByLabelText(
					`Include paths: ${scan.scan_options.include_paths.join(
						", "
					)} ; Exclude paths: None`
				)
			).toBeInTheDocument();
		});

		it("should display an include/exclude paths indicator with exclude paths", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const scan = mockAppState.scans.entities[mockStoreScanId];
			scan.scan_options.exclude_paths = ["exclude1", "exclude2", "exclude3"];
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.getByLabelText(
					`Include paths: None ; Exclude paths: ${scan.scan_options.exclude_paths.join(
						", "
					)}`
				)
			).toBeInTheDocument();
		});

		it("should display an include/exclude paths indicator with include & exclude paths", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const scan = mockAppState.scans.entities[mockStoreScanId];
			scan.scan_options.include_paths = ["include1", "include2", "include3"];
			scan.scan_options.exclude_paths = ["exclude1", "exclude2", "exclude3"];
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.getByLabelText(
					`Include paths: ${scan.scan_options.include_paths.join(
						", "
					)} ; Exclude paths: ${scan.scan_options.exclude_paths.join(", ")}`
				)
			).toBeInTheDocument();
		});

		it("multiple indicators can be displayed", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const scan = mockAppState.scans.entities[mockStoreScanId];
			scan.scan_options.batch_priority = true;
			scan.scan_options.include_paths = ["include1", "include2", "include3"];
			scan.qualified = true;
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(screen.getByLabelText("Batched Scan")).toBeInTheDocument();
			expect(screen.getByLabelText("Qualified Scan")).toBeInTheDocument();
			expect(
				screen.getByLabelText(
					`Include paths: ${scan.scan_options.include_paths.join(
						", "
					)} ; Exclude paths: None`
				)
			).toBeInTheDocument();
		});
	});

	describe("Branch column", () => {
		it("should display branch if set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].branch = "test-branch-name";
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.queryByRole("cell", {
					name: mockAppState.scans.entities[mockStoreScanId].branch,
				})
			).toBeInTheDocument();
		});

		it("should display 'default' branch if branch not set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].branch = "";
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.queryByRole("cell", {
					name: "Default",
				})
			).toBeInTheDocument();
		});
	});

	describe("Start column", () => {
		it("should display start date if set", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].timestamps.start =
				"20200101T11:00:00Z";
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			// note: start date from API is in GMT, so displayed date in GMT should be 5 hours earlier
			// since we are in EST on Jan 1 (GMT-0500)
			const dateField = screen.getByTitle(
				/Wednesday, January 1, 2020(,| at) 6:00:00 AM EST/
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
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].timestamps.end =
				"20200101T13:00:00Z";
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			// note: start date from API is in GMT, so displayed date in GMT should be 5 hours earlier
			// since we are in EST on Jan 1 (GMT-0500)
			const dateField = screen.getByTitle(
				/Wednesday, January 1, 2020(,| at) 8:00:00 AM EST/
			);
			expect(dateField).toBeInTheDocument();
			// also check the long date tooltip exists
			expect(
				getByText(dateField, "2020-01-01 8:00 AM EST")
			).toBeInTheDocument();
		});
	});

	describe("Actions column", () => {
		it("should display 3 success action items", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan completed with successful status
			mockAppState.scans.entities[mockStoreScanId].status = "completed";
			mockAppState.scans.entities[mockStoreScanId].success = true;
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.getByRole("button", { name: /^view successful results$/i })
			).toBeInTheDocument();
			// MUI "buttons" with href attrs are really a href link components
			const reportNewTabLink = screen.getByRole("link", {
				name: /^view successful results in new tab$/i,
			}) as HTMLAnchorElement;
			expect(reportNewTabLink).toBeInTheDocument();
			expect(reportNewTabLink.href).toMatch(/\/results\?/);
			expect(reportNewTabLink.target).toBe("_blank"); // opens in new window
			expect(
				screen.getByRole("button", {
					name: /open more actions menu/i,
				})
			).toBeInTheDocument();
		});

		it("should display 3 failure action items", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan completed with unsuccessful status
			mockAppState.scans.entities[mockStoreScanId].status = "completed";
			mockAppState.scans.entities[mockStoreScanId].success = false;
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			expect(
				screen.getByRole("button", { name: /^view failed results$/i })
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /^view failed results in new tab$/i })
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /open more actions menu/i })
			).toBeInTheDocument();
		});

		it("should be enabled if success is unavailable", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.entities[mockStoreScanId].status = "completed";
			// remove success field
			delete mockAppState.scans.entities[mockStoreScanId].success;
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

			const resultsButton = screen.getByRole("button", {
				name: /^view results$/i,
			});
			const resultsLink = screen.getByRole("link", {
				name: /^view results in new tab$/i,
			});
			const moreActionsButton = screen.getByRole("button", {
				name: /open more actions menu/i,
			});
			expect(resultsButton).toBeEnabled();
			expect(moreActionsButton).toBeEnabled();
			// link, so uses aria-disabled instead of a disabled attribute like a button
			expect(resultsLink).not.toHaveAttribute("aria-disabled");
		});

		describe("More Actions menu", () => {
			it("Should display 2 menu items for copy/rescan", async () => {
				const data = JSON.parse(JSON.stringify(formData));
				const mockOnDataLoad = jest.fn((meta) => meta);
				const mockExportFetch = jest.fn((meta) => meta);
				const mockToCsv = jest.fn((data) => data);
				mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
				// scan completed with successful status
				mockAppState.scans.entities[mockStoreScanId].status = "completed";
				mockAppState.scans.entities[mockStoreScanId].success = true;
				const { user } = render(
					<ActivityTable
						data={data}
						onDataLoad={mockOnDataLoad}
						exportFetch={mockExportFetch}
						toCsv={mockToCsv}
					/>
				);

				const moreActionsButton = screen.getByRole("button", {
					name: /open more actions menu/i,
				});
				await user.click(moreActionsButton);
				screen.getByRole("button", {
					name: /close more actions menu/i,
					hidden: true,
				}); // hidden because behind menu
				screen.getByRole("menuitem", { name: /copy link to these results/i });
				screen.getByRole("menuitem", { name: /new scan with these options/i });
			});

			it("Copy menu item should copy scan result link to clipboard", async () => {
				const data = JSON.parse(JSON.stringify(formData));
				const mockOnDataLoad = jest.fn((meta) => meta);
				const mockExportFetch = jest.fn((meta) => meta);
				const mockToCsv = jest.fn((data) => data);
				document.execCommand = jest.fn((commandId, showUI, value) => true);
				mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
				// scan completed with successful status
				mockAppState.scans.entities[mockStoreScanId].status = "completed";
				mockAppState.scans.entities[mockStoreScanId].success = true;
				const { user } = render(
					<ActivityTable
						data={data}
						onDataLoad={mockOnDataLoad}
						exportFetch={mockExportFetch}
						toCsv={mockToCsv}
					/>
				);

				const moreActionsButton = screen.getByRole("button", {
					name: /open more actions menu/i,
				});
				await user.click(moreActionsButton);
				const copyItem = screen.getByRole("menuitem", {
					name: /copy link to these results/i,
				});
				await user.click(copyItem);
				expect(document.execCommand).toHaveBeenCalledWith("copy");
			});

			it("Rescan item displays confirmation dialog with cancel button", async () => {
				const data = JSON.parse(JSON.stringify(formData));
				const mockOnDataLoad = jest.fn((meta) => meta);
				const mockExportFetch = jest.fn((meta) => meta);
				const mockToCsv = jest.fn((data) => data);
				mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
				// scan completed with successful status
				mockAppState.scans.entities[mockStoreScanId].status = "completed";
				mockAppState.scans.entities[mockStoreScanId].success = true;
				const { user } = render(
					<ActivityTable
						data={data}
						onDataLoad={mockOnDataLoad}
						exportFetch={mockExportFetch}
						toCsv={mockToCsv}
					/>
				);

				const moreActionsButton = screen.getByRole("button", {
					name: /open more actions menu/i,
				});
				await user.click(moreActionsButton);
				const rescanItem = screen.getByRole("menuitem", {
					name: /new scan with these options/i,
				});
				await user.click(rescanItem);

				// cancel rescan in dialog
				const dialog = screen.getByRole("dialog", { name: /new scan/i });
				const cancelButton = within(dialog).getByRole("button", {
					name: /cancel/i,
				});
				await user.click(cancelButton);
				await waitFor(() =>
					expect(
						screen.queryByRole("dialog", { name: /new scan/i })
					).not.toBeInTheDocument()
				);
				expect(startScan).not.toHaveBeenCalled();
			});

			it("Rescan item displays confirmation dialog with start scan button", async () => {
				const data = JSON.parse(JSON.stringify(formData));
				const mockOnDataLoad = jest.fn((meta) => meta);
				const mockExportFetch = jest.fn((meta) => meta);
				const mockToCsv = jest.fn((data) => data);
				mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
				// scan completed with successful status
				const scan: AnalysisReport =
					mockAppState.scans.entities[mockStoreScanId];
				scan.status = "completed";
				scan.success = true;
				const { user } = render(
					<ActivityTable
						data={data}
						onDataLoad={mockOnDataLoad}
						exportFetch={mockExportFetch}
						toCsv={mockToCsv}
					/>
				);

				const moreActionsButton = screen.getByRole("button", {
					name: /open more actions menu/i,
				});
				await user.click(moreActionsButton);
				const rescanItem = screen.getByRole("menuitem", {
					name: /new scan with these options/i,
				});
				await user.click(rescanItem);

				// start scan in dialog
				const dialog = screen.getByRole("dialog", { name: /new scan/i });
				const startScanButton = within(dialog).getByRole("button", {
					name: /start scan/i,
				});
				await user.click(startScanButton);
				await waitFor(() =>
					expect(
						screen.queryByRole("dialog", { name: /new scan/i })
					).not.toBeInTheDocument()
				);
				expect(startScan).toHaveBeenLastCalledWith(
					expect.any(Function), // navigate
					{
						// values
						vcsOrg: data.vcsOrg,
						repo: data.repo,
						branch: scan.branch,
						secrets: scan.scan_options.categories?.includes("secret") ?? true,
						staticAnalysis:
							scan.scan_options.categories?.includes("static_analysis") ?? true,
						inventory:
							scan.scan_options.categories?.includes("inventory") ?? true,
						vulnerability:
							scan.scan_options.categories?.includes("vulnerability") ?? true,
						sbom: scan.scan_options.categories?.includes("sbom") ?? true,
						configuration:
							scan.scan_options.categories?.includes("configuration") ?? true,
						depth: scan.scan_options?.depth ?? "",
						includeDev: scan.scan_options?.include_dev ?? false,
						secretPlugins: [],
						staticPlugins: [],
						techPlugins: [],
						vulnPlugins: [],
						sbomPlugins: [],
						configPlugins: [],
						includePaths: scan.scan_options?.include_paths
							? scan.scan_options?.include_paths.join(", ")
							: "",
						excludePaths: scan.scan_options?.exclude_paths
							? scan.scan_options?.exclude_paths.join(", ")
							: "",
					},
					mockAppState.currentUser.entities["self"] // currentUser
				);
			});
		});
	});

	describe("Table auto refresh", () => {
		it("should reload data every 30 seconds if scan running (queued, running)", () => {
			const data = JSON.parse(JSON.stringify(formData));
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "queued";

			jest.useFakeTimers();
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
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
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "completed";

			jest.useFakeTimers();
			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
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
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "queued";

			// because fake timers are used in test, these need to be added to userEvent setup config, see:
			// https://github.com/testing-library/user-event/issues/959#issuecomment-1127781872
			jest.useFakeTimers();
			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>,
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
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			// scan must be queued/running in order for reloading to occur, completed/terminated scans won't reload
			mockAppState.scans.entities[mockStoreScanId].status = "queued";

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
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
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			mockAppState.scans.status = "loading";

			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);

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
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			// load several pages of scans
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
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

	describe("Table filters", () => {
		it("no filters by default", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			expect(mockOnDataLoad).toBeCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			// associated filter toggles should be disabled
			const toggleShowScans = screen.getByRole("checkbox", {
				name: /Show only my scans/i,
			});
			expect(toggleShowScans).toBeEnabled();
			expect(toggleShowScans).not.toBeChecked();

			const toggleIncludeBatch = screen.getByRole("checkbox", {
				name: /Include batched scans/i,
			});
			expect(toggleIncludeBatch).toBeEnabled();
			expect(toggleIncludeBatch).not.toBeChecked();
		});

		it("toggles are disabled when table loading", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));
			mockAppState.scans.status = "loading";

			render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			// associated filter toggles should be disabled
			const toggleShowScans = screen.getByRole("checkbox", {
				name: /Show only my scans/i,
			});
			expect(toggleShowScans).toBeDisabled();

			const toggleIncludeBatch = screen.getByRole("checkbox", {
				name: /Include batched scans/i,
			});
			expect(toggleIncludeBatch).toBeDisabled();
		});

		it("Show my scans adds user filter", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			expect(mockOnDataLoad).toBeCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleShowScans = screen.getByRole("checkbox", {
				name: /Show only my scans/i,
			});
			expect(toggleShowScans).toBeEnabled();
			expect(toggleShowScans).not.toBeChecked();

			await user.click(toggleShowScans);
			expect(toggleShowScans).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					initiated_by: {
						filter: mockAppState.currentUser.entities["self"].email,
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});

			// un-toggle removes filter
			await user.click(toggleShowScans);
			expect(toggleShowScans).not.toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});
		});

		it("Include batch toggle adds batch filter", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			expect(mockOnDataLoad).toBeCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleIncludeBatch = screen.getByRole("checkbox", {
				name: /Include batched scans/i,
			});
			expect(toggleIncludeBatch).toBeEnabled();
			expect(toggleIncludeBatch).not.toBeChecked();

			await user.click(toggleIncludeBatch);
			expect(toggleIncludeBatch).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					include_batch: {
						filter: "true",
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});

			// un-toggle removes filter
			await user.click(toggleIncludeBatch);
			expect(toggleIncludeBatch).not.toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});
		});

		it("User filter can be added after batch filter", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			expect(mockOnDataLoad).toBeCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleIncludeBatch = screen.getByRole("checkbox", {
				name: /Include batched scans/i,
			});
			expect(toggleIncludeBatch).toBeEnabled();
			expect(toggleIncludeBatch).not.toBeChecked();

			await user.click(toggleIncludeBatch);
			expect(toggleIncludeBatch).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					include_batch: {
						filter: "true",
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleShowScans = screen.getByRole("checkbox", {
				name: /Show only my scans/i,
			});
			expect(toggleShowScans).toBeEnabled();
			expect(toggleShowScans).not.toBeChecked();

			await user.click(toggleShowScans);
			expect(toggleShowScans).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					include_batch: {
						filter: "true",
						match: "exact",
					},
					initiated_by: {
						filter: mockAppState.currentUser.entities["self"].email,
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});
		});

		it("Batch filter can be added after user filter", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			expect(mockOnDataLoad).toBeCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleShowScans = screen.getByRole("checkbox", {
				name: /Show only my scans/i,
			});
			expect(toggleShowScans).toBeEnabled();
			expect(toggleShowScans).not.toBeChecked();

			await user.click(toggleShowScans);
			expect(toggleShowScans).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					initiated_by: {
						filter: mockAppState.currentUser.entities["self"].email,
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleIncludeBatch = screen.getByRole("checkbox", {
				name: /Include batched scans/i,
			});
			expect(toggleIncludeBatch).toBeEnabled();
			expect(toggleIncludeBatch).not.toBeChecked();

			await user.click(toggleIncludeBatch);
			expect(toggleIncludeBatch).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					include_batch: {
						filter: "true",
						match: "exact",
					},
					initiated_by: {
						filter: mockAppState.currentUser.entities["self"].email,
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});
		});
	});

	describe("tablemenu options", () => {
		it("calls exportFetch", async () => {
			const data = JSON.parse(JSON.stringify(formData));
			mockAppState = JSON.parse(JSON.stringify(mockStore50Scans));
			data.submitContext = "view"; // "view" context to view more than a single scan
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT; // 10
			const mockOnDataLoad = jest.fn((meta) => meta);
			const mockExportFetch = jest.fn((meta) => meta);
			const mockToCsv = jest.fn((data) => data);

			const { user } = render(
				<ActivityTable
					data={data}
					onDataLoad={mockOnDataLoad}
					exportFetch={mockExportFetch}
					toCsv={mockToCsv}
				/>
			);
			expect(mockOnDataLoad).toBeCalledWith({
				currentPage: 0,
				filters: {},
				itemsPerPage: defaultRowsPerPage,
			});

			const toggleIncludeBatch = screen.getByRole("checkbox", {
				name: /Include batched scans/i,
			});
			expect(toggleIncludeBatch).toBeEnabled();
			expect(toggleIncludeBatch).not.toBeChecked();

			await user.click(toggleIncludeBatch);
			expect(toggleIncludeBatch).toBeChecked();
			expect(mockOnDataLoad).toHaveBeenLastCalledWith({
				currentPage: 0,
				filters: {
					include_batch: {
						filter: "true",
						match: "exact",
					},
				},
				itemsPerPage: defaultRowsPerPage,
			});

			let menu = screen.getByRole("button", { name: /open table menu/i });
			await user.click(menu);
			screen.getByRole("button", {
				name: /close table menu/i,
				hidden: true,
			}); // hidden because behind menu popup
			const downloadJson = screen.getByRole("menuitem", {
				name: /download as json/i,
			});
			await user.click(downloadJson);

			// wait for confirm dialog
			const dialog = await screen.findByRole("dialog", {
				name: /confirm download/i,
			});
			const ackButton = within(dialog).getByRole("button", {
				name: /i acknowledge/i,
			});
			await user.click(ackButton);

			expect(mockExportFetch).toHaveBeenCalledWith({
				filters: {
					include_batch: {
						filter: "true",
						match: "exact",
					},
				},
			});
		});
	});

	// note: we don't need to test the status cell because
	// that is being tested independently in the StatusCell component tests
});
