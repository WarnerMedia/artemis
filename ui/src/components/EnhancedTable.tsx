import React, { useEffect, useState } from "react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	Box,
	Collapse,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableCellProps,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TableSortLabel,
	Tooltip,
} from "@mui/material";
import { Theme } from "@mui/material/styles";

import { makeStyles } from "tss-react/mui";
import { FilterList as FilterListIcon } from "@mui/icons-material";

import AppGlobals from "app/globals";
import { FilterDef, RequestMeta } from "api/client";
import TableMenu, { ExportFormats, FetchData } from "./TableMenu";
import { ToCsvFormat } from "utils/formatters";

export type Order = "asc" | "desc";

export interface OrderMap {
	[key: string]: number;
}

export interface ColDef {
	field: string; // field in the row data to display, required only for fields you want displayed in the table
	headerName?: string; // user-friendly name for the header cell (such as for i18n, capitalization, etc.)
	// header cell style, align
	style?: React.CSSProperties;
	align?: "left" | "right" | "inherit" | "center" | "justify";
	// body cell style, align
	bodyStyle?: React.CSSProperties;
	bodyAlign?: "left" | "right" | "inherit" | "center" | "justify";
	// children: if defined, this will be used to render the cell content instead of "field";
	// "field" will still be used for sorting. allows for visual customization
	// will be passed the full row obj as props: {row: RowDef}
	children?: any;
	// don't fire a row click event for the column cell
	// use if children include events (such as OnClick) to prevent also firing the row's click event
	// addresses an edge case when using multiple dialogs where disableBackdropClick doesn't
	// prevent propagation of the backdrop click event from Cell contents => row
	disableRowClick?: boolean;
	order?: Order;
	// object map of keys and their ordering to use for sorting when alpha/numeric doesn't suffice
	// e.g. sorting by vuln severities {critical: 0, high: 1, medium: 2, ...}
	// note that data to compare *must* be a string
	orderMap?: OrderMap;
	// whether this column is sortable (default = true)
	sortable?: boolean;
}

export interface RowDef {
	[field: string]: any; // string[] and objects won't be sorted
	// row data can go here that doesn't get displayed, such as for passing back to the parent in the onClick callback
	// just don't add the field(s) to the column defs
}

export type DataLoadCallback = (meta?: RequestMeta) => void;

// callback when a row is selected or unselected
// so caller can do something with the row data
// returns row data or null if row is unselected
export type EnhancedTableClickCallback = (row: RowDef | null) => void;

export type EnhancedTableCollapsibleOpen = (id: string | number) => boolean;

interface MenuOptions {
	exportFile: string; // fileName prefix, a date stamp will also be added
	exportFormats: ExportFormats[]; // export formats to support
	exportFetch?: FetchData; // async callback to fetch data or
	exportData?: () => RowDef[]; // function returning data to export
	toCsv?: ToCsvFormat; // format object fields for CSV
}

interface EnhancedTableProps {
	id?: string; // row field to use for unique key, defaults to keyId if unsupplied
	columns: ColDef[];
	rows: RowDef[];
	defaultOrder?: Order; // how all columns will be ordered initially unless overridden in ColDef.order, default: "asc"
	defaultOrderBy?: keyof RowDef; // field to default order by
	disableRowClick?: boolean; // completely disable row click, not just for an individual column
	onRowSelect?: EnhancedTableClickCallback;
	selectedRow?: RowDef | null; // set to null in parent to clear the selected row in the table
	showEmptyRows?: boolean; // whether to show empty/placeholder rows if rows displayed < rows per page
	collapsibleOpen?: EnhancedTableCollapsibleOpen; // whether to expand the collapsible row
	collapsibleRow?: any; // whether to add a collapsible row element under each table row
	collapsibleParentClassName?: string; // if parent row style should change when collapsibleRow is open
	filters?: FilterDef;
	onDataLoad?: DataLoadCallback; // callback for loading table data, such as when doing server-side filtering, sorting, or paging
	// to load server-side data data on component mount (via call to onDataLoad), either filters or reloadCount options must be defined
	totalRows?: number; // for server-side-fetched data, define total count of unpaged rows returned
	reloadCount?: number; // when managing data server-side, update this count to force a data reload, such as after an add/delete operation
	rowsPerPage?: number; // set default TablePagination rowsPerPage setting
	rowsPerPageOptions?: Array<number | { value: number; label: string }>; // set default TablePagination rowsPerPageOptions setting
	menuOptions?: MenuOptions;
}

