import { Chip } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";

import {
	colorPriority,
	colorCritical,
	colorHigh,
	colorLow,
	colorMedium,
	colorNegligible,
} from "app/colors";
import { Risks, Severities } from "features/scans/scansSchemas";

const useStyles = makeStyles()(() => ({
	chipPriority: {
		color: "white",
		backgroundColor: colorPriority,
	},
	chipCritical: {
		color: "white",
		backgroundColor: colorCritical,
	},
	chipHigh: {
		color: "white",
		backgroundColor: colorHigh,
	},
	chipMedium: {
		color: "white",
		backgroundColor: colorMedium,
	},
	chipLow: {
		color: "black",
		backgroundColor: colorLow,
	},
	chipNegligible: {
		color: "black",
		backgroundColor: colorNegligible,
	},
}));

export const RiskChip = (props: { value?: Risks; count?: number }) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { value, count } = props;

	let chip = <></>; // "" risk
	switch (value) {
		case "priority":
			chip = (
				<Chip
					className={classes.chipPriority}
					label={
						count !== undefined
							? i18n._(t`Priority: ${count}`)
							: i18n._(t`Priority`)
					}
					size="small"
				/>
			);
			break;
		case "critical":
			chip = (
				<Chip
					className={classes.chipCritical}
					label={
						count !== undefined
							? i18n._(t`Critical: ${count}`)
							: i18n._(t`Critical`)
					}
					size="small"
				/>
			);
			break;
		case "high":
			chip = (
				<Chip
					className={classes.chipHigh}
					label={
						count !== undefined ? i18n._(t`High: ${count}`) : i18n._(t`High`)
					}
					size="small"
				/>
			);
			break;
		case "moderate":
			chip = (
				<Chip
					className={classes.chipMedium}
					label={
						count !== undefined
							? i18n._(t`Moderate: ${count}`)
							: i18n._(t`Moderate`)
					}
					size="small"
				/>
			);
			break;
		case "low":
			chip = (
				<Chip
					className={classes.chipLow}
					label={
						count !== undefined ? i18n._(t`Low: ${count}`) : i18n._(t`Low`)
					}
					size="small"
				/>
			);
			break;
	}
	return chip;
};

export const SeverityChip = (props: { value?: Severities; count?: number }) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { value, count } = props;

	let chip = <></>; // "" severity
	switch (value) {
		case "critical":
			chip = (
				<Chip
					className={classes.chipCritical}
					label={
						count !== undefined
							? i18n._(t`Critical: ${count}`)
							: i18n._(t`Critical`)
					}
					size="small"
				/>
			);
			break;
		case "high":
			chip = (
				<Chip
					className={classes.chipHigh}
					label={
						count !== undefined ? i18n._(t`High: ${count}`) : i18n._(t`High`)
					}
					size="small"
				/>
			);
			break;
		case "medium":
			chip = (
				<Chip
					className={classes.chipMedium}
					label={
						count !== undefined
							? i18n._(t`Medium: ${count}`)
							: i18n._(t`Medium`)
					}
					size="small"
				/>
			);
			break;
		case "low":
			chip = (
				<Chip
					className={classes.chipLow}
					label={
						count !== undefined ? i18n._(t`Low: ${count}`) : i18n._(t`Low`)
					}
					size="small"
				/>
			);
			break;
		case "negligible":
			chip = (
				<Chip
					className={classes.chipNegligible}
					label={
						count !== undefined
							? i18n._(t`Negligible: ${count}`)
							: i18n._(t`Negligible`)
					}
					size="small"
				/>
			);
			break;
	}
	return chip;
};
