import { render, screen } from "test-utils";
import { SecretDetail, SecretValidity } from "features/scans/scansSchemas";
import { SecretValidityChip } from "components/SecretValidityCell";

const VALIDITIES: SecretValidity[] = [
	SecretValidity.Active,
	SecretValidity.Inactive,
	SecretValidity.Unknown,
];

const TYPE_1 = "aws";
const TYPE_2 = "ssh";

const SOURCE = "Trufflehog";

const DETAIL_ACTIVE: SecretDetail = {
	type: TYPE_1,
	validity: SecretValidity.Active,
	source: SOURCE,
}

const DETAIL_INACTIVE_1: SecretDetail = {
	type: TYPE_1,
	validity: SecretValidity.Inactive,
	source: SOURCE,
}

const DETAIL_INACTIVE_2: SecretDetail = {
	type: TYPE_2,
	validity: SecretValidity.Inactive,
	source: SOURCE,
}

const DETAIL_UNKNOWN: SecretDetail = {
	type: TYPE_1,
	validity: SecretValidity.Unknown,
	source: SOURCE,
}

describe("SecretValidityCell", () => {
	it("no args, shows 'not tested'", () => {
		render(<SecretValidityChip />);
		expect(screen.getByText(/not tested/i)).toBeInTheDocument();
	});

	it("blank validity, shows 'not tested'", () => {
		render(<SecretValidityChip value="" />);
		expect(screen.getByText(/not tested/i)).toBeInTheDocument();
	});

	it("valid validities, creates labelled chip", () => {
		VALIDITIES.forEach((validity) => {
			const re = new RegExp(validity, "i");
			render(<SecretValidityChip value={validity} />);
			expect(screen.getByText(re)).toBeInTheDocument();
		});
	});

	it("one detail, creates labelled chip", () => {
		const details = [ DETAIL_ACTIVE ];
		const validity = getValidityStrFromDetails(details);

		const re = new RegExp(validity, "i");
		render(<SecretValidityChip value={validity} details={details} />);
		expect(screen.getByText(re)).toBeInTheDocument();
	});

	it("two details with same validity, creates labelled chip", () => {
		const details = [ DETAIL_INACTIVE_1, DETAIL_INACTIVE_2 ];
		const validity = getValidityStrFromDetails(details);

		const re = new RegExp(validity, "i");
		render(<SecretValidityChip value={validity} details={details} />);
		expect(screen.getByText(re)).toBeInTheDocument();
	});

	it("two details with one active, creates labelled chip with 'Active (Mixed)'", () => {
		const details = [ DETAIL_ACTIVE, DETAIL_INACTIVE_1 ];
		const validity = getValidityStrFromDetails(details);

		const re = new RegExp(`${SecretValidity.Active} \\(mixed\\)`, "i");
		render(<SecretValidityChip value={validity} details={details} />);
		expect(screen.getByText(re)).toBeInTheDocument();
	});

	it("two details with the same type and one inactive and one unknown, creates labelled chip with 'Inactive (Mixed)'", () => {
		const details = [ DETAIL_INACTIVE_1, DETAIL_UNKNOWN ];
		const validity = getValidityStrFromDetails(details);

		const re = new RegExp(`${SecretValidity.Inactive} \\(mixed\\)`, "i");
		render(<SecretValidityChip value={validity} details={details} />);
		expect(screen.getByText(re)).toBeInTheDocument();
	});

	it("two details with different type and one inactive and one unknown, creates labelled chip with 'Unknown (Mixed)'", () => {
		const details = [ DETAIL_INACTIVE_2, DETAIL_UNKNOWN ];
		const validity = getValidityStrFromDetails(details);

		const re = new RegExp(`${SecretValidity.Unknown} \\(mixed\\)`, "i");
		render(<SecretValidityChip value={validity} details={details} />);
		expect(screen.getByText(re)).toBeInTheDocument();
	});
});

function getValidityStrFromDetails(details: ReadonlyArray<SecretDetail>): string {
	return Array.from(new Set(details.map((item) => item.validity))).join(', ');
}