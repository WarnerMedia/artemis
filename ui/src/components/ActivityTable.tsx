import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
	Box,
	createTheme,
	FormControlLabel,
	IconButton,
	Paper,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Theme,
	ThemeProvider,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	Assignment as AssignmentIcon,
	AssignmentLate as AssignmentLateIcon,
	AssignmentTurnedIn as AssignmentTurnedInIcon,
	Autorenew as AutorenewIcon,
	OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { keyframes } from "tss-react";
import { makeStyles } from "tss-react/mui";
import { useLingui } from "@lingui/react";
import { Trans, t } from "@lingui/macro";
import * as Yup from "yup";
import * as QueryString from "query-string";

import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import { formatDate } from "utils/formatters";
import AppGlobals from "app/globals";
import { RootState } from "app/rootReducer";
import { selectAllScans, selectTotalScans } from "features/scans/scansSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";
import {
	AnalysisReport,
	ScanFormLocationState,
	ScanOptionsForm,
} from "features/scans/scansSchemas";
import StatusCell from "components/StatusCell";
import { RequestMeta } from "api/client";

const useStyles = makeStyles()(() => ({
	refreshSpin: {
		animation: `${keyframes`
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
		`} 1.4s linear infinite`,
	},
	resultsFail: {
		fill: "#ffcccc", // grey-red
	},
	resultsLoading: {},
	resultsPass: {
		fill: "#d0f0c0", // grey-green
	},
}));

export type ActivityDataLoadCallback = (meta?: RequestMeta) => void;

interface ActivityTableProps {
	onDataLoad: ActivityDataLoadCallback;
	data: ScanOptionsForm | null;
}

interface TableState {
	autoReload: boolean;
	showMyScans: boolean;
	currentPage: number;
	itemsPerPage: number;
}

const tableStateSchema: Yup.SchemaOf<TableState> = Yup.object()
	.shape({
		autoReload: Yup.boolean().defined(),
		showMyScans: Yup.boolean().defined(),
		currentPage: Yup.number()
			.defined()
			.min(0)
			.integer()
			.transform(function (value, originalvalue) {
				// default value "" casts as NaN, so instead cast to undefined
				return originalvalue === "" ? undefined : value;
			}),
		itemsPerPage: Yup.number()
			.defined()
			.positive()
			.integer()
			.oneOf(AppGlobals.APP_TABLE_ROWS_PER_PAGE_OPTIONS)
			.transform(function (value, originalvalue) {
				// default value "" casts as NaN, so instead cast to undefined
				return originalvalue === "" ? undefined : value;
			}),
	})
	.defined();

