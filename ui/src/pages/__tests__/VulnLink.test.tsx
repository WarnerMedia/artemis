import { render, screen } from "test-utils";
import { VulnLink } from "pages/ResultsPage";

describe("VulnLink component", () => {
	const nvdTitle = new RegExp(
		"view in the national vulnerability database",
		"i",
	);
	const vulnTitle = new RegExp("view in external site", "i");

	it("invalid vulnid, no link", () => {
		const vulnId = "CVE1";
		render(<VulnLink vulnId={vulnId} />);
		expect(screen.getByText(vulnId)).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("valid CVEID format, creates named button with NVD link", () => {
		const vulnId = "CVE-2021-0101";
		render(<VulnLink vulnId={vulnId} />);
		expect(screen.getByTitle(nvdTitle)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: vulnId }),
		).not.toBeInTheDocument();
	});

	it("valid longer CVEID format, creates named button with NVD link", () => {
		const vulnId = "CVE-2021-010101";
		render(<VulnLink vulnId={vulnId} />);
		expect(screen.getByTitle(nvdTitle)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: vulnId }),
		).not.toBeInTheDocument();
	});

	it("valid CVEID format + addTitle, creates button with NVD link", () => {
		const vulnId = "CVE-2021-0101";
		render(<VulnLink vulnId={vulnId} />);
		expect(
			screen.queryByRole("button", { name: nvdTitle }),
		).not.toBeInTheDocument();
	});

	it("invalid vuln link, no link", () => {
		const vulnId = "http://test.invalid+chars";
		render(<VulnLink vulnId={vulnId} />);
		expect(screen.getByText(vulnId)).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("valid vuln link, creates named button with generic link", () => {
		const vulnId = "https://npmjs.com/vuln/1234";
		render(<VulnLink vulnId={vulnId} />);
		expect(screen.getByTitle(vulnTitle)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: vulnId }),
		).not.toBeInTheDocument();
	});

	it("valid vuln link + addTitle, creates button with generic link", () => {
		const vulnId = "https://npmjs.com/vuln/1234";
		render(<VulnLink vulnId={vulnId} />);
		expect(
			screen.queryByRole("button", { name: vulnTitle }),
		).not.toBeInTheDocument();
	});
});
