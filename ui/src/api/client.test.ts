import { AuthError, exportsForTesting, handleException } from "./client";
import store from "app/store";
import { addNotification } from "features/notifications/notificationsSlice";
import { setGlobalException } from "features/globalException/globalExceptionSlice";
import { APP_NOTIFICATION_DELAY } from "app/globals";

jest.useFakeTimers();

test("formatError should throw AuthError on 401 response", () => {
	const error = {
		response: {
			status: 401,
		},
	};
	const exception = () => {
		exportsForTesting._formatError(error, "default");
	};
	expect(exception).toThrow(AuthError);
	expect(exception).toThrowError(/session expired/i);
});

test("formatError should throw failed.error if set in response", () => {
	const error = {
		response: {
			data: {
				failed: [{ error: "it failed" }],
			},
		},
	};
	const exception = () => {
		exportsForTesting._formatError(error, "default");
	};
	expect(exception).toThrowError("it failed");
});

test("formatError should throw statusText if set in response", () => {
	const error = {
		response: {
			statusText: "it failed",
		},
	};
	const exception = () => {
		exportsForTesting._formatError(error, "default");
	};
	expect(exception).toThrowError("it failed");
});

test("formatError should throw defaultError instead of error messsage", () => {
	const error = {
		message: "it failed",
	};
	const exception = () => {
		exportsForTesting._formatError(error, "default");
	};
	expect(exception).toThrowError("default");
});

test("formatError should throw defaulted error instead of error messsage", () => {
	const error = {
		message: "it failed",
	};
	const exception = () => {
		exportsForTesting._formatError(error);
	};
	expect(exception).toThrowError(/unknown error/i);
});

// test if a function calls a redux dispatch
test("handleException should dispatch an addNotification action for non-auth errors", () => {
	const spy = jest.spyOn(store, "dispatch");
	const error = new Error("it failed");
	handleException(error);
	expect(spy).toHaveBeenCalledWith({
		payload: {
			message: error.message, // should match our error
			type: "error",
		},
		type: addNotification.type, // should dispatch addNotification (type)
	});
	spy.mockRestore();
});

describe("handleException tests", () => {
	let dispatchSpy: any;
	let timeoutSpy: any;
	let error: any;

	beforeEach(() => {
		dispatchSpy = jest.spyOn(store, "dispatch");
		timeoutSpy = jest.spyOn(global, "setTimeout");
		error = new AuthError("auth failed");
		handleException(error);
	});
	afterEach(() => {
		dispatchSpy.mockRestore();
		timeoutSpy.mockRestore();
	});

	it("should dispatch setGlobalException action for auth errors", () => {
		expect(dispatchSpy).toHaveBeenCalledWith({
			payload: { message: error.message, action: "login" }, // globalException is a single string
			type: setGlobalException.type, // should dispatch addNotification (type)
		});
	});

	it("should set a 6-second timeout", () => {
		expect(setTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenLastCalledWith(
			exportsForTesting._redirect, // should call redirect
			APP_NOTIFICATION_DELAY // should set a delay
		);
	});
});

describe("_redirect tests", () => {
	it("should reload current page", () => {
		// mock window.location.reload
		const globalWindow = global.window;
		global.window = Object.create(window);
		Object.defineProperty(window, "location", {
			value: {
				reload: jest.fn(),
			},
		});

		exportsForTesting._redirect();
		expect(window.location.reload).toHaveBeenCalled();
		global.window = globalWindow;
	});
});
