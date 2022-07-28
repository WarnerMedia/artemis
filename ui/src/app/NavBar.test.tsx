import { render, screen, within } from "test-utils";
import NavBar from "./NavBar";

jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import { mockStoreEmpty } from "../../testData/testMockData";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

describe("NavBar component", () => {
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

	test("contains app name header", () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		render(<NavBar />);
		expect(
			screen.getByRole("heading", { name: /artemis/i })
		).toBeInTheDocument();
	});

	describe("app mega navbar", () => {
		test("contains user settings button", () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<NavBar />);
			expect(
				screen.getByRole("link", { name: /manage user settings/i })
			).toBeInTheDocument();
		});

		test("contains documentation button", () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<NavBar />);
			expect(
				screen.getByRole("button", { name: /open documentation/i })
			).toBeInTheDocument();
		});

		test("contains search button", () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<NavBar />);
			expect(
				screen.getByRole("link", {
					name: "Search for Components, Licenses, and Repositories",
				})
			).toBeInTheDocument();
		});

		describe("User Management feature", () => {
			test("hidden if current user is not an admin", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				mockAppState.currentUser.entities["self"].admin = false;
				render(<NavBar />);

				const menuButton = screen.queryByRole("button", {
					name: "Open Settings Menu",
				});
				expect(menuButton).not.toBeInTheDocument();
			});

			test("displayed if current user is an admin", async () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				mockAppState.currentUser.entities["self"].admin = true;
				const { user } = render(<NavBar />);

				const menuButton = screen.getByRole("button", {
					name: "Open Settings Menu",
				});
				expect(menuButton).toBeInTheDocument();
				await user.click(menuButton);

				const openMenu = screen.getByRole("menu", {
					name: "Close Settings Menu",
				});
				expect(openMenu).toBeInTheDocument();
				expect(within(openMenu).getByText("Manage Users")).toBeInTheDocument();
			});
		});

		describe("Maintenance banner feature", () => {
			test("no banner if there is no maintenance message", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				render(<NavBar />);
				expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			});

			test("banner displayed with message if there is a maintenance message", () => {
				mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
				mockAppState.systemStatus.maintenance.message = "a maintenance message";
				render(<NavBar />);
				const alert = screen.getByRole("alert");
				expect(alert).toBeInTheDocument();
				expect(
					within(alert).getByText(mockAppState.systemStatus.maintenance.message)
				).toBeInTheDocument();
			});
		});
	});
});
