import { render, screen } from "test-utils";
import GlobalException from "features/globalException/GlobalException";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useSelector: jest.fn(),
}));
/* eslint-disable */
import { useSelector } from "react-redux";

let mockAppState: any;
const mockUseSelector = useSelector as jest.Mock;

describe("GlobalException component", () => {
	beforeEach(() => {
		mockUseSelector.mockImplementation((callback) => {
			return callback(mockAppState);
		});
	});
	afterEach(() => {
		mockUseSelector.mockClear();
	});

	it("dialog is not displayed if there is no global exception", async () => {
		mockAppState = {
			globalException: {
				message: "",
			},
		};
		render(<GlobalException />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("dialog is displayed if there is a global exception", async () => {
		mockAppState = {
			globalException: {
				message: "test global exception",
			},
		};
		render(<GlobalException />);
		const dialog = screen.queryByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveTextContent(mockAppState.globalException.message);

		// global dialog should not close or action buttons/links
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("dialog contains a login button if action = 'login'", async () => {
		mockAppState = {
			globalException: {
				message: "session timeout",
				action: "login",
			},
		};
		render(<GlobalException />);
		const dialog = screen.queryByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveTextContent(mockAppState.globalException.message);

		// dialog should have login button but not close button
		expect(
			screen.queryByRole("button", { name: /close/i })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /return to login/i })
		).toBeInTheDocument();
	});
});
