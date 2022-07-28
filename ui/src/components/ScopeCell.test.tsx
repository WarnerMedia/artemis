import { render, screen } from "test-utils";
import ScopeCell from "./ScopeCell";

describe("ScopeCell component", () => {
	it("no args, empty results", () => {
		const { container } = render(<ScopeCell />);
		expect(container.firstChild).toBeNull();
	});

	it("displays a single value with a tooltip", () => {
		const string = "testme";
		render(<ScopeCell value={string} />);
		expect(screen.getByText(string)).toBeInTheDocument();
		// tooltips have titles
		expect(screen.getByTitle(string)).toBeInTheDocument();
	});

	it("array of 1 element displays single value with a tooltip", () => {
		const string = ["one"];
		render(<ScopeCell value={string} />);
		expect(screen.getByText(string[0])).toBeInTheDocument();
		// tooltips have titles
		expect(screen.getByTitle(string[0])).toBeInTheDocument();
	});

	it("array of elements displays ITEM + X MORE & tooltip with comma-separated elements", () => {
		const string = ["one", "two", "three", "four"];
		render(<ScopeCell value={string} />);
		expect(screen.getByText(`${string[0]} + 3 more`)).toBeInTheDocument();
		// tooltips have titles
		expect(screen.getByTitle(string.join(", "))).toBeInTheDocument();
	});
});
