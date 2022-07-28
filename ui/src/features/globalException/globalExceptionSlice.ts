import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "app/rootReducer";

// will add a login redirect button after the error message
type ActionType = "login";

export interface Notification {
	message: string;
	type: ActionType;
}

// state for managing a single global exception string
// used for authentication failures
interface GlobalException {
	message: string;
	action?: "login";
}

const initialState: GlobalException = {
	message: "",
};

export const globalExceptionSlice = createSlice({
	name: "globalException",
	initialState,
	reducers: {
		setGlobalException: (state, action: PayloadAction<GlobalException>) => {
			state.message = action.payload.message;
			state.action = action.payload?.action;
		},
	},
});

export const { setGlobalException } = globalExceptionSlice.actions;
export const selectGlobalException = (state: RootState) =>
	state.globalException;
export default globalExceptionSlice.reducer;
