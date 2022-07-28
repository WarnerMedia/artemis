import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
} from "@reduxjs/toolkit";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";

import { RootState } from "app/rootReducer";

// maps to MUI <Alert> severity types
type NotificationType = "error" | "info" | "success" | "warning";

export interface Notification {
	message: string;
	type: NotificationType;
}

// messages keyed by message so only 1 copy of each message (until dismissed)
// prevents repetition (stacking) of same message if same notification fired quickly
const notificationsAdapter = createEntityAdapter<Notification>({
	selectId: (notification) => notification.message,
});

const notificationsSlice = createSlice({
	name: "notifications",
	initialState: notificationsAdapter.getInitialState(),
	reducers: {
		addNotification: {
			reducer(state, action: PayloadAction<Notification>) {
				notificationsAdapter.upsertOne(state, action.payload);
			},
			prepare(message: string, type: NotificationType = "error") {
				if (["error", "info", "success", "warning"].includes(type)) {
					return {
						payload: {
							message,
							type,
						},
					};
				}
				throw new Error(i18n._(t`Invalid notification type`));
			},
		},
		clearNotification(state, action: PayloadAction<string>) {
			notificationsAdapter.removeOne(state, action.payload);
		},
		clearAllNotifications(state) {
			notificationsAdapter.removeAll(state);
		},
	},
});

export default notificationsSlice.reducer;
export const { addNotification, clearNotification, clearAllNotifications } =
	notificationsSlice.actions; // reducer actions

// selectors automatically created by using createEntityAdapter for CRUD operations on entities
export const {
	selectAll: selectAllNotifications,
	selectById: selectNotificationById,
	selectIds: selectNotificationIds,
	selectTotal: selectTotalNotifications,
} = notificationsAdapter.getSelectors(
	(state: RootState) => state.notifications
);
