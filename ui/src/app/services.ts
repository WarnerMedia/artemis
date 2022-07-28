import { customServiceMap } from "custom/services";

export type ServiceMapT = Map<
	string,
	{
		service: string;
		type: string;
		url: string;
	}
>;

// public (external) VCS services
export const serviceMap: ServiceMapT = new Map([
	["azure", { service: "azure", type: "ado", url: "https://dev.azure.com" }],
	[
		"bitbucket",
		{ service: "bitbucket", type: "bitbucket", url: "https://bitbucket.org" },
	],
	["gitlab", { service: "gitlab", type: "gitlab", url: "https://gitlab.com" }],
	["github", { service: "github", type: "github", url: "https://github.com" }],
	...customServiceMap,
]);
