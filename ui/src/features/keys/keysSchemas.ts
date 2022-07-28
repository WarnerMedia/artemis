import * as Yup from "yup";
import { ScanFeatures } from "features/users/usersSchemas";
import { Response } from "api/client";

// interfaces
export interface Key {
	id?: string;
	name: string;
	created?: string;
	last_used?: string | null;
	expires?: string | null;
	scope: string[];
	admin: boolean;
	features?: ScanFeatures | null;
}

export interface KeysResponse extends Response {
	results: Key[];
}

// validation schemas...
const keysSchema: Yup.SchemaOf<Key> = Yup.object()
	.shape({
		id: Yup.string(), // note: not required for schema validation b/c we add this field after validation
		name: Yup.string().defined(),
		created: Yup.string(),
		last_used: Yup.string().nullable(),
		expires: Yup.string().nullable(),
		scope: Yup.array().of(Yup.string().defined()).defined(),
		admin: Yup.boolean().defined(),
		features: Yup.object().nullable(),
	})
	.defined();

export const keysResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			results: Yup.array().of(keysSchema),
			count: Yup.number().defined(),
			next: Yup.string().defined().nullable(),
			previous: Yup.string().defined().nullable(),
		})
		.defined(),
});

export const addKeyResponseSchema = Yup.object().shape({
	data: Yup.object()
		.shape({
			key: Yup.string().defined(),
		})
		.defined(),
});
