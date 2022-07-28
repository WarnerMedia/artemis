import { getByText, render, screen } from "test-utils";
import { AnalysisReport } from "features/scans/scansSchemas";
import StatusCell from "./StatusCell";
import { UserEvent } from "@testing-library/user-event/dist/types/setup";

let row: AnalysisReport = {
	repo: "repo1",
	scan_id: "abc123",
	initiated_by: null,
	service: "vcs1",
	branch: null,
	scan_options: {
		categories: ["vulnerability", "static_analysis", "secret", "inventory"],
		plugins: ["plugin"],
		depth: 500,
		include_dev: false,
		callback: {
			url: null,
			client_id: null,
		},
		batch_priority: false,
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
			"i"
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
	beforeEach(() => {
		row.status = "completed";
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
		const count = (row?.results_summary?.vulnerabilities?.high || 0).toString();
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
		const count = (row?.results_summary?.static_analysis?.high || 0).toString();
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
			row?.results?.inventory?.technology_discovery || {}
		).length.toString();
		const reg = new RegExp(`${count} tech`, "i");
		const elt = screen.getByTitle(reg);
		expect(elt).toBeInTheDocument();
		expect(getByText(elt, count)).toBeInTheDocument();
	});

	it("displays a count of base images discovered", () => {
		render(<StatusCell row={row} />);
		const count = Object.keys(
			row?.results?.inventory?.base_images || {}
		).length.toString();
		const reg = new RegExp(`${count} base image`, "i");
		const elt = screen.getByTitle(reg);
		expect(elt).toBeInTheDocument();
		expect(getByText(elt, count)).toBeInTheDocument();
	});

	it("displays only vulns results if other categories are null and not in scan options", () => {
		const altRow = JSON.parse(JSON.stringify(row));
		altRow.results_summary = {
			vulnerabilities: {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0,
				negligible: 0,
				"": 0,
			},
			secrets: null,
			static_analysis: null,
			inventory: null,
		};
		altRow.scan_options.categories = ["vulnerability"];
		render(<StatusCell row={altRow} />);

		expect(screen.getByTitle(/critical vulnerabilit/i)).toBeInTheDocument();
		expect(
			screen.queryByTitle(/critical static analysis/i)
		).not.toBeInTheDocument();
		expect(screen.queryByTitle(/secrets/i)).not.toBeInTheDocument();
		expect(screen.queryByTitle(/technolog/i)).not.toBeInTheDocument();
	});

	it("displays only static analysis results if other categories are null and not in scan options", () => {
		const altRow = JSON.parse(JSON.stringify(row));
		altRow.results_summary = {
			vulnerabilities: null,
			secrets: null,
			static_analysis: {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0,
				negligible: 0,
				"": 0,
			},
			inventory: null,
		};
		altRow.scan_options.categories = ["static_analysis"];
		render(<StatusCell row={altRow} />);

		expect(
			screen.queryByTitle(/critical vulnerabilit/i)
		).not.toBeInTheDocument();
		expect(screen.getByTitle(/critical static analysis/i)).toBeInTheDocument();
		expect(screen.queryByTitle(/secrets/i)).not.toBeInTheDocument();
		expect(screen.queryByTitle(/technolog/i)).not.toBeInTheDocument();
	});

	it("displays only secret results if other categories are null and not in scan options", () => {
		const altRow = JSON.parse(JSON.stringify(row));
		altRow.results_summary = {
			vulnerabilities: null,
			secrets: 0,
			static_analysis: null,
			inventory: null,
		};
		altRow.scan_options.categories = ["secret"];
		render(<StatusCell row={altRow} />);

		expect(
			screen.queryByTitle(/critical vulnerabilit/i)
		).not.toBeInTheDocument();
		expect(
			screen.queryByTitle(/critical static analysis/i)
		).not.toBeInTheDocument();
		expect(screen.getByTitle(/secrets/i)).toBeInTheDocument();
		expect(screen.queryByTitle(/technolog/i)).not.toBeInTheDocument();
	});

	it("displays only inventory results if other categories are null and not in scan options", () => {
		const altRow = JSON.parse(JSON.stringify(row));
		altRow.results_summary = {
			vulnerabilities: null,
			secrets: null,
			static_analysis: null,
			inventory: {
				base_images: 0,
				technology_discovery: 8,
			},
		};
		altRow.scan_options.categories = ["inventory"];
		render(<StatusCell row={altRow} />);

		expect(
			screen.queryByTitle(/critical vulnerabilit/i)
		).not.toBeInTheDocument();
		expect(
			screen.queryByTitle(/critical static analysis/i)
		).not.toBeInTheDocument();
		expect(screen.queryByTitle(/secrets/i)).not.toBeInTheDocument();
		expect(screen.getByTitle(/technolog/i)).toBeInTheDocument();
	});
});

describe("field displays 'failed' status", () => {
	let user: UserEvent;
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

		let alert = await screen.findByRole("alert"); // alert popup visible
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
	let user: UserEvent;
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

		let alert = await screen.findByRole("alert"); // alert popup visible
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
	let user: UserEvent;
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

		let alert = await screen.findByRole("alert"); // alert popup visible
		expect(alert).toHaveTextContent(/error/i); // alert contains error title
		expect(alert).toHaveTextContent("shouldBeDisplayed1"); // all errors{} items displayed
		expect(alert).toHaveTextContent("shouldBeDisplayed2"); // ...

		const closeButton = screen.getByRole("button", { name: /^close$/i });
		expect(closeButton).toBeInTheDocument();
		await user.click(closeButton);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
