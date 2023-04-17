import { render, screen } from "test-utils";
import { Risks } from "features/scans/scansSchemas";
import { RiskChip } from "components/ChipCell";

const RISKS: Risks[] = ["priority", "critical", "high", "moderate", "low"];

describe("RiskChip component", () => {
	it("no args, empty results", () => {
		const { container } = render(<RiskChip />);
		expect(container.firstChild).toBeNull();
	});

	it("valid risks, creates labelled chip", () => {
		RISKS.forEach((risk) => {
			const re = new RegExp(risk, "i");
			render(<RiskChip value={risk} />);
			expect(screen.getByText(re)).toBeInTheDocument();
		});
	});

	it("valid risks, creates labelled chip with count", () => {
		const count = 10;
		RISKS.forEach((risk) => {
			const re = new RegExp(`${risk}: ${count}`, "i");
			render(<RiskChip value={risk} count={10} />);
			expect(screen.getByText(re)).toBeInTheDocument();
		});
	});
});
