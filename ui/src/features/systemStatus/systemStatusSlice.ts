import { createSlice } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import { SystemStatus } from "features/systemStatus/systemStatusSchemas";

type SliceState = SystemStatus & {
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | undefined | null;
};

const initialState: SliceState = {
	status: "idle",
	error: null,
	maintenance: {
		enabled: false,
		message: "",
	},
};

export const getSystemStatus = createSagaActions<SystemStatus, void>(
	"systemStatus/getSystemStatus"
);

const systemStatusSlice = createSlice({
	name: "systemStatus",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(getSystemStatus.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getSystemStatus.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.maintenance.enabled = action.payload.maintenance.enabled;
			state.maintenance.message = action.payload.maintenance.message;
		});
		builder.addCase(getSystemStatus.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
	},
});

export default systemStatusSlice.reducer;
export const selectSystemStatus = (state: RootState) => state.systemStatus;
