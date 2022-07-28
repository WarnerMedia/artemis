import { screen } from "@testing-library/react";
import { OverviewCard } from "./ResultsPage";

import { render } from "../test-utils";

import { VpnKey as VpnKeyIcon } from "@mui/icons-material";

// results_summary?.secrets // is number | null
// which is different then the other properties on results_summary, a potential gotcha spot
// add a test for this to ensure it's working and continues working.

// verify these with a test:
// if null, was not run
// if number, if 0, no secrets detected
// if number, if > 0, we have findings, make chart data

describe("Overview Card Secrets test", () => {
	const mockTinyChartData = [
		{
			name: "name",
			value: 0,
			color: "#000000",
		},
	];

	test("when the results_summary.secrets are null, then it says 'This scan option was not used'", async () => {
		const results_summary = {
			vulnerabilities: null,
			secrets: null,
			static_analysis: null,
			inventory: null,
		};

		render(
			<OverviewCard
				titleText={`Secrets`}
				titleIcon={<VpnKeyIcon />}
				scanOptionWasNotRun={results_summary.secrets === null}
				chartData={mockTinyChartData}
				nothingFoundText={`No secrets detected`}
				isTabDisabled={true}
			/>
		);

		expect(
			screen.getByText(/This scan option was not used/)
		).toBeInTheDocument();
	});
});

describe("Overview Card Secrets test", () => {
	const mockTinyChartData = [
		{
			name: "name",
			value: 0,
			color: "#000000",
		},
	];

	test("when the results_summary.secrets are ZERO, then it says 'No secrets detected'", async () => {
		const results_summary = {
			vulnerabilities: null,
			secrets: 0,
			static_analysis: null,
			inventory: null,
		};

		render(
			<OverviewCard
				titleText={`Secrets`}
				titleIcon={<VpnKeyIcon />}
				scanOptionWasNotRun={results_summary.secrets === null}
				chartData={mockTinyChartData}
				nothingFoundText={`No secrets detected`}
				isTabDisabled={true}
			/>
		);

		expect(screen.getByText(/No secrets detected/)).toBeInTheDocument();
	});
});

describe("Overview Card Secrets test", () => {
	const mockTinyChartData = [
		{
			name: "someSecretTypeName",
			value: 8,
			color: "#FFFFFF",
		},
	];

	test("when the results_summary.secrets are 8, it renders a chart", async () => {
		const results_summary = {
			vulnerabilities: null,
			secrets: 8,
			static_analysis: null,
			inventory: null,
		};

		render(
			<OverviewCard
				titleText={`Secrets`}
				titleIcon={<VpnKeyIcon />}
				scanOptionWasNotRun={results_summary.secrets === null}
				chartData={mockTinyChartData}
				nothingFoundText={`No secrets detected`}
				isTabDisabled={true}
			/>
		);

		expect(screen.getByTestId("a-donut-chart")).toBeInTheDocument();
	});
});
