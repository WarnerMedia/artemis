import { render, screen } from "test-utils";
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

	describe("WelcomeDialog", () => {
		test("hide-welcome unset, should display welcome dialog", async () => {
			localStorage.removeItem(STORAGE_LOCAL_WELCOME);
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
		});

		test("hide-welcome off, should display welcome dialog", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
		});

		test("value false if welcome dialog closed with 'don't show' option unchecked", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
			await user.click(screen.getByRole("button", { name: /ok/i }));

			// no change to hide-welcome setting
			expect(localStorageSetItemSpy).toHaveBeenCalledWith(
				STORAGE_LOCAL_WELCOME,
				"0",
			);
		});

		test("value true if welcome dialog closed with 'don't show' option checked", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "0");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<MainPage />);

			// wait for welcome dialog
			await screen.findByRole("heading", { name: /welcome to artemis/i });
			await user.click(
				screen.getByRole("checkbox", { name: /don't show this dialog/i }),
			);
			await user.click(screen.getByRole("button", { name: /ok/i }));

			// hide-welcome setting changed to true
			expect(localStorageSetItemSpy).toHaveBeenCalledWith(
				STORAGE_LOCAL_WELCOME,
				"1",
			);
		});

		test("hide-welcome on, should not display welcome dialog", async () => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1");
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);

			// no welcome dialog
			expect(
				screen.queryByRole("heading", { name: /welcome to artemis/i }),
			).not.toBeInTheDocument();
		});
	});
});
