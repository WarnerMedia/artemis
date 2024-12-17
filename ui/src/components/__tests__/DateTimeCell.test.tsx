import { render, screen } from "test-utils";
import { DateTime, Settings } from "luxon";
import DateTimeCell, { ExpiringDateTimeCell } from "components/DateTimeCell";

beforeAll(() => {
	// ensure consistent timezone for tests
	// don't set to UTC so we can check offsets working in tests
	Settings.defaultZone = "America/New_York";
});

describe("DateTimeCell component", () => {
	it("no args, empty results", () => {
		const { container } = render(<DateTimeCell />);
		expect(container.firstChild).toBeNull();
	});

	it("invalid date value, displays value as-is", () => {
		render(<DateTimeCell value="foo" />);
		expect(screen.getByTitle("foo")).toBeInTheDocument();
	});

	it("valid date, short (default) format", () => {
		render(<DateTimeCell value="2021-08-11T22:46:24.518Z" />);
		expect(
			screen.getByTitle(/Wednesday, August 11, 2021(,| at) 6:46:24 PM EDT/),
		).toBeInTheDocument();
		expect(screen.getByText("2021-08-11 6:46 PM EDT")).toBeInTheDocument();
	});

	it("valid date, long format", () => {
		render(<DateTimeCell value="2021-08-11T22:46:24.518Z" format="long" />);
		expect(
			screen.getByTitle(/Wednesday, August 11, 2021(,| at) 6:46:24 PM EDT/),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Wednesday, August 11, 2021(,| at) 6:46:24 PM EDT/),
		).toBeInTheDocument();
	});
});

describe("ExpiringDateTimeCell component", () => {
	it("no args, empty results", () => {
		const { container } = render(<ExpiringDateTimeCell />);
		expect(container.firstChild).toBeNull();
	});

	it("invalid date value, displays value as-is", () => {
		render(<ExpiringDateTimeCell value="foo" />);
		expect(screen.getByTitle("foo")).toBeInTheDocument();
	});

	it("valid date, short (default) format", () => {
		render(<ExpiringDateTimeCell value="2021-08-11T22:46:24.518Z" />);
		expect(
			screen.getByTitle(/Wednesday, August 11, 2021(,| at) 6:46:24 PM EDT/),
		).toBeInTheDocument();
		expect(screen.getByText("2021-08-11 6:46 PM EDT")).toBeInTheDocument();
	});

	it("valid date, long format", () => {
		render(
			<ExpiringDateTimeCell value="2021-08-11T22:46:24.518Z" format="long" />,
		);
		expect(
			screen.getByTitle(/Wednesday, August 11, 2021(,| at) 6:46:24 PM EDT/),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Wednesday, August 11, 2021(,| at) 6:46:24 PM EDT/),
		).toBeInTheDocument();
	});

	it("future date displays no expiration warning", () => {
		render(
			<ExpiringDateTimeCell
				value={DateTime.utc().plus({ days: 1 }).toJSON() ?? undefined}
			/>,
		);
		expect(
			screen.queryByTitle(/this item has expired/i),
		).not.toBeInTheDocument();
		expect(
			screen.queryByLabelText(/this item has expired/i),
		).not.toBeInTheDocument();
	});

	it("past date displays expiration warning", () => {
		render(
			<ExpiringDateTimeCell
				value={DateTime.utc().minus({ days: 1 }).toJSON() ?? undefined}
			/>,
		);
		expect(
			screen.queryByLabelText(/this item has expired/i),
		).toBeInTheDocument();
	});
});
