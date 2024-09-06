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