function descendingCompare<T>(a: T, b: T) {
	let aVal: T | string = a;
	let bVal: T | string = b;

	// if either value is a string, force both vals to strings for comparison
	// allows for string comparison against null
	if (typeof a === "string" || typeof b === "string") {
		aVal = a === null ? "" : "" + a;
		bVal = b === null ? "" : "" + b;
		return bVal.localeCompare(aVal);
	}
	if (bVal < aVal) {
		return -1;
	}
	if (bVal > aVal) {
		return 1;
	}
	return 0;
}

function descendingComparator<T>(
	a: T,
	b: T,
	orderBy: keyof T,
	orderMap?: OrderMap
) {
	const aVal = a[orderBy];
	const bVal = b[orderBy];
	if (orderMap && typeof aVal === "string" && typeof bVal === "string") {
		// look-up this key in our map to determine its sort priority
		return descendingCompare(orderMap[aVal], orderMap[bVal]);
	}
	return descendingCompare(aVal, bVal);
}

function getComparator<Key extends keyof any>(
	order: Order,
	orderBy: Key,
	orderMap?: OrderMap
): (
	a: { [key in Key]: number | string },
	b: { [key in Key]: number | string }
) => number {
	return order === "desc"
		? (a, b) => descendingComparator(a, b, orderBy, orderMap)
		: (a, b) => -descendingComparator(a, b, orderBy, orderMap);
}

function stableSort<T>(
	array: T[],
	comparator: (a: T, b: T) => number,
	order: Order
) {
	const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
	stabilizedThis.sort((a, b) => {
		const sorted = comparator(a[0], b[0]);
		if (sorted !== 0) return sorted;

		// in the case when fields are identical, use a "tie-breaker" for sorting
		// so we get deterministic sorting results
		// need to account for sort order so asc results sort reverse of desc
		return order === "desc" ? -(a[1] - b[1]) : a[1] - b[1];
	});
	return stabilizedThis.map((el) => el[0]);
}

interface EnhancedTableHeadProps {
	classes: ReturnType<typeof useStyles>["classes"];
	onRequestSort: (
		event: React.MouseEvent<unknown>,
		property: keyof RowDef,
		column?: ColDef
	) => void;
	order: Order;
	orderBy: keyof RowDef | null;
	columns: ColDef[];
	filters?: FilterDef;
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
	const { i18n } = useLingui();
	const { classes, order, orderBy, columns, onRequestSort, filters } = props;
	const createSortHandler =
		(property: keyof RowDef, column: ColDef) =>
		(event: React.MouseEvent<unknown>) => {
			onRequestSort(event, property, column);
		};

	return (
		<TableHead>
			<TableRow>
				{columns.map((column: ColDef) => {
					const sortable = column?.sortable === false ? false : true;
					if (sortable) {
						return (
							<TableCell
								key={column.field}
								sortDirection={orderBy === column.field ? order : false}
								align={column.align ?? "left"}
								style={column.style ? column.style : {}}
							>
								<TableSortLabel
									active={orderBy === column.field}
									direction={orderBy === column.field ? order : "asc"}
									onClick={createSortHandler(column.field, column)}
								>
									{column.headerName}
									{filters &&
										column.field in filters &&
										filters[column.field].filter && (
											<Tooltip title={i18n._(t`This column is filtered`)}>
												<span className={classes.filterIcon}>
													<FilterListIcon />
												</span>
											</Tooltip>
										)}
									{orderBy === column.field ? (
										<span className={classes.visuallyHidden}>
											{order === "desc"
												? "sorted descending"
												: "sorted ascending"}
										</span>
									) : null}
								</TableSortLabel>
							</TableCell>
						);
					}
					return (
						<TableCell
							key={column.field}
							align={column.align ?? "left"}
							style={column.style ? column.style : {}}
						>
							{column.headerName}
							{filters &&
								column.field in filters &&
								filters[column.field].filter && (
									<span className={classes.tableSortLabel}>
										<Tooltip title={i18n._(t`This column is filtered`)}>
											<span className={classes.filterIcon}>
												<FilterListIcon />
											</span>
										</Tooltip>
									</span>
								)}
						</TableCell>
					);
				})}
			</TableRow>
		</TableHead>
	);
}

