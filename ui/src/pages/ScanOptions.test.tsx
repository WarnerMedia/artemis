import { screen } from "@testing-library/react";
import { ScanOptionsSummary } from "./ResultsPage";
import { scanMockData } from "../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { render } from "../test-utils";
import {
	secretPluginsKeys,
	staticPluginsKeys,
	techPluginsKeys,
	vulnPluginsKeys,
} from "app/scanPlugins";

describe("ScanOptionsSummary component", () => {
	it("displays 'Categories' and 'Plugins'", () => {
		render(<ScanOptionsSummary scan={scanMockData as AnalysisReport} />);
		expect(screen.getByText(/Categories/)).toBeInTheDocument();
		expect(screen.getByText(/Plugins/)).toBeInTheDocument();
	});

	it("displays the plugin names", () => {
		render(<ScanOptionsSummary scan={scanMockData as AnalysisReport} />);
		expect(screen.getByText(/Alpha/)).toBeInTheDocument();
		expect(screen.getByText(/Beta/)).toBeInTheDocument();
		expect(screen.getByText(/Charlie/)).toBeInTheDocument();
		expect(screen.getByText(/Delta/)).toBeInTheDocument();
		expect(screen.getByText(/Echo/)).toBeInTheDocument();
	});

	it("displays each plugin by display name, not API name", () => {
		const allPlugins = {
			...secretPluginsKeys,
			...staticPluginsKeys,
			...techPluginsKeys,
			...vulnPluginsKeys,
		};
		let mockScan = JSON.parse(JSON.stringify(scanMockData));
		mockScan.scan_options.plugins = Object.keys(allPlugins);
		render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
		for (const [, value] of Object.entries(allPlugins)) {
			expect(screen.getByText(value.displayName)).toBeInTheDocument();
		}
	});
});
