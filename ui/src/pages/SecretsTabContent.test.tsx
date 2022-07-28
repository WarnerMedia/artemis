import { render, screen, waitFor } from "test-utils";
import { UserEvent } from "@testing-library/user-event/dist/types/setup";
import { SecretsTabContent } from "./ResultsPage";
import { mockCurrentUser, mockScan001 } from "../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";

// hiddenFindings you can override in tests
let hiddenFindings: HiddenFinding[] = [];
// use first secret result from test data - click this row in the results table
const secretFile = Object.keys(mockScan001.results.secrets)[0];

const openSecretsDialog = async () => {
	const { user } = render(
		<SecretsTabContent
			scan={mockScan001 as AnalysisReport}
			hiddenFindings={hiddenFindings}
			currentUser={mockCurrentUser}
		/>
	);

	// this data should be in the dialog title
	// first finding for this file (0)
	const secretType = Object.entries(mockScan001.results.secrets).filter(
		([key, value]) => key === secretFile
	)[0][1][0].type;

	const cell = screen.getByRole("rowheader", {
		name: secretFile,
	});

	expect(cell).toBeInTheDocument();
	// clicking the cell should open the dialog
	await user.click(cell);

	// wait for dialog to open
	await waitFor(() => screen.getByRole("dialog"));
	expect(screen.getByRole("dialog")).toHaveTextContent(secretType);
	return user;
};

// close dialog by clicking ok
const closeSecretsDialog = async (user: UserEvent) => {
	// clicking the ok button should close the dialog
	const okButton = screen.getByRole("button", { name: /^ok$/i });
	expect(okButton).toBeInTheDocument();
	await user.click(okButton);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	);
};

describe("SecretsTabContent component", () => {
	// increase this test timeout since waiting for async dialog operations can take some time
	jest.setTimeout(30000);
	describe("secretDialogContent", () => {
		it("contains no findings", () => {
			let scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
			// clear scan results sections
			if (scan?.results_summary) {
				scan.results_summary.secrets = null;
			}
			if (scan?.results) {
				scan.results.secrets = {};
			}

			render(
				<SecretsTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={mockCurrentUser}
				/>
			);

			expect(screen.queryByRole("row")).not.toBeInTheDocument();
			expect(screen.getByText(/no secrets found/i)).toBeInTheDocument();
		});

		it("contains 'hide this finding' button", async () => {
			hiddenFindings = []; // no findings hidden
			const user = await openSecretsDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^hide this finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeSecretsDialog(user);
		});

		it("contains 'modify hidden finding' button if the finding is already hidden", async () => {
			// hide secret we are going to open dialog for
			// first finding for this file (0)
			const secretFinding = Object.entries(mockScan001.results.secrets).filter(
				([key, value]) => key === secretFile
			)[0][1][0];

			hiddenFindings = [
				{
					id: "123-1234-123456",
					type: "secret",
					value: {
						filename: secretFile,
						line: secretFinding.line,
						commit: secretFinding.commit,
					},
					expires: null,
					reason: "test existing hidden finding, secret",
					created_by: "Catelyn.Stark@example.com",
				},
			];
			const user = await openSecretsDialog();
			const findingButton = screen.queryByRole("button", {
				name: /^modify hidden finding$/i,
			});
			expect(findingButton).toBeInTheDocument();
			await closeSecretsDialog(user);
		});
	});
});
