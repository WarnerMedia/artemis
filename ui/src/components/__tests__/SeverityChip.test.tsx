import { render, screen } from "test-utils";
import { Severities } from "features/scans/scansSchemas";
import { SeverityChip } from "components/ChipCell";

const SEVERITIES: Severities[] = [
	"critical",
	"high",
	"medium",
	"low",
	"negligible",
];

describe("SeverityChip component", () => {
	it("no args, empty results", () => {
		const { container } = render(<SeverityChip />);
		expect(container.firstChild).toBeNull();
	});

	it("blank severity, empty results", () => {
		const { container } = render(<SeverityChip value="" />);
		expect(container.firstChild).toBeNull();
	});

	it("valid severities, creates labelled chip", () => {
		SEVERITIES.forEach((severity) => {
			const re = new RegExp(severity, "i");
			render(<SeverityChip value={severity} />);
			expect(screen.getByText(re)).toBeInTheDocument();
		});
	});

	it("valid severities, creates labelled chip with count", () => {
		const count = 10;
		SEVERITIES.forEach((severity) => {
			const re = new RegExp(`${severity}: ${count}`, "i");
			render(<SeverityChip value={severity} count={10} />);
			expect(screen.getByText(re)).toBeInTheDocument();
		});
	});
});
