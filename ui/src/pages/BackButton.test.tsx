import { render, screen } from "test-utils";
import { BackButton } from "./UserSettings";

jest.mock("react-router-dom", () => ({
	...(jest.requireActual("react-router-dom") as any),
	__esModule: true,
	useNavigate: jest.fn(),
}));
/* eslint-disable */
import { useNavigate } from "react-router-dom";

const mockUseNavigate = useNavigate as jest.Mock;
const mockNavigate = jest.fn();
let mockHistory: any[] = [];
let globalWindow: any;

describe("BackButton component", () => {
	beforeEach(() => {
		mockUseNavigate.mockImplementation(() => mockNavigate);
		globalWindow = global.window;
		global.window = Object.create(window);
		Object.defineProperty(window, "history", {
			get() {
				return mockHistory;
			},
		});
	});
	afterEach(() => {
		mockUseNavigate.mockClear();
		mockNavigate.mockClear();
		global.window = globalWindow;
	});

	it("direct navigation to page goes back to /", async () => {
		const origReferrer = document.referrer;
		Object.defineProperty(document, "referrer", {
			value: "",
			configurable: true,
		});
		mockHistory = ["1", "2"];

		const { user } = render(<BackButton />);
		const button = screen.getByRole("button", { name: "Back" });
		expect(button).toBeInTheDocument();

		await user.click(button);
		expect(mockNavigate).toBeCalledWith("/");

		Object.defineProperty(document, "referrer", { value: origReferrer });
	});

	it("navigation to page goes back to prior page", async () => {
		const origReferrer = document.referrer;
		Object.defineProperty(document, "referrer", {
			value: "",
			configurable: true,
		});
		mockHistory = ["1", "2", "3"];

		const { user } = render(<BackButton />);
		const button = screen.getByRole("button", { name: "Back" });
		expect(button).toBeInTheDocument();

		await user.click(button);
		expect(mockNavigate).toBeCalledWith(-1);

		Object.defineProperty(document, "referrer", { value: origReferrer });
	});

	it("redirection back to this page goes back 2 pages", async () => {
		const origReferrer = document.referrer;
		Object.defineProperty(document, "referrer", {
			value: "localhost",
			configurable: true,
		});
		mockHistory = ["1", "2", "3", "4"];

		const { user } = render(<BackButton />);
		const button = screen.getByRole("button", { name: "Back" });
		expect(button).toBeInTheDocument();

		await user.click(button);
		expect(mockNavigate).toBeCalledWith(-2);

		Object.defineProperty(document, "referrer", { value: origReferrer });
	});
});
