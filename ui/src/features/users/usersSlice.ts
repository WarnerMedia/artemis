import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

import { RootState } from "app/rootReducer";
import createSagaActions from "utils/createSagaActions";
import { User, UsersResponse } from "features/users/usersSchemas";
import { Client, UserByIdRequest, UserRequest } from "api/client";

type SliceState = {
	status: "idle" | "loading" | "succeeded" | "failed";
	action: "get" | "add" | "update" | "delete" | null; // current in-progress action
	error: string | undefined | null;
	totalRecords: number;
};

const usersAdapter = createEntityAdapter<User>({
	selectId: (user) => user.email ?? "",
});

const initialState = usersAdapter.getInitialState<SliceState>({
	status: "idle",
	action: null,
	error: null,
	totalRecords: 0,
});

export const addUser = createSagaActions<User, UserRequest>("users/addUser");
export const updateUser = createSagaActions<User, UserRequest>(
	"users/updateUser",
);
export const deleteUser = createSagaActions<User["email"], UserByIdRequest>(
	"users/deleteUser",
);
export const getUserById = createSagaActions<User, UserByIdRequest>(
	"users/getUserById",
);
export const getUsers = createSagaActions<UsersResponse, Client>(
	"users/getUsers",
);

const usersSlice = createSlice({
	name: "users",
	initialState,
	reducers: {
		// reset store slice back to a "neutral" state that doesn't indicate in-progress (loading) or a success/failure condition
		resetStatus(state) {
			state.status = "idle";
		},
	},
	extraReducers: (builder) => {
		// add
		builder.addCase(addUser.pending, (state) => {
			state.status = "loading";
			state.action = "add";
		});
		builder.addCase(addUser.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			usersAdapter.upsertOne(state, action);
			state.totalRecords += 1;
		});
		builder.addCase(addUser.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// update
		builder.addCase(updateUser.pending, (state) => {
			state.status = "loading";
			state.action = "update";
		});
		builder.addCase(updateUser.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			usersAdapter.upsertOne(state, action);
		});
		builder.addCase(updateUser.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// delete
		builder.addCase(deleteUser.pending, (state) => {
			state.status = "loading";
			state.action = "delete";
		});
		builder.addCase(deleteUser.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			if (action.payload) {
				usersAdapter.removeOne(state, action.payload);
				state.totalRecords -= 1;
			}
		});
		builder.addCase(deleteUser.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// get single user
		builder.addCase(getUserById.pending, (state) => {
			state.status = "loading";
			state.action = "get";
		});
		builder.addCase(getUserById.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			usersAdapter.removeAll(state);
			usersAdapter.upsertOne(state, action);
			state.totalRecords = 1;
		});
		builder.addCase(getUserById.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
		// get all users
		builder.addCase(getUsers.pending, (state) => {
			state.status = "loading";
			state.action = "get";
		});
		builder.addCase(getUsers.fulfilled, (state, action) => {
			state.status = "succeeded";
			state.action = null;
			usersAdapter.setAll(state, action.payload.results); // replace prior results
			state.totalRecords = action.payload.count;
		});
		builder.addCase(getUsers.rejected, (state, action) => {
			state.status = "failed";
			state.action = null;
			state.error = action.error;
		});
	},
});

export const { resetStatus } = usersSlice.actions;

export default usersSlice.reducer;

export const {
	selectAll: selectAllUsers,
	selectById: selectUserById,
	selectIds: selectUserIds,
	selectTotal: selectTotalUsers,
} = usersAdapter.getSelectors((state: RootState) => state.users);
