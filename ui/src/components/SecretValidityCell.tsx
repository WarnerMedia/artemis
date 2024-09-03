import { Chip, ChipProps, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";

import { colorHigh, colorLow, colorNegligible } from "app/colors";
import { SecretValidity } from "features/scans/scansSchemas";
import {
	DoDisturbOnOutlined,
	FilterNoneOutlined,
	ReportOutlined,
	WarningAmber,
} from "@mui/icons-material";

const useStyles = makeStyles()(() => ({
	chipActive: {
		color: "white",
		backgroundColor: colorHigh,
	},
	iconActive: {
		color: "white !important",
	},
	chipInactive: {
		color: "black",
		backgroundColor: colorNegligible,
	},
	iconInactive: {
		color: "black !important",
	},
	chipUnknown: {
		color: "black",
		backgroundColor: colorLow,
	},
	iconUnknown: {
		color: "black !important",
	},
	iconMixed: {
		color: "black !important"
	}
}));

export type SecretValidityChipProps = {
	readonly value?: string;
	readonly tooltipDisabled?: boolean;
};

type TooltipChipProps = ChipProps & {
	readonly tooltipDisabled?: boolean;
	readonly tooltipText?: string;
};

export const SecretValidityChip = (props: SecretValidityChipProps) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { value, tooltipDisabled } = props;

	if (value?.includes(",")) {
		return (
			<TooltipChip
				icon={<FilterNoneOutlined />}
				label={i18n._(t`Mixed`)}
				size="small"
				tooltipDisabled={tooltipDisabled}
				tooltipText={i18n._(
					t`This finding has multiple different validities reported`
				)}
			/>
		);
	}

	console.log(value)

	switch (value) {
		case SecretValidity.Active:
			return (
				<TooltipChip
					className={classes.chipActive}
					icon={<ReportOutlined className={classes.iconActive} />}
					label={i18n._(t`Active`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(
						t`This finding was tested and determined to be valid and active`
					)}
				/>
			);
		case SecretValidity.Inactive:
			return (
				<TooltipChip
					className={classes.chipInactive}
					icon={<DoDisturbOnOutlined className={classes.iconInactive} />}
					label={i18n._(t`Inactive`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(
						t`This finding was tested and determined to be inactive`
					)}
				/>
			);
		case SecretValidity.Unknown:
			return (
				<TooltipChip
					className={classes.chipUnknown}
					icon={<WarningAmber className={classes.iconUnknown} />}
					label={i18n._(t`Unknown`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(
						t`This finding could not be determined to be either active or inactive`
					)}
				/>
			);
		default:
			return (
				<TooltipChip
					variant="outlined"
					label={i18n._(t`Not tested`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(t`This finding was not tested for validity`)}
				/>
			);
	}
};

const TooltipChip = (props: TooltipChipProps) => {
	const { tooltipDisabled, tooltipText, ...chipProps } = props;

	if (tooltipDisabled || !tooltipText) {
		return <Chip {...chipProps} />;
	} else {
		return (
			<Tooltip describeChild title={tooltipText} enterDelay={500}>
				<Chip {...chipProps} />
			</Tooltip>
		);
	}
};
