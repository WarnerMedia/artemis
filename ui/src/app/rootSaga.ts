import { all } from "redux-saga/effects";

// import sagas and combine
import {
	watchAddHiddenFinding,
	watchDeleteHiddenFinding,
	watchGetHiddenFindings,
	watchUpdateHiddenFinding,
} from "features/hiddenFindings/hiddenFindingsSaga";
import { watchDeleteUserKey, watchGetUserKeys } from "features/keys/keysSaga";
import {
	watchAddScanSaga,
	watchClearScansSaga,
	watchGetCurrentScan,
	watchGetScanById,
	watchGetScanHistory,
} from "features/scans/scansSaga";
import { watchGetSystemStatus } from "features/systemStatus/systemStatusSaga";
import { watchGetTheme, watchSetTheme } from "features/theme/themeSaga";
import {
	watchAddUser,
	watchDeleteUser,
	watchGetCurrentUser,
	watchGetUserById,
	watchGetUsers,
	watchUpdateUser,
} from "features/users/usersSaga";
import {
	watchGetVcsServices,
	watchLinkVcsService,
	watchUnlinkVcsService,
} from "features/vcsServices/vcsServicesSaga";

export default function* rootSaga() {
	yield all([
		watchAddHiddenFinding(),
		watchAddScanSaga(),
		watchAddUser(),
		watchClearScansSaga(),
		watchDeleteHiddenFinding(),
		watchDeleteUser(),
		watchDeleteUserKey(),
		watchGetCurrentScan(),
		watchGetCurrentUser(),
		watchGetHiddenFindings(),
		watchGetScanById(),
		watchGetScanHistory(),
		watchGetSystemStatus(),
		watchGetTheme(),
		watchSetTheme(),
		watchGetUsers(),
		watchGetUserById(),
		watchGetUserKeys(),
		watchGetVcsServices(),
		watchLinkVcsService(),
		watchUnlinkVcsService(),
		watchUpdateHiddenFinding(),
		watchUpdateUser(),
	]);
}
