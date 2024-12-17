import {
	takeLatest,
	call,
	put,
	StrictEffect,
	takeEvery,
} from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";

import client, {
	Client,
	handleException,
	UserByIdRequest,
	UserRequest,
} from "api/client";
import { User } from "features/users/usersSchemas";
import { getCurrentUser } from "features/users/currentUserSlice";
import {
	addUser,
	updateUser,
	deleteUser,
	getUserById,
	getUsers,
} from "./usersSlice";
import { addNotification } from "features/notifications/notificationsSlice";
import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";

function* _addUserSaga(
	action: PayloadAction<UserRequest>,
): Generator<StrictEffect, void, User> {
	try {
		const response: User = yield call(client.addUser, { ...action.payload });
		yield put({
			type: addUser.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`User added`), "success"));
	} catch (error: any) {
		yield put({ type: addUser.rejected.type, error: error.message });
	}
}

function* _updateUserSaga(
	action: PayloadAction<UserRequest>,
): Generator<StrictEffect, void, User> {
	try {
		const response: User = yield call(client.updateUser, {
			...action.payload,
		});
		yield put({
			type: updateUser.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`User updated`), "success"));
	} catch (error: any) {
		yield put({
			type: updateUser.rejected.type,
			error: error.message,
		});
	}
}

function* _deleteUserSaga(
	action: PayloadAction<UserByIdRequest>,
): Generator<StrictEffect, void, User["email"]> {
	try {
		const response: User["email"] = yield call(client.deleteUser, {
			...action.payload,
		});
		yield put({
			type: deleteUser.fulfilled.type,
			payload: response,
		});
		yield put(addNotification(i18n._(t`User removed`), "success"));
	} catch (error: any) {
		yield put({
			type: deleteUser.rejected.type,
			error: error.message,
		});
		yield call(handleException, error);
	}
}

function* _getUserByIdSaga(
	action: PayloadAction<UserByIdRequest>,
): Generator<StrictEffect, void, User> {
	const { email, meta } = action.payload;
	try {
		const response: User = yield call(client.getUserById, email, {
			meta,
		});
		yield put({
			type: getUserById.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getUserById.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

function* _getCurrentUserSaga(): Generator<StrictEffect, void, User> {
	try {
		const response: User = yield call(client.getUsersSelf);
		yield put({
			type: getCurrentUser.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getCurrentUser.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

function* _getUsersSaga(
	action: PayloadAction<Client>,
): Generator<StrictEffect, void, User[]> {
	const { meta } = action.payload;
	try {
		const response: User[] = yield call(client.getUsers, { meta });
		yield put({
			type: getUsers.fulfilled.type,
			payload: response,
		});
	} catch (error: any) {
		yield put({ type: getUsers.rejected.type, error: error.message });
		yield call(handleException, error);
	}
}

export function* watchAddUser() {
	yield takeEvery(addUser.pending.type, _addUserSaga);
}

export function* watchUpdateUser() {
	yield takeEvery(updateUser.pending.type, _updateUserSaga);
}

export function* watchDeleteUser() {
	yield takeEvery(deleteUser.pending.type, _deleteUserSaga);
}

export function* watchGetUserById() {
	yield takeLatest(getUserById.pending.type, _getUserByIdSaga);
}

export function* watchGetCurrentUser() {
	yield takeLatest(getCurrentUser.pending.type, _getCurrentUserSaga);
}

export function* watchGetUsers() {
	yield takeLatest(getUsers.pending.type, _getUsersSaga);
}

export const exportsForTesting = {
	_addUserSaga: _addUserSaga,
	_updateUserSaga: _updateUserSaga,
	_deleteUserSaga: _deleteUserSaga,
	_getUserByIdSaga: _getUserByIdSaga,
	_getCurrentUserSaga: _getCurrentUserSaga,
	_getUsersSaga: _getUsersSaga,
};
