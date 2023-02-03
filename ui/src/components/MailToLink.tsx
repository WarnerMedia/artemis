import { Button, IconButton, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { Email as EmailIcon } from "@mui/icons-material";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { APP_EMAIL_AUTHOR } from "app/globals";
import { DELETED_REGEX } from "utils/formatters";

interface MailToLinkProps {
	recipient?: string;
	subject?: string;
	body?: string;
	text: string;
	tooltip?: boolean;
	iconButton?: boolean;
	disabled?: boolean;
}

const useStyles = makeStyles()(() => ({
	emailButton: {
		textTransform: "none", // don't uppercase text in button
		padding: "0 5px",
	},
}));

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation
const EMAIL_REGEX = new RegExp(
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
);

const MailToLink = (props: MailToLinkProps) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const { subject, body, text, tooltip, iconButton, disabled = false } = props;
	let { recipient } = props;
	let elt = <>{text}</>;
	let tooltipTitle = text;

	if (!recipient) {
		recipient = APP_EMAIL_AUTHOR;
	}
	// recipient isn't an email address
	// return the text description without an email link
	if (!EMAIL_REGEX.test(recipient)) {
		if (DELETED_REGEX.test(text)) {
			// reformat internal deleted user names
			// from <name>_DELETED_<timestamp> => <name> (Deleted)
			const user = text.replace(DELETED_REGEX, "");
			tooltipTitle = i18n._(t`${user} (Deleted)`);

			elt = (
				<>
					<i>
						<Trans>{user} (Deleted)</Trans>
					</i>
				</>
			);
		}

		if (tooltip) {
			return (
				<Tooltip describeChild title={tooltipTitle}>
					<span>{elt}</span>
				</Tooltip>
			);
		}
		return elt;
	}
	let href = "mailto:" + encodeURI(recipient);
	if (subject || body) {
		href += "?";
	}
	if (subject) {
		href += "subject=" + encodeURIComponent(subject);
		if (body) {
			href += "&";
		}
	}
	if (body) {
		href += "body=" + encodeURIComponent(body);
	}

	if (iconButton) {
		elt = (
			<span>
				<IconButton
					aria-label={text}
					className={classes.emailButton}
					href={href}
					target="_blank"
					rel="noopener noreferrer nofollow"
					size="small"
					disabled={disabled}
				>
					<EmailIcon fontSize="small" />
				</IconButton>
			</span>
		);
	} else {
		elt = (
			<span>
				<Button
					className={classes.emailButton}
					startIcon={<EmailIcon />}
					href={href}
					target="_blank"
					rel="noopener noreferrer nofollow"
					size="small"
					disabled={disabled}
				>
					{text}
				</Button>
			</span>
		);
	}
	if (tooltip) {
		return (
			<Tooltip describeChild title={tooltipTitle}>
				<span>{elt}</span>
			</Tooltip>
		);
	}
	return elt;
};
export default MailToLink;
