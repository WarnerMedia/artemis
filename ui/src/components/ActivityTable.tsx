import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	Assignment as AssignmentIcon,
	AssignmentLate as AssignmentLateIcon,
	AssignmentTurnedIn as AssignmentTurnedInIcon,
	Autorenew as AutorenewIcon,
	Check as CheckIcon,
	LowPriority as LowPriorityIcon,
	MoreVert as MoreVertIcon,
	OpenInNew as OpenInNewIcon,
	PlayCircleOutline as PlayCircleOutlineIcon,
	RuleFolder as RuleFolderIcon,
	Share as ShareIcon,
	TouchApp as TouchAppIcon,
	Verified as VerifiedIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	createTheme,
	DialogActions,
	DialogContent,
	FormControlLabel,
	IconButton,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
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
import queryString from "query-string";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { keyframes } from "tss-react";
import { makeStyles } from "tss-react/mui";
import * as Yup from "yup";

import { RequestMeta } from "api/client";
import AppGlobals, { APP_NOTIFICATION_DELAY } from "app/globals";
import { RootState } from "app/rootReducer";
import {
	configPlugins,
	sbomPlugins,
	secretPlugins,
	staticPlugins,
	techPlugins,
	vulnPlugins,
} from "app/scanPlugins";
import StatusCell from "components/StatusCell";
import { addNotification } from "features/notifications/notificationsSlice";
import {
	AnalysisReport,
	ScanFormLocationState,
	ScanOptionsForm,
} from "features/scans/scansSchemas";
import { selectAllScans, selectTotalScans } from "features/scans/scansSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";
import { startScan } from "pages/MainPage";
import CopyToClipboard from "react-copy-to-clipboard";
import { formatDate, ToCsvFormat } from "utils/formatters";
import DraggableDialog from "./DraggableDialog";
import TableMenu, { FetchData } from "./TableMenu";

