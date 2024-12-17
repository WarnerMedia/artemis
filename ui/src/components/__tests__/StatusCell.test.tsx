import { getByText, render, screen } from "test-utils";
import { AnalysisReport } from "features/scans/scansSchemas";
import StatusCell from "components/StatusCell";
import {
	configPlugins,
	sbomPlugins,
	secretPlugins,
	staticPlugins,
	techPlugins,
	vulnPlugins,
	vulnPluginsKeys,
} from "app/scanPlugins";

const row: AnalysisReport = {
	repo: "repo1",
	scan_id: "abc123",
	initiated_by: null,
	service: "vcs1",
	branch: null,
	scan_options: {
		categories: [
			"vulnerability",
			"static_analysis",
			"secret",
			"inventory",
			"configuration",
		],
		plugins: ["plugin"],
		depth: 500,
		include_dev: false,
		callback: {
			url: null,
			client_id: null,
		},
		batch_priority: false,
		include_paths: [],
		exclude_paths: [],
	},
	status: "queued",
	status_detail: {
		plugin_name: "test",
		plugin_start_time: null,
		current_plugin: 1,
		total_plugins: 5,
	},
	success: false,
	truncated: false,
	timestamps: { queued: null, start: null, end: null },
	errors: {},
	results_summary: {
		vulnerabilities: {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
		},
		secrets: 0,
		static_analysis: {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
		},
		inventory: {
			base_images: 0,
			technology_discovery: 0,
		},
		configuration: {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
		},
	},
	results: {
		vulnerabilities: {},
		secrets: {},
		static_analysis: {},
		inventory: {},
	},
};

describe("field displays 'queued' status", () => {
	it("displays 'queued'", () => {
		row.status = "queued";
		render(<StatusCell row={row} />);

		expect(screen.getByText(/queued/i)).toBeInTheDocument();
	});

	it("displays 'queued for 10 minutes' after 10 minutes", () => {
		const dt = new Date();
		const epochMs = dt.valueOf();
		row.status = "queued";
		// start queued timestamp > 10 mins ago
		row.timestamps.queued = new Date(epochMs - 10.2 * 60 * 1000).toISOString();
		render(<StatusCell row={row} />);

		expect(screen.getByText(/queued 10 minutes ago/i)).toBeInTheDocument();
	});
});

describe("field displays 'initializing' status", () => {
	it("displays 'initializing'", () => {
		row.status = "processing";
		row.status_detail = {
			plugin_name: null,
			plugin_start_time: null,
			current_plugin: null,
			total_plugins: null,
		};
		render(<StatusCell row={row} />);

		expect(screen.getByText(/initializing/i)).toBeInTheDocument();
	});
});

describe("field displays 'in progress' status", () => {
	it("displays plugin status", () => {
		row.status_detail = {
			plugin_name: "plugin 1",
			plugin_start_time: null,
			current_plugin: 1,
			total_plugins: 20,
		};
		row.status = "running plugin 1";
		render(<StatusCell row={row} />);
		const reg = new RegExp(
			`${row.status_detail.current_plugin} of ${row.status_detail.total_plugins}: ${row.status_detail.plugin_name}`,
			"i",
		);
		const statusText = screen.getByText(reg);
		expect(statusText).toBeInTheDocument();
	});
	it("displays plugin status with sane defaults if data missing", () => {
		row.status_detail = {
			plugin_name: null,
			plugin_start_time: null,
			current_plugin: null,
			total_plugins: null,
		};
		row.status = "running plugin 1";
		render(<StatusCell row={row} />);
		expect(screen.getByText(/1 of 1/)).toBeInTheDocument();
	});
	it("displays plugin display name if one exists", () => {
		row.status_detail = {
			plugin_name: vulnPlugins[0],
			plugin_start_time: null,
			current_plugin: 1,
			total_plugins: 20,
		};
		row.status = `running plugin ${vulnPlugins[0]}`;
		render(<StatusCell row={row} />);
		const statusText = screen.getByText(
			`Running plugin ${row.status_detail.current_plugin} of ${
				row.status_detail.total_plugins
			}: ${vulnPluginsKeys[row.status_detail.plugin_name || ""].displayName}`,
		);
		expect(statusText).toBeInTheDocument();
	});
	it("displays a11y progress bar", () => {
		row.status_detail = {
			plugin_name: "plugin 1",
			plugin_start_time: null,
			current_plugin: 1,
			total_plugins: 20,
		};
		row.status = "running plugin 1";
		render(<StatusCell row={row} />);
		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toBeInTheDocument();

		expect(progressBar).toHaveAttribute("aria-valuenow");
	});
	it("displays a11y progress bar with progress < 100% on final plugin", () => {
		row.status_detail = {
			plugin_name: "plugin 20",
			plugin_start_time: null,
			current_plugin: 20,
			total_plugins: 20,
		};
		row.status = "running plugin 20";
		render(<StatusCell row={row} />);
		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toBeInTheDocument();

		expect(progressBar).toHaveAttribute("aria-valuenow");
		const valueNow = progressBar.getAttribute("aria-valuenow");
		if (valueNow) {
			expect(parseInt(valueNow, 10)).toBeGreaterThan(90);
			expect(parseInt(valueNow, 10)).toBeLessThan(100);
		}
	});
});

