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

import client, {
	Client,
	handleException,
	UserServiceRequest,
} from "api/client";
import {
	getVcsServices,
	linkVcsService,
	unlinkVcsService,
} from "./vcsServicesSlice";
import { addNotification } from "features/notifications/notificationsSlice";
import { VcsService, VcsServicesGetResponse } from "./vcsServicesSchemas";

function* _linkVcsServiceSaga(
	action: PayloadAction<UserServiceRequest>,
): Generator<StrictEffect, void, VcsService> {
	try {
		const response = yield call(client.linkUserService, { ...action.payload });
		yield put({
			type: linkVcsService.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Service account linked`), "success"));
	} catch (error: any) {
		yield put({
			type: linkVcsService.rejected.type,
			error: error.message,
			payload: action.payload,
		});
	}
}

function* _unlinkVcsServiceSaga(
	action: PayloadAction<UserServiceRequest>,
): Generator<StrictEffect, void, string | undefined> {
	try {
		const response: string | undefined = yield call(client.unlinkUserService, {
			...action.payload,
		});
		yield put({
			type: unlinkVcsService.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Service account unlinked`), "success"));
	} catch (error: any) {
		yield put({
			type: unlinkVcsService.rejected.type,
			error: error.message,
			payload: action.payload,
		});
		yield call(handleException, error);
	}
}

function* _getVcsServicesSaga(
	action: PayloadAction<Client>,
): Generator<StrictEffect, void, VcsServicesGetResponse> {
	let meta = undefined;
	if (action?.payload?.meta) {
		meta = action.payload.meta;
	}
	try {
		const response: VcsServicesGetResponse = yield call(
			client.getUserServices,
			{ meta },
		);
		yield put({
			type: getVcsServices.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getVcsServices.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

export function* watchLinkVcsService() {
	yield takeEvery(linkVcsService.pending.type, _linkVcsServiceSaga);
}

export function* watchUnlinkVcsService() {
	yield takeEvery(unlinkVcsService.pending.type, _unlinkVcsServiceSaga);
}

export function* watchGetVcsServices() {
	yield takeLatest(getVcsServices.pending.type, _getVcsServicesSaga);
}

export const exportsForTesting = {
	_linkVcsServiceSaga: _linkVcsServiceSaga,
	_unlinkVcsServiceSaga: _unlinkVcsServiceSaga,
	_getVcsServicesSaga: _getVcsServicesSaga,
};