const useStyles = makeStyles()(() => ({
	alertPopup: {
		position: "absolute", // floating over content
		zIndex: 100,
		"& > .MuiAlert-action": {
			alignItems: "flex-start",
		},
	},
	numberedList: {
		paddingLeft: 0,
		listStyle: "inside decimal",
	},
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
	exportFetch: FetchData; // async callback to fetch data
	data: ScanOptionsForm | null;
	toCsv: ToCsvFormat;
}

interface TableState {
	autoReload: boolean;
	showMyScans: boolean;
	includeBatch: boolean;
	currentPage: number;
	itemsPerPage: number;
}

const tableStateSchema: Yup.ObjectSchema<TableState> = Yup.object()
	.shape({
		autoReload: Yup.boolean().defined(),
		showMyScans: Yup.boolean().defined(),
		includeBatch: Yup.boolean().defined(),
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

interface ReportActionProps {
	row: AnalysisReport;
	onStartScanSelected: (row: AnalysisReport) => void;
	vcsOrg?: string | null;
	repo?: string | null;
}

const ReportAction = (props: ReportActionProps) => {
	const { row, onStartScanSelected, vcsOrg, repo } = props;
	const { classes } = useStyles();
	const dispatch = useDispatch();
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [isCopied, setCopied] = useState(false);
	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
	const menuOpen = Boolean(anchorEl);
	const resultsUrl = `results?org=${encodeURIComponent(
		vcsOrg || "",
	)}&repo=${encodeURIComponent(repo || "")}&id=${encodeURIComponent(
		row.scan_id,
	)}`;
	let ReportButton = <AssignmentIcon />;
	let tooltip = i18n._(t`View results`);
	let newTabTooltip = i18n._(t`View results in new tab`);
	let reportClass = classes.resultsLoading;

	// cancel any active setTimeout when component unmounted
	useEffect(() => {
		return function cleanup() {
			if (timeoutId) {
				clearTimeout(timeoutId);
				setTimeoutId(null);
			}
		};
	}, [timeoutId]);

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	if (row.success === true) {
		reportClass = classes.resultsPass;
		ReportButton = <AssignmentTurnedInIcon className={reportClass} />;
		tooltip = i18n._(t`View successful results`);
		newTabTooltip = i18n._(t`View successful results in new tab`);
	} else if (row.success === false) {
		reportClass = classes.resultsFail;
		ReportButton = <AssignmentLateIcon className={reportClass} />;
		tooltip = i18n._(t`View failed results`);
		newTabTooltip = i18n._(t`View failed results in new tab`);
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
					>
						{<OpenInNewIcon className={reportClass} />}
					</IconButton>
				</span>
			</Tooltip>
			<Tooltip title={i18n._(t`More Actions...`)}>
				<IconButton
					id="table-scan-actions-menu-button"
					aria-label={
						menuOpen
							? i18n._(t`Close More Actions Menu`)
							: i18n._(t`Open More Actions Menu`)
					}
					aria-controls="table-menu"
					aria-haspopup="true"
					aria-expanded={menuOpen ? "true" : undefined}
					onClick={handleMenuClick}
					size="small"
				>
					<MoreVertIcon />
				</IconButton>
			</Tooltip>
			<Menu
				id="table-scan-actions-menu"
				anchorEl={anchorEl}
				transformOrigin={{
					horizontal: "center",
					vertical: "top",
				}}
				open={menuOpen}
				onClose={handleMenuClose}
				MenuListProps={{
					"aria-labelledby": "table-scan-actions-menu-button",
				}}
			>
				<CopyToClipboard
					text={window.location.origin + "/" + resultsUrl}
					onCopy={() => {
						setCopied(true);
						setTimeoutId(
							setTimeout(() => {
								setTimeoutId(null);
								setCopied(false);
							}, APP_NOTIFICATION_DELAY),
						);
					}}
				>
					<MenuItem
						onClick={() => {
							dispatch(addNotification(i18n._(t`Copied to clipboard`), "info"));
							handleMenuClose();
						}}
					>
						<ListItemIcon>
							{isCopied ? (
								<CheckIcon fontSize="medium" />
							) : (
								<ShareIcon fontSize="medium" />
							)}
						</ListItemIcon>
						<ListItemText>
							<Trans>Copy link to these results</Trans>
						</ListItemText>
					</MenuItem>
				</CopyToClipboard>
				<MenuItem
					onClick={() => {
						handleMenuClose();
						onStartScanSelected(row);
					}}
				>
					<ListItemIcon>
						<PlayCircleOutlineIcon fontSize="medium" />
					</ListItemIcon>
					<ListItemText>
						<Trans>New scan with these options</Trans>
					</ListItemText>
				</MenuItem>
			</Menu>
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

const ActivityTable = (props: ActivityTableProps) => {
	const { onDataLoad, exportFetch, data, toCsv } = props;
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const navigate = useNavigate(); // only for navigation, e.g. replace(), push(), goBack()
	const location = useLocation(); // for location, since history.location is mutable
	const stateDefaults: TableState = {
		autoReload: true,
		showMyScans: false,
		includeBatch: false,
		currentPage: 0,
		itemsPerPage: AppGlobals.APP_TABLE_ROWS_PER_PAGE_DEFAULT,
	};
	const [autoReload, setAutoReload] = useState<boolean>(
		stateDefaults.autoReload,
	);
	const [showMyScans, setShowMyScans] = useState<boolean>(
		stateDefaults.showMyScans,
	);
	const [includeBatch, setIncludeBatch] = useState<boolean>(
		stateDefaults.includeBatch,
	);
	const [currentPage, setCurrentPage] = useState<number>(
		stateDefaults.currentPage,
	);
	const [itemsPerPage, setItemsPerPage] = useState<number>(
		stateDefaults.itemsPerPage,
	);
	const [scanToRestart, setScanToRestart] = useState<AnalysisReport | null>(
		null,
	);

	const scansStatus = useSelector((state: RootState) => state.scans.status);
	const itemCount = useSelector((state: RootState) => state.scans.totalRecords);
	const scansTotal = useSelector(selectTotalScans);
	const allScans = useSelector(selectAllScans);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self"),
	); // current user is "self" id

	// get any prior table state passed-in URL hash and validate matches schema
	// returns defaults if no hash params or validation fails
	const getHashParams = (): TableState => {
		if (location.hash) {
			const hash = queryString.parse(location.hash);
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
		window.location.hash = queryString.stringify({ ...state });
	};

	// generate table filters based on table options
	// such as "show only my scans" and "include batched scans" toggles
	const getFilters = (
		show: boolean = showMyScans,
		batch: boolean = includeBatch,
	) => {
		const filters: RequestMeta["filters"] = {};
		// check both currentUser & currenUser.email to make TypeScript happy in subsequent assignment
		// in theory, only currentUser?.email check should be required to ensure not undefined
		if (show && currentUser && currentUser?.email) {
			filters["initiated_by"] = {
				match: "exact",
				filter: currentUser.email,
			};
		}
		if (batch) {
			filters["include_batch"] = {
				match: "exact",
				filter: "true",
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
			setIncludeBatch(stateDefaults.includeBatch);
			setCurrentPage(stateDefaults.currentPage);
			setItemsPerPage(stateDefaults.itemsPerPage);
		} else if (scansStatus !== "loading") {
			// only load if not already loading
			const hashParams = getHashParams();
			setAutoReload(hashParams.autoReload);
			setShowMyScans(hashParams.showMyScans);
			setIncludeBatch(hashParams.includeBatch);
			setCurrentPage(hashParams.currentPage);
			setItemsPerPage(hashParams.itemsPerPage);

			// passing-in hash param values since state values are not updated immediately after setState()
			onDataLoad({
				currentPage: hashParams.currentPage,
				itemsPerPage: hashParams.itemsPerPage,
				filters: getFilters(hashParams.showMyScans, hashParams.includeBatch),
			});
		}

		// reload data only if form data changes, also needs to account for currentUser
		// getting loaded async to allow filtering by current user

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, currentUser]);

	const handleChangePage = (_event: unknown, newPage: number) => {
		setCurrentPage(newPage);
		setTableState({
			autoReload,
			showMyScans,
			includeBatch,
			currentPage: newPage,
			itemsPerPage,
		});
		onDataLoad({ currentPage: newPage, itemsPerPage, filters: getFilters() });
	};

	const handleChangeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const count = parseInt(event.target.value, 10);
		const page = 0; // reset page # since items per page changed
		setItemsPerPage(count);
		setCurrentPage(page);
		setTableState({
			autoReload,
			showMyScans,
			includeBatch,
			currentPage: page,
			itemsPerPage: count,
		});
		onDataLoad({
			currentPage: page,
			itemsPerPage: count,
			filters: getFilters(),
		});
	};

	const handleFilterChange = (show: boolean, batch: boolean) => {
		const page = 0; // reset page # since filtering will affect current page
		setShowMyScans(show);
		setIncludeBatch(batch);
		setCurrentPage(page);
		setTableState({
			autoReload,
			showMyScans: show,
			includeBatch: batch,
			currentPage: page,
			itemsPerPage,
		});
		onDataLoad({
			currentPage: page,
			itemsPerPage,
			filters: getFilters(show, batch),
		});
	};

	// create a new scan based on options from current scan
	const handleRescan = async (scan: AnalysisReport) =>
		startScan(
			navigate,
			{
				vcsOrg: data?.vcsOrg ?? null,
				repo: data?.repo ?? "",
				branch: scan.branch ?? "",
				secrets: scan.scan_options.categories?.includes("secret") ?? true,
				staticAnalysis:
					scan.scan_options.categories?.includes("static_analysis") ?? true,
				inventory: scan.scan_options.categories?.includes("inventory") ?? true,
				vulnerability:
					scan.scan_options.categories?.includes("vulnerability") ?? true,
				sbom: scan.scan_options.categories?.includes("sbom") ?? true,
				configuration:
					scan.scan_options.categories?.includes("configuration") ?? true,
				depth: scan.scan_options?.depth ?? "",
				includeDev: scan.scan_options?.include_dev ?? false,
				// removes any disabled plugins from new scan
				secretPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => secretPlugins.includes(p) || secretPlugins.includes(`-${p}`),
					),
				staticPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => staticPlugins.includes(p) || staticPlugins.includes(`-${p}`),
					),
				techPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => techPlugins.includes(p) || techPlugins.includes(`-${p}`),
					),
				vulnPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => vulnPlugins.includes(p) || vulnPlugins.includes(`-${p}`),
					),
				sbomPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => sbomPlugins.includes(p) || sbomPlugins.includes(`-${p}`),
					),
				configPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => configPlugins.includes(p) || configPlugins.includes(`-${p}`),
					),
				includePaths: scan.scan_options?.include_paths
					? scan.scan_options?.include_paths.join(", ")
					: "",
				excludePaths: scan.scan_options?.exclude_paths
					? scan.scan_options?.exclude_paths.join(", ")
					: "",
			},
			currentUser,
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
												includeBatch,
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
							<>
								<FormControlLabel
									control={
										<Switch
											checked={showMyScans}
											onChange={() => {
												handleFilterChange(!showMyScans, includeBatch);
											}}
											name="tableShowMyScans"
											color="primary"
											disabled={scansStatus === "loading"}
										/>
									}
									label={i18n._(t`Show only my scans`)}
								/>
								<FormControlLabel
									control={
										<Switch
											checked={includeBatch}
											onChange={() => {
												handleFilterChange(showMyScans, !includeBatch);
											}}
											name="tableIncludeBatch"
											color="primary"
											disabled={scansStatus === "loading"}
										/>
									}
									label={i18n._(t`Include batched scans`)}
								/>
							</>
						)}
						<Box display="flex" justifyContent="right">
							<TableMenu
								exportFile={
									data.submitContext === "scan" ? "scan_single" : "scan_history"
								}
								exportFormats={["csv", "json"]}
								exportFetch={() =>
									exportFetch({
										filters: getFilters(showMyScans, includeBatch),
									})
								}
								toCsv={toCsv}
							/>
						</Box>
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
								<DraggableDialog
									open={Boolean(scanToRestart)}
									title={i18n._(t`New Scan`)}
									maxWidth="md"
								>
									<DialogContent dividers={true}>
										<Trans>
											Start a new scan using the same options used in this scan?
											<br />
											Initiating a new scan will reload this page to display
											scan progress.
										</Trans>
									</DialogContent>

									<DialogActions>
										<Button
											aria-label={i18n._(t`Start Scan`)}
											size="small"
											variant="contained"
											startIcon={<PlayCircleOutlineIcon />}
											disabled={!scanToRestart || scansStatus === "loading"}
											autoFocus={Boolean(scanToRestart)}
											onClick={() => {
												if (scanToRestart) {
													handleRescan(scanToRestart);
												}
												setScanToRestart(null);
											}}
										>
											<Trans>Start Scan</Trans>
										</Button>

										<Button
											aria-label={i18n._(t`Cancel`)}
											size="small"
											onClick={() => {
												setScanToRestart(null);
											}}
										>
											<Trans>Cancel</Trans>
										</Button>
									</DialogActions>
								</DraggableDialog>

								<TableContainer component={Paper}>
									<Table aria-label={i18n._(t`Scans table`)} size="small">
										<TableHead>
											<TableRow>
												<TableCell>
													<Trans>Type</Trans>
												</TableCell>
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
															maxWidth: "5rem",
															width: "5rem",
														}}
													>
														<Tooltip
															title={
																row?.scan_options?.batch_priority
																	? row?.batch_description
																		? i18n._(
																				t`Batched Scan: ${row.batch_description}`,
																			)
																		: i18n._(t`Batched Scan`)
																	: i18n._(t`On-Demand Scan`)
															}
														>
															{row?.scan_options?.batch_priority ? (
																<LowPriorityIcon fontSize="small" />
															) : (
																<TouchAppIcon fontSize="small" />
															)}
														</Tooltip>
														{row?.qualified && (
															<Tooltip title={i18n._(t`Qualified Scan`)}>
																<VerifiedIcon fontSize="small" />
															</Tooltip>
														)}
														{((row?.scan_options?.include_paths &&
															row?.scan_options?.include_paths.length > 0) ||
															(row?.scan_options?.exclude_paths &&
																row?.scan_options?.exclude_paths.length >
																	0)) && (
															<Tooltip
																title={i18n._(
																	t`Include paths: ${
																		row?.scan_options?.include_paths.length > 0
																			? row?.scan_options?.include_paths.join(
																					", ",
																				)
																			: "None"
																	} ; Exclude paths: ${
																		row?.scan_options?.exclude_paths.length > 0
																			? row?.scan_options?.exclude_paths.join(
																					", ",
																				)
																			: "None"
																	}`,
																)}
															>
																<RuleFolderIcon fontSize="small" />
															</Tooltip>
														)}
													</TableCell>
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
															title={
																row.branch ? (
																	row.branch
																) : (
																	<i>
																		<Trans>Default</Trans>
																	</i>
																)
															}
														>
															<span>
																{row.branch ? (
																	row.branch
																) : (
																	<i>
																		<Trans>Default</Trans>
																	</i>
																)}
															</span>
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
															<ReportAction
																vcsOrg={data?.vcsOrg}
																repo={data?.repo}
																row={row}
																onStartScanSelected={(row: AnalysisReport) =>
																	setScanToRestart(row)
																}
															/>
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
