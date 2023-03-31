import * as Yup from "yup";
import { PagedResponse, Response, responseSchema } from "api/apiSchemas";

export interface ScanFeatures {
	[key: string]: boolean;
}

// interfaces
export interface User {
	id?: string; // not part of User data structure, added so we can reference "self" instead of email for current user
	email?: string; // for create, user email is in the url path, not the structure
	admin?: boolean | null;
	last_login?: string | null;
	scope?: string[] | null;
	features?: ScanFeatures | null;
	// scan_orgs field is available when fetching a single user but not a list of users
	scan_orgs?: string[];
}

export interface UsersResponse extends Response {
	results: User[];
}

// validation schemas...
const userSchema: Yup.ObjectSchema<User> = Yup.object()
	.shape({
		id: Yup.string(), // note: not required for schema validation b/c we add this field after validation
		// scan_orgs field is available when fetching a single user but not a list of users
		scan_orgs: Yup.array().of(Yup.string().defined()),
		email: Yup.string().defined(),
		admin: Yup.boolean().nullable(),
		last_login: Yup.string().nullable(),
		scope: Yup.array().of(Yup.string().defined()).nullable(),
		features: Yup.object().nullable(),
	})
	.defined();

export const userResponseSchema = Yup.object().shape({
	data: userSchema,
});

export const usersResponseSchema: Yup.ObjectSchema<PagedResponse> =
	Yup.object().shape({
		data: Yup.object()
			.concat(responseSchema)
			.shape({
				results: Yup.array().of(userSchema).defined(),
			})
			.defined(),
	});
