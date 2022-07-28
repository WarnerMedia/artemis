import { render, screen } from "@testing-library/react";
import App from "./App";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
/* eslint-disable */
import { getCurrentUser } from "features/users/currentUserSlice";
import { getSystemStatus } from "features/systemStatus/systemStatusSlice";
import { mockStoreEmpty } from "../testData/testMockData";
import { APP_MAINT_CHECK_INTERVAL, STORAGE_LOCAL_WELCOME } from "app/globals";
import { getTheme } from "features/theme/themeSlice";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

let origHideWelcome: string | null;
beforeAll(() => {
	origHideWelcome = localStorage.getItem(STORAGE_LOCAL_WELCOME);
	localStorage.setItem(STORAGE_LOCAL_WELCOME, "1"); // hide welcome message for all tests
});
afterAll(() => {
	if (origHideWelcome) {
		localStorage.setItem(STORAGE_LOCAL_WELCOME, origHideWelcome);
	} else {
		localStorage.removeItem(STORAGE_LOCAL_WELCOME);
	}
});

// this component doesn't take different props we need to test
// so we can just load the same component before each test
beforeEach(() => {
	jest.useFakeTimers(); // fake timers must be initialized before rendering <App/>
	mockUseSelector.mockImplementation((callback) => {
		return callback(mockAppState);
	});
	mockUseDispatch.mockImplementation(() => mockDispatch);
	mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
	render(<App />);
});
afterEach(() => {
	mockUseSelector.mockClear();
	mockUseDispatch.mockClear();
	// clear mockDispatch too or mock call counts will be inaccurate
	// will (bleed-over from prior tests)
	mockDispatch.mockClear();
});

test("default route renders mainpage form", async () => {
	await screen.findByRole("heading", { name: /scan information/i });
});

test("app should fetch current user on load", () => {
	expect(mockDispatch).toHaveBeenCalledWith(getCurrentUser());
});

test("app should fetch user theme on load", () => {
	expect(mockDispatch).toHaveBeenCalledWith(getTheme());
});

describe("system status", () => {
	test("app should fetch system status on load", () => {
		expect(mockDispatch).toHaveBeenCalledWith(getSystemStatus());
	});

	test("system status should be checked at an interval", () => {
		expect(mockDispatch).toHaveBeenCalledWith(getSystemStatus());
		// clear mock dispatch after each interval timeout to check that only getSystemStatus dispatch has been called
		mockDispatch.mockClear();
		jest.advanceTimersByTime(APP_MAINT_CHECK_INTERVAL + 1000);
		expect(mockDispatch).toHaveBeenCalledWith(getSystemStatus());
		mockDispatch.mockClear();
		jest.advanceTimersByTime(APP_MAINT_CHECK_INTERVAL + 1000);
		expect(mockDispatch).toHaveBeenCalledWith(getSystemStatus());
		mockDispatch.mockClear();
		jest.advanceTimersByTime(APP_MAINT_CHECK_INTERVAL + 1000);
		expect(mockDispatch).toHaveBeenCalledWith(getSystemStatus());
		mockDispatch.mockClear();
	});
});
