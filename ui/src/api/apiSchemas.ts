import * as Yup from "yup";

export interface Response {
	results: any;
	count: number;
	next: string | null;
	previous: string | null;
}

export interface PagedResponse {
	data: Response;
}

export const responseSchema = Yup.object()
	.shape({
		results: Yup.mixed().defined(), // should be implemented by schemas that .concat() this schema
		count: Yup.number().defined(),
		next: Yup.string().defined().nullable(),
		previous: Yup.string().defined().nullable(),
	})
	.defined();
