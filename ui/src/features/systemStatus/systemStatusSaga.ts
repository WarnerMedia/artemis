import { takeLatest, call, put, StrictEffect } from "redux-saga/effects";

import client, { handleException } from "api/client";
import { SystemStatus } from "features/systemStatus/systemStatusSchemas";
import { getSystemStatus } from "features/systemStatus/systemStatusSlice";

function* _getSystemStatusSaga(): Generator<StrictEffect, void, SystemStatus> {
	try {
		const response: SystemStatus = yield call(client.getSystemStatus);
		yield put({
			type: getSystemStatus.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getSystemStatus.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

export function* watchGetSystemStatus() {
	yield takeLatest(getSystemStatus.pending.type, _getSystemStatusSaga);
}

export const exportsForTesting = {
	_getSystemStatusSaga: _getSystemStatusSaga,
};
