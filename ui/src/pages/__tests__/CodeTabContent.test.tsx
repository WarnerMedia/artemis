import { render, screen, waitFor, within } from "test-utils";
import { STORAGE_LOCAL_EXPORT_ACKNOWLEDGE } from "app/globals";
import client, { Client } from "api/client";
import formatters from "utils/formatters";
import { CodeTabContent } from "pages/ResultsPage";
import { mockScan001 } from "../../../testData/testMockData";
import { AnalysisReport, SbomReport } from "features/scans/scansSchemas";
jest.mock("react-redux", () => ({
	...(jest.requireActual("react-redux") as any),
	__esModule: true,
	useDispatch: jest.fn(),
}));
/* eslint-disable */
import { useDispatch } from "react-redux";
import { addNotification } from "features/notifications/notificationsSlice";

const mockUseDispatch = useDispatch as jest.Mock;
const mockDispatch = jest.fn();
let origExportAck: string | null;
let localStorageSetItemSpy: any;

describe("CodeTabContent component", () => {
	jest.setTimeout(300000);

	beforeAll(() => {
		origExportAck = localStorage.getItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE);
	});
	afterAll(() => {
		if (origExportAck) {
			localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, origExportAck);
		} else {
			localStorage.removeItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE);
		}
	});

	beforeEach(() => {
		mockUseDispatch.mockImplementation(() => mockDispatch);
		localStorageSetItemSpy = jest.spyOn(
			window.localStorage.__proto__,
			"setItem",
		);
	});
	afterEach(() => {
		mockUseDispatch.mockClear();
		mockDispatch.mockClear();
		localStorageSetItemSpy.mockRestore();
	});

	it("default toolbar elements checked", () => {
		const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
		const state = {
			style: "a11yDark",
			showLineNumbers: true,
			wrapLongLines: true,
		};
		const mockSetState = jest.fn();
		render(
			<CodeTabContent scan={scan} state={state} setState={mockSetState} />,
		);

		const themeField = screen.getByLabelText(/theme/i);
		within(themeField).getByText("a11yDark (dark)");

		const numbers = screen.getByRole("checkbox", {
			name: /show line numbers/i,
		});
		expect(numbers).toBeChecked();

		const wrap = screen.getByRole("checkbox", { name: /wrap long lines/i });
		expect(wrap).toBeChecked();

		screen.getByRole("button", { name: /copy to clipboard/i });

		screen.getByRole("button", { name: /download scan results/i });

		// mock scan data doesn't include sbom category or plugins, so no sbom download button
		expect(
			screen.queryByRole("button", { name: /download sbom results/i }),
		).not.toBeInTheDocument();
	});

	it("default toolbar elements unchecked", () => {
		const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
		const state = {
			style: "nord",
			showLineNumbers: false,
			wrapLongLines: false,
		};
		const mockSetState = jest.fn();
		render(
			<CodeTabContent scan={scan} state={state} setState={mockSetState} />,
		);

		const themeField = screen.getByLabelText(/theme/i);
		within(themeField).getByText("nord (dark)");

		const numbers = screen.getByRole("checkbox", {
			name: /show line numbers/i,
		});
		expect(numbers).not.toBeChecked();

		const wrap = screen.getByRole("checkbox", { name: /wrap long lines/i });
		expect(wrap).not.toBeChecked();

		screen.getByRole("button", { name: /copy to clipboard/i });

		screen.getByRole("button", { name: /download scan results/i });

		// mock scan data doesn't include sbom category or plugins, so no sbom download button
		expect(
			screen.queryByRole("button", { name: /download sbom results/i }),
		).not.toBeInTheDocument();
	});

	it("sbom download button exists when scan has sbom options", () => {
		const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
		scan.scan_options.categories = ["sbom"];
		const state = {
			style: "nord",
			showLineNumbers: false,
			wrapLongLines: false,
		};
		const mockSetState = jest.fn();
		render(
			<CodeTabContent scan={scan} state={state} setState={mockSetState} />,
		);

		screen.getByRole("button", { name: /download scan results/i });

		screen.getByRole("button", { name: /download sbom results/i });
	});

	it("downloading scan results triggers acknowledgement", async () => {
		const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
		const state = {
			style: "nord",
			showLineNumbers: false,
			wrapLongLines: false,
		};
		const mockSetState = jest.fn();
		const spy = jest
			.spyOn(formatters, "exportToJson")
			.mockImplementation((fileName, data) => {
				return true;
			});
		// ensure acknowledgment dialog displayed
		localStorage.removeItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE);
		const { user } = render(
			<CodeTabContent scan={scan} state={state} setState={mockSetState} />,
		);

		const downloadButton = screen.getByRole("button", {
			name: /download scan results/i,
		});
		await user.click(downloadButton);

		// wait for confirm dialog
		const dialog = await screen.findByRole("dialog", {
			name: /confirm download/i,
		});
		const dontShowCheck = within(dialog).getByRole("checkbox", {
			name: /don't show this dialog again on this browser/i,
		});
		expect(dontShowCheck).not.toBeChecked();
		await user.click(dontShowCheck);
		expect(dontShowCheck).toBeChecked();

		const ackButton = within(dialog).getByRole("button", {
			name: /i acknowledge/i,
		});
		await user.click(ackButton);

		expect(localStorageSetItemSpy).toHaveBeenLastCalledWith(
			STORAGE_LOCAL_EXPORT_ACKNOWLEDGE,
			"1",
		);

		expect(spy).toHaveBeenCalledWith("scan", scan);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating JSON File", "info"),
		);
	});

	it("downloading scan results bypass acknowledgement", async () => {
		const scan: AnalysisReport = JSON.parse(JSON.stringify(mockScan001));
		const state = {
			style: "nord",
			showLineNumbers: false,
			wrapLongLines: false,
		};
		const mockSetState = jest.fn();
		const spy = jest
			.spyOn(formatters, "exportToJson")
			.mockImplementation((fileName, data) => {
				return true;
			});
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const { user } = render(
			<CodeTabContent scan={scan} state={state} setState={mockSetState} />,
		);

		const downloadButton = screen.getByRole("button", {
			name: /download scan results/i,
		});
		await user.click(downloadButton);

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: /confirm download/i }),
			).not.toBeInTheDocument(),
		);

		expect(spy).toHaveBeenCalledWith("scan", scan);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating JSON File", "info"),
		);
	});

	it("downloading sbom results triggers acknowledgement", async () => {
		const scan: SbomReport = JSON.parse(JSON.stringify(mockScan001));
		scan.scan_options.categories = ["sbom"];
		scan.sbom = [];

		const state = {
			style: "nord",
			showLineNumbers: false,
			wrapLongLines: false,
		};
		const mockSetState = jest.fn();

		const fetchSbomSpy = jest
			.spyOn(client, "getSbomScanById")
			.mockImplementation(
				(url: string, { meta, customConfig = {} }: Client) => {
					return Promise.resolve(scan);
				},
			);

		const exportSpy = jest
			.spyOn(formatters, "exportToJson")
			.mockImplementation((fileName, data) => {
				return true;
			});
		// ensure acknowledgment dialog displayed
		localStorage.removeItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE);
		const { user } = render(
			<CodeTabContent
				scan={scan as AnalysisReport}
				state={state}
				setState={mockSetState}
			/>,
		);

		const downloadButton = screen.getByRole("button", {
			name: /download sbom results/i,
		});
		await user.click(downloadButton);

		// wait for confirm dialog
		const dialog = await screen.findByRole("dialog", {
			name: /confirm download/i,
		});
		const dontShowCheck = within(dialog).getByRole("checkbox", {
			name: /don't show this dialog again on this browser/i,
		});
		expect(dontShowCheck).not.toBeChecked();
		await user.click(dontShowCheck);
		expect(dontShowCheck).toBeChecked();

		const ackButton = within(dialog).getByRole("button", {
			name: /i acknowledge/i,
		});
		await user.click(ackButton);

		expect(localStorageSetItemSpy).toHaveBeenLastCalledWith(
			STORAGE_LOCAL_EXPORT_ACKNOWLEDGE,
			"1",
		);

		// sbom results fetched
		expect(fetchSbomSpy).toHaveBeenCalledWith(
			`${scan.service}/${scan.repo}/${scan.scan_id}`,
			{},
		);
		// and downloads results as JSON
		waitFor(() => {
			expect(exportSpy).toHaveBeenCalledWith("sbom", scan.sbom);
		});

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating JSON File", "info"),
		);
	});

	it("downloading sbom results bypass acknowledgement", async () => {
		const scan: SbomReport = JSON.parse(JSON.stringify(mockScan001));
		scan.scan_options.categories = ["sbom"];
		scan.sbom = [];

		const state = {
			style: "nord",
			showLineNumbers: false,
			wrapLongLines: false,
		};
		const mockSetState = jest.fn();

		const fetchSbomSpy = jest
			.spyOn(client, "getSbomScanById")
			.mockImplementation(
				(url: string, { meta, customConfig = {} }: Client) => {
					return Promise.resolve(scan);
				},
			);

		const exportSpy = jest
			.spyOn(formatters, "exportToJson")
			.mockImplementation((fileName, data) => {
				return true;
			});
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const { user } = render(
			<CodeTabContent
				scan={scan as AnalysisReport}
				state={state}
				setState={mockSetState}
			/>,
		);

		const downloadButton = screen.getByRole("button", {
			name: /download sbom results/i,
		});
		await user.click(downloadButton);

		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: /confirm download/i }),
			).not.toBeInTheDocument(),
		);

		// sbom results fetched
		expect(fetchSbomSpy).toHaveBeenCalledWith(
			`${scan.service}/${scan.repo}/${scan.scan_id}`,
			{},
		);
		// and downloads results as JSON
		waitFor(() => {
			expect(exportSpy).toHaveBeenCalledWith("sbom", scan.sbom);
		});

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating JSON File", "info"),
		);
	});
});
