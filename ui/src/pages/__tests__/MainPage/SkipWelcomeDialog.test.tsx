import { render, screen } from "test-utils";
import MainPage from "pages/MainPage";
import { APP_DEMO_USER_REPO, APP_DEMO_USER_VCSORG } from "app/globals";

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

	describe("Skip WelcomeDialog", () => {
		beforeAll(() => {
			localStorage.setItem(STORAGE_LOCAL_WELCOME, "1"); // hide welcome dialog
		});

		test("contains a header", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			render(<MainPage />);
			expect(
				screen.getByRole("heading", { name: /scan information/i }),
			).toBeInTheDocument();
		});

		test("vcs field loads options", async () => {
			jest.useFakeTimers();
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			mockAppState.currentUser.status = "loading";

			const { rerender, user } = render(<MainPage />, null, {
				advanceTimers: jest.advanceTimersByTime,
			});
			// initial field state
			const initialField = screen.getByLabelText(/loading options/i);
			expect(initialField).toBeInTheDocument();
			expect(initialField).toBeDisabled();
			expect(initialField).not.toHaveFocus();

			// user now loaded
			mockAppState.currentUser.status = "succeeded";
			rerender(<MainPage />);
			jest.runOnlyPendingTimers();

			// after options loaded
			// findBy* = async
			const loadedField = await screen.findByRole("combobox", {
				name: "Version Control System",
			});
			expect(loadedField).toBeInTheDocument();
			expect(loadedField).toBeEnabled();
			expect(loadedField).toHaveFocus(); // first form element focused

			// user clicks next field without entering a value for vcs field
			await user.click(loadedField);
			await user.tab();

			// should generate a validation error vcs field required
			const validationErrors = await screen.findByText("Required");
			expect(validationErrors).toBeInTheDocument();

			// actions should be disabled
			screen.getByRole("button", { name: /start scan/i });

			jest.useRealTimers();
		});

		test("onboarding link exists", async () => {
			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			const { user } = render(<MainPage />);

			// 1. onboarding link appears when form first loaded
			const onboardingLink = screen.getByRole("link", {
				name: "Missing an option? Request access",
			});
			expect(onboardingLink).toBeInTheDocument();

			// 2. onboarding link remains there are no vcs validation errors
			await screen.findByRole("combobox", { name: "Version Control System" });
			const loadedField = screen.getByRole("combobox", {
				name: "Version Control System",
			});
			expect(loadedField).toBeInTheDocument();
			expect(loadedField).toBeEnabled();
			await user.type(
				loadedField,
				`${mockAppState.currentUser.entities["self"].scan_orgs[2]}{enter}`,
			);

			// user clicks next field after entering a valid value for vcs field
			await user.click(screen.getByRole("textbox", { name: "Repository" }));

			// there should be no validation errors
			expect(screen.queryByText("Required")).not.toBeInTheDocument();

			expect(onboardingLink).toBeInTheDocument();

			// 3. onboarding link should remain when there are vcs validation errors
			await user.click(loadedField);
			await user.clear(loadedField);
			await user.click(screen.getByRole("textbox", { name: "Repository" }));
			await screen.findAllByText("Required");

			expect(onboardingLink).toBeInTheDocument();
		});

		test("For users with demo-only scope, the demo repo is prepopulated in the form, and the button is live.", async () => {
			// setup a currentUser which has only demo scope
			const demoOnly = {
				scan_orgs: [APP_DEMO_USER_VCSORG],
				email: "DemoOnly@example.com",
				last_login: "2021-03-28T19:23:41+00:00",
				admin: false,
				scope: [`${APP_DEMO_USER_VCSORG}/${APP_DEMO_USER_REPO}`],
				features: { feature1: true, feature2: false },
				id: "self",
			};

			mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
			mockAppState.currentUser.entities.self = demoOnly;
			// ensure user data is loaded so we have the current user's scope(s)
			mockAppState.currentUser.status = "succeeded";
			render(<MainPage />);

			// wait for form to render
			await screen.findByRole("combobox", { name: "Version Control System" });

			// get the inputs, and assert they have the demo values prepopulated
			expect(
				screen.getByRole("combobox", {
					name: "Version Control System",
				}),
			).toHaveValue(APP_DEMO_USER_VCSORG);

			expect(screen.getByLabelText("Repository")).toHaveValue(
				APP_DEMO_USER_REPO,
			);

			// assert the button is live
			const startScanButton = screen.getByRole("button", {
				name: /start scan/i,
			});

			expect(startScanButton).not.toBeDisabled();
		});
	});
});
