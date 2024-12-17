import React, { useState } from "react";
import {
	Alert,
	AlertTitle,
	Box,
	IconButton,
	ListItem,
	ListItemIcon,
	ListItemText,
	Tooltip,
	Typography,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import {
	Help as HelpIcon,
	LooksOne as LooksOneIcon,
} from "@mui/icons-material";
import { useLingui } from "@lingui/react";
import { Trans, t } from "@lingui/macro";

import { RowDef } from "components/EnhancedTable";

const useStyles = makeStyles()((theme) => ({
	alertPopup: {
		position: "absolute", // floating over content
		zIndex: 100,
		width: "100%",
		"& > .MuiAlert-action": {
			alignItems: "flex-start",
		},
	},
	listItemText: {
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	resultsError: {
		color: theme.palette.error.main,
		borderColor: theme.palette.error.main,
		fill: theme.palette.error.main,
	},
}));

// REPLACE ME: SAMPLE COMPONENT FOR DISPLAYING RELATED application_metadata SCHEMA FIELDS
const ListItemMetaMultiField = (props: {
	data: RowDef | null;
	includeIcon?: boolean;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { data, includeIcon = false } = props;
	const [popoverOpen, setPopoverOpen] = useState(false);

	const metaData: React.ReactNode[] = [];
	let requirementsMet = false;
	let metaRequirements = 2;

	if (data) {
		// check field 1 exists
		if (data?.application_metadata?.sample_metadata?.field1) {
			metaData.push(
				<Tooltip
					describeChild
					title={data?.application_metadata?.sample_metadata?.field1}
					key="scan-samplemeta-field1"
				>
					<Box className={classes.listItemText}>
						{data?.application_metadata?.sample_metadata?.field1}
					</Box>
				</Tooltip>,
			);
			metaRequirements -= 1;
		} else {
			metaData.push(
				<Box className={classes.resultsError} key="scan-samplemeta-field1">
					<Trans>Meta Data Field1 Missing</Trans>
				</Box>,
			);
		}

		// check field2
		if (data?.application_metadata?.sample_metadata?.field2) {
			metaData.push(
				<Box className={classes.listItemText} key="scan-samplemeta-field2">
					<Box>{data?.application_metadata?.sample_metadata?.field2}</Box>
				</Box>,
			);
			metaRequirements -= 1;
		} else {
			metaData.push(
				<Box className={classes.resultsError} key="scan-samplemeta-field2">
					<Trans>Meta Data Field2 Missing</Trans>
				</Box>,
			);
		}
		requirementsMet = metaRequirements === 0;
	}

	const metaLabel = [
		<React.Fragment key="scan-samplemeta-label">
			<Trans>Meta Data Sample1 / Sample2</Trans>
		</React.Fragment>,
	];
	if (!requirementsMet) {
		metaLabel.push(
			<Box component="span" displayPrint="none" key="scan-metadata-help">
				<Tooltip title={i18n._(t`How do I provide this data?`)}>
					<span>
						<IconButton
							aria-label={i18n._(t`How do I provide this data?`)}
							onClick={() => setPopoverOpen(!popoverOpen)}
							size="small"
						>
							<HelpIcon color="error" />
						</IconButton>
					</span>
				</Tooltip>
				{popoverOpen && (
					<Alert
						severity="error"
						elevation={6}
						variant="filled"
						className={classes.alertPopup}
						onClose={() => setPopoverOpen(false)}
					>
						<AlertTitle>
							<Trans>Missing Metadata</Trans>
						</AlertTitle>
						<Box>
							<Typography variant="body2" gutterBottom paragraph={true}>
								<Trans>
									REPLACE ME: PROVIDE USER ASSISTANCE INFORMATION HERE.
								</Trans>
							</Typography>
						</Box>
					</Alert>
				)}
			</Box>,
		);
	}

	return (
		<ListItem key="scan-metadata-sample">
			{includeIcon && (
				<ListItemIcon>
					<LooksOneIcon
						className={cx(
							{},
							{
								[classes.resultsError]: !requirementsMet,
							},
						)}
					/>
				</ListItemIcon>
			)}
			<ListItemText
				classes={{ secondary: classes.listItemText }}
				primary={metaLabel}
				secondary={metaData}
			/>
		</ListItem>
	);
};
export default ListItemMetaMultiField;
