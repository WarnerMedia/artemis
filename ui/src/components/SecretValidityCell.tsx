import { Chip, ChipProps, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";

import { colorHigh, colorLow, colorNegligible } from "app/colors";
import { SecretDetail, SecretValidity } from "features/scans/scansSchemas";
import {
	DoDisturbOnOutlined,
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
}));

export type SecretValidityChipProps = {
	readonly value?: string;
	readonly details?: ReadonlyArray<SecretDetail>;
	readonly tooltipDisabled?: boolean;
};

type TooltipChipProps = ChipProps & {
	readonly tooltipDisabled?: boolean;
	readonly tooltipText?: string;
};

export const SecretValidityChip = (props: SecretValidityChipProps) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { value, details, tooltipDisabled } = props;

	const activeIcon = <ReportOutlined className={classes.iconActive} />;
	const inactiveIcon = <DoDisturbOnOutlined className={classes.iconInactive} />;
	const unknownIcon = <WarningAmber className={classes.iconUnknown} />;

	if (
		details &&
		details.length > 1 &&
		!allValuesMatch(details, (item) => item.validity)
	) {
		return getMixedChip(details, tooltipDisabled);
	}

	switch (value) {
		case SecretValidity.Active:
			return (
				<TooltipChip
					className={classes.chipActive}
					icon={activeIcon}
					label={i18n._(t`Active`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(
						t`This finding was tested and determined to be valid and active`,
					)}
				/>
			);
		case SecretValidity.Inactive:
			return (
				<TooltipChip
					className={classes.chipInactive}
					icon={inactiveIcon}
					label={i18n._(t`Inactive`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(
						t`This finding was tested and determined to be inactive`,
					)}
				/>
			);
		case SecretValidity.Unknown:
			return (
				<TooltipChip
					className={classes.chipUnknown}
					icon={unknownIcon}
					label={i18n._(t`Unknown`)}
					size="small"
					tooltipDisabled={tooltipDisabled}
					tooltipText={i18n._(
						t`This finding could not be determined to be either active or inactive`,
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

	function getMixedChip(
		details: ReadonlyArray<SecretDetail>,
		tooltipDisabled: boolean | undefined,
	) {
		let chipStyle: string;
		let icon: JSX.Element;
		let validityText: string;

		const validity = getMixedValidity(details);

		if (validity === SecretValidity.Active) {
			chipStyle = classes.chipActive;
			icon = activeIcon;
			validityText = i18n._(t`Active`);
		} else if (validity === SecretValidity.Inactive) {
			chipStyle = classes.chipInactive;
			icon = inactiveIcon;
			validityText = i18n._(t`Inactive`);
		} else {
			// validity === SecretValidity.Unknown
			chipStyle = classes.chipUnknown;
			icon = unknownIcon;
			validityText = i18n._(t`Unknown`);
		}

		return (
			<TooltipChip
				className={chipStyle}
				icon={icon}
				label={`${validityText} (${i18n._(t`Mixed`)})`}
				size="small"
				tooltipDisabled={tooltipDisabled}
				tooltipText={`${i18n._(
					t`Multiple different validities reported`,
				)}: ${getDetailsSummary(details)}`}
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

function getMixedValidity(
	details: ReadonlyArray<SecretDetail>,
): SecretValidity {
	if (allValuesMatch(details, (item) => item.type)) {
		// If all services agree on the finding type, validity priority goes Active > Inactive >
		// Unknown, since we assume "Inactive" determinations were made with more information than
		// "Unknown" determinations
		if (details.some((item) => item.validity === SecretValidity.Active)) {
			return SecretValidity.Active;
		} else if (
			details.some((item) => item.validity === SecretValidity.Inactive)
		) {
			return SecretValidity.Inactive;
		} else {
			return SecretValidity.Unknown;
		}
	} else {
		// If services do not agree on the finding type, validity priority goes Active > Unknown >
		// Inactive, since it's possible the "Unknown" determination is for a finding type that
		// cannot be verified automatically
		if (details.some((item) => item.validity === SecretValidity.Active)) {
			return SecretValidity.Active;
		} else if (
			details.some((item) => item.validity === SecretValidity.Unknown)
		) {
			return SecretValidity.Unknown;
		} else if (
			details.some((item) => item.validity === SecretValidity.Inactive)
		) {
			return SecretValidity.Inactive;
		} else {
			// Unexpected validity was received, we'll just say it's unknown
			return SecretValidity.Unknown;
		}
	}
}

function allValuesMatch(
	details: ReadonlyArray<SecretDetail>,
	fn: (item: SecretDetail) => string,
): boolean {
	let first: string | undefined;

	for (const detail of details) {
		if (first === undefined) {
			first = fn(detail);
		} else {
			const curr = fn(detail);

			if (curr !== first) {
				return false;
			}
		}
	}

	return true;
}

function getDetailsSummary(details: ReadonlyArray<SecretDetail>): string {
	const activeTypes = getTypesOfValidity(details, SecretValidity.Active);
	const inactiveTypes = getTypesOfValidity(details, SecretValidity.Inactive);
	const unknownTypes = getTypesOfValidity(details, SecretValidity.Unknown);

	const result = [];

	if (activeTypes.length > 0) {
		result.push(`Active (${activeTypes.join(", ")})`);
	}

	if (inactiveTypes.length > 0) {
		result.push(`Inactive (${inactiveTypes.join(", ")})`);
	}

	if (unknownTypes.length > 0) {
		result.push(`Unknown (${unknownTypes.join(", ")})`);
	}

	return result.join(", ");
}

function getTypesOfValidity(
	details: ReadonlyArray<SecretDetail>,
	validity: SecretValidity,
): string[] {
	const filtered = details
		.filter((item) => item.validity === validity)
		.map((item) => item.type);

	return Array.from(new Set(filtered));
}
