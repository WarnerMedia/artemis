import { render, screen, waitFor } from "test-utils";
import { UserEvent } from "@testing-library/user-event/dist/types/setup";
import { VulnTabContent } from "./ResultsPage";
import { mockCurrentUser, mockScan001 } from "../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";

// hiddenFindings you can override in tests
let hiddenFindings: HiddenFinding[] = [];

// select a vuln that's critical so it will sort to first page of results table
// so test will "see" this row when table is rendered
const vulnComponent = Object.keys(mockScan001.results.vulnerabilities)[4];

const openVulnDialog = async () => {
	const { user } = render(
		<VulnTabContent
			scan={mockScan001 as AnalysisReport}
			hiddenFindings={hiddenFindings}
			currentUser={mockCurrentUser}
		/>
	);

	// this data should be in the dialog title
	// don't use component name as that could be blank
	const cveId = Object.keys(
		Object.entries(mockScan001.results.vulnerabilities).filter(
			([key, value]) => key === vulnComponent
		)[0][1]
	)[0]; // first component vuln

	const cell = screen.getByRole("rowheader", {
		name: vulnComponent,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	const re = new RegExp(cveId, "i");
	await waitFor(() => screen.getByRole("dialog", { name: re }));
	return user;
};

// close dialog by clicking ok
const closeVulnDialog = async (user: UserEvent) => {
	// clicking the ok button should close the dialog
	const okButton = screen.getByRole("button", { name: /^ok$/i });
	expect(okButton).toBeInTheDocument();
	await user.click(okButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("VulnTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(30000);
	describe("vulnDialogContent", () => {
		it("contains no findings", () => {
			let scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
			// clear scan results sections
			if (scan?.results_summary) {
				scan.results_summary.vulnerabilities = null;
			}
			if (scan?.results) {
				scan.results.vulnerabilities = {};
			}

			render(
				<VulnTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={mockCurrentUser}
				/>
			);

			expect(screen.queryByRole("row")).not.toBeInTheDocument();
			expect(screen.getByText(/no vulnerabilities found/i)).toBeInTheDocument();
		});

		it("contains 'hide this finding' button", async () => {
			hiddenFindings = []; // no findings hidden
			const user = await openVulnDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^hide this finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeVulnDialog(user);
		});

		it("contains 'modify hidden finding' button if the finding is already hidden", async () => {
			// hide vulnerability we are going to open dialog for
			const cveId = Object.keys(
				Object.entries(mockScan001.results.vulnerabilities).filter(
					([key, value]) => key === vulnComponent
				)[0][1]
			)[0]; // first component vuln

			const vulnFinding = Object.values(
				Object.values(
					Object.entries(mockScan001.results.vulnerabilities).filter(
						([key, value]) => key === vulnComponent
					)[0]
				)[1]
			)[0];

			// 2 items / 1-per-source-file
			hiddenFindings = [
				{
					id: "123-1234-123456",
					type: "vulnerability",
					value: {
						id: cveId,
						source: vulnFinding.source[0],
						component: vulnComponent,
					},
					expires: null,
					reason: "test existing hidden finding 1, vulnerability",
					created_by: "Catelyn.Stark@example.com",
				},
				{
					id: "456-4567-456789",
					type: "vulnerability",
					value: {
						id: cveId,
						source: vulnFinding.source[1],
						component: vulnComponent,
					},
					expires: null,
					reason: "test existing hidden finding 2, vulnerability",
					created_by: "Bronn@example.com",
				},
			];
			const user = await openVulnDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^modify hidden finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeVulnDialog(user);
		});
	});
});
