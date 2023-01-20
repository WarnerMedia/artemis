import { render, screen } from "test-utils";
import WelcomeDialog from "./WelcomeDialog";

describe("WelcomeDialog component", () => {
	it("!open, dialog isn't displayed", () => {
		const { container } = render(
			<WelcomeDialog open={false} onOk={() => {}} title="my title">
				Content
			</WelcomeDialog>
		);
		expect(container.firstChild).toBeNull();
	});

	it("open, dialog is displayed with title and content", () => {
		render(
			<WelcomeDialog open={true} onOk={() => {}} title="my title">
				The Dialog Content
			</WelcomeDialog>
		);
		expect(
			screen.getByRole("heading", { name: /my title/i })
		).toBeInTheDocument();
		screen.getByText(/the dialog content/i);
	});

	it("'don't show' option unchecked, onOk called with false", async () => {
		const mockOnClose = jest.fn();
		const { user } = render(
			<WelcomeDialog open={true} onOk={mockOnClose} title="my title">
				Content
			</WelcomeDialog>
		);
		await user.click(screen.getByRole("button", { name: /ok/i }));
		expect(mockOnClose.mock.calls[0][0]).toBe(false);
	});

	it("'don't show' option checked, onOk called with true", async () => {
		const mockOnClose = jest.fn();
		const { user } = render(
			<WelcomeDialog open={true} onOk={mockOnClose} title="my title">
				Content
			</WelcomeDialog>
		);
		await user.click(
			screen.getByRole("checkbox", { name: /don't show this dialog/i })
		);
		await user.click(screen.getByRole("button", { name: /ok/i }));
		expect(mockOnClose.mock.calls[0][0]).toBe(true);
	});

	it("okText changes dialog confirmation button text", async () => {
		const mockOnClose = jest.fn();
		const { user } = render(
			<WelcomeDialog
				open={true}
				onOk={mockOnClose}
				title="my title"
				okText="I Acknowledge"
			>
				Content
			</WelcomeDialog>
		);
		expect(
			screen.queryByRole("button", { name: /ok/i })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "I Acknowledge" }));
		expect(mockOnClose.mock.calls[0][0]).toBe(false);
	});

	it("onCancel attribute adds cancel button that calls onCancel", async () => {
		const mockOnClose = jest.fn();
		const mockOnCancel = jest.fn();
		const { user } = render(
			<WelcomeDialog
				open={true}
				onOk={mockOnClose}
				onCancel={mockOnCancel}
				title="my title"
			>
				Content
			</WelcomeDialog>
		);
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		expect(mockOnClose).not.toHaveBeenCalled();
		expect(mockOnCancel).toHaveBeenCalled();
	});
});
