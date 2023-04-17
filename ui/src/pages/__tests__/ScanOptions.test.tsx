import { screen, within } from "@testing-library/react";
import { ScanOptionsSummary } from "pages/ResultsPage";
import { scanMockData } from "../../../testData/testMockData";
import { AnalysisReport } from "features/scans/scansSchemas";
import { render } from "test-utils";
import {
	pluginCatalog,
	secretPluginsKeys,
	staticPluginsKeys,
	techPluginsKeys,
	vulnPluginsKeys,
	sbomPluginsKeys,
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

	it("displays each enabled category by display name, not API name", () => {
		const mockScan = JSON.parse(JSON.stringify(scanMockData));
		mockScan.scan_options.categories = Object.keys(pluginCatalog);
		render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
		for (const [, value] of Object.entries(pluginCatalog)) {
			const categoryChip = screen.getByText(value.displayName);
			expect(categoryChip).toBeInTheDocument();
			expect(
				screen.getByTitle(value.displayName, { exact: false })
			).toBeInTheDocument(); // substring
			expect(categoryChip).not.toHaveAttribute("aria-disabled");
		}
	});

	it("displays each disabled category by display name, not API name", () => {
		const mockScan = JSON.parse(JSON.stringify(scanMockData));
		mockScan.scan_options.categories = Object.keys(pluginCatalog).map(
			(category) => `-${category}`
		);
		render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
		for (const [, value] of Object.entries(pluginCatalog)) {
			const categoryChip = screen.getByText(value.displayName);
			expect(categoryChip).toBeInTheDocument();
			expect(
				screen.getByTitle(`${value.displayName} (not run)`, { exact: false })
			).toBeInTheDocument(); // substring
			expect(categoryChip.parentElement).toHaveAttribute(
				"aria-disabled",
				"true"
			);
		}
	});

	it("displays each enabled plugin by display name, not API name", () => {
		const allPlugins = {
			...secretPluginsKeys,
			...staticPluginsKeys,
			...techPluginsKeys,
			...vulnPluginsKeys,
			...sbomPluginsKeys,
		};
		const mockScan = JSON.parse(JSON.stringify(scanMockData));
		mockScan.scan_options.plugins = Object.keys(allPlugins);
		render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
		for (const [, value] of Object.entries(allPlugins)) {
			const pluginChip = screen.getByText(value.displayName);
			expect(pluginChip).toBeInTheDocument();
			expect(
				screen.getByTitle(value.displayName, { exact: false })
			).toBeInTheDocument(); // substring
			expect(pluginChip).not.toHaveAttribute("aria-disabled");
		}
	});

	it("displays each disabled plugin by display name, not API name", () => {
		const allPlugins = {
			...secretPluginsKeys,
			...staticPluginsKeys,
			...techPluginsKeys,
			...vulnPluginsKeys,
			...sbomPluginsKeys,
		};
		const mockScan = JSON.parse(JSON.stringify(scanMockData));
		mockScan.scan_options.plugins = Object.keys(allPlugins).map(
			(plugin) => `-${plugin}`
		);
		render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
		for (const [, value] of Object.entries(allPlugins)) {
			const pluginChip = screen.getByText(value.displayName);
			expect(pluginChip).toBeInTheDocument();
			expect(
				screen.getByTitle(`${value.displayName} (not run)`, { exact: false })
			).toBeInTheDocument(); // substring
			expect(pluginChip.parentElement).toHaveAttribute("aria-disabled", "true");
		}
	});

	describe("displays include/exclude paths", () => {
		it("displays none when include/exclude paths not defined", () => {
			const mockScan = JSON.parse(JSON.stringify(scanMockData));
			mockScan.scan_options.include_paths = undefined;
			mockScan.scan_options.exclude_paths = undefined;
			render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
			const includePaths = screen.getByText("Include Paths (0)");
			if (includePaths.parentElement) {
				within(includePaths.parentElement).getByText("None");
			}
			const excludePaths = screen.getByText("Exclude Paths (0)");
			if (excludePaths.parentElement) {
				within(excludePaths.parentElement).getByText("None");
			}
		});

		it("displays none when include/exclude paths are empty arrays", () => {
			const mockScan = JSON.parse(JSON.stringify(scanMockData));
			mockScan.scan_options.include_paths = [];
			mockScan.scan_options.exclude_paths = [];
			render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
			const includePaths = screen.getByText("Include Paths (0)");
			if (includePaths.parentElement) {
				within(includePaths.parentElement).getByText("None");
			}
			const excludePaths = screen.getByText("Exclude Paths (0)");
			if (excludePaths.parentElement) {
				within(excludePaths.parentElement).getByText("None");
			}
		});

		it("displays paths when include/exclude paths defined", () => {
			const mockScan = JSON.parse(JSON.stringify(scanMockData));
			mockScan.scan_options.include_paths = ["includ1", "include2", "include3"];
			mockScan.scan_options.exclude_paths = [
				"exclude1",
				"exclude2",
				"exclude3",
				"exclude4",
			];
			render(<ScanOptionsSummary scan={mockScan as AnalysisReport} />);
			const includePaths = screen.getByText(
				`Include Paths (${mockScan.scan_options.include_paths.length})`
			);
			if (includePaths.parentElement) {
				for (const path of mockScan.scan_options.include_paths) {
					within(includePaths.parentElement).getByText(path);
				}
			}
			const excludePaths = screen.getByText(
				`Exclude Paths (${mockScan.scan_options.exclude_paths.length})`
			);
			if (excludePaths.parentElement) {
				for (const path of mockScan.scan_options.exclude_paths) {
					within(excludePaths.parentElement).getByText(path);
				}
			}
		});
	});
});
