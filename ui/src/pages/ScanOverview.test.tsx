import { screen } from "@testing-library/react";
import { OverviewTabContent } from "./ResultsPage";

import { AnalysisReport } from "features/scans/scansSchemas";
import {
	mockScan001,
	mockScan002,
	mockHFRows001,
	mockHFRows002,
	mockColors,
} from "../../testData/testMockData";

import { render } from "../test-utils";

describe("OverviewTabContent", () => {
	it("with vulns, without StaticAnalysis, with images, and 5 hidden", async () => {
		const tabsStatus = {
			isDisabledVulns: false,
			isDisabledStat: true,
			isDisabledSecrets: false,
			isDisabledInventory: false,
			isDisabledHFs: false,
			isDisabledConfig: false,
		};

		render(
			<OverviewTabContent
				scan={mockScan001 as AnalysisReport}
				hfRows={mockHFRows001}
				sharedColors={mockColors}
				tabsStatus={tabsStatus}
			/>
		);

		expect(screen.getByText(/Vulnerabilities/)).toBeInTheDocument();

		expect(screen.getByText(/Static Analysis/)).toBeInTheDocument();
		expect(
			screen.getByText(/This scan option was not used/)
		).toBeInTheDocument();

		expect(screen.getByText(/Secrets/)).toBeInTheDocument();

		expect(screen.getByText(/Inventory/)).toBeInTheDocument();
		expect(
			screen.getByText(/Images: golang, python, ubuntu/)
		).toBeInTheDocument();

		expect(screen.getByText(/Hidden Findings/)).toBeInTheDocument();
		expect(screen.getByText(/5 hidden findings/)).toBeInTheDocument();
	});
});

describe("OverviewTabContent", () => {
	it("with no vulns detected, unused secrets, no hidden", async () => {
		const tabsStatus = {
			isDisabledVulns: false,
			isDisabledStat: false,
			isDisabledSecrets: true,
			isDisabledInventory: true,
			isDisabledHFs: false,
			isDisabledConfig: false,
		};

		render(
			<OverviewTabContent
				scan={mockScan002 as AnalysisReport}
				hfRows={mockHFRows002}
				sharedColors={mockColors}
				tabsStatus={tabsStatus}
			/>
		);

		expect(screen.getByText(/Vulnerabilities/)).toBeInTheDocument();
		expect(screen.getByText(/No vulnerabilities detected/)).toBeInTheDocument();

		expect(screen.getByText(/Static Analysis/)).toBeInTheDocument();

		expect(screen.getByText(/Secrets/)).toBeInTheDocument();
		expect(
			screen.getAllByText(/This scan option was not used/)[0]
		).toBeInTheDocument();

		expect(screen.getByText(/Inventory/)).toBeInTheDocument();

		expect(screen.getByText(/Hidden Findings/)).toBeInTheDocument();
		expect(screen.getByText(/No findings are hidden/)).toBeInTheDocument();
		expect(screen.getByText(/0 hidden findings/)).toBeInTheDocument();
	});
});
