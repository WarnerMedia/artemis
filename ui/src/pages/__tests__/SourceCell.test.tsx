import { render, screen } from "test-utils";
import { SourceCell } from "pages/ResultsPage";

describe("SourceCell component", () => {
	it("no args, empty results", () => {
		const { container } = render(<SourceCell />);
		expect(container.firstChild).toBeNull();
	});

	it("single filepath, displays file name", () => {
		const row = { source: "/path/to/file" };
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source)).toBeInTheDocument();
		expect(screen.getByText(row.source)).toBeInTheDocument();
	});

	it("single filepath with dependencies, displays file name without dependencies", () => {
		const row = { source: "/path/to/file: dependency>dependency>dependency" };
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source)).toBeInTheDocument();
		expect(screen.getByText("/path/to/file")).toBeInTheDocument();
	});

	it("single filepath in array, displays file name", () => {
		const row = { source: ["/path/to/file"] };
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source[0])).toBeInTheDocument();
		expect(screen.getByText(row.source[0])).toBeInTheDocument();
	});

	it("2 filepaths in array, displays 1st file + 1 more", () => {
		const row = { source: ["/path/to/file1", "/path/to/file2"] };
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source.join(", "))).toBeInTheDocument();
		expect(screen.getByText(row.source[0] + " + 1 more")).toBeInTheDocument();
	});

	it("10 filepaths in array, displays 1st file + 9 more", () => {
		const row = {
			source: [
				"/path/to/file1",
				"/path/to/file2",
				"/path/to/file3",
				"/path/to/file4",
				"/path/to/file5",
				"/path/to/file6",
				"/path/to/file7",
				"/path/to/file8",
				"/path/to/file9",
				"/path/to/file10",
			],
		};
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source.join(", "))).toBeInTheDocument();
		expect(screen.getByText(row.source[0] + " + 9 more")).toBeInTheDocument();
	});

	it("shows warning for 1 unhidden finding", () => {
		const row = {
			source: ["/path/to/file1"],
			unhiddenFindings: ["/path/to/file2"],
		};
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source[0])).toBeInTheDocument();
		expect(screen.getByText(row.source[0])).toBeInTheDocument();

		expect(
			screen.getByLabelText(/1 source file not covered/i)
		).toBeInTheDocument();
	});

	it("shows warning for 3 unhidden findings", () => {
		const row = {
			source: ["/path/to/file1"],
			unhiddenFindings: ["/path/to/file2", "/path/to/file3", "/path/to/file4"],
		};
		render(<SourceCell row={row} />);
		expect(screen.getByTitle(row.source[0])).toBeInTheDocument();
		expect(screen.getByText(row.source[0])).toBeInTheDocument();

		expect(
			screen.getByLabelText(/3 source files not covered/i)
		).toBeInTheDocument();
	});
});
