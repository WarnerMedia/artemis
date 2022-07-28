import { useState } from "react";
import {
	Box,
	Chip,
	IconButton,
	LinearProgress,
	Tooltip,
	Typography,
} from "@mui/material";
import { Alert, AlertTitle } from "@mui/material";
import {
	BugReport as BugReportIcon,
	Cancel as CancelIcon,
	Error as ErrorIcon,
	HourglassFull as HourglassFullIcon,
	Info as InfoIcon,
	Layers as LayersIcon,
	Security as SecurityIcon,
	VpnKey as VpnKeyIcon,
	WatchLater as WatchLaterIcon,
} from "@mui/icons-material";
import { Theme } from "@mui/material/styles";
import { makeStyles, withStyles } from "tss-react/mui";
import { Plural, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { t, plural } from "@lingui/macro";
import { DateTime } from "luxon";

import {
	colorCritical,
	colorHigh,
	colorMedium,
	colorImages,
	colorTech,
} from "app/colors";
import { AnalysisReport, ScanErrors } from "features/scans/scansSchemas";

const useStyles = makeStyles()(() => ({
	cellContent: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		flexWrap: "wrap",
	},
	alertPopup: {
		position: "absolute", // floating over content
		zIndex: 100,
		"& > .MuiAlert-action": {
			alignItems: "flex-start",
		},
	},
	// style all chips as links since they will all link to results tab
	chipCritical: {
		minWidth: "2em", // add some default space for loading display when results aren't displayed in chip
		color: "white",
		backgroundColor: colorCritical,
		borderRadius: "10px 0px 0px 10px", // rounded left top-and-bottom corners
		cursor: "pointer",
	},
	chipHigh: {
		minWidth: "2em",
		color: "white",
		backgroundColor: colorHigh,
		borderRadius: "0px 0px 0px 0px", // all corners square
		cursor: "pointer",
	},
	chipMedium: {
		minWidth: "2em",
		color: "white",
		backgroundColor: colorMedium,
		borderRadius: "0px 10px 10px 0px", // rounded right top-and-bottom corners
		cursor: "pointer",
	},
	chipSecrets: {
		minWidth: "2em",
		color: "white",
		backgroundColor: colorCritical,
		cursor: "pointer",
	},
	chipTech: {
		minWidth: "2em",
		color: "white",
		backgroundColor: colorTech,
		borderRadius: "10px 0px 0px 10px", // rounded left top-and-bottom corners
		cursor: "pointer",
	},
	chipImages: {
		minWidth: "2em",
		color: "black",
		backgroundColor: colorImages,
		borderRadius: "0px 10px 10px 0px", // rounded right top-and-bottom corners
		cursor: "pointer",
	},
}));

// make the individual scan progress bars a little thicker
// to differentiate from other LinearProgress bars (like used for whole data table)
const BorderLinearProgress = withStyles(LinearProgress, (theme: Theme) => ({
	root: {
		height: 10,
		borderRadius: 5,
		marginBottom: theme.spacing(1),
	},
	// progress bar background grey instead of darkblue
	colorPrimary: {
		backgroundColor:
			theme.palette.grey[theme.palette.mode === "light" ? 200 : 700],
	},
	bar: {
		borderRadius: 5,
		background: theme.custom?.gradient,
	},
}));

const alertPopupContent = (errors: ScanErrors) => {
	let elts = [];
	for (const [key, value] of Object.entries(errors)) {
		elts.push(<Typography key={key}>{value}</Typography>);
	}
	return elts;
};

interface StatusCellProps {
	row: AnalysisReport;
}

