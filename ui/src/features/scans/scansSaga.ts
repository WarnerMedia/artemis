import {
	takeEvery,
	takeLatest,
	call,
	cancel,
	fork,
	put,
	StrictEffect,
} from "redux-saga/effects";
import { Task } from "@redux-saga/types";
import { PayloadAction } from "@reduxjs/toolkit";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import axios from "axios";

import client, {
	handleException,
	Client,
	ScanByIdRequest,
	ScanRequest,
} from "api/client";
import store from "app/store";
import {
	AnalysisReport,
	ScanHistoryResponse,
	ScanOptionsForm,
} from "features/scans/scansSchemas";
import {
	addScan,
	clearScans,
	getCurrentScan,
	getScanById,
	getScanHistory,
	selectScanById,
} from "features/scans/scansSlice";
import { addNotification } from "features/notifications/notificationsSlice";

interface ScanTasks {
	[id: string]: Task;
}

// object containing background tasks to get scans by id
// can be cancelled if user changes page or initiates a new scan
const scanTasks: ScanTasks = {};
let abortController: AbortController | null = null;

// cancel any prior queued background scan tasks
// this cancels both the saga tasks as well as the underlying axios requests
const _cancelScanTasks = () => {
	console.debug(
		"cancelling queued background scan tasks:",
		Object.keys(scanTasks).length
	);
	for (const [id, task] of Object.entries(scanTasks)) {
		cancel(task);
		delete scanTasks[id];
	}
	// cancel the actual axios requests
	if (abortController) {
		abortController.abort("queued background scan request cancelled");
		abortController = null;
	}
};

