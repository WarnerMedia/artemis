import TooltipCell from "components/ScopeCell";
import { render, screen } from "test-utils";

describe("TooltipCell component", () => {
	it("no args, empty results", () => {
		const { container } = render(<TooltipCell />);
		expect(container.firstChild).toBeNull();
	});

	it("displays a tooltip", () => {
		const string = "testme";
		render(<TooltipCell value={string} />);
		expect(screen.getByText(string)).toBeInTheDocument();
		// tooltips have titles
		expect(screen.getByTitle(string)).toBeInTheDocument();
	});
});