const useStyles = makeStyles()((theme: Theme) => ({
	filterIcon: {
		// match styles of TableSortLabel-icon
		color: theme.palette.text.secondary,
		fontSize: "18px",
		width: "1em",
		height: "1.4em",
		flexShrink: 0,
		marginLeft: "5px",
	},
	root: {
		width: "100%",
	},
	paper: {
		width: "100%",
		marginBottom: theme.spacing(2),
	},
	table: {
		minWidth: 750,
	},
	tableRow: {
		"&.MuiTableRow-hover:hover": {
			backgroundColor: "rgba(0, 159, 219, 0.10)",
		},
		// row selected (clicked)
		"&.Mui-selected, &.Mui-selected:hover": {
			backgroundColor: theme.palette.primary.main, // use primary color (blue) instead of secondary (pink)
			"& > .MuiTableCell-root": {
				color: "white",
			},
		},
	},
	tableSortLabel: {
		// match MuiTableSortLabel-root
		display: "inline-flex",
		alignItems: "center",
		flexDirection: "inherit",
		justifyContent: "flex-start",
		verticalAlign: "middle", // from button base
	},
	visuallyHidden: {
		border: 0,
		clip: "rect(0 0 0 0)",
		height: 1,
		margin: -1,
		overflow: "hidden",
		padding: 0,
		position: "absolute",
		top: 20,
		width: 1,
	},
}));

