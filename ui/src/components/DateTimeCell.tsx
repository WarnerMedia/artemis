import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Tooltip } from "@mui/material";
import { ReportProblemOutlined as ReportProblemOutlinedIcon } from "@mui/icons-material";
import { makeStyles } from "tss-react/mui";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";

import { formatDate } from "utils/formatters";

const useStyles = makeStyles()((theme) => ({
	warningIcon: {
		fill: theme.palette.warning.main,
		marginLeft: theme.spacing(1),
		verticalAlign: "middle",
	},
}));

const DateTimeCell = (props: { value?: string; format?: "short" | "long" }) => {
	const { value, format = "short" } = props;

	let cell = <></>;
	if (value) {
		cell = (
			<>
				<Tooltip describeChild title={formatDate(value, "long")}>
					<span>{formatDate(value, format)}</span>
				</Tooltip>
			</>
		);
	}
	return cell;
};
export default DateTimeCell;

// DateTimeCell that will display an expiration indicator icon if date value is before current date
export const ExpiringDateTimeCell = (props: {
	value?: string;
	format?: "short" | "long";
}) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const { value, format = "short" } = props;
	const [isExpired, setIsExpired] = useState(false);

	useEffect(() => {
		if (value && typeof value === "string") {
			const expirationDate = DateTime.fromISO(value);
			if (expirationDate.isValid) {
				const diff = expirationDate.diffNow();
				if (diff.milliseconds < 0) {
					setIsExpired(true);
				} else {
					setIsExpired(false);
				}
			} else {
				setIsExpired(false); // 'Never' == not expired
			}
		}
	}, [value]);

	let cell = <></>;
	if (value) {
		cell = (
			<>
				<DateTimeCell value={value} format={format} />
				{isExpired && (
					<Tooltip title={i18n._(t`This item has expired`)}>
						<ReportProblemOutlinedIcon
							className={classes.warningIcon}
							aria-label={i18n._(t`This item has expired`)}
						/>
					</Tooltip>
				)}
			</>
		);
	}
	return cell;
};