const ActivityTable = (props: ActivityTableProps) => {
	const { onDataLoad, data } = props;
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const navigate = useNavigate(); // only for navigation, e.g. replace(), push(), goBack()
	const location = useLocation(); // for location, since history.location is mutable
	const stateDefaults: TableState = {
		autoReload: true,
		showMyScans: false,
		currentPage: 0,
		itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
	};
	const [autoReload, setAutoReload] = useState<boolean>(
		stateDefaults.autoReload
	);
	const [showMyScans, setShowMyScans] = useState<boolean>(
		stateDefaults.showMyScans
	);
	const [currentPage, setCurrentPage] = useState<number>(
		stateDefaults.currentPage
	);
	const [itemsPerPage, setItemsPerPage] = useState<number>(
		stateDefaults.itemsPerPage
	);

	const scansStatus = useSelector((state: RootState) => state.scans.status);
	const itemCount = useSelector((state: RootState) => state.scans.totalRecords);
	const scansTotal = useSelector(selectTotalScans);
	const allScans = useSelector(selectAllScans);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	); // current user is "self" id

	// get any prior table state passed-in URL hash and validate matches schema
	// returns defaults if no hash params or validation fails
	const getHashParams = (): TableState => {
		if (location.hash) {
			const hash = QueryString.parse(location.hash);
			if (Object.keys(hash)) {
				try {
					// schema validation will also transform hash params to their correct types
					const validValues = tableStateSchema.validateSync(hash, {
						strict: false, // setting to false will trim fields on validate
					});
					return { ...stateDefaults, ...validValues };
				} catch (err) {
					return stateDefaults;
				}
			}
		}
		return stateDefaults;
	};

	// update URL hash with new table state
	const setTableState = (state: TableState) => {
		// this needs to be window here and not history to preserve the hash on navigation
		window.location.hash = QueryString.stringify({ ...state });
	};

	// generate table filters based on table options
	// such as "show on my scans" toggle
	const getFilters = (show: boolean = showMyScans) => {
		let filters: RequestMeta["filters"] = {};
		// check both currentUser & currenUser.email to make TypeScript happy in subsequent assignment
		// in theory, only currentUser?.email check should be required to ensure not undefined
		if (show && currentUser && currentUser?.email) {
			filters["initiated_by"] = {
				match: "exact",
				filter: currentUser.email,
			};
		}
		return filters;
	};

	// on initial page load
	// auto-reload table data
	useEffect(() => {
		// ensure component is still mounted when component state is updated
		// otherwise you'll get the exception:
		// "Can't perform a React state update on an unmounted component"
		// this is especially prone to occur in component testing
		let isMounted = true;
		let interval: NodeJS.Timeout | null = setInterval(() => {
			// refresh as long as there are incomplete scans and auto-reload is enabled
			if (
				isMounted &&
				scansTotal &&
				itemCount === 1 &&
				autoReload &&
				// only reload if any scan is in a non-terminal state
				allScans.some((scan) => {
					return (
						scan.status === "queued" ||
						scan.status === "processing" ||
						scan.status.startsWith("running ") // running plugin ...
					);
				})
			) {
				onDataLoad({ currentPage, itemsPerPage, filters: getFilters() });
			}
		}, AppGlobals.APP_RELOAD_INTERVAL);

		return () => {
			isMounted = false;
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		scansTotal,
		autoReload,
		AppGlobals.APP_RELOAD_INTERVAL,
		allScans,
		currentPage,
		itemsPerPage,
		onDataLoad,
		itemCount,
	]);

	// reload table if data prop changes
	useEffect(() => {
		if (!data) {
			// form data has been reset, reset table state
			setAutoReload(stateDefaults.autoReload);
			setShowMyScans(stateDefaults.showMyScans);
			setCurrentPage(stateDefaults.currentPage);
			setItemsPerPage(stateDefaults.itemsPerPage);
		} else if (scansStatus !== "loading") {
			// only load if not already loading
			const hashParams = getHashParams();
			setAutoReload(hashParams.autoReload);
			setShowMyScans(hashParams.showMyScans);
			setCurrentPage(hashParams.currentPage);
			setItemsPerPage(hashParams.itemsPerPage);

			// passing-in hash param values since state values are not updated immediately after setState()
			onDataLoad({
				currentPage: hashParams.currentPage,
				itemsPerPage: hashParams.itemsPerPage,
				filters: getFilters(hashParams.showMyScans),
			});
		}

		// reload data only if form data changes, also needs to account for currentUser
		// getting loaded async to allow filtering by current user

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, currentUser]);

	const handleChangePage = (event: unknown, newPage: number) => {
		setCurrentPage(newPage);
		setTableState({
			autoReload,
			showMyScans,
			currentPage: newPage,
			itemsPerPage,
		});
		onDataLoad({ currentPage: newPage, itemsPerPage, filters: getFilters() });
	};

	const handleChangeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const count = parseInt(event.target.value, 10);
		const page = 0; // reset page # since items per page changed
		setItemsPerPage(count);
		setCurrentPage(page);
		setTableState({
			autoReload,
			showMyScans,
			currentPage: page,
			itemsPerPage: count,
		});
		onDataLoad({
			currentPage: page,
			itemsPerPage: count,
			filters: getFilters(),
		});
	};

	const handleFilterChange = (show: boolean) => {
		const page = 0; // reset page # since filtering will affect current page
		setShowMyScans(show);
		setCurrentPage(page);
		setTableState({
			autoReload,
			showMyScans: show,
			currentPage: page,
			itemsPerPage,
		});
		onDataLoad({ currentPage: page, itemsPerPage, filters: getFilters(show) });
	};

	interface ReportActionProps {
		row: AnalysisReport;
	}

	const ReportAction = (props: ReportActionProps) => {
		const { row } = props;
		const resultsUrl = `results?org=${encodeURIComponent(
			data?.vcsOrg || ""
		)}&repo=${encodeURIComponent(data?.repo || "")}&id=${encodeURIComponent(
			row.scan_id
		)}`;
		const resultsUnavailable =
			!("success" in row) || typeof row.success !== "boolean";
		let ReportButton = <AssignmentIcon />;
		let tooltip = i18n._(t`Fetching report status...`);
		let newTabTooltip = tooltip;
		let shareTooltip = tooltip;
		let reportClass = classes.resultsLoading;

		if (row.success === true) {
			reportClass = classes.resultsPass;
			ReportButton = <AssignmentTurnedInIcon className={reportClass} />;
			tooltip = i18n._(t`View successful report`);
			newTabTooltip = i18n._(t`View successful report in new tab`);
			shareTooltip = i18n._(t`Copy link to this report`);
		} else if (row.success === false) {
			reportClass = classes.resultsFail;
			ReportButton = <AssignmentLateIcon className={reportClass} />;
			tooltip = i18n._(t`View failed report`);
			newTabTooltip = i18n._(t`View failed report in new tab`);
			shareTooltip = i18n._(t`Copy link to this report`);
		}

		return (
			<>
				<Tooltip title={tooltip}>
					<span>
						<IconButton
							size="small"
							aria-label={tooltip}
							onClick={() => {
								navigate(resultsUrl, {
									state: { fromScanForm: true } as ScanFormLocationState,
								});
							}}
							disabled={resultsUnavailable}
						>
							{ReportButton}
						</IconButton>
					</span>
				</Tooltip>
				<Tooltip title={newTabTooltip}>
					<span>
						<IconButton
							size="small"
							aria-label={newTabTooltip}
							href={resultsUrl}
							target="_blank"
							disabled={resultsUnavailable}
						>
							{<OpenInNewIcon className={reportClass} />}
						</IconButton>
					</span>
				</Tooltip>
				<CustomCopyToClipboard
					icon="share"
					size="small"
					copyTarget={window.location.origin + "/" + resultsUrl}
					className={reportClass}
					copyLabel={shareTooltip}
					disabled={resultsUnavailable}
				/>
			</>
		);
	};

	const NoResults = () => (
		<Box marginTop={2}>
			<Typography align="center" style={{ fontStyle: "italic" }}>
				<Trans>No matching scans to display</Trans>
			</Typography>
		</Box>
	);

	return (
		<div>
			{data ? (
				<>
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
						}}
					>
						<Tooltip
							title={
								scansStatus === "loading"
									? i18n._(t`Refreshing...`)
									: i18n._(t`Refresh now`)
							}
						>
							<span>
								<IconButton
									className={
										scansStatus === "loading" ? classes.refreshSpin : ""
									}
									disabled={scansStatus === "loading"}
									aria-label={
										scansStatus === "loading"
											? i18n._(t`Refreshing...`)
											: i18n._(t`Refresh now`)
									}
									onClick={() => {
										// note: complete scan history reloaded (getScanHistory)
										// instead of just updating existing scan items status (getScanById)
										// in case new scan items are added we need to display
										onDataLoad({
											currentPage,
											itemsPerPage,
											filters: getFilters(),
										});
									}}
									onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
										event.preventDefault();
									}}
									size="large"
								>
									<AutorenewIcon />
								</IconButton>
							</span>
						</Tooltip>

						{data.submitContext === "scan" ? (
							<FormControlLabel
								control={
									<Switch
										checked={autoReload}
										onChange={() => {
											setAutoReload(!autoReload);
											setTableState({
												autoReload: !autoReload,
												showMyScans,
												currentPage,
												itemsPerPage,
											});
										}}
										name="autoReload"
										color="primary"
									/>
								}
								label={i18n._(t`Auto Refresh`)}
							/>
						) : (
							<FormControlLabel
								control={
									<Switch
										checked={showMyScans}
										onChange={() => {
											handleFilterChange(!showMyScans);
										}}
										name="tableShowMyScans"
										color="primary"
										disabled={scansStatus === "loading"}
									/>
								}
								label={i18n._(t`Show only my scans`)}
							/>
						)}
					</div>

					{scansTotal > 0 ? (
						<>
							<ThemeProvider
								theme={(theme: Theme) =>
									createTheme({
										...theme,
										components: {
											...theme.components,
											MuiTableCell: {
												styleOverrides: {
													sizeSmall: {
														// adjust table cell padding so actions column items don't wrap
														padding: theme.spacing(1),
													},
												},
											},
										},
									})
								}
							>
								<TableContainer component={Paper}>
									<Table aria-label={i18n._(t`Scans table`)} size="small">
										<TableHead>
											<TableRow>
												<TableCell>
													<Trans>Branch</Trans>
												</TableCell>
												<TableCell>
													<Trans>Start</Trans>
												</TableCell>
												<TableCell>
													<Trans>End</Trans>
												</TableCell>
												<TableCell
													style={{ justifyContent: "center" }}
													align="center"
												>
													<Trans>Status</Trans>
												</TableCell>
												<TableCell>
													<Trans>Actions</Trans>
												</TableCell>
											</TableRow>
										</TableHead>

										<TableBody>
											{allScans.map((row) => (
												<TableRow key={row.scan_id}>
													<TableCell
														style={{
															textOverflow: "ellipsis",
															overflow: "hidden",
															whiteSpace: "nowrap",
															maxWidth: "8rem",
															width: "8rem",
														}}
													>
														<Tooltip
															describeChild
															title={row.branch ? row.branch : ""}
														>
															<span>{row.branch}</span>
														</Tooltip>
													</TableCell>
													<TableCell
														style={{
															maxWidth: "14rem",
															width: "14rem",
														}}
													>
														<Tooltip
															describeChild
															title={formatDate(row.timestamps.start, "long")}
														>
															<span>{formatDate(row.timestamps.start)}</span>
														</Tooltip>
													</TableCell>
													<TableCell
														style={{
															maxWidth: "14rem",
															width: "14rem",
														}}
													>
														<Tooltip
															describeChild
															title={formatDate(row.timestamps.end, "long")}
														>
															<span>{formatDate(row.timestamps.end)}</span>
														</Tooltip>
													</TableCell>
													<TableCell>
														<StatusCell row={row}></StatusCell>
													</TableCell>
													<TableCell
														component="th"
														scope="row"
														style={{
															maxWidth: "8rem",
															width: "8rem",
														}}
													>
														{row.status !== "queued" && (
															<ReportAction row={row} />
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</ThemeProvider>

							<TablePagination
								component="div"
								count={itemCount}
								rowsPerPage={itemsPerPage}
								rowsPerPageOptions={AppGlobals.APP_TABLE_ROWS_PER_PAGE_OPTIONS}
								page={currentPage}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
							/>
						</>
					) : (
						<NoResults />
					)}
				</>
			) : (
				<NoResults />
			)}
		</div>
	);
};
export default ActivityTable;
