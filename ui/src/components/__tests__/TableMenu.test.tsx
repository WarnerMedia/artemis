import store from "app/store";
import { STORAGE_LOCAL_EXPORT_ACKNOWLEDGE } from "app/globals";
import { render, screen, waitFor, within } from "test-utils";
import formatters from "utils/formatters";
import TableMenu, { ExportFormats } from "components/TableMenu";

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

describe("TableMenu component", () => {
	jest.setTimeout(120000);

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
			"setItem"
		);
	});
	afterEach(() => {
		mockUseDispatch.mockClear();
		mockDispatch.mockClear();
		localStorageSetItemSpy.mockRestore();
	});

	it("display confirmation dialog, sets local storage key if 'don't show again' checked", async () => {
		// ensure acknowledgment dialog displayed
		localStorage.removeItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE);
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		const spy = jest
			.spyOn(formatters, "exportToCsv")
			.mockImplementation((fileName, data, toCsv) => {
				return true;
			});

		const exportFetch = async () => Promise.resolve(data);
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);

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
			"1"
		);

		expect(spy).toHaveBeenCalledWith(exportFile, data, undefined);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating CSV File", "info")
		);
	});

	it("display confirmation dialog, don't set local storage key if 'don't show again' unchecked", async () => {
		// ensure acknowledgment dialog displayed
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "0");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		const spy = jest
			.spyOn(formatters, "exportToCsv")
			.mockImplementation((fileName, data, toCsv) => {
				return true;
			});

		const exportFetch = async () => Promise.resolve(data);
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);

		// wait for confirm dialog
		const dialog = await screen.findByRole("dialog", {
			name: /confirm download/i,
		});
		const dontShowCheck = within(dialog).getByRole("checkbox", {
			name: /don't show this dialog again on this browser/i,
		});
		expect(dontShowCheck).not.toBeChecked();

		const ackButton = within(dialog).getByRole("button", {
			name: /i acknowledge/i,
		});
		await user.click(ackButton);

		expect(localStorageSetItemSpy).toHaveBeenLastCalledWith(
			STORAGE_LOCAL_EXPORT_ACKNOWLEDGE,
			"0"
		);

		expect(spy).toHaveBeenCalledWith(exportFile, data, undefined);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating CSV File", "info")
		);
	});

	it("display confirmation dialog, don't set local storage key or call data export if cancel button clicked", async () => {
		// ensure acknowledgment dialog displayed
		localStorage.removeItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE);
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		const spy = jest
			.spyOn(formatters, "exportToCsv")
			.mockImplementation((fileName, data, toCsv) => {
				return true;
			});

		const exportFetch = async () => Promise.resolve(data);
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);

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

		const cancelButton = within(dialog).getByRole("button", {
			name: /cancel/i,
		});
		await user.click(cancelButton);

		expect(localStorageSetItemSpy).not.toHaveBeenCalled();
		expect(spy).not.toHaveBeenCalled();
		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it("exportFormat csv adds csv export to menu and shows spinner", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		// set a timeout for fetch so we can check for progress indicator
		const exportFetch = jest.fn().mockImplementation(() => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve(data);
				}, 1000);
			});
		});
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		screen.getByRole("button", {
			name: /close table menu/i,
			hidden: true,
		}); // hidden because behind menu popup
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);

		// closes menu when option clicked
		// re-open menu
		menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);

		// check for spinny thingy
		screen.getByRole("progressbar");

		waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
		);
		expect(exportFetch).toHaveBeenCalled();
	});

	it("CSV export calls exportToCsv", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		const spy = jest
			.spyOn(formatters, "exportToCsv")
			.mockImplementation((fileName, data, toCsv) => {
				return true;
			});

		const exportFetch = async () => Promise.resolve(data);
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);
		expect(spy).toHaveBeenCalledWith(exportFile, data, undefined);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating CSV File", "info")
		);
	});

	it("CSV export fails", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const spy = jest
			.spyOn(formatters, "exportToCsv")
			.mockImplementation((fileName, data, toCsv) => {
				return true;
			});
		const dispatchSpy = jest.spyOn(store, "dispatch").mockImplementation(() => {
			return true;
		});

		const exportFetch = async () => Promise.reject(new Error("error!"));
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);
		expect(spy).not.toHaveBeenCalled();

		expect(dispatchSpy).toHaveBeenLastCalledWith(
			addNotification("error!", "error")
		);
	});

	it("CSV export includes toCsv attribute", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["csv"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];
		const toCsv = () => {};

		const spy = jest
			.spyOn(formatters, "exportToCsv")
			.mockImplementation((fileName, data, toCsv) => {
				return true;
			});

		const exportFetch = async () => Promise.resolve(data);
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
				toCsv={toCsv}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadCsv = screen.getByRole("menuitem", {
			name: /download as csv/i,
		});
		await user.click(downloadCsv);
		expect(spy).toHaveBeenCalledWith(exportFile, data, toCsv);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating CSV File", "info")
		);
	});

	it("exportFormat json adds json export to menu and shows spinner", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["json"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		// set a timeout for fetch so we can check for progress indicator
		const exportFetch = jest.fn().mockImplementation(() => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve(data);
				}, 1000);
			});
		});
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		screen.getByRole("button", {
			name: /close table menu/i,
			hidden: true,
		}); // hidden because behind menu popup
		const downloadJson = screen.getByRole("menuitem", {
			name: /download as json/i,
		});
		await user.click(downloadJson);

		// closes menu when option clicked
		// re-open menu
		menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);

		// check for spinny thingy
		screen.getByRole("progressbar");

		waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
		);
		expect(exportFetch).toHaveBeenCalled();
	});

	it("JSON export calls exportToJson", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["json"];
		const data = [
			{
				var1: "val1",
				var2: "val2",
			},
		];

		const spy = jest
			.spyOn(formatters, "exportToJson")
			.mockImplementation((fileName, data) => {
				return true;
			});

		const exportFetch = async () => Promise.resolve(data);
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadJson = screen.getByRole("menuitem", {
			name: /download as json/i,
		});
		await user.click(downloadJson);
		expect(spy).toHaveBeenCalledWith(exportFile, data);

		expect(mockDispatch).toHaveBeenLastCalledWith(
			addNotification("Generating JSON File", "info")
		);
	});

	it("JSON export fails", async () => {
		// bypass aknowledgement dialog
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, "1");
		const exportFile = "fileName";
		const exportFormats: ExportFormats[] = ["json"];
		const spy = jest
			.spyOn(formatters, "exportToJson")
			.mockImplementation((fileName, data) => {
				return true;
			});
		const dispatchSpy = jest.spyOn(store, "dispatch").mockImplementation(() => {
			return true;
		});

		const exportFetch = async () => Promise.reject(new Error("error!"));
		const { user } = render(
			<TableMenu
				exportFile={exportFile}
				exportFormats={exportFormats}
				exportFetch={exportFetch}
			/>
		);
		let menu = screen.getByRole("button", { name: /open table menu/i });
		await user.click(menu);
		const downloadJson = screen.getByRole("menuitem", {
			name: /download as json/i,
		});
		await user.click(downloadJson);
		expect(spy).not.toHaveBeenCalled();

		expect(dispatchSpy).toHaveBeenLastCalledWith(
			addNotification("error!", "error")
		);
	});
});
