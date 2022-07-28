import { render, screen, waitFor, within } from "test-utils";
import { HiddenFindingsTabContent } from "./ResultsPage";
import {
	mockHFRows003,
	mockHFSummary003,
	mockHiddenFindingsSummaryNone,
} from "../../testData/testMockData";
import { formatDate } from "utils/formatters";
import { UserEvent } from "@testing-library/user-event/dist/types/setup";

const filterFindingsById = (vulnId: string | number) => {
	return mockHFRows003.filter((finding) => finding.location === vulnId);
};

const openFindingDialog = async () => {
	const { user } = render(
		<HiddenFindingsTabContent
			hiddenFindingsConsolidatedRows={mockHFRows003}
			hiddenFindingsSummary={mockHFSummary003}
		/>
	);

	// + "" to force string
	const cveId = String(filterFindingsById("CVE-2018-00000")[0].location);
	const cell = screen.getByRole("cell", {
		name: cveId,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	await waitFor(() =>
		screen.getByRole("dialog", { name: /modify hidden finding/i })
	);
	return user;
};

// close dialog by clicking ok
const closeFindingDialog = async (user: UserEvent) => {
	// clicking the ok button should close the dialog
	const cancelButton = screen.getByRole("button", { name: /^cancel$/i });
	expect(cancelButton).toBeInTheDocument();
	await user.click(cancelButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("HiddenFindingsTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(30000);

	it("contains no findings", () => {
		render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={[]}
				hiddenFindingsSummary={mockHiddenFindingsSummaryNone}
			/>
		);

		expect(screen.queryByRole("row")).not.toBeInTheDocument();
		expect(screen.getByText(/no hidden findings/i)).toBeInTheDocument();
	});

	it("contains 'modify hidden finding' title since all hidden findings are hidden", async () => {
		const user = await openFindingDialog();
		const dialog = screen.getByRole("dialog", {
			name: /modify hidden finding/i,
		});
		expect(
			within(dialog).getByRole("link", { name: "CVE-2018-00000" })
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: /^remove$/i })
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: /^update$/i })
		).toBeInTheDocument();
		await closeFindingDialog(user);
	});

	it("contains global hidden finding exclusion warning", () => {
		render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={mockHFRows003}
				hiddenFindingsSummary={mockHFSummary003}
			/>
		);

		expect(
			screen.getByText(
				/these findings will be excluded from all results for this repository, including all branches/i
			)
		).toBeInTheDocument();
		expect(screen.getAllByRole("checkbox")).toHaveLength(mockHFRows003.length);
		expect(screen.getAllByLabelText(/this item has expired/i)).toHaveLength(4);
	});

	it("single finding has expected row cells and warnings", () => {
		const summary = {
			...mockHiddenFindingsSummaryNone,
			critical: 0,
			high: 1,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
			secret: 0,
			secret_raw: 0,
			static_analysis: 0,
			vulnerability: 1,
			vulnerability_raw: 0,
		};
		render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={filterFindingsById("CVE-2019-00000")}
				hiddenFindingsSummary={summary}
			/>
		);

		const rows = screen.getAllByRole("checkbox");

		expect(rows).toHaveLength(1);
		expect(within(rows[0]).getByText("CVE-2019-00000")).toBeInTheDocument();
		expect(within(rows[0]).getByText("component1")).toBeInTheDocument();
		expect(within(rows[0]).getByText(/vulnerability/i)).toBeInTheDocument();
		expect(within(rows[0]).getByText(/high/i)).toBeInTheDocument();
		expect(
			within(rows[0]).getByLabelText(
				/30 source files not covered by this hidden finding/i
			)
		).toBeInTheDocument();
		expect(
			within(rows[0]).getByLabelText(/this item has expired/i)
		).toBeInTheDocument();
	});

	it("severities sort as expected", async () => {
		const { user } = render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={mockHFRows003}
				hiddenFindingsSummary={mockHFSummary003}
			/>
		);

		const header = screen.getByRole("button", { name: "Severity" });
		expect(header).toBeInTheDocument();
		await user.click(header);
		expect(within(header).getByText(/sorted ascending/i)).toBeInTheDocument();

		// finding ids sorted highest severity (critical) to lowest ("")
		const idOrder = [
			"CVE-2020-0000",
			"CVE-2021-0101",
			33,
			"CVE-2019-00000",
			"CVE-2018-00000",
			14,
			17,
			177,
			"test.me",
		];

		// get new row results after re-order
		let rows = screen.getAllByRole("checkbox");
		let r = 0;
		idOrder.forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].severity) {
					expect(
						within(cols[3]).getByText(finding[0].severity, { exact: false })
					).toBeInTheDocument(); // col 4 = severity
				}
				r += 1;
			}
		});

		// test descending sorting
		await user.click(header);
		expect(within(header).getByText(/sorted descending/i)).toBeInTheDocument();

		rows = screen.getAllByRole("checkbox");
		r = 0;
		idOrder.reverse().forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].severity) {
					expect(
						within(cols[3]).getByText(finding[0].severity, { exact: false })
					).toBeInTheDocument(); // col 4 = severity
				}
				r += 1;
			}
		});
	});

	it("expires sort as expected", async () => {
		const { user } = render(
			<HiddenFindingsTabContent
				hiddenFindingsConsolidatedRows={mockHFRows003}
				hiddenFindingsSummary={mockHFSummary003}
			/>
		);

		const header = screen.getByRole("button", { name: "Expires" });
		expect(header).toBeInTheDocument();
		await user.click(header);
		expect(within(header).getByText(/sorted ascending/i)).toBeInTheDocument();

		// finding ids sorted highest expires (oldest) to lowest (never)
		const idOrder = [
			"CVE-2018-00000",
			"CVE-2019-00000",
			"CVE-2021-0101",
			33,
			"CVE-2020-0000",
			17,
			177,
			"test.me",
			14,
		];

		// get new row results after re-order
		let rows = screen.getAllByRole("checkbox");
		let r = 0;
		idOrder.forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].expires) {
					const dt = formatDate(finding[0].expires);
					expect(
						within(cols[4]).getByText(dt, { exact: false })
					).toBeInTheDocument(); // col 5 = expires
				}
				r += 1;
			}
		});

		// test descending sorting
		await user.click(header);
		expect(within(header).getByText(/sorted descending/i)).toBeInTheDocument();

		rows = screen.getAllByRole("checkbox");
		r = 0;
		idOrder.reverse().forEach((id) => {
			const finding = filterFindingsById(id);
			if (finding.length > 0) {
				const cols = within(rows[r]).getAllByRole("cell");
				expect(within(cols[1]).getByText(id)).toBeInTheDocument(); // 3rd col is vulnid (col0 = "rowheader", not "cell")

				// don't try to find blank severities
				if (finding[0].expires) {
					const dt = formatDate(finding[0].expires);
					expect(
						within(cols[4]).getByText(dt, { exact: false })
					).toBeInTheDocument(); // col 5 = expires
				}
				r += 1;
			}
		});
	});
});
