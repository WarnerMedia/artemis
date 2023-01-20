import createSagaActions from "./createSagaActions";

test("should create pending, rejected, fulfilled actions", () => {
	const testActions = createSagaActions("test/actions");

	expect(testActions.fulfilled.type).toBeDefined();
	expect(testActions.pending.type).toBeDefined();
	expect(testActions.rejected.type).toBeDefined();
});

test("should create an action that sets pending type on call", () => {
	const testActions = createSagaActions<number, string>("test/actions");
	expect(testActions("testMe")).toEqual({
		type: "test/actions/pending",
		payload: "testMe",
	});
});

test("should create an action that sets meta args for fulfilled", () => {
	const testActions = createSagaActions<number, string>("test/actions");
	expect(testActions.fulfilled(3, "arg")).toEqual({
		type: "test/actions/fulfilled",
		payload: 3,
		meta: { arg: "arg" },
	});
});

test("should create an action that sets meta args for rejected", () => {
	const testActions = createSagaActions<number, string>("test/actions");
	expect(testActions.rejected("error", "arg")).toEqual({
		type: "test/actions/rejected",
		error: "error",
		meta: { arg: "arg" },
	});
});
