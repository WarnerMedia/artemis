import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import { User } from "features/users/usersSchemas";

type SliceState = {
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | undefined | null;
	totalRecords: number;
};

const currentUserAdapter = createEntityAdapter<User>();

const initialState = currentUserAdapter.getInitialState<SliceState>({
	status: "idle",
	error: null,
	totalRecords: 0,
});

export const getCurrentUser = createSagaActions<User, void>(
	"currentUser/getCurrentUser"
);

const currentUserSlice = createSlice({
	name: "currentUser",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(getCurrentUser.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getCurrentUser.fulfilled, (state, action) => {
			state.status = "succeeded";
			currentUserAdapter.upsertOne(state, action);
			state.totalRecords = 1;
		});
		builder.addCase(getCurrentUser.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
	},
});

export default currentUserSlice.reducer;

export const { selectById: selectCurrentUser } =
	currentUserAdapter.getSelectors((state: RootState) => state.currentUser);