const StatusCell = (props: StatusCellProps) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const [popoverOpen, setPopoverOpen] = useState(false);
	const row = props.row;

	const openResults = (tab: number) => {
		const resultsUrl = `results?service=${encodeURIComponent(
			row?.service || ""
		)}&repo=${encodeURIComponent(row?.repo || "")}&id=${encodeURIComponent(
			row.scan_id
		)}&tab=${tab}`;
		window.open(resultsUrl, "_blank");
	};

	switch (row.status) {
		case "queued":
			let ago = 0;
			// calculate minutes ago scan was queued
			if (row.timestamps.queued) {
				const queued = DateTime.fromISO(row.timestamps.queued);
				const now = DateTime.local();
				const dur = now.diff(queued, ["minutes"]);
				ago = Math.floor(dur.minutes);
			}
			return (
				<Box className={classes.cellContent}>
					<Box component="span">
						<IconButton aria-hidden="true" disabled={true} size="large">
							<WatchLaterIcon />
						</IconButton>
					</Box>
					<Box component="span">
						{ago ? (
							<Plural
								value={ago}
								one="Queued # minute ago"
								other="Queued # minutes ago"
							/>
						) : (
							<Trans>Queued</Trans>
						)}
					</Box>
				</Box>
			);
		case "completed":
			// try to determine ahead of results_summary fetch what results will be displayed
			// so we can display a preview while loading
			const hasVulnResults =
				row.scan_options.categories?.includes("vulnerability") ||
				row?.results_summary?.vulnerabilities;
			const hasAnalysisResults =
				row.scan_options.categories?.includes("static_analysis") ||
				row?.results_summary?.static_analysis;
			const hasSecretResults =
				row.scan_options.categories?.includes("secret") ||
				typeof row?.results_summary?.secrets === "number";
			const hasInventoryResults =
				row.scan_options.categories?.includes("inventory") ||
				row?.results_summary?.inventory;

			// if any results_summary section is null then some subset of plugins ran
			let info = undefined;
			if (
				row?.results_summary?.vulnerabilities === null ||
				row?.results_summary?.static_analysis === null ||
				row?.results_summary?.secrets === null ||
				row?.results_summary?.inventory === null
			) {
				info = {
					plugins: i18n._(
						t`This scan ran with a subset of plugins. View scan results for additional details`
					),
				};
			}

			return (
				<Box className={classes.cellContent}>
					{hasVulnResults && (
						<Chip
							style={{ marginRight: "5px" }}
							icon={<SecurityIcon />}
							onClick={() => openResults(1)}
							label={
								row.results_summary ? (
									<>
										<Tooltip
											describeChild
											id="tooltip-critical-vulns"
											arrow={true}
											title={plural(
												row?.results_summary?.vulnerabilities?.critical || 0,
												{
													one: "# Critical vulnerability",
													other: "# Critical vulnerabilities",
												}
											)}
										>
											<Chip
												label={
													row?.results_summary?.vulnerabilities?.critical || 0
												}
												size="small"
												className={classes.chipCritical}
												aria-describedby="tooltip-critical-vulns"
											/>
										</Tooltip>
										<Tooltip
											describeChild
											id="tooltip-high-vulns"
											arrow={true}
											title={plural(
												row?.results_summary?.vulnerabilities?.high || 0,
												{
													one: "# High vulnerability",
													other: "# High vulnerabilities",
												}
											)}
										>
											<Chip
												label={row?.results_summary?.vulnerabilities?.high || 0}
												size="small"
												className={classes.chipHigh}
												aria-describedby="tooltip-high-vulns"
											/>
										</Tooltip>
										<Tooltip
											describeChild
											id="tooltip-medium-vulns"
											arrow={true}
											title={plural(
												row?.results_summary?.vulnerabilities?.medium || 0,
												{
													one: "# Medium vulnerability",
													other: "# Medium vulnerabilities",
												}
											)}
										>
											<Chip
												label={
													row?.results_summary?.vulnerabilities?.medium || 0
												}
												size="small"
												className={classes.chipMedium}
												aria-describedby="tooltip-medium-vulns"
											/>
										</Tooltip>
									</>
								) : (
									<Tooltip
										id="tooltip-vulns-loading"
										arrow={true}
										title={i18n._(t`Fetching vulnerability results...`)}
									>
										<span>
											<Chip
												size="small"
												className={classes.chipCritical}
												disabled={true}
											/>
											<Chip
												size="small"
												className={classes.chipHigh}
												disabled={true}
											/>
											<Chip
												size="small"
												className={classes.chipMedium}
												disabled={true}
											/>
										</span>
									</Tooltip>
								)
							}
						/>
					)}
					{hasAnalysisResults && (
						<Chip
							style={{ marginRight: "5px" }}
							icon={<BugReportIcon />}
							onClick={() => openResults(2)}
							label={
								row.results_summary ? (
									<>
										<Tooltip
											describeChild
											id="tooltip-critical-analysis"
											arrow={true}
											title={plural(
												row?.results_summary?.static_analysis?.critical || 0,
												{
													one: "# Critical static analysis result",
													other: "# Critical static analysis result",
												}
											)}
										>
											<Chip
												label={
													row?.results_summary?.static_analysis?.critical || 0
												}
												size="small"
												className={classes.chipCritical}
												aria-describedby="tooltip-critical-analysis"
											/>
										</Tooltip>
										<Tooltip
											describeChild
											id="tooltip-high-analysis"
											arrow={true}
											title={plural(
												row?.results_summary?.static_analysis?.high || 0,
												{
													one: "# High static analysis result",
													other: "# High static analysis result",
												}
											)}
										>
											<Chip
												label={row?.results_summary?.static_analysis?.high || 0}
												size="small"
												className={classes.chipHigh}
												aria-describedby="tooltip-high-analysis"
											/>
										</Tooltip>
										<Tooltip
											describeChild
											id="tooltip-medium-analysis"
											arrow={true}
											title={plural(
												row?.results_summary?.static_analysis?.medium || 0,
												{
													one: "# Medium static analysis result",
													other: "# Medium static analysis results",
												}
											)}
										>
											<Chip
												label={
													row?.results_summary?.static_analysis?.medium || 0
												}
												size="small"
												className={classes.chipMedium}
												aria-describedby="tooltip-medium-analysis"
											/>
										</Tooltip>
									</>
								) : (
									<Tooltip
										id="tooltip-analysis-loading"
										arrow={true}
										title={i18n._(t`Fetching static analysis results...`)}
									>
										<span>
											<Chip
												size="small"
												className={classes.chipCritical}
												disabled={true}
											/>
											<Chip
												size="small"
												className={classes.chipHigh}
												disabled={true}
											/>
											<Chip
												size="small"
												className={classes.chipMedium}
												disabled={true}
											/>
										</span>
									</Tooltip>
								)
							}
						/>
					)}
					{hasSecretResults && (
						<Chip
							style={{ marginRight: "5px" }}
							icon={<VpnKeyIcon />}
							onClick={() => openResults(3)}
							label={
								row.results_summary ? (
									<>
										<Tooltip
											describeChild
											id="tooltip-secrets-count"
											arrow={true}
											title={plural(row?.results_summary?.secrets || 0, {
												one: "# Secret detected",
												other: "# Secrets detected",
											})}
										>
											<Chip
												label={row?.results_summary?.secrets || 0}
												size="small"
												className={classes.chipSecrets}
												aria-describedby="tooltip-secrets-count"
											/>
										</Tooltip>
									</>
								) : (
									<Tooltip
										id="tooltip-secrets-loading"
										arrow={true}
										title={i18n._(t`Fetching secrets results...`)}
									>
										<span>
											<Chip
												size="small"
												className={classes.chipSecrets}
												disabled={true}
											/>
										</span>
									</Tooltip>
								)
							}
						/>
					)}
					{hasInventoryResults && (
						<Chip
							style={{ marginRight: "5px" }}
							icon={<LayersIcon />}
							onClick={() => openResults(4)}
							label={
								row.results_summary ? (
									<>
										<Tooltip
											describeChild
											id="tooltip-technology-count"
											arrow={true}
											title={plural(
												row?.results_summary?.inventory?.technology_discovery ||
													0,
												{
													one: "# Technology",
													other: "# Technologies",
												}
											)}
										>
											<Chip
												label={
													row?.results_summary?.inventory
														?.technology_discovery || 0
												}
												size="small"
												className={classes.chipTech}
												aria-describedby="tooltip-technology-count"
											/>
										</Tooltip>
										<Tooltip
											describeChild
											id="tooltip-base-image-count"
											arrow={true}
											title={plural(
												row?.results_summary?.inventory?.base_images || 0,
												{
													one: "# Base image",
													other: "# Base images",
												}
											)}
										>
											<Chip
												label={
													row?.results_summary?.inventory?.base_images || 0
												}
												size="small"
												className={classes.chipImages}
												aria-describedby="tooltip-base-image-count"
											/>
										</Tooltip>
									</>
								) : (
									<Tooltip
										id="tooltip-inventory-loading"
										arrow={true}
										title={i18n._(t`Fetching inventory results...`)}
									>
										<span>
											<Chip
												size="small"
												className={classes.chipTech}
												disabled={true}
											/>
											<Chip
												size="small"
												className={classes.chipImages}
												disabled={true}
											/>
										</span>
									</Tooltip>
								)
							}
						/>
					)}

					{info && (
						<Box component="span">
							{popoverOpen && (
								<Alert
									severity="info"
									elevation={6}
									variant="filled"
									className={classes.alertPopup}
									onClose={() => setPopoverOpen(false)}
								>
									<AlertTitle>
										<Trans>Info</Trans>
									</AlertTitle>
									{alertPopupContent(info)}
								</Alert>
							)}
							<Box component="span">
								<Tooltip title={i18n._(t`View info`)}>
									<span>
										<IconButton
											aria-label={i18n._(t`View info`)}
											onClick={() => setPopoverOpen(!popoverOpen)}
											disabled={!info}
											size="small"
										>
											<InfoIcon color="primary" />
										</IconButton>
									</span>
								</Tooltip>
							</Box>
						</Box>
					)}
				</Box>
			);
		case "error":
		case "failed":
		case "terminated":
			let errors = row.errors ? { ...row.errors } : row.errors;
			if (errors && Object.keys(errors).length === 0) {
				errors = undefined;
			}

			let status = <Trans>Failed</Trans>;
			if (row.status === "terminated") {
				status = <Trans>Terminated</Trans>;
			} else if (row.status === "error") {
				status = <Trans>Error</Trans>;
			}

			return (
				<Box className={classes.cellContent}>
					{popoverOpen && errors && (
						<Alert
							severity="error"
							elevation={6}
							variant="filled"
							className={classes.alertPopup}
							onClose={() => setPopoverOpen(false)}
						>
							<AlertTitle>
								<Trans>Errors</Trans>
							</AlertTitle>
							{alertPopupContent(errors)}
						</Alert>
					)}
					<Box component="span">
						<Tooltip title={errors ? i18n._(t`View errors`) : ""}>
							<span>
								<IconButton
									aria-label={errors ? i18n._(t`View errors`) : ""}
									onClick={() => setPopoverOpen(true)}
									disabled={!errors}
									size="large"
								>
									{row.status === "terminated" ? (
										<CancelIcon color="error" />
									) : (
										<ErrorIcon color="error" />
									)}
								</IconButton>
							</span>
						</Tooltip>
					</Box>
					<Box component="span">{status}</Box>
				</Box>
			);
		case "processing":
			return (
				<Box className={classes.cellContent}>
					<Box component="span">
						<IconButton aria-hidden="true" disabled={true} size="large">
							<HourglassFullIcon />
						</IconButton>
					</Box>
					<Box component="span">
						<Trans>Initializing</Trans>
					</Box>
				</Box>
			);
		default:
			// processing/running plugin <plugin>
			const current = row.status_detail.current_plugin || 1;
			const total = row.status_detail.total_plugins || 1;
			// add 1 to total plugin count so that when final plugin is running
			// progress % won't show 100% prematurely
			const progress = (current / (total + 1)) * 100;

			return (
				<Box className={classes.cellContent}>
					<BorderLinearProgress
						variant="determinate"
						value={progress}
						style={{ width: "100%" }}
					/>
					<Trans>
						Running plugin {current} of {total}: {row.status_detail.plugin_name}
					</Trans>
				</Box>
			);
	}
};
export default StatusCell;
