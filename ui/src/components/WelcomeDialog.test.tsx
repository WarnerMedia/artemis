import { render, screen } from "test-utils";
import WelcomeDialog from "./WelcomeDialog";

describe("WelcomeDialog component", () => {
	it("!open, dialog isn't displayed", () => {
		const { container } = render(
			<WelcomeDialog open={false} onClose={() => {}} title="my title">
				Content
			</WelcomeDialog>
		);
		expect(container.firstChild).toBeNull();
	});

	it("open, dialog is displayed with title and content", () => {
		render(
			<WelcomeDialog open={true} onClose={() => {}} title="my title">
				The Dialog Content
			</WelcomeDialog>
		);
		expect(
			screen.getByRole("heading", { name: /my title/i })
		).toBeInTheDocument();
		screen.getByText(/the dialog content/i);
	});

	it("'don't show' option unchecked, onClose called with false", async () => {
		const mockOnClose = jest.fn();
		const { user } = render(
			<WelcomeDialog open={true} onClose={mockOnClose} title="my title">
				Content
			</WelcomeDialog>
		);
		await user.click(screen.getByRole("button", { name: /ok/i }));
		expect(mockOnClose.mock.calls[0][0]).toBe(false);
	});

	it("'don't show' option checked, onClose called with true", async () => {
		const mockOnClose = jest.fn();
		const { user } = render(
			<WelcomeDialog open={true} onClose={mockOnClose} title="my title">
				Content
			</WelcomeDialog>
		);
		await user.click(
			screen.getByRole("checkbox", { name: /don't show this dialog/i })
		);
		await user.click(screen.getByRole("button", { name: /ok/i }));
		expect(mockOnClose.mock.calls[0][0]).toBe(true);
	});
});
