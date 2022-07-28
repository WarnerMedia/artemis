import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import {
	AnalysisReport,
	ScanHistoryResponse,
	ScanOptionsForm,
} from "features/scans/scansSchemas";
import { Client, ScanByIdRequest, ScanRequest } from "api/client";

type SliceState = {
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | undefined | null;
	totalRecords: number;
};

// scan history is subset of analysis report fields
const scansAdapter = createEntityAdapter<AnalysisReport>({
	// ID field is .scan_id (for individual scans), not createEntityAdapter default field (.id)
	selectId: (scan) => scan.scan_id,
});

const initialState = scansAdapter.getInitialState<SliceState>({
	status: "idle",
	error: null,
	totalRecords: 0,
});

// output: AnalysisReport = API scan object
// input: ScanOptionsForm = user form
export const addScan = createSagaActions<AnalysisReport, ScanOptionsForm>(
	"scans/addScan"
);
export const clearScans = createSagaActions<void>("scans/clearScans");
export const getCurrentScan = createSagaActions<AnalysisReport, Client | void>(
	"scans/getCurrentScan"
);
export const getScanHistory = createSagaActions<
	ScanHistoryResponse,
	ScanRequest
>("scans/getScanHistory");
export const getScanById = createSagaActions<AnalysisReport, ScanByIdRequest>(
	"scans/getScanById"
);

const scansSlice = createSlice({
	name: "scans",
	initialState,
	reducers: {},
	// note that these are not in the main reducer chain, they are considered extraReducers
	// because they are called by some async logic from redux-sagas instead of directly
	// by action
	extraReducers: (builder) => {
		builder.addCase(addScan.pending, (state, action) => {
			state.status = "loading";
		});
		builder.addCase(addScan.fulfilled, (state, action) => {
			state.status = "succeeded";
			// "start scan" follows latest single scan created by user
			scansAdapter.removeAll(state);
			scansAdapter.upsertOne(state, action);
			state.totalRecords = 1;
		});
		builder.addCase(addScan.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
		builder.addCase(clearScans.fulfilled, (state) => {
			state.status = "idle";
			state.error = null;
			state.totalRecords = 0;
			scansAdapter.removeAll(state);
		});
		builder.addCase(getCurrentScan.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getCurrentScan.fulfilled, (state, action) => {
			state.status = "succeeded";
			scansAdapter.upsertOne(state, action);
			state.totalRecords = 1;
		});
		builder.addCase(getCurrentScan.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
		builder.addCase(getScanById.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getScanById.fulfilled, (state, action) => {
			state.status = "succeeded";
			scansAdapter.upsertOne(state, action);
			// Note: getScanById is used for fetching result details on a scan already retrieved via getScanHistory
			// as such we don't update totalRecords when a scan is received
		});
		builder.addCase(getScanById.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
		builder.addCase(getScanHistory.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getScanHistory.fulfilled, (state, action) => {
			state.status = "succeeded";
			scansAdapter.setAll(state, action.payload.results); // replace prior results
			state.totalRecords = action.payload.count;
		});
		builder.addCase(getScanHistory.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
	},
});

export default scansSlice.reducer;

// selectors automatically created by using createEntityAdapter for CRUD operations on entities
export const {
	selectAll: selectAllScans,
	selectById: selectScanById,
	selectIds: selectScanIds,
	selectTotal: selectTotalScans,
} = scansAdapter.getSelectors((state: RootState) => state.scans);
