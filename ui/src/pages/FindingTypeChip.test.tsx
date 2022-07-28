import { render, screen } from "test-utils";
import { HiddenFindingType } from "features/hiddenFindings/hiddenFindingsSchemas";
import { FindingTypeChip } from "./ResultsPage";

describe("FindingTypeChip component", () => {
	it("no args, empty results", () => {
		const { container } = render(<FindingTypeChip />);
		expect(container.firstChild).toBeNull();
	});

	it("valid finding types, creates labelled chip", () => {
		const types: HiddenFindingType[] = [
			"vulnerability",
			"vulnerability_raw",
			"static_analysis",
			"secret",
			"secret_raw",
		];
		types.forEach((type) => {
			// replace _ in types with space, e.g. "vulnerability_raw" => "vulnerability raw"
			const re = new RegExp(type.replace("_", " "), "i");
			render(<FindingTypeChip value={type} />);
			expect(screen.getByText(re)).toBeInTheDocument();
		});
	});
});
