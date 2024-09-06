import {
	getDefaultNormalizer,
	render,
	screen,
	waitFor,
	within,
} from "test-utils";
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
import { getScanById } from "features/scans/scansSlice";
import ResultsPage from "pages/ResultsPage";
import {
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
				// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
				// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
				// using: replace(/\s+/g, ' ')
				// causing the match to break
				// so don't collapseWhitespace in the normalizer for comparing dates here
				expect(
					within(queudDateElapsed.parentElement).getByText(queued, {
						normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
					})
				).toBeInTheDocument();
			}

			const startDate = await screen.findByText(/^Start Date$/);
			expect(startDate).toBeInTheDocument();
			if (startDate.parentElement) {
				// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
				// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
				// using: replace(/\s+/g, ' ')
				// causing the match to break
				// so don't collapseWhitespace in the normalizer for comparing dates here
				expect(
					within(startDate.parentElement).getByText(
						formatDate(scan.timestamps.start, "long"),
						{ normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }
					)
				).toBeInTheDocument();
			}

			const endDateElapsed = await screen.findByText(
				/^End Date \/ Scan Time Elapsed$/
			);
			expect(endDateElapsed).toBeInTheDocument();
			if (endDateElapsed.parentElement) {
				const end = new RegExp(formatDate(scan.timestamps.end, "long"));
				// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
				// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
				// using: replace(/\s+/g, ' ')
				// causing the match to break
				// so don't collapseWhitespace in the normalizer for comparing dates here
				expect(
					within(endDateElapsed.parentElement).getByText(end, {
						normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
					})
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
