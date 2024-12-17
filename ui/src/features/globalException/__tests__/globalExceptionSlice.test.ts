import { AnyAction } from "@reduxjs/toolkit";
import globalException, {
	// reducers
	setGlobalException,
	// selectors
	selectGlobalException,
} from "features/globalException/globalExceptionSlice";
import { mockStoreEmpty } from "../../../../testData/testMockData";

describe("globalException reducers", () => {
	const initialState = { message: "" };

	it("should handle initial state", () => {
		expect(globalException(undefined, {} as AnyAction)).toEqual(initialState);
	});

	it("setGlobalException should set the global exception", () => {
		expect(
			globalException(initialState, {
				type: setGlobalException.type,
				payload: { message: "Test Exception" },
			}),
		).toEqual({
			message: "Test Exception",
		});
	});

	it("setGlobalException action should set the global exception action", () => {
		expect(
			globalException(initialState, {
				type: setGlobalException.type,
				payload: { message: "Test Exception", action: "login" },
			}),
		).toEqual({
			message: "Test Exception",
			action: "login",
		});
	});

	it("setGlobalException should replace an existing global exception", () => {
		expect(
			globalException(
				{ message: "Existing Exception", action: "login" },
				{
					type: setGlobalException.type,
					payload: { message: "New Exception" },
				},
			),
		).toEqual({
			message: "New Exception", // action removed
		});
	});
});

describe("globalException selectors", () => {
	it("selectGlobalException should return the global exception", () => {
		const state = JSON.parse(JSON.stringify(mockStoreEmpty));
		state.globalException = {
			message: "An Exception",
		};
		// given full redux store state should only return the globalException object
		const selected = selectGlobalException(state);
		expect(selected).toEqual(state.globalException);
	});

	it("selectGlobalException with action should return the global exception with an action", () => {
		const state = JSON.parse(JSON.stringify(mockStoreEmpty));
		state.globalException = {
			message: "Another Exception",
			action: "login",
		};
		// given full redux store state should only return the globalException object
		const selected = selectGlobalException(state);
		expect(selected).toEqual(state.globalException);
	});
});
