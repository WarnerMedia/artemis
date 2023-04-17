import { AnyAction } from "@reduxjs/toolkit";
import { RootState } from "app/rootReducer";
import { mockStoreScanSlice } from "../../../../testData/testMockData";
import scans, {
	// reducers
	clearScans,
	addScan,
	getCurrentScan,
	// selectors
	selectAllScans,
	selectScanById,
	selectScanIds,
	selectTotalScans,
} from "features/scans/scansSlice";

describe("scans reducer", () => {
	const initialState = {
		entities: {},
		ids: [],
		error: null, // additions to default entity
		status: "idle",
		totalRecords: 0,
	};
	let state: any = null;
	let payload = null;
	let expectedResult: any = null;

	beforeEach(() => {
		expectedResult = null;
	});

	it("should handle initial state", () => {
		// created by createEntityAdapter so shape will include entities{} & ids[]
		expect(scans(undefined, {} as AnyAction)).toEqual(initialState);
	});

	it("addScan.pending should set scan status to loading", () => {
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.status = "loading";
		state = scans(undefined, {
			type: addScan.pending.type,
		});
		expect(state).toEqual(expectedResult);
	});

	it("addScan.fulfilled should insert an item", () => {
		payload = {
			scan_id: "abc123",
			status: "queued",
			timestamps: { start: null, end: null },
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.entities[payload.scan_id] = payload;
		expectedResult.ids.push(payload.scan_id);
		expectedResult.status = "succeeded";
		expectedResult.totalRecords++;
		state = scans(undefined, {
			type: addScan.fulfilled.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("addScan.fulfilled should replace existing item with new item", () => {
		payload = {
			scan_id: "xyz321",
			status: "queued",
			timestamps: { start: null, end: null },
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.entities[payload.scan_id] = payload;
		expectedResult.ids.push(payload.scan_id);
		expectedResult.status = "succeeded";
		expectedResult.totalRecords++;
		// inject prior state that had an existing scan added
		state = scans(state, {
			type: addScan.fulfilled.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("addScan.rejected should set error state", () => {
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.status = "failed";
		expectedResult.error = "rut roh it failed";
		// inject prior state that had an existing scan added
		state = scans(undefined, {
			type: addScan.rejected.type,
			error: "rut roh it failed",
		});
		expect(state).toEqual(expectedResult);
	});

	it("getCurrentScan.pending should set scan status to loading", () => {
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.status = "loading";
		state = scans(undefined, {
			type: getCurrentScan.pending.type,
		});
		expect(state).toEqual(expectedResult);
	});

	it("getCurrentScan.fulfilled should insert an item", () => {
		payload = {
			scan_id: "abc123",
			status: "queued",
			timestamps: { start: null, end: null },
		};
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.entities[payload.scan_id] = payload;
		expectedResult.ids.push(payload.scan_id);
		expectedResult.status = "succeeded";
		expectedResult.totalRecords++;
		state = scans(undefined, {
			type: getCurrentScan.fulfilled.type,
			payload: payload,
		});
		expect(state).toEqual(expectedResult);
	});

	it("getCurrentScan.fulfilled should insert a 2nd item", () => {
		payload = {
			scan_id: "xyz321", // separate item, different id
			status: "queued",
			timestamps: { start: null, end: null },
		};

		state = scans(state, {
			type: getCurrentScan.fulfilled.type,
			payload: payload,
		});
		expect(Object.values(state["entities"])).toHaveLength(2);
	});

	it("getCurrentScan.rejected should set error state", () => {
		// deep clone entity
		expectedResult = JSON.parse(JSON.stringify(initialState));
		expectedResult.error = "rut roh it failed";
		expectedResult.status = "failed";
		// inject prior state that had an existing scan added
		state = scans(undefined, {
			type: getCurrentScan.rejected.type,
			error: "rut roh it failed",
		});
		expect(state).toEqual(expectedResult);
	});

	it("clearScans should clear scans", () => {
		state = {
			entities: {
				abc123: {
					scan_id: "abc123",
					status: "queued",
					timestamps: { start: null, end: null },
				},
				xyz321: {
					scan_id: "xyz321",
					status: "queued",
					timestamps: { start: null, end: null },
				},
			},
			ids: ["abc123", "xyz321"],
			error: "rut roh it failed", // additions to default entity
			status: "failed",
		};
		state = scans(state, {
			type: clearScans.fulfilled.type,
		});
		expect(state).toEqual(initialState);
	});

	describe("scans selectors", () => {
		const state: RootState = mockStoreScanSlice;

		it("selectAllScans should return all scans", () => {
			// given full redux store state should only return all the notifications
			const selected = selectAllScans(state);
			expect(selected).toEqual(Object.values(state.scans.entities));
		});

		it("selectScanById should return a scan by id", () => {
			// given full redux store state should only return notifications with id
			const selected = selectScanById(state, "xyz321");
			expect(selected).toEqual(state.scans.entities["xyz321"]);
		});

		it("selectScanIds should return all scan ids", () => {
			// given full redux store state should only return notifications ids
			const selected = selectScanIds(state);
			expect(selected).toEqual(state.scans.ids);
		});

		it("selectTotalScans should return scan count", () => {
			// given full redux store state should only return notifications count
			const selected = selectTotalScans(state);
			expect(selected).toEqual(state.scans.ids.length);
		});
	});
});
