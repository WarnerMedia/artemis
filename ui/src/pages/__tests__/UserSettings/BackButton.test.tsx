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
	__esModule: true,
	useNavigate: jest.fn(),
	useLocation: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import UserSettings from "pages/UserSettings";
import { mockStoreEmpty } from "../../../../testData/testMockData";
import { STORAGE_LOCAL_WELCOME } from "app/globals";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

const mockUseLocation = useLocation as jest.Mock;
const mockUseNavigate = useNavigate as jest.Mock;
const mockNavigate = jest.fn();
let mockHistory: any[] = [];
let globalWindow: any;
let mockLocation: any;

let origHideWelcome: string | null;

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
	origHideWelcome = localStorage.getItem(STORAGE_LOCAL_WELCOME);
});
afterAll(() => {
	if (origHideWelcome) {
		localStorage.setItem(STORAGE_LOCAL_WELCOME, origHideWelcome);
	} else {
		localStorage.removeItem(STORAGE_LOCAL_WELCOME);
	}
});

describe("UserSettings component", () => {
	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
		mockUseDispatch.mockImplementation(() => mockDispatch);
		mockUseNavigate.mockImplementation(() => mockNavigate);
		mockUseLocation.mockImplementation(() => {
			return mockLocation;
		});
		globalWindow = global.window;
		global.window ??= Object.create(window);
		Object.defineProperty(window, "history", {
			get() {
				return mockHistory;
			},
		});
		mockLocation = {
			pathname: "/settings",
			search: "",
		};
	});
	afterEach(() => {
		mockUseSelector.mockClear();
		mockUseDispatch.mockClear();
		// clear mockDispatch too or mock call counts will be inaccurate
		// will (bleed-over from prior tests)
		mockDispatch.mockClear();
		mockUseLocation.mockClear();
		mockUseNavigate.mockClear();
		mockNavigate.mockClear();
		global.window ??= globalWindow;
	});

	// back button functionality tested more thoroughly in BackButton.test.tsx
	// this just checks for existence on this page and expected behavior wrt account linking
	describe("back button", () => {
		it("page should have a back button", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<UserSettings />);
			expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
		});

		it("back button should not call fromRedirect if an auth code wasn't passed in the page URL", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<UserSettings />);
			const button = screen.getByRole("button", { name: "Back" });
			expect(button).toBeInTheDocument();

			await user.click(button);
			expect(mockNavigate).toBeCalledWith("/");
		});

		it("back button should call fromRedirect if an auth code is passed in the page URL", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const pathname = "/settings";
			mockLocation = {
				pathname: pathname,
				search: `?code=abcdef1023456789abcd`,
			};
			const { user } = render(<UserSettings />);
			const button = screen.getByRole("button", { name: "Back" });
			expect(button).toBeInTheDocument();

			await user.click(button);
			expect(mockNavigate).toHaveBeenCalledTimes(2);
			expect(mockNavigate).toHaveBeenNthCalledWith(1, pathname, {
				replace: true,
			});
			expect(mockNavigate).toHaveBeenNthCalledWith(2, -2);
		});
	});
});
