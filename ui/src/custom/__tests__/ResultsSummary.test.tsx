import { render, screen, waitFor, within } from "test-utils";
import { ResultsSummary } from "pages/ResultsPage";
import { scanMockData } from "../../../testData/testMockData";

// REPLACE ME: replace with test for real meta data field(s)
describe("ResultsSummary component", () => {
	jest.setTimeout(90000);

	it("Displays field1/field2 from sample_metadata", () => {
		const scan = JSON.parse(JSON.stringify(scanMockData));
		scan.application_metadata = {
			sample_metadata: {
				field1: "Meta Value 1",
				field2: "Meta Value 2",
				field3: "Meta Value 3",
			},
		};

		render(<ResultsSummary scan={scan} />);
		const sectionField = screen.getByText("Meta Data Sample1 / Sample2");
		expect(sectionField).toBeInTheDocument();
		if (sectionField.parentElement) {
			expect(
				within(sectionField.parentElement).getByText(
					scan.application_metadata.sample_metadata.field1,
				),
			).toBeInTheDocument();
			expect(
				within(sectionField.parentElement).getByText(
					scan.application_metadata.sample_metadata.field2,
				),
			).toBeInTheDocument();
		}
	});

	it("Displays field3 from sample_metadata", () => {
		const scan = JSON.parse(JSON.stringify(scanMockData));
		scan.application_metadata = {
			sample_metadata: {
				field1: "Meta Value 1",
				field2: "Meta Value 2",
				field3: "Meta Value 3",
			},
		};

		render(<ResultsSummary scan={scan} />);

		const sectionField = screen.getByText(/Meta Data Sample3/i);
		expect(sectionField).toBeInTheDocument();
		if (sectionField.parentElement) {
			expect(
				within(sectionField.parentElement).getByText(
					scan.application_metadata.sample_metadata.field3,
				),
			).toBeInTheDocument();
		}
	});

	it("Displays unknown if field3 from sample_metadata is null", () => {
		const scan = JSON.parse(JSON.stringify(scanMockData));
		scan.application_metadata = {
			sample_metadata: {
				field1: "Meta Value 1",
				field2: "Meta Value 2",
				field3: null,
			},
		};

		render(<ResultsSummary scan={scan} />);

		const sectionField = screen.getByText(/Meta Data Sample3/i);
		expect(sectionField).toBeInTheDocument();
		if (sectionField.parentElement) {
			expect(
				within(sectionField.parentElement).getByText(/unknown/i),
			).toBeInTheDocument();
		}
	});

	it("Displays errors if fields 1 & 2 from sample_metadata are null", () => {
		const scan = JSON.parse(JSON.stringify(scanMockData));
		scan.application_metadata = {
			sample_metadata: {
				field1: null,
				field2: null,
				field3: null,
			},
		};

		render(<ResultsSummary scan={scan} />);
		const sectionField = screen.getByText("Meta Data Sample1 / Sample2");
		expect(sectionField).toBeInTheDocument();
		if (sectionField.parentElement) {
			expect(
				within(sectionField.parentElement).getByText(
					"Meta Data Field1 Missing",
				),
			).toBeInTheDocument();
			expect(
				within(sectionField.parentElement).getByText(
					"Meta Data Field2 Missing",
				),
			).toBeInTheDocument();
		}
	});

	it("Displays tooltip and guidance popup if no field1, field2 metadata found", async () => {
		const scan = JSON.parse(JSON.stringify(scanMockData));
		scan.application_metadata = {
			sample_metadata: {
				field1: null,
				field2: null,
				field3: null,
			},
		};

		const { user } = render(<ResultsSummary scan={scan} />);
		const sectionField = screen.getByText("Meta Data Sample1 / Sample2");
		expect(sectionField).toBeInTheDocument();
		if (sectionField.parentElement) {
			expect(
				within(sectionField.parentElement).getByText(
					"Meta Data Field1 Missing",
				),
			).toBeInTheDocument();
			expect(
				within(sectionField.parentElement).getByText(
					"Meta Data Field2 Missing",
				),
			).toBeInTheDocument();
		}

		// open popup
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		const helpButton = within(sectionField).getByRole("button", {
			name: "How do I provide this data?",
		});
		expect(helpButton).toBeInTheDocument();
		await user.click(helpButton);

		let alert;
		await waitFor(() => {
			alert = screen.getByRole("alert");
			expect(alert).toBeInTheDocument();
		});
		if (!alert) {
			fail("alert is not defined");
		}

		// verify alert content
		expect(within(alert).getByText("Missing Metadata")).toBeInTheDocument();
		const closeButton = within(alert).getByRole("button", { name: "Close" });
		expect(closeButton).toBeInTheDocument();

		// close popup with close button
		await user.click(closeButton);
		await waitFor(() => {
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});

		// re-open popup to check closing dialog with help button
		await user.click(helpButton);
		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		// close popup with help button
		await user.click(helpButton);
		await waitFor(() => {
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	});
});
