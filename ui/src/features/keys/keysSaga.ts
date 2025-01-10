import {
	takeEvery,
	takeLatest,
	call,
	put,
	StrictEffect,
} from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";

import client, { Client, handleException, UserKeyRequest } from "api/client";
import { deleteUserKey, getUserKeys } from "features/keys/keysSlice";
import { addNotification } from "features/notifications/notificationsSlice";
import { Key, KeysResponse } from "./keysSchemas";

function* _deleteUserKeySaga(
	action: PayloadAction<UserKeyRequest>,
): Generator<StrictEffect, void, Key["id"]> {
	try {
		const response: Key["id"] = yield call(client.deleteUserKey, {
			...action.payload,
		});
		yield put({
			type: deleteUserKey.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Key removed`), "success"));
	} catch (error: any) {
		yield put({
			type: deleteUserKey.rejected.type,
			error: error.message,
		});
		yield call(handleException, error);
	}
}

function* _getUserKeysSaga(
	action: PayloadAction<Client>,
): Generator<StrictEffect, void, KeysResponse> {
	const maxCount = 200;
	let meta = undefined;
	if (action?.payload?.meta) {
		meta = action.payload.meta;
	} else {
		// by default get 200 api keys and do sorting client-side
		meta = {
			currentPage: 0,
			itemsPerPage: maxCount,
		};
	}
	try {
		const response: KeysResponse = yield call(client.getUserKeys, {
			meta: meta,
		});
		yield put({
			type: getUserKeys.fulfilled.type,
			payload: response,
		});
		if (response?.count > maxCount) {
			yield put(
				addNotification(
					i18n._(
						t`User API key count exceeds ${maxCount}. Currently users can only manage ${maxCount} keys at a time. Please remove some expired or unused keys`,
					),
					"warning",
				),
			);
		}
	} catch (error: any) {
		yield put({ type: getUserKeys.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

export function* watchDeleteUserKey() {
	yield takeEvery(deleteUserKey.pending.type, _deleteUserKeySaga);
}

export function* watchGetUserKeys() {
	yield takeLatest(getUserKeys.pending.type, _getUserKeysSaga);
}

export const exportsForTesting = {
	_deleteUserKeySaga: _deleteUserKeySaga,
	_getUserKeysSaga: _getUserKeysSaga,
};
