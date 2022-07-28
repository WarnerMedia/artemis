import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import logger from "redux-logger";

import rootReducer, { RootState } from "app/rootReducer";
import rootSaga from "app/rootSaga";

// keep the helpful middleware reduxjs-toolkit adds (such as Immer)
// so instead of replacing middleware, get the default and then add to it
const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) => {
		// add logger middleware in dev only
		if (process.env.NODE_ENV === "development") {
			return getDefaultMiddleware().concat(sagaMiddleware, logger);
		}
		return getDefaultMiddleware().concat(sagaMiddleware);
	},
});

// enable Webpack hot module replacement
// allows app changes to be applied to running app on editor save without full reload
// also maintains redux store state
if (process.env.NODE_ENV === "development" && module.hot) {
	// ignore these dev-only module updates for coverage
	/* istanbul ignore next */
	module.hot.accept("app/rootReducer", () => {
		store.replaceReducer(rootReducer);
	});
}

sagaMiddleware.run(rootSaga);

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action<string>
>;
export default store;
