import { ListItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { Looks3 as Looks3Icon } from "@mui/icons-material";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";

import { RowDef } from "components/EnhancedTable";

const useStyles = makeStyles()(() => ({
	listItemText: {
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
}));

// REPLACE ME: SAMPLE COMPONENT FOR DISPLAYING A SINGLE application_metadata SCHEMA FIELD
const ResultsMetaField = (props: { data: RowDef | null }) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { data } = props;

	const standaloneValue =
		data?.application_metadata?.sample_metadata?.field3 ?? i18n._(t`Unknown`);

	return (
		<>
			{standaloneValue && (
				<ListItem key="scan-samplemeta-field3">
					<ListItemIcon>
						<Looks3Icon />
					</ListItemIcon>
					<Tooltip describeChild title={standaloneValue}>
						<ListItemText
							classes={{ secondary: classes.listItemText }}
							primary={i18n._(t`Meta Data Sample3`)}
							secondary={standaloneValue}
						/>
					</Tooltip>
				</ListItem>
			)}
		</>
	);
};
export default ResultsMetaField;
