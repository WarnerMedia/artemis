import { getDefaultNormalizer, render, screen, within } from "test-utils";
import { LinkedAccounts } from "./UserSettings";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useSelector, useDispatch } from "react-redux";
import { unlinkVcsService } from "features/vcsServices/vcsServicesSlice";
import { mockStoreEmpty } from "../../testData/testMockData";
import { APP_SERVICE_GITHUB_URL } from "app/globals";
import { Settings } from "luxon";
import { formatDate } from "utils/formatters";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("LinkedAccounts component", () => {
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

	it("no linked services shows 'link github' button", () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));

		render(<LinkedAccounts />);
		expect(
			screen.getByRole("button", { name: "Link GitHub User" })
		).toBeInTheDocument();
	});

	it("shows no buttons while component loading", () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		mockAppState.vcsServices.status = "loading";

		render(<LinkedAccounts />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("shows a disabled linking button while account linking", () => {
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		mockAppState.vcsServices.linking.github = true;

		render(<LinkedAccounts />);
		const button = screen.getByRole("button", {
			name: "Linking GitHub User...",
		});
		expect(button).toBeInTheDocument();
		expect(button).toBeDisabled();
	});

	it("link button redirects to vcs auth", async () => {
		const globalWindow = global.window;
		global.window = Object.create(window);
		const url = "";
		Object.defineProperty(window, "location", {
			value: {
				href: url,
			},
		});
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));

		const { user } = render(<LinkedAccounts />);
		const button = screen.getByRole("button", {
			name: "Link GitHub User",
		});
		expect(button).toBeInTheDocument();
		await user.click(button);
		expect(window.location.href).toEqual(APP_SERVICE_GITHUB_URL);

		global.window = globalWindow;
	});

	it("if linked, shows an unlink button and account information", () => {
		const linkDate = "2021-10-18T00:00:00Z";
		const userName = "github-username";
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		mockAppState.vcsServices.ids = ["github"];
		mockAppState.vcsServices.entities.github = {
			username: userName,
			linked: linkDate,
		};

		render(<LinkedAccounts />);
		const button = screen.getByRole("button", {
			name: "Unlink GitHub User",
		});
		expect(button).toBeInTheDocument();

		const usernameLabel = screen.getByText(/Username:/);
		const usernameRe = new RegExp(userName);
		expect(within(usernameLabel).getByText(usernameRe)).toBeInTheDocument();

		const linkedLabel = screen.getByText(/Linked:/);
		const linkedRe = new RegExp(formatDate(linkDate, "long"));
		// ICU 72.1 update introduced a unicode string, \u202f, to separate time from AM/PM
		// the collapseWhitespace option in the text normalizer was converting this to ' ' (space)
		// using: replace(/\s+/g, ' ')
		// causing the match to break
		// so don't collapseWhitespace in the normalizer for comparing dates here
		expect(
			within(linkedLabel).getByText(linkedRe, {
				normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
			})
		).toBeInTheDocument();
	});

	it("shows a disabled unlinking button while account unlinking", () => {
		const linkDate = "2021-10-18T00:00:00Z";
		const userName = "github-username";
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		mockAppState.vcsServices.ids = ["github"];
		mockAppState.vcsServices.entities.github = {
			username: userName,
			linked: linkDate,
		};
		mockAppState.vcsServices.unlinking.github = true;

		render(<LinkedAccounts />);
		const button = screen.getByRole("button", {
			name: "Unlinking GitHub User...",
		});
		expect(button).toBeInTheDocument();
		expect(button).toBeDisabled();
	});

	it("clicking unlink and cancelling confirmation does not call dispatch", async () => {
		const linkDate = "2021-10-18T00:00:00Z";
		const userName = "github-username";
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		mockAppState.vcsServices.ids = ["github"];
		mockAppState.vcsServices.entities.github = {
			username: userName,
			linked: linkDate,
		};

		const { user } = render(<LinkedAccounts />);
		const button = screen.getByRole("button", {
			name: "Unlink GitHub User",
		});
		expect(button).toBeInTheDocument();
		await user.click(button);

		expect(screen.queryByRole("dialog")).toBeInTheDocument();
		const cancelButton = screen.getByRole("button", {
			name: "Cancel",
		});
		expect(cancelButton).toBeInTheDocument();
		await user.click(cancelButton);

		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it("clicking unlink and confirming dispatches an unlink event", async () => {
		const linkDate = "2021-10-18T00:00:00Z";
		const userName = "github-username";
		mockAppState = JSON.parse(JSON.stringify(mockStoreEmpty));
		mockAppState.vcsServices.ids = ["github"];
		mockAppState.vcsServices.entities.github = {
			username: userName,
			linked: linkDate,
		};

		const { user } = render(<LinkedAccounts />);
		const button = screen.getByRole("button", {
			name: "Unlink GitHub User",
		});
		expect(button).toBeInTheDocument();
		await user.click(button);

		const dialog = screen.queryByRole("dialog");
		expect(dialog).toBeInTheDocument();

		if (dialog) {
			const unlinkButton = within(dialog).getByRole("button", {
				name: "Unlink",
			});
			expect(unlinkButton).toBeInTheDocument();
			await user.click(unlinkButton);
		}

		expect(mockDispatch).toHaveBeenLastCalledWith(
			unlinkVcsService({
				url: "/users/self/services/github",
			})
		);
	});
});
