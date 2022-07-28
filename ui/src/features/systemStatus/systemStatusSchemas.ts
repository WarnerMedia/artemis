import * as Yup from "yup";

// interfaces
export interface SystemStatus {
	maintenance: {
		enabled: boolean;
		message: string;
	};
	// engine information is still TBD, may be a different API
}

// validation schemas...
const systemStatusSchema: Yup.SchemaOf<SystemStatus> = Yup.object()
	.shape({
		maintenance: Yup.object()
			.shape({
				enabled: Yup.boolean().defined(),
				message: Yup.string().defined(),
			})
			.defined(),
		// engine information is still TBD, may be a different API
	})
	.defined();

export const systemStatusResponseSchema = Yup.object().shape({
	data: systemStatusSchema,
});
