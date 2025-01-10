import { render, screen, waitFor, within } from "test-utils";
import EnhancedTable, { ColDef, RowDef } from "components/EnhancedTable";
import { FilterDef } from "api/client";
import AppGlobals, { APP_TABLE_EXPORT_MAX } from "app/globals";
import { ExportFormats } from "components/TableMenu";
import formatters from "utils/formatters";

describe("EnhancedTable component", () => {
	const columns: ColDef[] = [{ field: "data", headerName: "Data" }];
	const rows: RowDef[] = [
		// 19 rows
		{ data: "row 1" },
		{ data: "row 2" },
		{ data: "row 3" },
		{ data: "row 4" },
		{ data: "ROW 1" },
		{ data: "ROW 2" },
		{ data: "notarow 1" },
		{ data: "notarow 2" },
		{ data: "foo 3" },
		{ data: "bar 4" },
		{ data: "baz 5" },
		{ data: "zero 0" },
		{ data: "other" },
		{ data: "row" },
		{ data: "data" },
		{ data: 1 },
		{ data: 2 },
		{ data: 3 },
		{ data: ["foo", "bar", "baz"] },
	];

	describe("filters option", () => {
		const totalRowsPerPage = 10;

		it("no filters shows all rows", () => {
			const filters = {
				data: {
					filter: "",
				},
			};
			const rowsPerPage = totalRowsPerPage;
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(rowsPerPage),
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rows.length}`),
			).toBeInTheDocument();
			expect(
				screen.queryByLabelText("This column is filtered"),
			).not.toBeInTheDocument();
		});

		it("filters default to partial match, case insensitive (icontains)", () => {
			const filters = {
				data: {
					filter: "row 1",
				},
			};
			const rowsPerPage = 3; // matches
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("rowheader", { name: "row 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("rowheader", { name: "ROW 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("rowheader", { name: "notarow 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(totalRowsPerPage),
				}),
			).toBeInTheDocument();

			// check total items matches filtered item count (not unfiltered record count)
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rowsPerPage}`),
			).toBeInTheDocument();

			// column has a filtered indicator
			expect(
				screen.getByLabelText("This column is filtered"),
			).toBeInTheDocument();
		});

		it("filters displayed in table header even if column is not orderable", () => {
			const col: ColDef[] = [
				{ field: "id", headerName: "ID" },
				{ field: "data", headerName: "Data", sortable: false },
			];
			const row: RowDef[] = [{ id: "1", data: "row 1" }];
			const filters = {
				data: {
					filter: "row 1",
				},
			};
			render(
				<EnhancedTable
					columns={col}
					rows={row}
					id="id"
					defaultOrderBy="id"
					filters={filters}
				/>,
			);

			// column has a filtered indicator
			expect(
				screen.getByRole("columnheader", {
					name: "Data This column is filtered",
				}),
			).toBeInTheDocument();
		});

		it("filters numbers as strings", () => {
			const filters = {
				data: {
					filter: "1",
				},
			};
			const rowsPerPage = 4; // matches
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("rowheader", { name: "row 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("rowheader", { name: "ROW 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("rowheader", { name: "notarow 1" }),
			).toBeInTheDocument();
			expect(screen.getByRole("rowheader", { name: "1" })).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(totalRowsPerPage),
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rowsPerPage}`),
			).toBeInTheDocument();
		});

		it("filters item in an array", () => {
			const filters = {
				data: {
					filter: "foo",
				},
			};
			const rowsPerPage = 2; // matches
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("rowheader", { name: "foo 3" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("rowheader", { name: "foobarbaz" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(totalRowsPerPage),
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rowsPerPage}`),
			).toBeInTheDocument();
		});

		it("filters (contains) matches case", () => {
			const filters: FilterDef = {
				data: {
					filter: "ROW",
					match: "contains",
				},
			};
			const rowsPerPage = 2; // matches
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("rowheader", { name: "ROW 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("rowheader", { name: "ROW 2" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(totalRowsPerPage),
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rowsPerPage}`),
			).toBeInTheDocument();
		});

		it("filters exact match", () => {
			const filters: FilterDef = {
				data: {
					filter: "row 1",
					match: "exact",
				},
			};
			const rowsPerPage = 1; // matches entire text and case "row 1" but not "ROW 1"
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("rowheader", { name: "row 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(totalRowsPerPage),
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rowsPerPage}`),
			).toBeInTheDocument();
		});

		it("filtering resets page", async () => {
			const filters: FilterDef = {
				data: {
					filter: "",
				},
			};

			// start with no filter
			let rowsPerPage = totalRowsPerPage;
			const { rerender, user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.getAllByRole("rowheader")).toHaveLength(rowsPerPage);
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(totalRowsPerPage),
				}),
			).toBeInTheDocument();
			expect(
				screen.getByText(`1–${rowsPerPage} of ${rows.length}`),
			).toBeInTheDocument();

			// go to page 2
			const nextButton = screen.getByRole("button", { name: /next page/i });
			expect(nextButton).toBeInTheDocument();
			await user.click(nextButton);

			// look for 2nd page indicators
			// note: the dash here is not a minus sign, it's a different character
			// that looks almost identical, –
			await screen.findByText(`11–${rows.length} of ${rows.length}`);

			// change filter, expect page to reset to 1
			filters.data.filter = "row 1";
			rowsPerPage = 3; // filtered matches
			rerender(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			await screen.findByText(`1–${rowsPerPage} of ${rowsPerPage}`);
		});

		it("filtering no results", async () => {
			const filters: FilterDef = {
				data: {
					filter: "xyz12345",
				},
			};

			const rowsPerPage = totalRowsPerPage;
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
				/>,
			);
			expect(screen.queryByRole("cell")).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(rowsPerPage),
				}),
			).toBeInTheDocument();
			expect(screen.getByText("0–0 of 0")).toBeInTheDocument();
			expect(
				screen.getByText("No results match current filters"),
			).toBeInTheDocument();
		});
	});

	describe("rows per page", () => {
		it("rows per page defaults to 10", () => {
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
				/>,
			);
			expect(
				screen.getByRole("button", {
					name:
						"Rows per page: " +
						String(AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT),
				}),
			).toBeInTheDocument();
		});

		it("rows per page matches rowsPerPage option", () => {
			const rowsPerPage = 5;
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					rowsPerPage={rowsPerPage}
				/>,
			);
			expect(
				screen.getByRole("button", {
					name: "Rows per page: " + String(rowsPerPage),
				}),
			).toBeInTheDocument();
		});

		it("rows per page options default to [5, 10, 20]", async () => {
			const defaultRowsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT;
			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
				/>,
			);

			const rowsPerPageButton = screen.getByRole("button", {
				name: "Rows per page: " + String(defaultRowsPerPage),
			});
			expect(rowsPerPageButton).toBeInTheDocument();
			await user.click(rowsPerPageButton);

			await waitFor(() => {
				expect(
					screen.queryByRole("listbox", { name: /rows per page/i }),
				).toBeInTheDocument();
			});

			const popup = screen.getByRole("listbox", { name: /rows per page/i });
			AppGlobals.APP_TABLE_ROWS_PER_PAGE_OPTIONS.forEach((option) => {
				expect(within(popup).getByText(String(option))).toBeInTheDocument();
			});
		});

		it("rows per page options match rowsPerPageOptions", async () => {
			const rowsPerPageOptions = [50, 100, 500];
			const rowsPerPage = 50;
			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={rowsPerPageOptions}
				/>,
			);

			const rowsPerPageButton = screen.getByRole("button", {
				name: "Rows per page: " + String(rowsPerPage),
			});
			expect(rowsPerPageButton).toBeInTheDocument();
			await user.click(rowsPerPageButton);

			await waitFor(() => {
				expect(
					screen.queryByRole("listbox", { name: /rows per page/i }),
				).toBeInTheDocument();
			});

			const popup = screen.getByRole("listbox", { name: /rows per page/i });
			rowsPerPageOptions.forEach((option) => {
				expect(within(popup).getByText(String(option))).toBeInTheDocument();
			});
		});
	});

	describe("server-side data fetching", () => {
		const mockOnDataLoad = jest.fn();
		const defaultOrderBy = "data";

		afterEach(() => {
			mockOnDataLoad.mockClear();
		});

		it("onDataLoad should be called only once when table first renders", () => {
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={0}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});
		});

		it("filters should cause table to pass filters to data load callback", () => {
			let filters = {
				data: {
					filter: "",
				},
			};
			const { rerender } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					filters={filters}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: 0,
				filters: filters,
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			filters = {
				data: {
					filter: "row",
				},
			};
			rerender(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					filters={filters}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: 0,
				filters: filters,
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});
		});

		it("totalRows should indicate the total record count", () => {
			const totalRows = 200;
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					totalRows={totalRows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
				/>,
			);
			expect(
				screen.getByText(
					`1–${AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT} of ${totalRows}`,
				),
			).toBeInTheDocument();
		});

		it("incrementing reloadCount should trigger onDataLoad", () => {
			let reloadCount = 0;
			const { rerender } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			reloadCount += 1;
			rerender(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			reloadCount += 1;
			rerender(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(3);
			expect(mockOnDataLoad.mock.calls[2][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});
		});

		it("if no items on current page, table reload should decrement page count", async () => {
			let reloadCount = 0;
			let currentPage = 0;
			let totalRows = rows.length;

			const { rerender, user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
					totalRows={totalRows}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			// go to page 2
			const nextButton = screen.getByRole("button", { name: /next page/ });
			expect(nextButton).toBeInTheDocument();
			await user.click(nextButton);

			// look for 2nd page indicators
			// note: the dash here is not a minus sign, it's a different character
			// that looks almost identical, –
			await screen.findByText(`11–${totalRows} of ${totalRows}`);

			currentPage += 1;
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			// current page should have no items on it
			const emptyPage: RowDef[] = [];
			totalRows = 10;
			reloadCount += 1; // force a table reload since it doesn't know data has changed (server-side)
			currentPage = 0; // current page should go back to 0 (prior page)
			rerender(
				<EnhancedTable
					columns={columns}
					rows={emptyPage}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
					totalRows={totalRows}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(3);
			expect(mockOnDataLoad.mock.calls[2][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});
		});

		it("if no items on current page, table reload shouldn't decrement page count if already on first page", () => {
			let reloadCount = 0;
			const currentPage = 0;
			let totalRows = rows.length;

			const { rerender } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
					totalRows={totalRows}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			// current page should have no items on it
			const emptyPage: RowDef[] = [];
			totalRows = 0;
			reloadCount += 1; // force a table reload since it doesn't know data has changed (server-side)
			rerender(
				<EnhancedTable
					columns={columns}
					rows={emptyPage}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={reloadCount}
					totalRows={totalRows}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});
		});

		it("paging should trigger onDataLoad with new page", async () => {
			let currentPage = 0;
			const totalRows = rows.length;
			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					totalRows={totalRows}
					reloadCount={0}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			// go to page 2
			const nextButton = screen.getByRole("button", { name: /next page/ });
			expect(nextButton).toBeInTheDocument();
			await user.click(nextButton);

			// look for 2nd page indicators
			// note: the dash here is not a minus sign, it's a different character
			// that looks almost identical, –
			await screen.findByText(`11–${totalRows} of ${totalRows}`);

			currentPage += 1;
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: currentPage,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});
		});

		it("changing rows-per-page should trigger onDataLoad with new itemsPerPage", async () => {
			let itemsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT;
			const totalRows = rows.length;
			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					totalRows={totalRows}
					reloadCount={0}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: itemsPerPage,
				orderBy: defaultOrderBy,
			});

			// switch from 10 items per page to 20
			const rowsPerPageButton = screen.getByRole("button", {
				name: "Rows per page: " + String(itemsPerPage),
			});
			expect(rowsPerPageButton).toBeInTheDocument();
			await user.click(rowsPerPageButton);

			await waitFor(() => {
				expect(
					screen.queryByRole("listbox", { name: /rows per page/i }),
				).toBeInTheDocument();
			});

			itemsPerPage = 20;
			const popup = screen.getByRole("listbox", { name: /rows per page/i });
			const items20 = within(popup).getByText(String(itemsPerPage));
			expect(items20).toBeInTheDocument();
			await user.click(items20);

			// ensure mock callback called again with 20 itemsPerPage
			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: itemsPerPage,
				orderBy: defaultOrderBy,
			});

			// ensure Rows per page changes to 20
			await waitFor(() => {
				const rowsPerPageButton = screen.getByRole("button", {
					name: "Rows per page: " + String(itemsPerPage),
				});
				expect(rowsPerPageButton).toBeInTheDocument();
			});
		});

		it("sorting columns should trigger onDataLoad with new orderBy", async () => {
			const columns: ColDef[] = [
				{ field: "data", headerName: "Data" },
				{ field: "name", headerName: "Name" },
			];
			const rows: RowDef[] = [
				// 19 rows
				{ data: "row 1", name: "Name 3" },
				{ data: "row 2", name: "Name 2" },
				{ data: "row 3", name: "Name 1" },
			];

			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy={defaultOrderBy}
					onDataLoad={mockOnDataLoad}
					reloadCount={0}
				/>,
			);
			expect(mockOnDataLoad.mock.calls.length).toBe(1);
			expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			// click data column header to change sort order
			const dataHeader = screen.getByRole("button", {
				name: "Data sorted ascending",
			});
			expect(dataHeader).toBeInTheDocument();
			await user.click(dataHeader);
			expect(
				screen.getByRole("button", { name: "Data sorted descending" }),
			).toBeInTheDocument();

			expect(mockOnDataLoad.mock.calls.length).toBe(2);
			expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: `-${defaultOrderBy}`,
			});

			// click data column header again to change sort order
			await user.click(dataHeader);
			expect(
				screen.getByRole("button", { name: "Data sorted ascending" }),
			).toBeInTheDocument();

			expect(mockOnDataLoad.mock.calls.length).toBe(3);
			expect(mockOnDataLoad.mock.calls[2][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: defaultOrderBy,
			});

			// sort by name column instead
			const nameHeader = screen.getByRole("button", { name: "Name" });
			expect(nameHeader).toBeInTheDocument();
			await user.click(nameHeader);
			expect(
				screen.getByRole("button", { name: "Name sorted ascending" }),
			).toBeInTheDocument();

			expect(mockOnDataLoad.mock.calls.length).toBe(4);
			expect(mockOnDataLoad.mock.calls[3][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: "name",
			});

			// click name column header again to change sort order
			await user.click(nameHeader);
			expect(
				screen.getByRole("button", { name: "Name sorted descending" }),
			).toBeInTheDocument();

			expect(mockOnDataLoad.mock.calls.length).toBe(5);
			expect(mockOnDataLoad.mock.calls[4][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: "-name",
			});

			// click name column header again to change sort order
			await user.click(nameHeader);
			expect(
				screen.getByRole("button", { name: "Name sorted ascending" }),
			).toBeInTheDocument();

			expect(mockOnDataLoad.mock.calls.length).toBe(6);
			expect(mockOnDataLoad.mock.calls[5][0]).toStrictEqual({
				currentPage: 0,
				filters: {},
				itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				orderBy: "name",
			});
		});
	});

	describe("client-side data fetching", () => {
		it("when defaultOrder is set row data should be sorted", () => {
			render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data" // sort by this field
				/>,
			);

			// table sort column indicator
			expect(
				screen.getByRole("button", {
					name: /[A-Za-z]+ sorted ascending/i,
				}),
			).toBeInTheDocument();

			// ensure row data is sorted by defaultOrderBy param
			const table = screen.getByRole("table", { name: /results table/i });
			const tableRows = within(table).getAllByRole("checkbox");
			const sortedRows = rows.sort((a: any, b: any) => {
				return String(a.data).localeCompare(b.data);
			});
			tableRows.forEach((row, i) => {
				if (Array.isArray(sortedRows[i].data)) {
					within(row).getByRole("rowheader", {
						name: sortedRows[i].data.join(""),
					});
				} else {
					within(row).getByRole("rowheader", { name: sortedRows[i].data });
				}
			});
		});
	});

	describe("no default ordering", () => {
		describe("client-side data fetching", () => {
			it("when defaultOrder is not set row data should not be sorted", () => {
				render(<EnhancedTable columns={columns} rows={rows} id="data" />);

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				// ensure row data is in original, unsorted order
				const table = screen.getByRole("table", { name: /results table/i });
				const tableRows = within(table).getAllByRole("checkbox");
				tableRows.forEach((row, i) => {
					if (Array.isArray(rows[i].data)) {
						within(row).getByRole("rowheader", { name: rows[i].data.join("") });
					} else {
						within(row).getByRole("rowheader", { name: rows[i].data });
					}
				});
			});
		});

		describe("server-side data fetching", () => {
			const mockOnDataLoad = jest.fn();

			afterEach(() => {
				mockOnDataLoad.mockClear();
			});

			it("onDataLoad should not be called with orderBy", () => {
				render(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						reloadCount={0}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(1);
				expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();
			});

			it("filters should cause table to pass filters to data load callback without orderBy", () => {
				let filters = {
					data: {
						filter: "",
					},
				};
				const { rerender } = render(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						filters={filters}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(1);
				expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
					currentPage: 0,
					filters: filters,
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				filters = {
					data: {
						filter: "row",
					},
				};
				rerender(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						filters={filters}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(2);
				expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
					currentPage: 0,
					filters: filters,
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();
			});

			it("incrementing reloadCount should trigger onDataLoad without orderBy", () => {
				let reloadCount = 0;
				const { rerender } = render(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						reloadCount={reloadCount}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(1);
				expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				reloadCount += 1;
				rerender(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						reloadCount={reloadCount}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(2);
				expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				reloadCount += 1;
				rerender(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						reloadCount={reloadCount}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(3);
				expect(mockOnDataLoad.mock.calls[2][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();
			});

			it("paging should trigger onDataLoad with new page without orderBy", async () => {
				let currentPage = 0;
				const totalRows = rows.length;
				const { user } = render(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						totalRows={totalRows}
						reloadCount={0}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(1);
				expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
					currentPage: currentPage,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				// go to page 2
				const nextButton = screen.getByRole("button", { name: /next page/ });
				expect(nextButton).toBeInTheDocument();
				await user.click(nextButton);

				// look for 2nd page indicators
				// note: the dash here is not a minus sign, it's a different character
				// that looks almost identical, –
				await screen.findByText(`11–${totalRows} of ${totalRows}`);

				currentPage += 1;
				expect(mockOnDataLoad.mock.calls.length).toBe(2);
				expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
					currentPage: currentPage,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();
			});

			it("changing rows-per-page should trigger onDataLoad with new itemsPerPage and without orderBy", async () => {
				let itemsPerPage = AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT;
				const totalRows = rows.length;
				const { user } = render(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						totalRows={totalRows}
						reloadCount={0}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(1);
				expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: itemsPerPage,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				// switch from 10 items per page to 20
				const rowsPerPageButton = screen.getByRole("button", {
					name: "Rows per page: " + String(itemsPerPage),
				});
				expect(rowsPerPageButton).toBeInTheDocument();
				await user.click(rowsPerPageButton);

				await waitFor(() => {
					expect(
						screen.queryByRole("listbox", { name: /rows per page/i }),
					).toBeInTheDocument();
				});

				itemsPerPage = 20;
				const popup = screen.getByRole("listbox", { name: /rows per page/i });
				const items20 = within(popup).getByText(String(itemsPerPage));
				expect(items20).toBeInTheDocument();
				await user.click(items20);

				// ensure mock callback called again with 20 itemsPerPage
				expect(mockOnDataLoad.mock.calls.length).toBe(2);
				expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: itemsPerPage,
				});

				// ensure Rows per page changes to 20
				await waitFor(() => {
					const rowsPerPageButton = screen.getByRole("button", {
						name: "Rows per page: " + String(itemsPerPage),
					});
					expect(rowsPerPageButton).toBeInTheDocument();
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();
			});

			it("sorting columns should trigger onDataLoad with new orderBy", async () => {
				const columns: ColDef[] = [
					{ field: "data", headerName: "Data" },
					{ field: "name", headerName: "Name" },
				];
				const rows: RowDef[] = [
					// 19 rows
					{ data: "row 1", name: "Name 3" },
					{ data: "row 2", name: "Name 2" },
					{ data: "row 3", name: "Name 1" },
				];

				const { user } = render(
					<EnhancedTable
						columns={columns}
						rows={rows}
						id="data"
						onDataLoad={mockOnDataLoad}
						reloadCount={0}
					/>,
				);
				expect(mockOnDataLoad.mock.calls.length).toBe(1);
				expect(mockOnDataLoad.mock.calls[0][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
				});

				// no table sort column indicator
				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted ascending/i,
					}),
				).not.toBeInTheDocument();

				expect(
					screen.queryByRole("button", {
						name: /[A-Za-z]+ sorted descending/i,
					}),
				).not.toBeInTheDocument();

				// click data column header to change sort order
				const dataHeader = screen.getByRole("button", {
					name: "Data",
				});
				expect(dataHeader).toBeInTheDocument();
				await user.click(dataHeader);
				expect(
					screen.getByRole("button", { name: "Data sorted ascending" }),
				).toBeInTheDocument();

				expect(mockOnDataLoad.mock.calls.length).toBe(2);
				expect(mockOnDataLoad.mock.calls[1][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
					orderBy: "data",
				});

				// click data column header again to change sort order
				await user.click(dataHeader);
				expect(
					screen.getByRole("button", { name: "Data sorted descending" }),
				).toBeInTheDocument();

				expect(mockOnDataLoad.mock.calls.length).toBe(3);
				expect(mockOnDataLoad.mock.calls[2][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
					orderBy: "-data",
				});

				// sort by name column instead
				const nameHeader = screen.getByRole("button", { name: "Name" });
				expect(nameHeader).toBeInTheDocument();
				await user.click(nameHeader);
				expect(
					screen.getByRole("button", { name: "Name sorted ascending" }),
				).toBeInTheDocument();

				expect(mockOnDataLoad.mock.calls.length).toBe(4);
				expect(mockOnDataLoad.mock.calls[3][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
					orderBy: "name",
				});

				// click name column header again to change sort order
				await user.click(nameHeader);
				expect(
					screen.getByRole("button", { name: "Name sorted descending" }),
				).toBeInTheDocument();

				expect(mockOnDataLoad.mock.calls.length).toBe(5);
				expect(mockOnDataLoad.mock.calls[4][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
					orderBy: "-name",
				});

				// click name column header again to change sort order
				await user.click(nameHeader);
				expect(
					screen.getByRole("button", { name: "Name sorted ascending" }),
				).toBeInTheDocument();

				expect(mockOnDataLoad.mock.calls.length).toBe(6);
				expect(mockOnDataLoad.mock.calls[5][0]).toStrictEqual({
					currentPage: 0,
					filters: {},
					itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
					orderBy: "name",
				});
			});
		});
	});

	describe("tablemenu options", () => {
		it("calls exportFetch", async () => {
			const filters: FilterDef = {
				data: {
					filter: "row 1",
				},
			};
			const exportFile = "fileName";
			const exportFormats: ExportFormats[] = ["json"];
			const exportFetch = jest.fn().mockImplementation(() => {
				return new Promise((resolve) => resolve(rows));
			});

			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
					menuOptions={{
						exportFile: exportFile,
						exportFormats: exportFormats,
						exportFetch: exportFetch,
					}}
				/>,
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

			// wait for confirm dialog
			const dialog = await screen.findByRole("dialog", {
				name: /confirm download/i,
			});
			const ackButton = within(dialog).getByRole("button", {
				name: /i acknowledge/i,
			});
			await user.click(ackButton);

			expect(exportFetch).toHaveBeenCalledWith({
				currentPage: 0,
				filters: { data: { filter: "row 1" } },
				itemsPerPage: APP_TABLE_EXPORT_MAX,
				orderBy: "data",
			});
		});

		it("calls exportData", async () => {
			const filters: FilterDef = {
				data: {
					filter: "row 1",
				},
			};
			const exportFile = "fileName";
			const exportFormats: ExportFormats[] = ["json"];
			const exportData = jest.fn().mockImplementation(() => rows);
			const spy = jest
				.spyOn(formatters, "exportToJson")
				.mockImplementation((fileName, data) => {
					return true;
				});

			const { user } = render(
				<EnhancedTable
					columns={columns}
					rows={rows}
					id="data"
					defaultOrderBy="data"
					filters={filters}
					menuOptions={{
						exportFile: exportFile,
						exportFormats: exportFormats,
						exportData: exportData,
					}}
				/>,
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

			// wait for confirm dialog
			const dialog = await screen.findByRole("dialog", {
				name: /confirm download/i,
			});
			const ackButton = within(dialog).getByRole("button", {
				name: /i acknowledge/i,
			});
			await user.click(ackButton);

			expect(exportData).toHaveBeenCalled();
			// filtering and ordering applied to row data:
			// filtered by "row 1" (case insensitive) & orderby by data ("notrow" before "row")
			expect(spy).toHaveBeenCalledWith(exportFile, [
				{ data: "notarow 1" },
				{ data: "row 1" },
				{ data: "ROW 1" },
			]);
		});
	});
});
