import { render, screen, within } from "test-utils";
import { FindingListItem } from "pages/ResultsPage";

describe("FindingListItem component", () => {
	it("listitem accessible by role+label with string label", () => {
		render(<FindingListItem id="testId" label="testLabel" value="testValue" />);
		const listItem = screen.getByRole("listitem", { name: "testLabel" });
		expect(listItem).toBeInTheDocument();
		expect(within(listItem).getByText("testValue")).toBeInTheDocument();
	});

	it("listitem accessible by role+label with element label", () => {
		render(
			<FindingListItem
				id="testId"
				label={<span>testLabel</span>}
				value={<span>testValue</span>}
			/>
		);
		const listItem = screen.getByRole("listitem", { name: "testLabel" });
		expect(listItem).toBeInTheDocument();
		expect(within(listItem).getByText("testValue")).toBeInTheDocument();
	});
});
