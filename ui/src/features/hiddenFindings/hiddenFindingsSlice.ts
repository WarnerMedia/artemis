import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import { HiddenFindingsRequest } from "api/client";

type SliceState = {
	status: "idle" | "loading" | "succeeded" | "failed";
	action: "get" | "add" | "update" | "delete" | null; // current in-progress action
	error: string | undefined | null;
};

const hiddenFindingsAdapter = createEntityAdapter<HiddenFinding>();

const initialState = hiddenFindingsAdapter.getInitialState<SliceState>({
	status: "idle",
	action: null,
	error: null,
});

// output: HiddenFinding = API whitelist object
// input: HiddenFindingsRequest = user form
export const addHiddenFinding = createSagaActions<
	HiddenFinding,
	HiddenFindingsRequest
>("hiddenFindings/addHiddenFinding");
export const deleteHiddenFinding = createSagaActions<
	HiddenFinding["id"],
	HiddenFindingsRequest
>("hiddenFindings/deleteHiddenFinding");
export const getHiddenFindings = createSagaActions<
	HiddenFinding[],
	HiddenFindingsRequest
>("hiddenFindings/getHiddenFindings");
export const updateHiddenFinding = createSagaActions<
	HiddenFinding,
	HiddenFindingsRequest
>("hiddenFindings/updateHiddenFinding");

const hiddenFindingsSlice = createSlice({
	name: "hiddenFindings",
	initialState,
	reducers: {
		// clear-out any hidden findings
		clearHiddenFindings(state) {
			state.status = "idle";
			state.error = null;
			hiddenFindingsAdapter.removeAll(state);
		},
		// reset store slice back to a "neutral" state that doesn't indicate in-progress (loading) or a success/failure condition
		resetStatus(state) {
			state.status = "idle";
		},
	},
	extraReducers: (builder) => {
		// add
		builder.addCase(addHiddenFinding.pending, (state) => {
			state.status = "loading";
			state.action = "add";
		});
		builder.addCase(addHiddenFinding.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			if (Array.isArray(action.payload)) {
				hiddenFindingsAdapter.upsertMany(state, action.payload);
			} else {
				hiddenFindingsAdapter.upsertOne(state, action.payload);
			}
		});
		builder.addCase(addHiddenFinding.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// delete
		builder.addCase(deleteHiddenFinding.pending, (state) => {
			state.status = "loading";
			state.action = "delete";
		});
		builder.addCase(deleteHiddenFinding.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			if (action.payload) {
				hiddenFindingsAdapter.removeOne(state, action.payload);
			}
		});
		builder.addCase(deleteHiddenFinding.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// get
		builder.addCase(getHiddenFindings.pending, (state) => {
			state.status = "loading";
			state.action = "get";
		});
		builder.addCase(getHiddenFindings.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			// replace all entries, since existing entries could be for a different repo
			hiddenFindingsAdapter.setAll(state, action.payload);
		});
		builder.addCase(getHiddenFindings.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// update
		builder.addCase(updateHiddenFinding.pending, (state) => {
			state.status = "loading";
			state.action = "update";
		});
		builder.addCase(updateHiddenFinding.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			if (Array.isArray(action.payload)) {
				hiddenFindingsAdapter.upsertMany(state, action.payload);
			} else {
				hiddenFindingsAdapter.upsertOne(state, action.payload);
			}
		});
		builder.addCase(updateHiddenFinding.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
	},
});

export const { clearHiddenFindings, resetStatus } = hiddenFindingsSlice.actions;

export default hiddenFindingsSlice.reducer;

export const {
	selectAll: selectAllHiddenFindings,
	selectById: selectHiddenFindingById,
	selectIds: selectHiddenFindingIds,
	selectTotal: selectTotalHiddenFindings,
} = hiddenFindingsAdapter.getSelectors(
	(state: RootState) => state.hiddenFindings,
);
