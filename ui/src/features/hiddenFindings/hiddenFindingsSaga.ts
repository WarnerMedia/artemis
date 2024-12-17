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

import client, { handleException, HiddenFindingsRequest } from "api/client";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import {
	addHiddenFinding,
	deleteHiddenFinding,
	getHiddenFindings,
	updateHiddenFinding,
} from "features/hiddenFindings/hiddenFindingsSlice";
import { addNotification } from "features/notifications/notificationsSlice";

function* _addHiddenFindingSaga(
	action: PayloadAction<HiddenFindingsRequest>,
): Generator<StrictEffect, void, HiddenFinding | HiddenFinding[]> {
	try {
		const response = yield call(client.addHiddenFinding, { ...action.payload });
		yield put({
			type: addHiddenFinding.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Hidden finding added`), "success"));
	} catch (error: any) {
		yield put({ type: addHiddenFinding.rejected.type, error: error.message });
	}
}

function* _deleteHiddenFindingSaga(
	action: PayloadAction<HiddenFindingsRequest>,
): Generator<StrictEffect, void, HiddenFinding["id"]> {
	try {
		const response: HiddenFinding["id"] = yield call(
			client.deleteHiddenFinding,
			{
				...action.payload,
			},
		);
		yield put({
			type: deleteHiddenFinding.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Hidden finding removed`), "success"));
	} catch (error: any) {
		yield put({
			type: deleteHiddenFinding.rejected.type,
			error: error.message,
		});
	}
}

function* _getHiddenFindingsSaga(
	action: PayloadAction<HiddenFindingsRequest>,
): Generator<StrictEffect, void, HiddenFinding[]> {
	const { url, meta } = action.payload;
	try {
		const response: HiddenFinding[] = yield call(
			client.getHiddenFindings,
			url,
			{ meta },
		);
		yield put({
			type: getHiddenFindings.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getHiddenFindings.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

function* _updateHiddenFindingSaga(
	action: PayloadAction<HiddenFindingsRequest>,
): Generator<StrictEffect, void, HiddenFinding[]> {
	try {
		const response: HiddenFinding[] = yield call(client.updateHiddenFinding, {
			...action.payload,
		});
		yield put({
			type: updateHiddenFinding.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Hidden finding updated`), "success"));
	} catch (error: any) {
		yield put({
			type: updateHiddenFinding.rejected.type,
			error: error.message,
		});
	}
}

export function* watchAddHiddenFinding() {
	yield takeEvery(addHiddenFinding.pending.type, _addHiddenFindingSaga);
}

export function* watchDeleteHiddenFinding() {
	yield takeEvery(deleteHiddenFinding.pending.type, _deleteHiddenFindingSaga);
}

export function* watchGetHiddenFindings() {
	yield takeLatest(getHiddenFindings.pending.type, _getHiddenFindingsSaga);
}

export function* watchUpdateHiddenFinding() {
	yield takeEvery(updateHiddenFinding.pending.type, _updateHiddenFindingSaga);
}

export const exportsForTesting = {
	_addHiddenFindingSaga: _addHiddenFindingSaga,
	_deleteHiddenFindingSaga: _deleteHiddenFindingSaga,
	_getHiddenFindingsSaga: _getHiddenFindingsSaga,
	_updateHiddenFindingSaga: _updateHiddenFindingSaga,
};
