import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Snackbar } from "@mui/material";
import { Alert } from "@mui/material";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";

import { APP_NOTIFICATION_DELAY } from "app/globals";
import { AppDispatch } from "app/store";
import {
	clearNotification,
	clearAllNotifications,
	selectAllNotifications,
	selectTotalNotifications,
} from "features/notifications/notificationsSlice";

const notificationTrans = {
	error: t`error`,
	info: t`info`,
	success: t`success`,
	warning: t`warning`,
};

const Notifications = () => {
	const { i18n } = useLingui();
	const dispatch: AppDispatch = useDispatch();
	const notificationsTotal = useSelector(selectTotalNotifications);
	const allNotifications = useSelector(selectAllNotifications);
	const defaultHideDuration = APP_NOTIFICATION_DELAY; // delay before auto-closing all alerts
	const [autoHideDuration, setAutoHideDuration] = useState<number | null>(
		defaultHideDuration
	);

	// don't auto-close the snackbar if there are error|warning notifications
	// ensures user has time to digest alert messages and any remediative actions
	useEffect(() => {
		const isAutoClosable = () => {
			const foundIdx = allNotifications.findIndex((notification) => {
				if (
					notification?.type === "error" ||
					notification?.type === "warning"
				) {
					return true;
				}
				return false;
			});
			return foundIdx === -1;
		};

		setAutoHideDuration(isAutoClosable() ? defaultHideDuration : null);
	}, [allNotifications, defaultHideDuration]);

	const onDismissAllNotifications = (
		event: React.SyntheticEvent | Event,
		reason?: string
	) => {
		// note: by default, snackbars allow a user to click outside the snackbar (ie. "clickaway")
		// to dismiss the snackbar... however, this is not the behavior we want because the snackbar
		// can contain multiple notifications that need to be dismissed individually
		// so disable this behavior by ignoring clickaways
		if (reason === "clickaway") {
			return;
		}
		dispatch(clearAllNotifications());
	};

	const notifications = allNotifications.map((notification) => (
		// add an aria-label with the type of notification to the element
		// because otherwise, there is no indication whether this notification is for
		// success, error, info, or warning (besides CSS styling)
		// see: https://material-ui.com/components/alert/#accessibility
		<Alert
			aria-label={i18n._(notificationTrans[notification.type])}
			key={notification.message}
			elevation={6}
			variant="filled"
			onClose={() => {
				dispatch(clearNotification(notification.message));
			}}
			severity={notification.type}
		>
			{notification.message}
		</Alert>
	));

	// note below that {notifications} must be wrapped in an actual element
	// and not just React.Fragment, this is required for the transition or you
	// get a MUI exception: Grow.js:130 Uncaught TypeError: Cannot read property 'style' of null
	return (
		<Snackbar
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			open={!!notificationsTotal}
			onClose={onDismissAllNotifications}
			autoHideDuration={autoHideDuration}
		>
			<div>{notifications}</div>
		</Snackbar>
	);
};
export default Notifications;