function* _addScanSaga(
	action: PayloadAction<ScanOptionsForm>
): Generator<StrictEffect, void, AnalysisReport> {
	const scan = action.payload;
	_cancelScanTasks();

	try {
		const response: AnalysisReport = yield call(client.addScan, { data: scan });
		yield put({
			type: addScan.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`Scan started`), "success"));
	} catch (error: any) {
		// note: reducer actions should be serializable, so pass the thrown Error's string message
		// instead of the entire Error object to the reducer action error field
		// otherwise, you get "A non-serializable value was detected in an action, in the path: `error`"
		yield put({ type: addScan.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

function* _clearScansSaga() {
	_cancelScanTasks();
	yield put({ type: clearScans.fulfilled.type });
}

function* _getCurrentScanSaga(
	action: PayloadAction<Client | void>
): Generator<StrictEffect, void, AnalysisReport> {
	const { meta } = action.payload || { meta: undefined };
	_cancelScanTasks();

	try {
		const response: AnalysisReport = yield call(client.getCurrentScan, {
			meta: meta,
		});
		yield put({
			type: getCurrentScan.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getCurrentScan.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

function* _getScanByIdSaga(
	action: PayloadAction<ScanByIdRequest>
): Generator<StrictEffect, void, AnalysisReport> {
	const { url, meta } = action.payload;
	try {
		const response: AnalysisReport = yield call(client.getScanById, url, {
			meta,
		});
		yield put({
			type: getScanById.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		// don't yield a rejection back to reducer if task was cancelled
		if (!axios.isCancel(error)) {
			yield put({ type: getScanById.rejected.type, error: error.message });
			yield call(handleException, error);
		}
		// TODO/FIXME:
		// on an individual scan error, develop a way to bubble this information
		// to the user as per-scan fields that can be viewed in the tabular results
		// instead of just in a generic notification message
		// for instance, set the success field so it doesn't look like this this data is still fetching
		// and append the error to the scan errors object
	} finally {
		// if we had a queued task for this scan, remove it from the queue
		delete scanTasks[url];
		if (Object.keys(scanTasks).length === 0) {
			abortController = null;
		}
	}
}

function* _getScanHistorySaga(
	action: PayloadAction<ScanRequest>
): Generator<StrictEffect, void, ScanHistoryResponse | Task> {
	const { data, meta } = action.payload;
	_cancelScanTasks();

	try {
		const response = (yield call(client.getScanHistory, {
			data: data,
			meta: meta,
		})) as ScanHistoryResponse;
		if ("results" in response) {
			// queue background tasks to fetch additional details for each scan (like results)
			// forked tasks are still attached to parent tasks, so when this takeLatest() task is cancelled by a newer call
			// (such as paging table data), all forked children will be properly cancelled
			//
			// maintain a list of forked background scan tasks in case user requests a DIFFERENT saga action (e,g starting a new scan),
			// as this will NOT terminate THIS saga, so the forked scans won't be cancelled automatically
			abortController = new AbortController(); // All scan tasks use the same abort controller so they can all be aborted at once
			console.debug("queueing new scan tasks:", response.results.length);
			for (let i = 0; i < response.results.length; i += 1) {
				const result = response.results[i];
				if ("service" in result && "repo" in result && "scan_id" in result) {
					const scan = selectScanById(store.getState(), result.scan_id);

					// if individual results for this scan state are already fetched, return those fields (summary, success, etc.)
					// this helps if same page of results is reloaded (such as by navigating back from viewing a scan's results)
					//
					// TODO: future performance optimization idea:
					// instead of storing results_summary in scans slice, put them in a separate "results" slice
					// only refresh that cache if scans are in a intermediate state (such as queued, in progress, etc.)
					// otherwise, just return the cached results
					// these results will _not_ be replaced on paging since it's minimal summary data
					// it could however be reset if requested repo changes
					if (
						scan &&
						scan.status === result.status &&
						"success" in scan &&
						"results_summary" in scan
					) {
						result.success = scan.success;
						if (scan?.results_summary) {
							result.results_summary = { ...scan.results_summary };
						}
						// don't copy full results, they are too large - fetch those only when a report is requested

						// the following may-or-may-not be set
						if ("errors" in scan) {
							result.errors = { ...scan.errors };
						}
						// we don't need to copy alerts or debug from cached scan since those elements aren't being displayed for scan history results (yet)
						if ("application_metadata" in scan) {
							result.application_metadata = { ...scan.application_metadata };
						}
					} else if (result.status !== "queued") {
						// fetch the rest of the scan fields we are missing from history (AnalysisReport extending ScanHistory, e.g., success, results_summary)
						// note we get a scan summary (format=summary), not full results for each scan
						const id = [result.service, result.repo, result.scan_id].join("/");

						// pass-in an abort controller so these requests can be cancelled
						// and format=summary so only summary results are returned
						scanTasks[id] = (yield fork(_getScanByIdSaga, {
							payload: {
								url: id,
								meta: {
									abortController: abortController,
									filters: {
										format: {
											match: "exact",
											filter: "summary",
										},
									},
								},
							},
							type: getScanById.pending.type,
						})) as Task;
					}
				}
			}
			console.debug("scanTasks queued:", Object.keys(scanTasks).length);
		}
		yield put({
			type: getScanHistory.fulfilled.type,
			payload: response as ScanHistoryResponse,
		});
	} catch (error: any) {
		yield put({ type: getScanHistory.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

export function* watchAddScanSaga() {
	yield takeEvery(addScan.pending.type, _addScanSaga);
}

export function* watchClearScansSaga() {
	// clears pending scans, this is part of getting scans, so we only need latest not every
	yield takeLatest(clearScans.pending.type, _clearScansSaga);
}

export function* watchGetCurrentScan() {
	yield takeLatest(getCurrentScan.pending.type, _getCurrentScanSaga);
}

export function* watchGetScanById() {
	yield takeLatest(getScanById.pending.type, _getScanByIdSaga);
}

export function* watchGetScanHistory() {
	yield takeLatest(getScanHistory.pending.type, _getScanHistorySaga);
}

export const exportsForTesting = {
	_addScanSaga: _addScanSaga,
	_clearScansSaga: _clearScansSaga,
	_cancelScanTasks: _cancelScanTasks,
	_getCurrentScanSaga: _getCurrentScanSaga,
	_getScanHistorySaga: _getScanHistorySaga,
};
