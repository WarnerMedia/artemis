import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import CopyToClipboard from "react-copy-to-clipboard";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { addNotification } from "features/notifications/notificationsSlice";
import { Box, IconButton, Tooltip } from "@mui/material";
import {
	AssignmentReturnedOutlined as AssignmentReturnedIcon,
	AssignmentTurnedInOutlined as AssignmentTurnedInIcon,
	Check as CheckIcon,
	Share as ShareIcon,
} from "@mui/icons-material";

import { APP_NOTIFICATION_DELAY } from "app/globals";

interface CustomCopyToClipboardProps {
	autoFocus?: boolean; // default: false
	className?: string;
	copyLabel?: string; // default: "Copy to clipboard"
	copyTarget: any;
	disabled?: boolean; // default: false
	icon?: "clipboard" | "share"; // default: clipboard
	size?: "small" | "medium" | "large"; // default: small
}

const CustomCopyToClipboard = (props: CustomCopyToClipboardProps) => {
	const { i18n } = useLingui();
	const dispatch = useDispatch();
	const [isCopied, setIsCopied] = useState(false);
	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
	const {
		autoFocus = false,
		copyTarget,
		size = "small",
		icon = "clipboard",
		copyLabel = i18n._(t`Copy to clipboard`),
		disabled = false,
		...buttonProps
	} = props;
	const copyText = useMemo(() => {
		if (typeof copyTarget === "string") return copyTarget;
		if (typeof copyTarget === "number") return copyTarget.toString();
		if (Array.isArray(copyTarget)) return copyTarget.join(", ");
		return JSON.stringify(copyTarget, null, 2);
	}, [copyTarget]);
	const [buttonUnclicked] = useState(
		icon === "share" ? (
			<ShareIcon fontSize={size} {...buttonProps} />
		) : (
			<AssignmentReturnedIcon fontSize={size} {...buttonProps} />
		),
	);
	const [buttonClicked] = useState(
		icon === "share" ? (
			<CheckIcon fontSize={size} {...buttonProps} />
		) : (
			<AssignmentTurnedInIcon fontSize={size} {...buttonProps} />
		),
	);

	// cancel any active setTimeout when component unmounted
	useEffect(() => {
		return function cleanup() {
			if (timeoutId) {
				clearTimeout(timeoutId);
				setTimeoutId(null);
			}
		};
	}, [timeoutId]);

	return (
		<Box component="span" displayPrint="none">
			<CopyToClipboard
				text={copyText}
				onCopy={() => {
					setIsCopied(true);
					setTimeoutId(
						setTimeout(() => {
							setTimeoutId(null);
							setIsCopied(false);
						}, APP_NOTIFICATION_DELAY),
					);
				}}
			>
				<Tooltip title={isCopied ? i18n._(t`Copied`) : copyLabel}>
					<span>
						<IconButton
							autoFocus={autoFocus}
							size={size === "large" ? "medium" : size}
							aria-label={isCopied ? i18n._(t`Copied`) : copyLabel}
							disabled={disabled}
							onClick={() =>
								dispatch(
									addNotification(i18n._(t`Copied to clipboard`), "info"),
								)
							}
						>
							{isCopied ? buttonClicked : buttonUnclicked}
						</IconButton>
					</span>
				</Tooltip>
			</CopyToClipboard>
		</Box>
	);
};

export default CustomCopyToClipboard;
