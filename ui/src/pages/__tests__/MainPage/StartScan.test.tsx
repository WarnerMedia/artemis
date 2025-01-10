import { startScan } from "pages/MainPage";
import { AnalysisReport, ScanOptionsForm } from "features/scans/scansSchemas";

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
jest.mock("api/client", () => ({
	...(jest.requireActual("api/client") as any),
	__esModule: true,
	handleException: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
/* eslint-disable */
import { useLocation, useNavigate } from "react-router-dom";
import {
	mockStoreScanId,
	mockStoreSingleScan,
} from "../../../../testData/testMockData";
import { STORAGE_LOCAL_WELCOME } from "app/globals";
import store from "app/store";
import { addScan } from "features/scans/scansSlice";
import { User } from "features/users/usersSchemas";
import { handleException } from "api/client";

let mockAppState: any;
let mockLocation: any;
let mockHistory: any[] = [];
let globalWindow: any;
const mockUseLocation = useLocation as jest.Mock;
const mockUseNavigate = useNavigate as jest.Mock;
const mockNavigate = jest.fn();
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

let origHideWelcome: string | null;
let localStorageSetItemSpy: any;

describe("MainPage component", () => {
	jest.setTimeout(120000);

	beforeAll(() => {
		origHideWelcome = localStorage.getItem(STORAGE_LOCAL_WELCOME);
	});
	afterAll(() => {
		if (origHideWelcome) {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, origHideWelcome);
		} else {
			localStorage.removeItem(STORAGE_LOCAL_WELCOME);
		}
	});

	beforeEach(() => {
		mockUseLocation.mockImplementation(() => {
			return mockLocation;
		});
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
		localStorageSetItemSpy = jest.spyOn(
			window.localStorage.__proto__,
			"setItem",
		);
		mockLocation = {
			search: "",
		};
		mockUseNavigate.mockImplementation(() => mockNavigate);
		globalWindow = global.window;
		global.window ??= Object.create(window);
		Object.defineProperty(window, "history", {
			get() {
				return mockHistory;
			},
		});
	});
	afterEach(() => {
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
		localStorageSetItemSpy.mockRestore();
	});

	describe("startScan", () => {
		const vcsOrg = "goodVcs/goodOrg";
		const repo = "repo";
		let formValues: ScanOptionsForm;
		let currentUser: User;

		beforeEach(() => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreSingleScan));
			const scan: AnalysisReport = mockAppState.scans.entities[mockStoreScanId];

			currentUser = mockAppState.currentUser.entities["self"];
			formValues = {
				vcsOrg: vcsOrg,
				repo: repo,
				branch: scan.branch ?? "",
				secrets: scan.scan_options.categories?.includes("secret") ?? true,
				staticAnalysis:
					scan.scan_options.categories?.includes("static_analysis") ?? true,
				inventory: scan.scan_options.categories?.includes("inventory") ?? true,
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
			};
		});

		test("validates values", async () => {
			const mockNavigate = jest.fn();
			const dispatchSpy = jest.spyOn(store, "dispatch");
			currentUser.scan_orgs = [];

			startScan(mockNavigate, formValues, currentUser);
			expect(handleException).toHaveBeenCalled();

			expect(dispatchSpy).not.toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		test("calls addScan and navigate", async () => {
			const mockNavigate = jest.fn();
			const dispatchSpy = jest.spyOn(store, "dispatch");
			startScan(mockNavigate, formValues, currentUser);

			expect(dispatchSpy).toHaveBeenLastCalledWith(addScan(formValues));

			expect(mockNavigate).toHaveBeenLastCalledWith(
				`/?repo=${encodeURIComponent(
					repo,
				)}&submitContext=scan&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				{ replace: true },
			);
		});
	});
});
