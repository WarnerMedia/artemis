import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import { Key, KeysResponse } from "features/keys/keysSchemas";
import { UserKeyRequest } from "api/client";

type SliceState = {
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | undefined | null;
	totalRecords: number;
};

const keysAdapter = createEntityAdapter<Key>();

const initialState = keysAdapter.getInitialState<SliceState>({
	status: "idle",
	error: null,
	totalRecords: 0,
});

export const deleteUserKey = createSagaActions<Key["id"], UserKeyRequest>(
	"users/deleteUserKey",
);
export const getUserKeys = createSagaActions<KeysResponse, { userId?: string }>(
	"users/getUserKeys",
);

// note: add key is not a redux store action since we don't store the returned api key value
// in the redux store

const keysSlice = createSlice({
	name: "keys",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		// delete
		builder.addCase(deleteUserKey.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(deleteUserKey.fulfilled, (state, action) => {
			state.status = "succeeded";
			if (action.payload) {
				keysAdapter.removeOne(state, action.payload);
				state.totalRecords -= 1;
			}
		});
		builder.addCase(deleteUserKey.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
		// get
		builder.addCase(getUserKeys.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getUserKeys.fulfilled, (state, action) => {
			state.status = "succeeded";
			keysAdapter.setAll(state, action.payload.results);
			state.totalRecords = action.payload.count;
		});
		builder.addCase(getUserKeys.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
	},
});

export default keysSlice.reducer;

export const {
	selectAll: selectAllKeys,
	selectById: selectKeyById,
	selectIds: selectKeyIds,
	selectTotal: selectTotalKeys,
} = keysAdapter.getSelectors((state: RootState) => state.keys);
