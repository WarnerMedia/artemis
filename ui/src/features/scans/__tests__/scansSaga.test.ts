import { takeLatest, call, put, takeEvery } from "redux-saga/effects";
import { addScan, getCurrentScan } from "features/scans/scansSlice";
import { addNotification } from "features/notifications/notificationsSlice";
import {
	watchAddScanSaga,
	watchGetCurrentScan,
	exportsForTesting,
} from "features/scans/scansSaga";
import client, { handleException } from "api/client";
import { ScanOptionsForm } from "features/scans/scansSchemas";

// ensure sagas are executing correct steps

// TODO: consider wrapping different saga effects in describe() and each expect test in it()

test("test _addScan Saga success effects", () => {
	const scan: ScanOptionsForm = {
		vcsOrg: "vcs/org",
		repo: "repo",
	};
	// test the generator function
	const gen = exportsForTesting._addScanSaga({
		payload: scan,
		type: addScan.pending.type,
	});

	expect(gen.next().value).toEqual(call(client.addScan, { data: scan }));
	expect(gen.next().value).toEqual(put({ type: addScan.fulfilled.type }));
	// each call to addNotification creates a notification with an ascending id
	// so set id to 0 on 2nd addNotification call so results match
	const notification1 = gen.next().value;
	const notification2 = put(addNotification("Scan started", "success"));

	expect(notification1).toEqual(notification2);
	expect(gen.next()).toEqual({ done: true, value: undefined });
});

test("test _addScan Saga failure effects", () => {
	const scan: ScanOptionsForm = {
		vcsOrg: "vcs/org",
		repo: "repo",
	};
	const gen = exportsForTesting._addScanSaga({
		payload: scan,
		type: addScan.pending.type,
	});

	expect(gen.next().value).toEqual(call(client.addScan, { data: scan }));
	// use generator's throw() method to test failure case (catch)
	const error = {};
	expect(gen.throw(error).value).toEqual(put({ type: addScan.rejected.type }));
	expect(gen.next().value).toEqual(call(handleException, error));
	expect(gen.next()).toEqual({ done: true, value: undefined });
});

test("test _getCurrentScan Saga success effects", () => {
	const actionPayload = {};
	const gen = exportsForTesting._getCurrentScanSaga({
		payload: actionPayload,
		type: "_getCurrentScan",
	});
	expect(gen.next().value).toEqual(call(client.getCurrentScan, actionPayload));
	expect(gen.next().value).toEqual(
		put({ type: getCurrentScan.fulfilled.type })
	);
	expect(gen.next()).toEqual({ done: true, value: undefined });
});

test("test _getCurrentScan Saga failure effects", () => {
	const actionPayload = {};
	const gen = exportsForTesting._getCurrentScanSaga({
		payload: actionPayload,
		type: "_getCurrentScan",
	});
	expect(gen.next().value).toEqual(call(client.getCurrentScan, actionPayload));
	// use generator's throw() method to test failure case (catch)
	const error = {};
	expect(gen.throw(error).value).toEqual(
		put({ type: getCurrentScan.rejected.type })
	);
	expect(gen.next().value).toEqual(call(handleException, error));
	expect(gen.next()).toEqual({ done: true, value: undefined });
});

test("test watchAddScanSaga Saga effects", () => {
	const gen = watchAddScanSaga();

	expect(gen.next().value).toEqual(
		takeEvery(addScan.pending.type, exportsForTesting._addScanSaga)
	);
	expect(gen.next()).toEqual({ done: true, value: undefined });
});

test("test watchGetCurrentScan Saga effects", () => {
	const gen = watchGetCurrentScan();

	expect(gen.next().value).toEqual(
		takeLatest(
			getCurrentScan.pending.type,
			exportsForTesting._getCurrentScanSaga
		)
	);
	expect(gen.next()).toEqual({ done: true, value: undefined });
});
