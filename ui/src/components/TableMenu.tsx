import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	CircularProgress,
	IconButton,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Tooltip,
} from "@mui/material";
import {
	SaveAlt as SaveAltIcon,
	MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";

import { handleException } from "api/client";
import { STORAGE_LOCAL_EXPORT_ACKNOWLEDGE } from "app/globals";
import formatters, { ToCsvFormat } from "utils/formatters";
import { RowDef } from "./EnhancedTable";
import { RequestMeta } from "api/client";
import WelcomeDialog from "./WelcomeDialog";
import ExportDialogContent from "custom/ExportDialogContent";
import { addNotification } from "features/notifications/notificationsSlice";

export type ExportFormats = "csv" | "json";
export type FetchData = (meta?: RequestMeta) => Promise<RowDef[]>;

export interface TableMenuOptions {
	exportFile: string; // fileName prefix, a date stamp will also be added
	exportFormats: ExportFormats[]; // export formats to support
	exportFetch: FetchData; // async callback to fetch data
	toCsv?: ToCsvFormat; // format object fields for CSV
}

const TableMenu = (props: TableMenuOptions) => {
	const dispatch = useDispatch();
	const { i18n } = useLingui();
	const { exportFile, exportFormats, exportFetch, toCsv } = props;
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [creatingCsv, setCreatingCsv] = useState(false);
	const [creatingJson, setCreatingJson] = useState(false);
	const [skipDialog, setSkipDialog] = useState(false);
	const [dialogOpen, setDialogOpen] = useState<null | "csv" | "json">(null);
	const menuOpen = Boolean(anchorEl);

	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	const onDialogOk = (disable: boolean) => {
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, disable ? "1" : "0");
		switch (dialogOpen) {
			case "csv":
				handleCsvDownload();
				break;
			case "json":
				handleJsonDownload();
				break;
		}
		setDialogOpen(null);
		setSkipDialog(disable);
	};

	useEffect(() => {
		setSkipDialog(
			Boolean(Number(localStorage.getItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE))),
		);
	}, []);

	const handleCsvDownload = async () => {
		dispatch(addNotification(i18n._(t`Generating CSV File`), "info"));
		setCreatingCsv(true);
		try {
			const data = await exportFetch();
			if (data) {
				formatters.exportToCsv(exportFile, data, toCsv);
			}
		} catch (e) {
			handleException(e);
		} finally {
			setCreatingCsv(false);
		}
	};

	const handleJsonDownload = async () => {
		dispatch(addNotification(i18n._(t`Generating JSON File`), "info"));
		setCreatingJson(true);
		try {
			const data = await exportFetch();
			if (data) {
				formatters.exportToJson(exportFile, data);
			}
		} catch (e) {
			handleException(e);
		} finally {
			setCreatingJson(false);
		}
	};

	return (
		<>
			{exportFormats.length > 0 && (
				<>
					<WelcomeDialog
						open={Boolean(dialogOpen)}
						onOk={onDialogOk}
						onCancel={() => setDialogOpen(null)}
						title={i18n._(t`Confirm Download`)}
						okText={<Trans>I Acknowledge</Trans>}
					>
						<ExportDialogContent />
					</WelcomeDialog>
					<Tooltip title={i18n._(t`Table Options`)}>
						<IconButton
							id="table-menu-button"
							aria-label={
								menuOpen
									? i18n._(t`Close Table Menu`)
									: i18n._(t`Open Table Menu`)
							}
							aria-controls="table-menu"
							aria-haspopup="true"
							aria-expanded={menuOpen ? "true" : undefined}
							onClick={handleMenuClick}
						>
							<MoreHorizIcon fontSize="large" />
						</IconButton>
					</Tooltip>
					<Menu
						id="table-menu"
						anchorEl={anchorEl}
						transformOrigin={{
							horizontal: "center",
							vertical: "top",
						}}
						open={menuOpen}
						onClose={handleMenuClose}
						MenuListProps={{
							"aria-labelledby": "table-menu-button",
						}}
					>
						{exportFormats.includes("csv") && (
							<MenuItem
								onClick={() => {
									handleMenuClose();
									if (skipDialog) {
										handleCsvDownload();
									} else {
										setDialogOpen("csv");
									}
								}}
							>
								<ListItemIcon>
									{creatingCsv ? (
										<CircularProgress color="inherit" size={24} />
									) : (
										<SaveAltIcon fontSize="medium" />
									)}
								</ListItemIcon>
								<ListItemText>
									{creatingCsv ? (
										<Trans>Generating CSV File...</Trans>
									) : (
										<Trans>Download as CSV</Trans>
									)}
								</ListItemText>
							</MenuItem>
						)}
						{exportFormats.includes("json") && (
							<MenuItem
								onClick={() => {
									handleMenuClose();
									if (skipDialog) {
										handleJsonDownload();
									} else {
										setDialogOpen("json");
									}
								}}
							>
								<ListItemIcon>
									{creatingJson ? (
										<CircularProgress color="inherit" size={24} />
									) : (
										<SaveAltIcon fontSize="medium" />
									)}
								</ListItemIcon>
								<ListItemText>
									{creatingJson ? (
										<Trans>Generating JSON File...</Trans>
									) : (
										<Trans>Download as JSON</Trans>
									)}
								</ListItemText>
							</MenuItem>
						)}
					</Menu>
				</>
			)}
		</>
	);
};
export default TableMenu;
