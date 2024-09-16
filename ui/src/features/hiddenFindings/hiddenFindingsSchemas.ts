import * as Yup from "yup";

import { SecretValidity, Severities } from "features/scans/scansSchemas";

// interfaces
export const HiddenFindingTypeValues = [
	"vulnerability",
	"vulnerability_raw",
	"secret",
	"secret_raw",
	"static_analysis",
	"configuration",
];

export type HiddenFindingType =
	| "configuration"
	| "static_analysis"
	| "secret"
	| "secret_raw"
	| "vulnerability"
	| "vulnerability_raw";

type HiddenFindingBase = {
	id?: string;
	expires?: string | null;
	reason: string; // | ""
	created_by?: string | null;
	created?: string | null;
	updated_by?: string | null;
	updated?: string | null;
};

type HiddenFindingAnalysis = HiddenFindingBase & {
	type: "static_analysis";
	value: {
		filename: string;
		line: number;
		type: string;
		severity?: Severities;
	};
};

type HiddenFindingConfig = HiddenFindingBase & {
	type: "configuration";
	value: {
		id: string;
		severity?: Severities;
	};
};

type HiddenFindingSecret = HiddenFindingBase & {
	type: "secret";
	value: {
		filename: string;
		line: number;
		commit: string;
		validity?: SecretValidity;
	};
};

type HiddenFindingSecretRaw = HiddenFindingBase & {
	type: "secret_raw";
	value: {
		value: string;
	};
};

type HiddenFindingVuln = HiddenFindingBase & {
	type: "vulnerability";
	value: {
		id: string;
		source: string;
		component: string;
		severity?: Severities;
	};
};

type HiddenFindingVulnRaw = HiddenFindingBase & {
	type: "vulnerability_raw";
	value: {
		id: string;
		severity?: Severities;
	};
};

export type HiddenFinding =
	| HiddenFindingAnalysis
	| HiddenFindingConfig
	| HiddenFindingSecret
	| HiddenFindingSecretRaw
	| HiddenFindingVuln
	| HiddenFindingVulnRaw;

// validation schemas...
const SeveritySchema = Yup.string().oneOf([
	"critical",
	"high",
	"medium",
	"low",
	"negligible",
	"",
]);

const hiddenFindingValueAnalysisSchema = Yup.object()
	.shape({
		filename: Yup.string().defined(),
		line: Yup.number().defined().positive().integer(),
		type: Yup.string().defined(),
		severity: SeveritySchema,
	})
	.defined();

const hiddenFindingValueConfigSchema = Yup.object()
	.shape({
		id: Yup.string().defined(),
	})
	.defined();

const hiddenFindingValueSecretSchema = Yup.object()
	.shape({
		filename: Yup.string().defined(),
		line: Yup.number().defined().integer().min(0),
		commit: Yup.string().defined(),
	})
	.defined();

const hiddenFindingValueSecretRawSchema = Yup.object()
	.shape({
		value: Yup.string().defined(),
	})
	.defined();

const hiddenFindingValueVulnSchema = Yup.object()
	.shape({
		id: Yup.string().defined(),
		source: Yup.string().defined(),
		component: Yup.string().defined(),
		severity: SeveritySchema,
	})
	.defined();

const hiddenFindingValueVulnRawSchema = Yup.object()
	.shape({
		id: Yup.string().defined(),
		severity: SeveritySchema,
	})
	.defined();

// not setting this schema as ObjectSchema<HiddenFinding> as type checking doesn't seem to be able to handle
// multiple type variants for 'value' field
export const hiddenFindingSchema = Yup.object()
	.shape({
		id: Yup.string(), // note: not required for schema validation b/c we add this field after validation
		type: Yup.string().oneOf(HiddenFindingTypeValues),
		value: Yup.object().when("type", ([type], schema) => {
			switch (type) {
				case "configuration":
					return hiddenFindingValueConfigSchema;
				case "static_analysis":
					return hiddenFindingValueAnalysisSchema;
				case "secret":
					return hiddenFindingValueSecretSchema;
				case "secret_raw":
					return hiddenFindingValueSecretRawSchema;
				case "vulnerability":
					return hiddenFindingValueVulnSchema;
				case "vulnerability_raw":
					return hiddenFindingValueVulnRawSchema;
				default:
					// we shouldn't reach this case because type is verified above
					return schema.oneOf(HiddenFindingTypeValues);
			}
		}),
		expires: Yup.string().nullable(),
		reason: Yup.string(),
		created_by: Yup.string().nullable(),
		created: Yup.string().nullable(),
		updated_by: Yup.string().nullable(),
		updated: Yup.string().nullable(),
	})
	.defined();

export const hiddenFindingsResponseSchema = Yup.object().shape({
	data: Yup.array().of(hiddenFindingSchema).defined().nullable(),
});
