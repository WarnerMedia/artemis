import { i18n } from "@lingui/core";
import { t } from "@lingui/macro";
import * as Yup from "yup";

import { booleanStringSchema } from "features/search/searchSchemas";

// REPLACE ME: THESE SCHEMAS ARE AN EXAMPLE OF HOW YOU CAN VALIDATE SEARCH FILTERING FOR REPO application_metadata INFORMATION
// SEE ALSO: SearchMetaField.tsx FOR ASSOCIATED COMPONENT FIELDS

// define how long the user input in the search field can be
const META_FIELD1_LENGTH = 20;
const META_FIELD2_LENGTH = 30;

const matchMetadataFieldSchema = (message: string) => {
	return Yup.string()
		.trim()
		.oneOf(["null", "notnull", "icontains", "exact"], message);
};

// note: exported schemas must be functions returning schemas instead of schemas themselves
// so that they are evaluated at validation time once the app has initialized i18n
// e.g., export const metaSchema = Yup.object({ ... }); will return an application error:
// "plurals for locale undefined aren't loaded. Use i18n.loadLocaleData method to load plurals for specific locale. Using other plural rule as a fallback"

// this schema validates the values the user enters into the search web form
export const metaSchema = () => {
	return Yup.object({
		field1_match: matchMetadataFieldSchema(
			i18n._(t`Invalid meta data field1 matcher`)
		),
		field1: Yup.string()
			.trim()
			.max(
				META_FIELD1_LENGTH,
				i18n._(
					t`Meta data field1 must be less than ${META_FIELD1_LENGTH} characters`
				)
			),
		field2_match: matchMetadataFieldSchema(
			i18n._(t`Invalid meta data field2 matcher`)
		),
		field2: Yup.string()
			.trim()
			.max(
				META_FIELD2_LENGTH,
				i18n._(
					t`Meta data field2 must be less than ${META_FIELD2_LENGTH} characters`
				)
			),
	}).defined();
};

// this schema validates the values passed to the search page via URL query parameters
// the syntax is slightly different than above because matcher and value fields are combined instead of separate
// so field1_match=icontains, field1=value becomes: field1__icontains=value
// and field1_match=exact, field1=value becomes: field1=value
export const metaQueryParamsSchema = () => {
	return Yup.object({
		field1: Yup.string()
			.trim()
			.max(
				META_FIELD1_LENGTH,
				i18n._(
					t`Meta data field1 must be less than ${META_FIELD1_LENGTH} characters`
				)
			),
		field1__null: booleanStringSchema(
			i18n._(t`Meta data field1 null must be either "true" or "false"`)
		),
		field1__icontains: Yup.string()
			.trim()
			.max(
				META_FIELD1_LENGTH,
				i18n._(
					t`Meta data field1 must be less than ${META_FIELD1_LENGTH} characters`
				)
			),
		field2: Yup.string()
			.trim()
			.max(
				META_FIELD2_LENGTH,
				i18n._(
					t`Meta data field2 must be less than ${META_FIELD2_LENGTH} characters`
				)
			),
		field2__null: booleanStringSchema(
			i18n._(t`Meta data field2 null must be either "true" or "false"`)
		),
		field2__icontains: Yup.string()
			.trim()
			.max(
				META_FIELD2_LENGTH,
				i18n._(
					t`Meta data field2 must be less than ${META_FIELD2_LENGTH} characters`
				)
			),
	}).defined();
};
