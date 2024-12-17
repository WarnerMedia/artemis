import { render, screen, waitFor } from "test-utils";
import MainPage from "pages/MainPage";

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
import { mockStoreEmpty } from "../../../../testData/testMockData";
import { STORAGE_LOCAL_WELCOME } from "app/globals";
import { getScanHistory } from "features/scans/scansSlice";

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

	describe("Page titles", () => {
		beforeAll(() => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1"); // hide welcome dialog
		});

		describe("Form submission", () => {
			test("Title is Artemis before form is submitted", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				expect(global.window.document.title).toMatch("Artemis");
			});

			test("Title contains repo when vcsOrg does not contain an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				const vcsOrg = "goodVcs.goodOrg.com";
				const repo = "org/repo";
				await user.type(vcsField, `${vcsOrg}{enter}`);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				await user.type(repoField, repo);

				const viewScansButton = screen.getByRole("button", {
					name: /view scans/i,
				});
				await user.click(viewScansButton);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(`Artemis: ${repo}`),
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						}),
					),
				);

				await waitFor(() =>
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/?repo=${encodeURIComponent(
							repo,
						)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
						{ replace: true },
					),
				);
			});

			test("Title contains org/repo name when vcsOrg contains an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				const vcsOrg = "goodVcs/goodOrg";
				const repo = "repo";
				await user.type(vcsField, `${vcsOrg}{enter}`);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				await user.type(repoField, repo);

				const viewScansButton = screen.getByRole("button", {
					name: /view scans/i,
				});
				await user.click(viewScansButton);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`Artemis: ${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`,
					),
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						}),
					),
				);

				await waitFor(() =>
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/?repo=${encodeURIComponent(
							repo,
						)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
						{ replace: true },
					),
				);
			});

			test("Title contains org/repo name when vcsOrg contains path with an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const { user } = render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				const vcsOrg = "goodVcs/goodOrg/org/path";
				const repo = "repo";
				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				await user.type(vcsField, `${vcsOrg}{enter}`);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				await user.type(repoField, repo);

				const viewScansButton = screen.getByRole("button", {
					name: /view scans/i,
				});
				await user.click(viewScansButton);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`,
					),
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						}),
					),
				);

				await waitFor(() =>
					expect(mockNavigate).toHaveBeenLastCalledWith(
						`/?repo=${encodeURIComponent(
							repo,
						)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
						{ replace: true },
					),
				);
			});
		});

		describe("URL query params", () => {
			test("Title contains repo when vcsOrg does not contain an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const vcsOrg = "goodVcs.goodOrg.com";
				const repo = "org/repo";
				mockLocation = {
					search: `?repo=${encodeURIComponent(
						repo,
					)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				};
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				expect(vcsField).toHaveDisplayValue(vcsOrg);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				expect(repoField).toHaveDisplayValue(repo);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(`Artemis: ${repo}`),
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						}),
					),
				);
			});

			test("Title contains org/repo name when vcsOrg contains an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const vcsOrg = "goodVcs/goodOrg";
				const repo = "repo";
				mockLocation = {
					search: `?repo=${encodeURIComponent(
						repo,
					)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				};
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				expect(vcsField).toHaveDisplayValue(vcsOrg);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				expect(repoField).toHaveDisplayValue(repo);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`Artemis: ${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`,
					),
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						}),
					),
				);
			});

			test("Title contains org/repo name when vcsOrg contains path with an org", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				const vcsOrg = "goodVcs/goodOrg/org/path";
				const repo = "repo";
				mockLocation = {
					search: `?repo=${encodeURIComponent(
						repo,
					)}&submitContext=view&vcsOrg=${encodeURIComponent(vcsOrg)}`,
				};
				render(<MainPage />);

				// wait for current user info to load
				await waitFor(() =>
					expect(
						screen.queryByText(/^loading options$/),
					).not.toBeInTheDocument(),
				);

				const vcsField = screen.getByRole("combobox", {
					name: /version control system/i,
				});
				expect(vcsField).toHaveDisplayValue(vcsOrg);

				const repoField = screen.getByRole("textbox", {
					name: /repository/i,
				});
				expect(repoField).toHaveDisplayValue(repo);

				// check the page title contains expected repo & branch
				// branch is "default" since scan contains a null branch field
				await waitFor(() =>
					expect(global.window.document.title).toMatch(
						`${vcsOrg.substring(vcsOrg.indexOf("/") + 1)}/${repo}`,
					),
				);

				await waitFor(() =>
					expect(mockDispatch).toHaveBeenLastCalledWith(
						getScanHistory({
							data: expect.objectContaining({ repo: repo, vcsOrg: vcsOrg }),
							meta: expect.any(Object),
						}),
					),
				);
			});
		});
	});
});
