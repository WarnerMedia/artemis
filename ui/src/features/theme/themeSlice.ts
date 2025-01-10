import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import { ThemeColors } from "features/theme/themeSchemas";
import { defaultTheme, IThemeColors, themeColors } from "app/colors";
import { WritableDraft } from "immer/dist/internal";

const initialState: ThemeColors = {
	name: defaultTheme,
	dark: themeColors[defaultTheme].dark,
	light: themeColors[defaultTheme].light,
	main: themeColors[defaultTheme].main,
	gradient: themeColors[defaultTheme].gradient,
	gradientText: themeColors[defaultTheme].gradientText,
};

export const getTheme = createSagaActions<ThemeColors, void>("theme/getTheme");

export const setTheme = createSagaActions<ThemeColors, keyof IThemeColors>(
	"theme/setTheme",
);

const saveThemeState = (
	state: WritableDraft<ThemeColors>,
	action:
		| PayloadAction<ThemeColors, string, { arg: void }, never>
		| PayloadAction<ThemeColors, string, { arg: keyof IThemeColors }, never>,
) => {
	state.name = action.payload.name;
	state.dark = action.payload.dark;
	state.light = action.payload.light;
	state.main = action.payload.main;
	state.gradient = action.payload.gradient;
	state.gradientText = action.payload.gradientText;
};

const themeSlice = createSlice({
	name: "theme",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(getTheme.fulfilled, (state, action) => {
			saveThemeState(state, action);
		});
		builder.addCase(setTheme.fulfilled, (state, action) => {
			saveThemeState(state, action);
		});
	},
});

export default themeSlice.reducer;
export const selectTheme = (state: RootState) => state.theme;
