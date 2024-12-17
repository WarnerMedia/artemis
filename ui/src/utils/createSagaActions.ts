import { createAction } from "@reduxjs/toolkit";

export default function createSagaActions<Returned, ThunkArg = void>(
	typePrefix: string,
) {
	const fulfilled = createAction(
		typePrefix + "/fulfilled",
		(result: Returned, arg: ThunkArg) => {
			return {
				payload: result,
				meta: { arg },
			};
		},
	);

	const pending = createAction(typePrefix + "/pending", (arg: ThunkArg) => {
		return {
			payload: arg,
		};
	});

	const rejected = createAction(
		typePrefix + "/rejected",
		(error: string | null, arg: ThunkArg, payload?: ThunkArg) => {
			return {
				payload,
				error: error || "Rejected",
				meta: { arg },
			};
		},
	);

	// TODO: consider also adding a separate "cancelled" action
	return Object.assign(
		(arg: ThunkArg) => {
			return pending(arg);
		},
		{
			pending,
			rejected,
			fulfilled,
			typePrefix,
		},
	);
}
