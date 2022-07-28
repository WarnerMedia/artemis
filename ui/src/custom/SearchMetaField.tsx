import { Box, ListItem, ListItemText } from "@mui/material";
import {
	LooksOne as LooksOneIcon,
	LooksTwo as LooksTwoIcon,
} from "@mui/icons-material";
import { makeStyles } from "tss-react/mui";
import { useLingui } from "@lingui/react";
import { Trans, t } from "@lingui/macro";

import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import { RowDef } from "components/EnhancedTable";
import { FormFieldDef, MatcherT } from "pages/SearchPage";

// REPLACE ME: THIS COMPONENT IS AN EXAMPLE OF HOW YOU CAN ADD SEARCH FILTERING FOR REPO application_metadata INFORMATION
// SEE ALSO: searchMetaSchemas.ts FOR ASSOCIATED VALIDATION SCHEMAS

const useStyles = makeStyles()(() => ({
	// ensure list items don't expand dialog width
	dialogListItems: {
		whiteSpace: "normal",
		wordWrap: "break-word",
	},
	dialogMinHeight: {
		minHeight: "8em",
	},
}));

type MatchMetaFieldT = "null" | "icontains" | "exact";

export type MetaFiltersT = {
	field1_match: MatchMetaFieldT;
	field1: string;
	field2_match: MatchMetaFieldT;
	field2: string;
};

export const initialMetaFilters: MetaFiltersT = {
	field1_match: "icontains", // default field 1 matcher to "Contains" option
	field1: "",
	field2_match: "exact", // default field 2 matcher to "Exact" option
	field2: "",
};

const matchMetaField: MatcherT = {
	null: {
		label: t`No Meta Data Field`,
	},
	notnull: {
		label: t`Any Meta Data Field`,
	},
	icontains: {
		label: t`Contains`,
	},
	exact: {
		label: t`Exact`,
	},
};

export const metaFields: FormFieldDef = {
	field1_match: {
		id: "repo-meta-field1-match",
		label: t`Meta Data Field1 Match`,
		component: "MatchStringField",
		matchOptions: matchMetaField,
		size: 3,
	},
	field1: {
		id: "repo-meta-field1",
		label: t`Meta Data Field1`,
		component: "TextField",
		icon: <LooksOneIcon />,
		size: 9,
	},
	field2_match: {
		id: "repo-meta-field2-match",
		label: t`Meta Data Field2 Match`,
		component: "MatchStringField",
		matchOptions: matchMetaField,
		size: 3,
	},
	field2: {
		id: "repo-meta-field2",
		label: t`Meta Data Field2`,
		component: "TextField",
		icon: <LooksTwoIcon />,
		size: 9,
	},
};

const SearchMetaField = (props: { data: RowDef | null }) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { data } = props;

	const standaloneValue =
		data?.application_metadata?.sample_metadata?.field3 ?? "";

	return (
		<ListItem key="repo-samplemeta-field3">
			<ListItemText
				primary={
					<>
						{i18n._(t`Meta Data Sample3`)}{" "}
						{standaloneValue && (
							<CustomCopyToClipboard copyTarget={standaloneValue} />
						)}
					</>
				}
				secondary={
					<Box className={classes.dialogMinHeight}>
						{standaloneValue ? <>{standaloneValue}</> : <Trans>Unknown</Trans>}
					</Box>
				}
			/>
		</ListItem>
	);
};
export default SearchMetaField;
