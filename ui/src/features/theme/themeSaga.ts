import { t } from "@lingui/macro";
import {
	takeEvery,
	takeLatest,
	call,
	put,
	StrictEffect,
} from "redux-saga/effects";

import { defaultTheme, IThemeColors, themeColors } from "app/colors";
import { getTheme, setTheme } from "features/theme/themeSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { STORAGE_LOCAL_THEME } from "app/globals";

function* _getThemeSaga(): Generator<StrictEffect, void, string | null> {
	const currentTheme = yield call(
		[localStorage, "getItem"],
		STORAGE_LOCAL_THEME,
	);
	let payload = {
		name: defaultTheme,
		...themeColors[defaultTheme],
	};
	if (
		currentTheme &&
		typeof currentTheme === "string" &&
		currentTheme in themeColors
	) {
		payload = {
			name: currentTheme,
			...themeColors[currentTheme as keyof IThemeColors],
		};
	}
	yield put({
		type: getTheme.fulfilled.type,
		payload: payload,
	});
}

function* _setThemeSaga(
	action: PayloadAction<string>,
): Generator<StrictEffect, void, void> {
	const theme = action.payload;
	if (!(theme in themeColors)) {
		yield put({ type: setTheme.rejected.type, error: t`Invalid theme value` });
	} else {
		yield call([localStorage, "setItem"], STORAGE_LOCAL_THEME, action.payload);
		const payload = {
			name: theme,
			...themeColors[theme as keyof IThemeColors],
		};
		yield put({
			type: setTheme.fulfilled.type,
			payload: payload,
		});
	}
}

export function* watchGetTheme() {
	yield takeLatest(getTheme.pending.type, _getThemeSaga);
}

export function* watchSetTheme() {
	yield takeEvery(setTheme.pending.type, _setThemeSaga);
}

export const exportsForTesting = {
	_getThemeSaga: _getThemeSaga,
	_setThemeSaga: _setThemeSaga,
};
