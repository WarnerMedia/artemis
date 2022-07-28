import { render, screen, waitFor } from "test-utils";
import { AnalysisTabContent } from "./ResultsPage";
import { mockCurrentUser, mockScan002 } from "../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import { UserEvent } from "@testing-library/user-event/dist/types/setup";

// hiddenFindings you can override in tests
let hiddenFindings: HiddenFinding[] = [];

// note: node/some/path/here/anotherone.js (item #4 from test data) was selected
// since it's the first item in the list due to sorting by severity
// first item in the actual data (auth.json) won't appear on first page of results
// thus, won't be "found" in the table (unless you page)
const analysisFile = Object.keys(mockScan002.results.static_analysis)[4];

const openAnalysisDialog = async () => {
	const { user } = render(
		<AnalysisTabContent
			scan={mockScan002 as AnalysisReport}
			hiddenFindings={hiddenFindings}
			currentUser={mockCurrentUser}
		/>
	);

	// this data should be in the dialog title
	// first finding for this file (0)
	const analysisType =
		Object.entries(mockScan002.results.static_analysis).filter(
			([key, value]) => key === analysisFile
		)[0][1][0].type || "No Type";

	const cell = screen.getByRole("rowheader", {
		name: analysisFile,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	await waitFor(() => screen.getByRole("dialog"));
	expect(screen.getByRole("dialog")).toHaveTextContent(analysisType);
	return user;
};

// close dialog by clicking ok
const closeAnalysisDialog = async (user: UserEvent) => {
	// clicking the ok button should close the dialog
	const okButton = screen.getByRole("button", { name: /^ok$/i });
	expect(okButton).toBeInTheDocument();
	await user.click(okButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("AnalysisTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(30000);
	describe("analysisDialogContent", () => {
		it("contains no findings", () => {
			let scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan002));
			// clear scan results sections
			if (scan?.results_summary) {
				scan.results_summary.static_analysis = null;
			}
			if (scan?.results) {
				scan.results.static_analysis = {};
			}

			render(
				<AnalysisTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={mockCurrentUser}
				/>
			);

			expect(screen.queryByRole("row")).not.toBeInTheDocument();
			expect(
				screen.getByText(/no static analysis findings/i)
			).toBeInTheDocument();
		});

		it("contains 'hide this finding' button", async () => {
			hiddenFindings = []; // no findings hidden
			const user = await openAnalysisDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^hide this finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeAnalysisDialog(user);
		});

		it("contains 'modify hidden finding' button if the finding is already hidden", async () => {
			// hide analysis we are going to open dialog for
			// first finding for this file (0)
			const analysisFinding = Object.entries(
				mockScan002.results.static_analysis
			).filter(([key, value]) => key === analysisFile)[0][1][0];

			hiddenFindings = [
				{
					id: "123-1234-123456",
					type: "static_analysis",
					value: {
						filename: analysisFile,
						line: analysisFinding.line,
						type: analysisFinding.type,
					},
					expires: null,
					reason: "test existing hidden finding, static analysis",
					created_by: "Catelyn.Stark@example.com",
				},
			];
			const user = await openAnalysisDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^modify hidden finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeAnalysisDialog(user);
		});
	});
});