const EnhancedTable = (props: EnhancedTableProps) => {
	const { classes, cx } = useStyles();
	const {
		id = "keyId",
		columns,
		rows,
		defaultOrder,
		defaultOrderBy,
		disableRowClick = false,
		onRowSelect,
		selectedRow,
		showEmptyRows,
		collapsibleOpen,
		collapsibleRow,
		collapsibleParentClassName,
		filters,
		onDataLoad,
		totalRows,
		reloadCount,
		rowsPerPageOptions,
		menuOptions,
	} = props;
	let initialOrder: Order = defaultOrder ?? "asc";
	let defaultOrderMap = undefined;
	if (defaultOrderBy) {
		for (let i = 0; i < columns.length; i += 1) {
			if (columns[i].field === defaultOrderBy) {
				initialOrder = columns[i]?.order ?? "asc";
				defaultOrderMap = columns[i].orderMap;
				break;
			}
		}
	}
	const [orderBy, setOrderBy] = useState<keyof RowDef | null>(
		defaultOrderBy ?? null
	);
	const [order, setOrder] = useState<Order>(initialOrder);
	const [orderMap, setOrderMap] = useState<OrderMap | undefined>(
		defaultOrderMap
	);
	const [selected, setSelected] = useState<string[]>([]);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(
		props?.rowsPerPage ?? AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT
	);
	let filtered = false;

	// (re)load server-side data on reloadCount update
	useEffect(() => {
		if (onDataLoad && (reloadCount !== 0 || !filters)) {
			let currentPage = page;
			// if all items on a page are removed, goto previous page
			// unless already on page 1
			if (filteredRows.length === 0 && page > 0) {
				currentPage -= 1;
				setPage(currentPage);
			}
			if (reloadCount !== undefined) {
				const params: RequestMeta = {
					currentPage: currentPage,
					itemsPerPage: rowsPerPage,
					filters: filters ?? {},
				};
				if (orderBy) {
					params.orderBy =
						order === "desc" ? `-${String(orderBy)}` : String(orderBy);
				}
				onDataLoad(params);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reloadCount]);

	const handleRequestSort = (
		_event: React.MouseEvent<unknown>,
		property: keyof RowDef,
		column?: ColDef
	) => {
		// by default just flip ordering of column
		let newOrder: Order = order === "asc" ? "desc" : "asc";
		if (orderBy !== property) {
			// column to orderby has changed
			// order by a column's default if set or table default otherwise
			newOrder = column?.order ?? defaultOrder ?? "asc";
		}
		setOrder(newOrder);
		setOrderBy(property);
		setOrderMap(column?.orderMap);

		if (onDataLoad) {
			const params: RequestMeta = {
				currentPage: page,
				itemsPerPage: rowsPerPage,
				filters: filters ?? {},
			};
			if (property) {
				params.orderBy =
					newOrder === "desc" ? `-${String(property)}` : String(property);
			}
			onDataLoad(params);
		}
	};

	const isSelected = (name: string) => selected.indexOf(name) !== -1;

	const handleClick = (event: React.MouseEvent<unknown>, row: RowDef) => {
		event.stopPropagation();
		const unselected = isSelected(row[id]);
		setSelected(unselected ? [] : [row[id]]);
		if (onRowSelect) {
			// if row unselected, return null for selected row data
			onRowSelect(unselected ? null : row);
		}
	};

	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
		if (onDataLoad) {
			const params: RequestMeta = {
				currentPage: newPage,
				itemsPerPage: rowsPerPage,
				filters: filters ?? {},
			};
			if (orderBy) {
				params.orderBy =
					order === "desc" ? `-${String(orderBy)}` : String(orderBy);
			}
			onDataLoad(params);
		}
	};

	const handleChangeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const newRowsPerPage = parseInt(event.target.value, 10);
		setRowsPerPage(newRowsPerPage);
		setPage(0);
		if (onDataLoad) {
			const params: RequestMeta = {
				currentPage: 0,
				itemsPerPage: newRowsPerPage,
				filters: filters ?? {},
			};
			if (orderBy) {
				params.orderBy =
					order === "desc" ? `-${String(orderBy)}` : String(orderBy);
			}
			onDataLoad(params);
		}
	};

	const handleChangeFilters = (row: RowDef) => {
		// test each filter against each row's specified field value
		filtered = false;
		if (filters) {
			for (const [field, opts] of Object.entries(filters)) {
				if (opts.filter && field in row) {
					// convert number field values to strings
					filtered = true;
					let fieldVal =
						typeof row[field] === "number" ? String(row[field]) : row[field];
					// convert array field values to a joined string for comparison
					if (Array.isArray(row[field])) {
						fieldVal = (row[field] as unknown as string[]).join(", ");
					}
					if (typeof fieldVal === "string" && typeof opts.filter === "string") {
						const filterVal =
							opts?.match === "exact" || opts?.match === "contains"
								? opts.filter.trim()
								: opts.filter.trim().toLowerCase();
						fieldVal =
							opts?.match === "exact" || opts?.match === "contains"
								? fieldVal.trim()
								: fieldVal.trim().toLowerCase();
						// default to partial match
						if (
							(opts?.match === "exact" && fieldVal !== filterVal) ||
							!fieldVal.includes(filterVal)
						) {
							return false;
						}
					}
				}
			}
		}
		return true;
	};

	// if there isn't data to fill the rowsPerPage requested, fill rest of space with empty rows
	const emptyRows =
		rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage);

	const tableCells = (row: RowDef, columns: ColDef[], rowNum: number) => {
		const labelId = `enhanced-table-checkbox-${rowNum}`;
		const cells: React.ReactNode[] = [];

		columns.forEach((column: ColDef, index: number) => {
			// "" and 0 rowValues are valid
			if (column.field in row) {
				const rowValue = row[column.field];
				const cellKey = row[id] + "-" + column.field;
				let cellProps: TableCellProps = {};
				if (index === 0) {
					// first cell requires different props
					cellProps = { component: "th", id: labelId, scope: "row" };
				}
				if (column.disableRowClick) {
					cellProps.onClick = (event: React.SyntheticEvent) => {
						event.stopPropagation();
					};
				}
				if (column.bodyAlign) {
					cellProps.align = column.bodyAlign;
				}
				if (column.bodyStyle) {
					cellProps.style = column.bodyStyle;
				}
				if (column.children) {
					// TODO: if there is a large amount of data in a cell the entire row will grow vertically
					// to display all the data
					// consider instead constraining cell content and adding ellipsis and a tooltip

					// manually creating React element for rendering children instead of just calling component as function
					// this mitigates Error "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
					// if render function contains hooks
					const children = React.createElement(column.children, {
						row: row,
						value: rowValue,
					});
					cells.push(
						<TableCell key={cellKey} {...cellProps}>
							{children}
						</TableCell>
					);
				} else {
					cells.push(
						<TableCell key={cellKey} {...cellProps}>
							{rowValue}
						</TableCell>
					);
				}
			}
		});

		return cells;
	};

	// monitor if parent changed selectedRow so table can respond
	// with selection changes accordingly
	useEffect(() => {
		if (!selectedRow) {
			setSelected([]);
			if (onRowSelect) {
				onRowSelect(null);
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedRow]);

	let filteredRows: RowDef[] = [];
	let count = 0;
	if (onDataLoad) {
		filteredRows = rows;
		count = totalRows ?? 0;
	} else {
		if (orderBy) {
			filteredRows = stableSort(
				rows.filter(handleChangeFilters),
				getComparator(order, orderBy, orderMap),
				order
			);
		} else {
			filteredRows = [...rows.filter(handleChangeFilters)];
		}
		count = filteredRows.length;
		filteredRows = filteredRows.slice(
			page * rowsPerPage,
			page * rowsPerPage + rowsPerPage
		);
	}

	useEffect(() => {
		// if filters change, reset current page
		if (filters) {
			setPage(0);
			if (onDataLoad) {
				const params: RequestMeta = {
					currentPage: 0,
					itemsPerPage: rowsPerPage,
					filters: filters ?? {},
				};
				if (orderBy) {
					params.orderBy =
						order === "desc" ? `-${String(orderBy)}` : String(orderBy);
				}
				onDataLoad(params);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	useEffect(() => {
		// client-side paging:
		// if all items on a page are removed, goto previous page
		// unless already on page 1
		if (!onDataLoad && filteredRows.length === 0 && page > 0) {
			setPage((prevPage) => {
				return prevPage > 0 ? (prevPage -= 1) : prevPage;
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, filteredRows.length]);

	let exportFetch: FetchData = async () => Promise.resolve([]);
	if (menuOptions?.exportFetch) {
		exportFetch = async () => {
			const params: RequestMeta = {
				currentPage: 0,
				itemsPerPage: AppGlobals.APP_TABLE_EXPORT_MAX,
				filters: filters ?? {},
			};
			if (orderBy) {
				params.orderBy =
					order === "desc" ? `-${String(orderBy)}` : String(orderBy);
			}
			return menuOptions?.exportFetch
				? menuOptions.exportFetch(params)
				: Promise.resolve([]);
		};
	} else if (menuOptions?.exportData) {
		exportFetch = async () => {
			let r: RowDef[] = [];
			if (menuOptions.exportData) {
				const data = menuOptions.exportData();
				if (orderBy) {
					r = stableSort(
						data.filter(handleChangeFilters),
						getComparator(order, orderBy, orderMap),
						order
					);
				} else {
					r = [...data.filter(handleChangeFilters)];
				}
			}
			return Promise.resolve(r);
		};
	}

	return (
		<div className={classes.root}>
			<Paper className={classes.paper}>
				{menuOptions && (
					<Box display="flex" justifyContent="right">
						<TableMenu
							exportFile={menuOptions?.exportFile ?? "table_data"}
							exportFormats={menuOptions?.exportFormats ?? []}
							exportFetch={exportFetch}
							toCsv={menuOptions?.toCsv}
						/>
					</Box>
				)}
				<TableContainer>
					<Table
						className={classes.table}
						size="small"
						aria-label="results table"
					>
						<EnhancedTableHead
							classes={classes}
							order={order}
							orderBy={orderBy}
							onRequestSort={handleRequestSort}
							columns={columns}
							filters={filters}
						/>
						<TableBody>
							{filteredRows.map((row, rowNum) => {
								const isItemSelected = isSelected(row[id] as string);
								let collapsibleContent: React.ReactNode | null = null;
								if (collapsibleRow) {
									collapsibleContent = React.createElement(collapsibleRow, {
										row: row,
									});
								}

								return (
									<React.Fragment key={`wrapper-row-${row[id]}`}>
										<TableRow
											hover
											onClick={(event) => {
												if (!disableRowClick) {
													handleClick(event, row as RowDef);
												}
											}}
											role="checkbox"
											aria-checked={isItemSelected}
											tabIndex={-1}
											key={row[id]}
											selected={isItemSelected}
											className={cx(
												classes.tableRow,
												collapsibleOpen &&
													collapsibleOpen(row[id]) &&
													collapsibleParentClassName
											)}
										>
											{tableCells(row as RowDef, columns, rowNum)}
										</TableRow>

										{collapsibleContent && collapsibleOpen && (
											<TableRow
												style={{ padding: 0 }}
												key={`collapsible-row-${row[id]}`}
											>
												<TableCell
													colSpan={columns.length}
													style={{ padding: 0 }}
													key={`collapsible-cell-${row[id]}`}
												>
													<Collapse
														in={collapsibleOpen(row[id])}
														timeout="auto"
														unmountOnExit
													>
														{collapsibleContent}
													</Collapse>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})}
							{emptyRows > 0 && showEmptyRows && (
								<TableRow
									key="empty-row-spacer"
									style={{ height: 33 * emptyRows }}
								>
									<TableCell key="empty-cell-spacer" colSpan={6} />
								</TableRow>
							)}
						</TableBody>
					</Table>
					{filteredRows.length === 0 && filtered && (
						<Box marginTop={"2rem"} style={{ textAlign: "center" }}>
							<i>
								<Trans>No results match current filters</Trans>
							</i>
						</Box>
					)}
				</TableContainer>
				<TablePagination
					rowsPerPageOptions={
						rowsPerPageOptions ?? AppGlobals.APP_TABLE_ROWS_PER_PAGE_OPTIONS
					}
					component="div"
					count={count}
					rowsPerPage={rowsPerPage}
					page={page}
					onPageChange={handleChangePage}
					onRowsPerPageChange={handleChangeRowsPerPage}
				/>
			</Paper>
		</div>
	);
};
export default EnhancedTable;
