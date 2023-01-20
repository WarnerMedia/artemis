import { AnyAction, EntityState } from "@reduxjs/toolkit";
import { RootState } from "app/rootReducer";
import { mockStoreNotification } from "../../../testData/testMockData";
import notifications, {
	// types
	Notification,
	// reducers
	addNotification,
	clearNotification,
	clearAllNotifications,
	// selectors
	selectAllNotifications,
	selectNotificationById,
	selectNotificationIds,
	selectTotalNotifications,
} from "./notificationsSlice";

describe("notifications reducers", () => {
	let state: EntityState<Notification> = {
		entities: {},
		ids: [],
	};
	let payload = null;
	let expectedResult: any = null;

	beforeEach(() => {
		expectedResult = null;
	});

	it("should handle initial state", () => {
		// created by createEntityAdapter so shape will include entities{} & ids[]
		expect(notifications(undefined, {} as AnyAction)).toEqual(state);
	});

	// check that an additional notification is added to the state each time
	it("addNotification should add a (default) error notification", () => {
		payload = {
			message: "Notification 1 Error",
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(state));
		expectedResult.entities[payload.message] = payload;
		expectedResult.ids.push(payload.message);
		state = notifications(state, {
			type: addNotification.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("addNotification should add a success notification type", () => {
		payload = {
			message: "Notification 2 Success",
			type: "success",
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(state));
		expectedResult.entities[payload.message] = payload;
		expectedResult.ids.push(payload.message);
		state = notifications(state, {
			type: addNotification.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("addNotification should add an info notification type", () => {
		payload = {
			message: "Notification 3 Info",
			type: "info",
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(state));
		expectedResult.entities[payload.message] = payload;
		expectedResult.ids.push(payload.message);
		state = notifications(state, {
			type: addNotification.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("addNotification should add a warning notification type", () => {
		payload = {
			message: "Notification 4 Warning",
			type: "warn",
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(state));
		expectedResult.entities[payload.message] = payload;
		expectedResult.ids.push(payload.message);
		state = notifications(state, {
			type: addNotification.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("clearNotification should remove a notification by message", () => {
		payload = {
			message: "Message to be purged",
			type: "warn",
		};
		const initialState = JSON.parse(JSON.stringify(state));
		initialState.entities[payload.message] = payload;
		initialState.ids.push(payload.message);

		state = notifications(state, {
			type: clearNotification.type,
			payload: payload,
		});
		expect(state).not.toEqual(initialState);
	});

	it("clearAllNotifications should remove all notifications", () => {
		state = notifications(state, {
			type: clearAllNotifications.type,
		});
		expectedResult = {
			entities: {},
			ids: [],
		};
		expect(state).toEqual(expectedResult);
	});
});

describe("notifications selectors", () => {
	const state: RootState = mockStoreNotification;

	it("selectAllNotifications should return all notifications", () => {
		// given full redux store state should only return all the notifications
		const selected = selectAllNotifications(state);
		expect(selected).toEqual(Object.values(state.notifications.entities));
	});

	it("selectNotificationById should return a notification by id", () => {
		// given full redux store state should only return notifications with id
		const selected = selectNotificationById(state, 3);
		expect(selected).toEqual(state.notifications.entities[3]);
	});

	it("selectNotificationIds should return all notification ids", () => {
		// given full redux store state should only return notifications ids
		const selected = selectNotificationIds(state);
		expect(selected).toEqual(state.notifications.ids);
	});

	it("selectTotalNotifications should return notification count", () => {
		// given full redux store state should only return notifications count
		const selected = selectTotalNotifications(state);
		expect(selected).toEqual(state.notifications.ids.length);
	});
});

describe("addNotification", () => {
	it("should generate unique notications", () => {
		const notification1 = addNotification("a");
		const notification2 = addNotification("b");

		expect(notification1.payload).toEqual({
			message: "a",
			type: "error",
		});

		expect(notification2.payload).toEqual({
			message: "b",
			type: "error",
		});
		// last payload should be different from the first
		expect(notification1.payload).not.toEqual(notification2.payload);
	});

	it("should throw an error on unknown notification type", () => {
		expect(() => {
			// ts-ignore to force this use-case in test since typescript won't
			// even allow this kind of funny business
			// @ts-ignore
			addNotification("Unknown Notification Type", "unknown");
		}).toThrow(/invalid notification/i);
	});
});
