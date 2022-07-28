import * as Yup from "yup";

// interfaces
export type VcsServiceRequestGithub = {
	name: "github";
	params: {
		auth_code: string;
	};
};
export type VcsServiceRequest = VcsServiceRequestGithub;

export type VcsServiceGithub = {
	name: "github";
	username: string;
	linked: string;
};

export type VcsService = VcsServiceGithub; // & other services when available

// array of services
export type VcsServicesGetResponse = VcsService[];

// a single service created
export type VcsServicesAddResponse = VcsServiceGithub; // & other services when available

// validation schemas...
const vcsServiceGithubSchema = Yup.object().shape({
	name: Yup.string()
		.matches(/^github$/)
		.defined(),
	username: Yup.string().defined(),
	linked: Yup.date().defined(),
});

export const vcsServicesGetResponseSchema = Yup.object().shape({
	// extend this validation if more service types are added
	data: Yup.array().of(vcsServiceGithubSchema).defined(),
});

export const vcsServicesAddResponseSchema = Yup.object().shape({
	// extend this validation if more service types are added
	data: vcsServiceGithubSchema.defined(),
});

export const githubAuthRegex = new RegExp("^[0-9a-f]{20}$");
