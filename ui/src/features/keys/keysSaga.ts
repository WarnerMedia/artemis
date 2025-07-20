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

import client, { handleException, UserKeyRequest } from "api/client";
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
		
		// Extract user ID from URL path to refresh keys for the same user
		const url = action.payload.url;
		const pathParts = url.split('/');
		const userId = pathParts[2]; // users/{userId}/keys/{keyId}
		
		// Refresh keys list after successful deletion
		yield put(getUserKeys({ userId: userId !== 'self' ? userId : undefined }));
	} catch (error: any) {
		yield put({
			type: deleteUserKey.rejected.type,
			error: error.message,
		});
		yield call(handleException, error);
	}
}

function* _getUserKeysSaga(
	action: PayloadAction<{ userId?: string }>,
): Generator<StrictEffect, void, KeysResponse> {
	const maxCount = 200;
	const meta = {
		currentPage: 0,
		itemsPerPage: maxCount,
	};
	try {
		const response: KeysResponse = yield call(client.getUserKeys, {
			meta: meta,
			userId: action.payload?.userId,
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
