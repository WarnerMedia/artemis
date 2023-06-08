import { combineReducers } from "@reduxjs/toolkit";

// import slices and create reducers
import globalExceptionReducer from "features/globalException/globalExceptionSlice";
import hiddenFindingsReducer from "features/hiddenFindings/hiddenFindingsSlice";
import keysReducer from "features/keys/keysSlice";
import notificationReducer from "features/notifications/notificationsSlice";
import scanReducer from "features/scans/scansSlice";
import systemStatusReducer from "features/systemStatus/systemStatusSlice";
import themeReducer from "features/theme/themeSlice";
import currentUserReducer from "features/users/currentUserSlice";
import userReducer from "features/users/usersSlice";
import vcsServiceReducer from "features/vcsServices/vcsServicesSlice";

const rootReducer = combineReducers({
	theme: themeReducer,
	currentUser: currentUserReducer,
	globalException: globalExceptionReducer,
	hiddenFindings: hiddenFindingsReducer,
	keys: keysReducer,
	notifications: notificationReducer,
	scans: scanReducer,
	systemStatus: systemStatusReducer,
	users: userReducer,
	vcsServices: vcsServiceReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
