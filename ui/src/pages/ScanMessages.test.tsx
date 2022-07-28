import { render, screen } from "test-utils";
import { ScanMessages } from "./ResultsPage";

describe("ScanMessages component", () => {
	it("no messages, hide component", () => {
		const { container } = render(<ScanMessages />);
		expect(container.firstChild).toBeNull();
	});

	it("use default severity and startExpanded", () => {
		render(<ScanMessages messages={{ test: "me" }} />);
		const accordion = screen.getByRole("button", { name: "Scan Warnings (1)" });
		expect(accordion).toBeInTheDocument();
		expect(accordion).toHaveAttribute("aria-expanded", "false");
	});

	it("severity=error changes accordion title", () => {
		render(<ScanMessages messages={{ test: "me" }} severity="error" />);
		const accordion = screen.getByRole("button", { name: "Scan Errors (1)" });
		expect(accordion).toBeInTheDocument();
	});

	it("startExpanded=true shows alerts", () => {
		render(<ScanMessages messages={{ test: "me" }} startExpanded={true} />);
		const accordion = screen.getByRole("button", { name: "Scan Warnings (1)" });
		expect(accordion).toBeInTheDocument();
		expect(accordion).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("test: me")).toBeInTheDocument();
	});

	it("message formatting", () => {
		render(
			<ScanMessages
				messages={{
					variable: "variableValue",
					variableArray1: ["variableArray1Item1"],
					variableArray2: [
						"variableArray2Item1",
						"variableArray2Item2",
						"variableArray2Item3",
						"variableArray2Item4",
					],
				}}
				startExpanded={true}
			/>
		);
		expect(
			screen.getByRole("button", { name: "Scan Warnings (3)" })
		).toBeInTheDocument();
		expect(screen.getByText("variable: variableValue")).toBeInTheDocument();
		expect(
			screen.getByText("variableArray1: variableArray1Item1")
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"variableArray2: variableArray2Item1, variableArray2Item2, variableArray2Item3, variableArray2Item4"
			)
		).toBeInTheDocument();
	});
});