describe("field displays 'complete' status", () => {
	describe("displays scan category counts if summary results exist for that category", () => {
		beforeEach(() => {
			row.status = "completed";
			// ensure no categories or plugins enabled so results based solely on results summary
			row.scan_options.categories = [];
			row.scan_options.plugins = [];
			row.results = {
				vulnerabilities: { component: {} },
				secrets: { SecretFinding: [] },
				static_analysis: {
					filepath: [
						{
							line: 1,
							type: "XSS",
							message: "Lorem ipsum",
							severity: "critical",
						},
					],
				},
				inventory: {
					base_images: {
						golang: {
							tags: ["latest"],
							digests: [],
						},
						python: {
							tags: ["latest"],
							digests: [],
						},
						ubuntu: {
							tags: ["latest"],
							digests: [],
						},
					},
					technology_discovery: {
						Ruby: 55.98,
						Java: 32.33,
						JavaScript: 4.59,
						TypeScript: 4.02,
						PHP: 1.57,
						Shell: 0.94,
						Python: 0.52,
						Dockerfile: 0.05,
					},
				},
			};
			row.results_summary = {
				vulnerabilities: {
					critical: 1,
					high: 1,
					medium: 2,
					low: 2,
					negligible: 2,
					"": 0,
				},
				secrets: 5,
				static_analysis: {
					critical: 3,
					high: 1,
					medium: 2,
					low: 1,
					negligible: 0,
					"": 0,
				},
				inventory: {
					base_images: 3,
					technology_discovery: 8,
				},
				configuration: {
					critical: 2,
					high: 2,
					medium: 1,
					low: 1,
					negligible: 1,
					"": 0,
				},
			};
		});

		it("displays a count of critical vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical vuln`, "i");
			const elt = screen.getByTitle(reg); // for a11y each result should have a title reporting count & finding type (vuln, static analysis, etc.)
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument(); // an element should also just contain a visible count
		});

		it("displays a count of high vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.high || 0
			).toString();
			const reg = new RegExp(`${count} high vuln`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium vuln`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of critical static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of high static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.high || 0
			).toString();
			const reg = new RegExp(`${count} high static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of secrets detected", () => {
			render(<StatusCell row={row} />);
			const count = (row?.results_summary?.secrets || 0).toString();
			const reg = new RegExp(`${count} secret`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of technologies discovered", () => {
			render(<StatusCell row={row} />);
			const count = Object.keys(
				row?.results?.inventory?.technology_discovery || {},
			).length.toString();
			const reg = new RegExp(`${count} tech`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of base images discovered", () => {
			render(<StatusCell row={row} />);
			const count = Object.keys(
				row?.results?.inventory?.base_images || {},
			).length.toString();
			const reg = new RegExp(`${count} base image`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of critical configuration results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.configuration?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical configuration`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of high configuration results", () => {
			render(<StatusCell row={row} />);
			const count = (row?.results_summary?.configuration?.high || 0).toString();
			const reg = new RegExp(`${count} high configuration`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium configuration results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.configuration?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium configuration`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});
	});

	describe("displays scan category ran if category enabled in scan options", () => {
		beforeEach(() => {
			row.status = "completed";
			row.scan_options.categories = [
				"vulnerability",
				"secret",
				"inventory",
				"static_analysis",
				"sbom",
				"configuration",
			];
			// exclude plugins and results_summary so we are testing only categories
			row.scan_options.plugins = [];
			row.results = undefined;
			row.results_summary = {
				vulnerabilities: null,
				secrets: null,
				static_analysis: null,
				inventory: null,
				configuration: null,
			};
		});

		it("displays a count of critical vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical vuln`, "i");
			const elt = screen.getByTitle(reg); // for a11y each result should have a title reporting count & finding type (vuln, static analysis, etc.)
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument(); // an element should also just contain a visible count
		});

		it("displays a count of high vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.high || 0
			).toString();
			const reg = new RegExp(`${count} high vuln`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium vuln`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of critical static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of high static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.high || 0
			).toString();
			const reg = new RegExp(`${count} high static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of secrets detected", () => {
			render(<StatusCell row={row} />);
			const count = (row?.results_summary?.secrets || 0).toString();
			const reg = new RegExp(`${count} secret`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of technologies discovered", () => {
			render(<StatusCell row={row} />);
			const count = Object.keys(
				row?.results?.inventory?.technology_discovery || {},
			).length.toString();
			const reg = new RegExp(`${count} tech`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of base images discovered", () => {
			render(<StatusCell row={row} />);
			const count = Object.keys(
				row?.results?.inventory?.base_images || {},
			).length.toString();
			const reg = new RegExp(`${count} base image`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		if (sbomPlugins.length > 0) {
			it("displays sbom category run indicator without a count", () => {
				render(<StatusCell row={row} />);
				expect(
					screen.getByTitle(/software bill of materials \(sbom\)/i),
				).toBeInTheDocument();
			});
		}
	});

	describe("displays scan category ran if a single category plugin enabled in scan options", () => {
		beforeEach(() => {
			row.status = "completed";
			// enable a single scan plugin in each category
			row.scan_options.plugins = [
				secretPlugins[0],
				vulnPlugins[0],
				techPlugins[0],
				staticPlugins[0],
				sbomPlugins[0],
				configPlugins[0],
			];
			// exclude categories and results_summary so we are testing only plugins
			row.scan_options.categories = [];
			row.results = undefined;
			row.results_summary = {
				vulnerabilities: null,
				secrets: null,
				static_analysis: null,
				inventory: null,
				configuration: null,
			};
		});

		it("displays a count of critical vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical vuln`, "i");
			const elt = screen.getByTitle(reg); // for a11y each result should have a title reporting count & finding type (vuln, static analysis, etc.)
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument(); // an element should also just contain a visible count
		});

		it("displays a count of high vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.high || 0
			).toString();
			const reg = new RegExp(`${count} high vuln`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium vulnerabilities", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.vulnerabilities?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium vuln`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of critical static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of high static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.high || 0
			).toString();
			const reg = new RegExp(`${count} high static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium static analysis results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.static_analysis?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium static analysis`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of secrets detected", () => {
			render(<StatusCell row={row} />);
			const count = (row?.results_summary?.secrets || 0).toString();
			const reg = new RegExp(`${count} secret`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of technologies discovered", () => {
			render(<StatusCell row={row} />);
			const count = Object.keys(
				row?.results?.inventory?.technology_discovery || {},
			).length.toString();
			const reg = new RegExp(`${count} tech`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of base images discovered", () => {
			render(<StatusCell row={row} />);
			const count = Object.keys(
				row?.results?.inventory?.base_images || {},
			).length.toString();
			const reg = new RegExp(`${count} base image`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of critical configuration results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.configuration?.critical || 0
			).toString();
			const reg = new RegExp(`${count} critical configuration`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of high configuration results", () => {
			render(<StatusCell row={row} />);
			const count = (row?.results_summary?.configuration?.high || 0).toString();
			const reg = new RegExp(`${count} high configuration`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		it("displays a count of medium configuration results", () => {
			render(<StatusCell row={row} />);
			const count = (
				row?.results_summary?.configuration?.medium || 0
			).toString();
			const reg = new RegExp(`${count} medium configuration`, "i");
			const elt = screen.getByTitle(reg);
			expect(elt).toBeInTheDocument();
			expect(getByText(elt, count)).toBeInTheDocument();
		});

		if (sbomPlugins.length > 0) {
			it("displays sbom category run indicator without a count", () => {
				render(<StatusCell row={row} />);
				expect(
					screen.getByTitle(/software bill of materials \(sbom\)/i),
				).toBeInTheDocument();
			});
		}
	});

	describe("scan subset help indicator", () => {
		beforeEach(() => {
			row.status = "completed";
			// ensure no categories or plugins enabled so results based solely on results summary
			row.scan_options.categories = [];
			row.scan_options.plugins = [];
			row.results = {
				vulnerabilities: { component: {} },
				secrets: { SecretFinding: [] },
				static_analysis: {
					filepath: [
						{
							line: 1,
							type: "XSS",
							message: "Lorem ipsum",
							severity: "critical",
						},
					],
				},
				inventory: {
					base_images: {
						golang: {
							tags: ["latest"],
							digests: [],
						},
						python: {
							tags: ["latest"],
							digests: [],
						},
						ubuntu: {
							tags: ["latest"],
							digests: [],
						},
					},
					technology_discovery: {
						Ruby: 55.98,
						Java: 32.33,
						JavaScript: 4.59,
						TypeScript: 4.02,
						PHP: 1.57,
						Shell: 0.94,
						Python: 0.52,
						Dockerfile: 0.05,
					},
				},
			};
			row.results_summary = {
				vulnerabilities: {
					critical: 1,
					high: 1,
					medium: 2,
					low: 2,
					negligible: 2,
					"": 0,
				},
				secrets: 5,
				static_analysis: {
					critical: 3,
					high: 1,
					medium: 2,
					low: 1,
					negligible: 0,
					"": 0,
				},
				inventory: {
					base_images: 3,
					technology_discovery: 8,
				},
				configuration: {
					critical: 2,
					high: 2,
					medium: 1,
					low: 1,
					negligible: 1,
					"": 0,
				},
			};
		});

		it("displays no scan subset help indicator if all scan categories produced summary results and no include/exclude paths", () => {
			render(<StatusCell row={row} />);
			const subsetIndicator = screen.queryByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).not.toBeInTheDocument();
		});

		it("displays scan subset help indicator if vulnerability scan category missing in summary results", async () => {
			const rowNoVuls = JSON.parse(JSON.stringify(row));
			rowNoVuls.results_summary.vulnerabilities = null;
			const { user } = render(<StatusCell row={rowNoVuls} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();

			expect(
				screen.queryByText(/this scan ran with a subset of plugins/i),
			).not.toBeInTheDocument();
			await user.click(subsetIndicator);
			expect(
				screen.getByText(/this scan ran with a subset of plugins/i),
			).toBeInTheDocument();
			expect(screen.getByText(/results may vary/i)).toBeInTheDocument();
		});

		it("displays scan subset help indicator if secret scan category missing in summary results", () => {
			const rowNoVuls = JSON.parse(JSON.stringify(row));
			rowNoVuls.results_summary.secrets = null;
			render(<StatusCell row={rowNoVuls} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();
		});

		it("displays scan subset help indicator if static analysis scan category missing in summary results", () => {
			const rowNoVuls = JSON.parse(JSON.stringify(row));
			rowNoVuls.results_summary.static_analysis = null;
			render(<StatusCell row={rowNoVuls} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();
		});

		it("displays scan subset help indicator if inventory scan category missing in summary results", () => {
			const rowNoVuls = JSON.parse(JSON.stringify(row));
			rowNoVuls.results_summary.inventory = null;
			render(<StatusCell row={rowNoVuls} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();
		});

		it("displays scan subset help indicator if configuration scan category missing in summary results", () => {
			const rowNoVuls = JSON.parse(JSON.stringify(row));
			rowNoVuls.results_summary.configuration = null;
			render(<StatusCell row={rowNoVuls} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();
		});

		it("displays scan subset help indicator if scan has include paths", async () => {
			const rowIncludes = JSON.parse(JSON.stringify(row));
			rowIncludes.scan_options.include_paths = ["include"];
			const { user } = render(<StatusCell row={rowIncludes} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();

			expect(
				screen.queryByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).not.toBeInTheDocument();
			await user.click(subsetIndicator);
			expect(
				screen.getByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).toBeInTheDocument();
			expect(screen.getByText(/results may vary/i)).toBeInTheDocument();
		});

		it("displays scan subset help indicator if scan has exclude paths", async () => {
			const rowExcludes = JSON.parse(JSON.stringify(row));
			rowExcludes.scan_options.exclude_paths = ["exclude"];
			const { user } = render(<StatusCell row={rowExcludes} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();

			expect(
				screen.queryByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).not.toBeInTheDocument();
			await user.click(subsetIndicator);
			expect(
				screen.getByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).toBeInTheDocument();
			expect(screen.getByText(/results may vary/i)).toBeInTheDocument();
		});

		it("displays scan subset help indicator if scan has include & exclude paths", async () => {
			const rowPaths = JSON.parse(JSON.stringify(row));
			rowPaths.scan_options.include_paths = ["include"];
			rowPaths.scan_options.exclude_paths = ["exclude"];
			const { user } = render(<StatusCell row={rowPaths} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();

			expect(
				screen.queryByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).not.toBeInTheDocument();
			await user.click(subsetIndicator);
			expect(
				screen.getByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).toBeInTheDocument();
			expect(screen.getByText(/results may vary/i)).toBeInTheDocument();
		});

		it("displays scan subset help indicator if scan missing results and has include/exclude paths", async () => {
			const rowHelp = JSON.parse(JSON.stringify(row));
			rowHelp.results_summary.vulnerabilities = null;
			rowHelp.scan_options.include_paths = ["include"];
			const { user } = render(<StatusCell row={rowHelp} />);
			const subsetIndicator = screen.getByRole("button", {
				name: /view info/i,
			});
			expect(subsetIndicator).toBeInTheDocument();

			expect(
				screen.queryByText(/this scan ran with a subset of plugins/i),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).not.toBeInTheDocument();
			await user.click(subsetIndicator);
			expect(
				screen.queryByText(/this scan ran with a subset of plugins/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					/this scan ran against a subset of source code due to include\/exclude paths/i,
				),
			).toBeInTheDocument();
			expect(screen.getByText(/results may vary/i)).toBeInTheDocument();
		});
	});
});

describe("field displays 'failed' status", () => {
	let user: any;
	beforeEach(() => {
		row.status = "failed";
		row.errors = {
			failed1: "shouldBeDisplayed1",
			failed2: "shouldBeDisplayed2",
		};
		const renderArgs = render(<StatusCell row={row} />);
		user = renderArgs.user;
	});

	it("displays 'failed'", () => {
		expect(screen.getByText(/failed/i)).toBeInTheDocument();
	});

	it("includes option to view and close error alert", async () => {
		const button = screen.getByRole("button", { name: /view errors/i });
		expect(button).toBeInTheDocument();
		await user.click(button);

		const alert = await screen.findByRole("alert"); // alert popup visible
		expect(alert).toHaveTextContent(/error/i); // alert contains error title
		expect(alert).toHaveTextContent("shouldBeDisplayed1"); // all errors{} items displayed
		expect(alert).toHaveTextContent("shouldBeDisplayed2"); // ...

		const closeButton = screen.getByRole("button", { name: /^close$/i });
		expect(closeButton).toBeInTheDocument();
		await user.click(closeButton);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});

describe("field displays 'terminated' status", () => {
	let user: any;
	beforeEach(() => {
		row.status = "terminated";
		row.errors = {
			failed1: "shouldBeDisplayed1",
			failed2: "shouldBeDisplayed2",
		};
		const renderArgs = render(<StatusCell row={row} />);
		user = renderArgs.user;
	});

	it("displays 'terminated'", () => {
		expect(screen.getByText(/terminated/i)).toBeInTheDocument();
	});

	it("includes option to view and close error alert", async () => {
		const button = screen.getByRole("button", { name: /view errors/i });
		expect(button).toBeInTheDocument();
		await user.click(button);

		const alert = await screen.findByRole("alert"); // alert popup visible
		expect(alert).toHaveTextContent(/error/i); // alert contains error title
		expect(alert).toHaveTextContent("shouldBeDisplayed1"); // all errors{} items displayed
		expect(alert).toHaveTextContent("shouldBeDisplayed2"); // ...

		const closeButton = screen.getByRole("button", { name: /^close$/i });
		expect(closeButton).toBeInTheDocument();
		await user.click(closeButton);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});

describe("field displays 'error' status", () => {
	let user: any;
	beforeEach(() => {
		row.status = "error";
		row.errors = {
			failed1: "shouldBeDisplayed1",
			failed2: "shouldBeDisplayed2",
		};
		const renderArgs = render(<StatusCell row={row} />);
		user = renderArgs.user;
	});

	it("displays 'error'", () => {
		expect(screen.getByText(/error/i)).toBeInTheDocument();
	});

	it("includes option to view and close error alert", async () => {
		const button = screen.getByRole("button", { name: /view errors/i });
		expect(button).toBeInTheDocument();
		await user.click(button);

		const alert = await screen.findByRole("alert"); // alert popup visible
		expect(alert).toHaveTextContent(/error/i); // alert contains error title
		expect(alert).toHaveTextContent("shouldBeDisplayed1"); // all errors{} items displayed
		expect(alert).toHaveTextContent("shouldBeDisplayed2"); // ...

		const closeButton = screen.getByRole("button", { name: /^close$/i });
		expect(closeButton).toBeInTheDocument();
		await user.click(closeButton);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
