import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import {
	VcsService,
	VcsServicesGetResponse,
} from "features/vcsServices/vcsServicesSchemas";
import { UserServiceRequest } from "api/client";

type SliceState = {
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | undefined | null;
	totalRecords: number;
	// state of individual services
	linking: {
		github: boolean;
	};
	unlinking: {
		github: boolean;
	};
};

const vcsServicesAdapter = createEntityAdapter<VcsService>({
	// ID field is .name (for individual services), not createEntityAdapter default field (.id)
	selectId: (service) => service.name,
});

const initialState = vcsServicesAdapter.getInitialState<SliceState>({
	status: "idle",
	error: null,
	totalRecords: 0,
	linking: {
		github: false,
	},
	unlinking: {
		github: false,
	},
});

export const linkVcsService = createSagaActions<VcsService, UserServiceRequest>(
	"users/linkVcsServices"
);
export const unlinkVcsService = createSagaActions<
	string | undefined,
	UserServiceRequest
>("users/unlinkVcsServices");
export const getVcsServices = createSagaActions<VcsServicesGetResponse, void>(
	"users/getVcsServices"
);

const vcsServicesSlice = createSlice({
	name: "vcsServices",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		// add
		builder.addCase(linkVcsService.pending, (state, action) => {
			state.status = "loading";
			if (
				action?.payload?.data?.name &&
				action.payload.data.name in state.linking
			) {
				state.linking[action.payload.data.name] = true;
			}
		});
		builder.addCase(linkVcsService.fulfilled, (state, action) => {
			state.status = "succeeded";
			if (action?.payload?.name && action.payload.name in state.linking) {
				state.linking[action.payload.name] = false;
			}
			vcsServicesAdapter.upsertOne(state, action.payload);
		});
		builder.addCase(linkVcsService.rejected, (state, action) => {
			state.status = "failed";
			if (
				action?.payload?.data?.name &&
				action.payload.data.name in state.linking
			) {
				state.linking[action.payload.data.name] = false;
			}
			state.error = action.error;
		});
		// delete
		builder.addCase(unlinkVcsService.pending, (state, action) => {
			state.status = "loading";
			// get service name from the url's last field, e.g., /services/github
			const service = action.payload.url.split("/").pop();
			if (service === "github") {
				state.unlinking[service] = true;
			}
		});
		builder.addCase(unlinkVcsService.fulfilled, (state, action) => {
			state.status = "succeeded";
			if (action.payload) {
				// service name is the return value
				if (action.payload === "github") {
					state.unlinking[action.payload] = false;
				}
				vcsServicesAdapter.removeOne(state, action.payload);
				state.totalRecords -= 1;
			}
		});
		builder.addCase(unlinkVcsService.rejected, (state, action) => {
			state.status = "failed";
			if (action.payload) {
				// get service name from the url's last field, e.g., /services/github
				const service = action.payload.url.split("/").pop();
				if (service === "github") {
					state.unlinking[service] = false;
				}
			}
			state.error = action.error;
		});
		// get
		builder.addCase(getVcsServices.pending, (state) => {
			state.status = "loading";
		});
		builder.addCase(getVcsServices.fulfilled, (state, action) => {
			state.status = "succeeded";
			vcsServicesAdapter.setAll(state, action.payload);
			state.totalRecords = action.payload.length;
		});
		builder.addCase(getVcsServices.rejected, (state, action) => {
			state.status = "failed";
			state.error = action.error;
		});
	},
});

export default vcsServicesSlice.reducer;

export const {
	selectAll: selectAllServices,
	selectById: selectServiceById,
	selectIds: selectServiceIds,
	selectTotal: selectTotalServices,
} = vcsServicesAdapter.getSelectors((state: RootState) => state.vcsServices);
