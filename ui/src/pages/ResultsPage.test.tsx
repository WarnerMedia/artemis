import { render, screen, waitFor, within } from "test-utils";
import { Settings } from "luxon";
import { formatDate } from "utils/formatters";
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
import { startScan } from "pages/MainPage";
import * as Yup from "yup";
import { getScanById } from "features/scans/scansSlice";
import ResultsPage, { getResultFilters, setResultFilters } from "./ResultsPage";
import {
	mockHiddenFindings003,
	mockScan001,
	mockStoreScanId,
	mockStoreEmpty,
	mockStoreSingleScan,
} from "../../testData/testMockData";
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

	describe("Page title", () => {
		it("title should include 'scan results'", async () => {
			const globalWindow = global.window;
			global.window = Object.create(window);
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
				expect(global.window.document.title).toMatch(/scan results/i)
			);

			// check share button
			const shareButton = screen.getByRole("button", {
				name: /^copy link to these scan results$/i,
			});
			expect(shareButton).toBeInTheDocument();
			await user.click(shareButton);
			expect(document.execCommand).toHaveBeenCalledWith("copy");

			global.window = globalWindow;
		});

		it('title should include scan repo and "default" branch if no branch defined', async () => {
			const globalWindow = global.window;
			global.window = Object.create(window);
			global.scrollTo = jest.fn();

			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			// must use a scan with results
			mockAppState.scans.ids.push(mockScan001.scan_id);
			mockAppState.scans.entities[mockScan001.scan_id] = JSON.parse(
				JSON.stringify(mockScan001)
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
					screen.queryByText(/^fetching scan results$/)
				).not.toBeInTheDocument()
			);

			// check the page title contains expected repo & branch
			// branch is "default" since scan contains a null branch field
			await waitFor(() =>
				expect(global.window.document.title).toMatch(
					`Artemis - Scan Results: ${repo} (default)`
				)
			);
			global.window = globalWindow;
		});

		it("title should include scan repo and branch name if branch defined", async () => {
			const globalWindow = global.window;
			global.window = Object.create(window);
			global.scrollTo = jest.fn();

			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			// must use a scan with results
			mockAppState.scans.ids.push(mockScan001.scan_id);
			mockAppState.scans.entities[mockScan001.scan_id] = JSON.parse(
				JSON.stringify(mockScan001)
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
					screen.queryByText(/^fetching scan results$/)
				).not.toBeInTheDocument()
			);

			// check the page title contains expected repo & branch
			// branch is "default" since scan contains a null branch field
			await waitFor(() =>
				expect(global.window.document.title).toMatch(
					`Artemis - Scan Results: ${repo} (${branch})`
				)
			);
			global.window = globalWindow;
		});
	});

	describe("Scan Results", () => {
		it("should display scan information", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const id = mockStoreScanId;
			const scan = mockAppState.scans.entities[id];
			const repo = scan.repo;
			const service = scan.service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}&tab=3`,
			};
			render(<ResultsPage />);

			// wait for scan data to load
			const orgRepository = await screen.findByText(
				/^Organization \/ Repository$/
			);
			expect(orgRepository).toBeInTheDocument();
			if (orgRepository.parentElement) {
				expect(
					within(orgRepository.parentElement).getByText(repo)
				).toBeInTheDocument();
			}

			// scan meta data is tested separately in ResultsSummary component tests

			const serviceField = await screen.findByText(/^Service$/);
			expect(serviceField).toBeInTheDocument();
			if (serviceField.parentElement) {
				expect(
					within(serviceField.parentElement).getByText(service)
				).toBeInTheDocument();
			}

			const branch = await screen.findByText(/^Branch$/);
			expect(branch).toBeInTheDocument();
			expect(branch).toBeInTheDocument();
			if (branch.parentElement) {
				expect(
					within(branch.parentElement).getByText(scan.branch)
				).toBeInTheDocument();
			}

			const initiatedBy = await screen.findByText(/^Initiated By$/);
			expect(initiatedBy).toBeInTheDocument();
			if (initiatedBy.parentElement) {
				expect(
					within(initiatedBy.parentElement).getByText(scan.initiated_by)
				).toBeInTheDocument();
				expect(
					within(initiatedBy.parentElement).getByRole("link", {
						name: scan.initiated_by,
					})
				).toBeInTheDocument();
			}

			const status = await screen.findByText(/^Status$/);
			expect(status).toBeInTheDocument();
			if (status.parentElement) {
				const statusRe = new RegExp(scan.status, "i");
				expect(
					within(status.parentElement).getByText(statusRe)
				).toBeInTheDocument();
			}

			const results = await screen.findByText(/^Results$/);
			expect(results).toBeInTheDocument();
			if (results.parentElement) {
				expect(
					within(results.parentElement).getByText(
						scan.success ? "No Issues Found" : "Issues Found"
					)
				).toBeInTheDocument();
			}

			const scanid = await screen.findByText(/^Scan ID$/);
			expect(scanid).toBeInTheDocument();
			if (scanid.parentElement) {
				expect(within(scanid.parentElement).getByText(id)).toBeInTheDocument();
			}

			// batch description should not exist since it's not in the scan data
			expect(screen.queryByText(/^Batch Description$/)).not.toBeInTheDocument();

			const queudDateElapsed = await screen.findByText(
				/^Queued Date \/ Queued Time Elapsed$/
			);
			expect(queudDateElapsed).toBeInTheDocument();
			if (queudDateElapsed.parentElement) {
				const queued = new RegExp(formatDate(scan.timestamps.queued, "long"));
				expect(
					within(queudDateElapsed.parentElement).getByText(queued)
				).toBeInTheDocument();
			}

			const startDate = await screen.findByText(/^Start Date$/);
			expect(startDate).toBeInTheDocument();
			if (startDate.parentElement) {
				expect(
					within(startDate.parentElement).getByText(
						formatDate(scan.timestamps.start, "long")
					)
				).toBeInTheDocument();
			}

			const endDateElapsed = await screen.findByText(
				/^End Date \/ Scan Time Elapsed$/
			);
			expect(endDateElapsed).toBeInTheDocument();
			if (endDateElapsed.parentElement) {
				const end = new RegExp(formatDate(scan.timestamps.end, "long"));
				expect(
					within(endDateElapsed.parentElement).getByText(end)
				).toBeInTheDocument();
			}
		});

		it("should display batch description if it's in the scan data", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			document.execCommand = jest.fn((commandId, showUI, value) => true);
			const id = mockStoreScanId;
			const scan = mockAppState.scans.entities[id];
			const repo = scan.repo;
			const service = scan.service;
			const batchDescription = "this is a description";
			mockAppState.scans.entities[id].batch_description = batchDescription;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}&tab=3`,
			};
			render(<ResultsPage />);

			// wait for scan data to load
			const batchDescriptionElt = await screen.findByText(
				/^Batch Description$/
			);
			expect(batchDescriptionElt).toBeInTheDocument();
			if (batchDescriptionElt.parentElement) {
				expect(
					within(batchDescriptionElt.parentElement).getByText(batchDescription)
				).toBeInTheDocument();
			}
		});
	});

	describe("Navigation buttons", () => {
		it("should display back button", () => {
			render(<ResultsPage />);

			expect(
				screen.getByRole("button", {
					name: /back to scans/i,
				})
			).toBeInTheDocument();
		});

		it("refresh/rescan buttons should be disabled while loading scan data", () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			mockAppState.scans.status = "loading";

			render(<ResultsPage />);

			const refreshButton = screen.getByRole("button", {
				name: /refresh scan results/i,
			});
			expect(refreshButton).toBeInTheDocument();
			expect(refreshButton).toBeDisabled();

			const rescanButton = screen.getByRole("button", {
				name: /new scan with these options/i,
			});
			expect(rescanButton).toBeInTheDocument();
			expect(rescanButton).toBeDisabled();
		});

		it("clicking refresh button should dispatch getScanbyId", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const id = mockStoreScanId;
			const repo = mockAppState.scans.entities[id].repo;
			const service = mockAppState.scans.entities[id].service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}`,
			};

			const { user } = render(<ResultsPage />);
			const refreshButton = screen.getByRole("button", {
				name: /refresh scan results/i,
			});

			expect(refreshButton).toBeInTheDocument();
			expect(refreshButton).not.toBeDisabled();
			await user.click(refreshButton);
			expect(mockDispatch).toHaveBeenLastCalledWith(
				getScanById({
					url: `${service}/${repo}/${id}`,
					meta: {
						filters: {
							format: { match: "exact", filter: "full" },
						},
					},
				})
			);
		});

		it("clicking new scan button displays confirmation dialog with cancel button", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const id = mockStoreScanId;
			const repo = mockAppState.scans.entities[id].repo;
			const service = mockAppState.scans.entities[id].service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}`,
			};

			const { user } = render(<ResultsPage />);
			const rescanButton = screen.getByRole("button", {
				name: /new scan with these options/i,
			});
			await user.click(rescanButton);

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

		it("clicking new scan button displays confirmation dialog with start scan button", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const id = mockStoreScanId;
			const scan = mockAppState.scans.entities[id];
			const repo = scan.repo;
			const service = scan.service;
			// page needs query params to get the scan
			mockLocation = {
				search: `?id=${id}&repo=${repo}&service=${service}`,
			};

			const { user } = render(<ResultsPage />);
			const rescanButton = screen.getByRole("button", {
				name: /new scan with these options/i,
			});
			await user.click(rescanButton);

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
					vcsOrg: "goodVcs/goodOrg", // service = goodVcs, repo = goodOrg/repo
					repo: "repo",
					branch: scan.branch,
					secrets: scan.scan_options.categories?.includes("secret") ?? true,
					staticAnalysis:
						scan.scan_options.categories?.includes("static_analysis") ?? true,
					inventory:
						scan.scan_options.categories?.includes("inventory") ?? true,
					vulnerability:
						scan.scan_options.categories?.includes("vulnerability") ?? true,
					sbom: scan.scan_options.categories?.includes("sbom") ?? true,
					depth: scan.scan_options?.depth ?? "",
					includeDev: scan.scan_options?.include_dev ?? false,
					secretPlugins: [],
					staticPlugins: [],
					techPlugins: [],
					vulnPlugins: [],
					sbomPlugins: [],
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
					repo
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
					repo
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
					repo
				)}&service=${encodeURIComponent(service)}&tab=2`,
			};
			render(<ResultsPage />);

			// tab 2 passed in queryString, but there aren't any static analysis results, so default to Overview tab (0) instead
			const tab = await screen.findByRole("tab", { name: "Overview" });
			expect(tab).toBeInTheDocument();
			expect(tab).toHaveAttribute("aria-selected", "true");
		});
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
				mockAppState.hiddenFindings.ids.push(finding.id);
				mockAppState.hiddenFindings.entities[finding.id] = JSON.parse(
					JSON.stringify(finding)
				);
				mockAppState.hiddenFindings.totalRecords += 1;
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
			global.window = Object.create(window);
		});

		afterEach(() => {
			global.window = globalWindow;
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
			global.window = Object.create(window);
		});

		afterEach(() => {
			global.window = globalWindow;
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
