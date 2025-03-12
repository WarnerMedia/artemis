import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	ArrowBackIos as ArrowBackIosIcon,
	BuildCircle,
	Clear as ClearIcon,
	Close as CloseIcon,
	Cloud as CloudIcon,
	Description as DescriptionIcon,
	ExpandMore as ExpandMoreIcon,
	Filter1 as Filter1Icon,
	FilterList as FilterListIcon,
	Folder as FolderIcon,
	Grading as GradingIcon,
	OpenInNew as OpenInNewIcon,
	RadioButtonChecked as RadioButtonCheckedIcon,
	RadioButtonUnchecked as RadioButtonUncheckedIcon,
	Replay as ReplayIcon,
	Search as SearchIcon,
	Security as SecurityIcon,
	Settings as SettingsIcon,
	Subject as SubjectIcon,
} from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Chip,
	ChipProps,
	Container,
	DialogActions,
	DialogContent,
	Divider,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormLabel,
	Grid2 as Grid,
	GridSize,
	IconButton,
	InputAdornment,
	InputLabel,
	LinearProgress,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	MenuItem,
	TextField as MuiTextField,
	Paper,
	Slide,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import client, {
	Client,
	FilterDef,
	RequestMeta,
	handleException,
} from "api/client";
import {
	colorCritical,
	colorHigh,
	colorLow,
	colorMedium,
	colorNegligible,
	colorPriority,
} from "app/colors";
import { RootState } from "app/rootReducer";
import {
	GROUP_VULN,
	pluginKeys,
	sbomPluginsKeys,
	secretPluginsKeys,
	staticPluginsKeys,
	techPluginsKeys,
	vulnPlugins,
	vulnPluginsKeys,
	vulnPluginsObjects,
} from "app/scanPlugins";
import AutoCompleteField from "components/AutoCompleteField";
import { RiskChip, SeverityChip } from "components/ChipCell";
import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import DraggableDialog from "components/DraggableDialog";
import EnhancedTable, { ColDef, RowDef } from "components/EnhancedTable";
import DatePickerField from "components/FormikPickers";
import TooltipCell from "components/TooltipCell";
import ListItemMetaMultiField from "custom/ListItemMetaMultiField";
import SearchMetaField, {
	MetaFiltersT,
	exportMetaData,
	initialMetaFilters,
	metaFields,
} from "custom/SearchMetaField";
import { metaQueryParamsSchema, metaSchema } from "custom/searchMetaSchemas";
import { Risks, Severities } from "features/scans/scansSchemas";
import {
	ComponentLicense,
	Scan,
	SearchComponent,
	SearchComponentsResponse,
	SearchRepo,
	SearchReposResponse,
	SearchVulnerability,
	SearchVulnsResponse,
	VulnComponent,
	booleanStringSchema,
	cicdToolSchema,
	matchDateSchema,
	matchNullDateSchema,
	matchStringSchema,
	repoSchema,
	serviceSchema,
	supportedCicdTools,
} from "features/search/searchSchemas";
import { selectCurrentUser } from "features/users/currentUserSlice";
import {
	Field,
	FieldAttributes,
	Form,
	Formik,
	FormikErrors,
	FormikProps,
	FormikTouched,
	useFormikContext,
	validateYupSchema,
	yupToFormErrors,
} from "formik";
import { Select, TextField } from "formik-mui";
import { DateTime } from "luxon";
import { PSProps, PluginsSelector } from "pages/MainPage";
import queryString from "query-string";
import {
	Dispatch,
	ReactElement,
	ReactNode,
	SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
import { capitalize, formatDate } from "utils/formatters";
import * as Yup from "yup";
import { SourceCodeHotLink, VulnLink } from "./ResultsPage";

const useStyles = makeStyles()((theme) => ({
	accordionDetails: {
		flexGrow: 1,
	},
	advisoryIdLink: {
		"&.MuiButton-root": {
			padding: 0,
			verticalAlign: "initial",
			maxWidth: "28em",
			justifyContent: "start",
		},
	},
	autoComplete: {
		border: `1px solid ${theme.palette.primary.main}`,
	},
	autoCompleteSelected: {
		// Hover
		'&[data-focus="true"]': {
			backgroundColor: "rgba(0, 159, 219, 0.10)",
		},
		// Selected
		'&[aria-selected="true"]': {
			color: "white",
			backgroundColor: theme.palette.primary.main,
		},
	},
	backButton: {
		marginBottom: theme.spacing(1),
	},
	categoryNodes: {
		display: "flex",
		alignItems: "center",
	},
	chipArray: {
		"& > *:first-of-type": {
			marginLeft: theme.spacing(6),
		},
		"& > :not(:first-of-type)": {
			marginLeft: theme.spacing(0.5),
		},
	},
	chipPlugins: {
		marginRight: theme.spacing(0.5),
		marginBottom: theme.spacing(0.5),
	},
	chipPriority: {
		color: "white",
		fill: "white",
		backgroundColor: colorPriority,
		"&:hover": {
			color: "white",
			fill: "white",
			backgroundColor: colorPriority,
		},
		"&:active": {
			color: "white",
			fill: "white",
			backgroundColor: colorPriority,
		},
		"&:focus": {
			color: "white",
			fill: "white",
			backgroundColor: colorPriority,
			border: `2px solid ${theme.palette.primary.main}`,
		},
		"&:click": {
			color: "white",
			fill: "white",
			backgroundColor: colorPriority,
		},
	},
	chipCritical: {
		color: "white",
		fill: "white",
		backgroundColor: colorCritical,
		"&:hover": {
			color: "white",
			fill: "white",
			backgroundColor: colorCritical,
		},
		"&:active": {
			color: "white",
			fill: "white",
			backgroundColor: colorCritical,
		},
		"&:focus": {
			color: "white",
			fill: "white",
			backgroundColor: colorCritical,
			border: `2px solid ${theme.palette.primary.main}`,
		},
		"&:click": {
			color: "white",
			fill: "white",
			backgroundColor: colorCritical,
		},
	},
	chipHigh: {
		color: "white",
		fill: "white",
		backgroundColor: colorHigh,
		"&:hover": {
			color: "white",
			fill: "white",
			backgroundColor: colorHigh,
		},
		"&:active": {
			color: "white",
			fill: "white",
			backgroundColor: colorHigh,
		},
		"&:focus": {
			color: "white",
			fill: "white",
			backgroundColor: colorHigh,
			border: `2px solid ${theme.palette.primary.main}`,
		},
		"&:click": {
			color: "white",
			fill: "white",
			backgroundColor: colorHigh,
		},
	},
	chipMedium: {
		color: "white",
		fill: "white",
		backgroundColor: colorMedium,
		"&:hover": {
			color: "white",
			fill: "white",
			backgroundColor: colorMedium,
		},
		"&:active": {
			color: "white",
			fill: "white",
			backgroundColor: colorMedium,
		},
		"&:focus": {
			color: "white",
			fill: "white",
			backgroundColor: colorMedium,
			border: `2px solid ${theme.palette.primary.main}`,
		},
		"&:click": {
			color: "white",
			fill: "white",
			backgroundColor: colorMedium,
		},
	},
	chipLow: {
		color: "black",
		fill: "black",
		backgroundColor: colorLow,
		"&:hover": {
			color: "black",
			fill: "black",
			backgroundColor: colorLow,
		},
		"&:active": {
			color: "black",
			fill: "black",
			backgroundColor: colorLow,
		},
		"&:focus": {
			color: "black",
			fill: "black",
			backgroundColor: colorLow,
			border: `2px solid ${theme.palette.primary.main}`,
		},
		"&:click": {
			color: "black",
			fill: "black",
			backgroundColor: colorLow,
		},
	},
	chipNegligible: {
		color: "black",
		fill: "black",
		backgroundColor: colorNegligible,
		"&:hover": {
			color: "black",
			fill: "black",
			backgroundColor: colorNegligible,
		},
		"&:active": {
			color: "black",
			fill: "black",
			backgroundColor: colorNegligible,
		},
		"&:focus": {
			color: "black",
			fill: "black",
			backgroundColor: colorNegligible,
			border: `2px solid ${theme.palette.primary.main}`,
		},
		"&:click": {
			color: "black",
			fill: "black",
			backgroundColor: colorNegligible,
		},
	},
	dialogButtons: {
		"& > *": {
			marginLeft: theme.spacing(1),
		},
	},
	// ensure list items don't expand dialog width
	dialogListItems: {
		whiteSpace: "normal",
		wordWrap: "break-word",
	},
	formButton: {
		marginTop: theme.spacing(3),
		marginLeft: theme.spacing(1),
	},
	formButtons: {
		display: "flex",
		justifyContent: "flex-start",
	},
	formControl: {
		width: "100%",
	},
	// truncate long items in summary section + add ellipsis
	listItemText: {
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	paperHeader: {
		marginBottom: theme.spacing(2),
	},
	repoRiskLink: {
		display: "inline-flex",
		alignItems: "center",
		"& > *": {
			marginLeft: theme.spacing(0.5),
			marginRight: theme.spacing(0.5),
		},
	},
	resultsError: {
		color: theme.palette.error.main,
		borderColor: theme.palette.error.main,
		fill: theme.palette.error.main,
	},
	scanCategory: {
		flex: 1,
	},
	scanFeaturesIcon: {
		color: "darkgrey",
		marginRight: theme.spacing(1),
	},
	tabDialogGrid: {
		overflowWrap: "break-word",
	},
	tablePaper: {
		padding: theme.spacing(2),
	},
}));

const COMPONENT_NAME_LENGTH = 100;
const COMPONENT_VERSION_LENGTH = 32;
const COMPONENT_LICENSE_LENGTH = 120;
const VULN_ID_LENGTH = 100;
const DESCRIPTION_LENGTH = 100;
const REMEDIATION_LENGTH = 100;

type SearchCategoryT = "component" | "repo" | "vuln";

type MatchStringT = "icontains" | "exact";

/* FUTURE: include "bt" (between)
type MatchDateT = "null" | "lt" | "exact" | "gt" | "bt";
*/

// components API does not include null matcher
type MatchDateT = "lt" | "gt";

type MatchLicenseT = "null" | "icontains" | "exact";

// repos API includes null matcher
type MatchNullDateT = "null" | MatchDateT;

/* FUTURE: include null (none)
type MatchRiskT = Risks | "null";
const RiskValues = ["null", "low", "moderate", "high", "critical", "priority"];
*/

type MatchRiskT = Risks;
const RiskValues = ["low", "moderate", "high", "critical", "priority"];

const PluginValues = [...vulnPlugins];

type MatchSeverityT = Severities | ""; // None = ""

type ComponentFiltersT = {
	category: "component";
	name_match: MatchStringT;
	name: string;
	version_match: MatchStringT;
	version: string;
	license_match: MatchLicenseT;
	license: string;
	service_match: MatchStringT;
	service: string;
	repo_match: MatchStringT;
	repo: string;
	last_scan_match: MatchDateT;
	last_scan: DateTime | null;
	// last_scan_to: DateTime | null; // FUTURE
};

type RepoFiltersT = MetaFiltersT & {
	category: "repo";
	service_match: MatchStringT;
	service: string;
	repo_match: MatchStringT;
	repo: string;
	cicd_tool: string;
	risk: MatchRiskT[];
	last_scan_match: MatchNullDateT;
	last_scan: DateTime | null;
	last_qualified_scan_match: MatchNullDateT;
	last_qualified_scan: DateTime | null;
	// last_qualified_scan_to: DateTime | null; // FUTURE
};

type VulnFiltersT = {
	category: "vuln";
	vuln_id_match: MatchStringT;
	vuln_id: string;
	description_match: MatchStringT;
	description: string;
	remediation_match: MatchStringT;
	remediation: string;
	severity: MatchSeverityT[];
	component_name_match: MatchStringT;
	component_name: string;
	component_version_match: MatchStringT;
	component_version: string;
	plugin: string[];
	vulnerability: boolean;
	vulnPlugins: string[];
};

type SearchFiltersT = ComponentFiltersT | RepoFiltersT | VulnFiltersT;

const initialComponentFilters: ComponentFiltersT = {
	category: "component",
	name_match: "icontains",
	name: "",
	version_match: "icontains",
	version: "",
	license_match: "icontains",
	license: "",
	service_match: "exact",
	service: "",
	repo_match: "icontains",
	repo: "",
	last_scan_match: "lt",
	last_scan: null,
	// last_scan_to: null, // FUTURE
};

const initialRepoFilters: RepoFiltersT = {
	category: "repo",
	service_match: "exact",
	service: "",
	repo_match: "icontains",
	repo: "",
	cicd_tool: "",
	risk: [],
	last_scan_match: "lt",
	last_scan: null,
	last_qualified_scan_match: "lt",
	last_qualified_scan: null,
	// last_qualified_scan_to: null, // FUTURE
	...initialMetaFilters,
};

const initialVulnFilters: VulnFiltersT = {
	category: "vuln",
	vuln_id_match: "icontains",
	vuln_id: "",
	description_match: "icontains",
	description: "",
	remediation_match: "icontains",
	remediation: "",
	severity: [],
	component_name_match: "icontains",
	component_name: "",
	component_version_match: "icontains",
	component_version: "",
	plugin: [],
	vulnerability: false,
	vulnPlugins: [],
};

export interface MatcherT {
	[name: string]: {
		label: string;
		icon?: ReactElement;
		props?: ChipProps | PSProps;
	};
}

export interface FormFieldDef {
	[name: string]: {
		id: string;
		label: string;
		component:
			| "AutoCompleteField"
			| "DropdownSelector"
			| "KeyboardDateTimePickerField"
			| "MatchChipField"
			| "MatchDateField"
			| "MatchPluginsSelectorField"
			| "MatchStringField"
			| "TextField"
			| "SpacerField";
		icon?: React.ReactNode;
		size: GridSize;
		fieldProps?: FieldAttributes<any>;
		matchOptions?: MatcherT;
	};
}

interface MatchFieldProps extends FieldAttributes<any> {
	matchOptions: MatcherT;
}

const getMaxDate = () => {
	return DateTime.now().plus({ minutes: 1 }).toJSDate();
};

// combine separate arrays for each plugin category into a unified plugin array
// and omit plugin categories
// translates form values used by PluginsSelector component into plugin array
// passed in url query string or to data table filters
const getVulnQueryValues = (values: AddQueryParams) => {
	const queryValues: AddQueryParams = {};
	const sourcePlugins: string[] = [];

	// copy-over each key
	for (const [k, v] of Object.entries(values)) {
		// omit categories
		if (k === "vulnerability") {
			continue;
		}
		// combine individual filter categories into plugin
		if (k === "vulnPlugins") {
			sourcePlugins.push(...v);
			continue;
		}
		queryValues[k] = v;
	}
	if (sourcePlugins.length) {
		queryValues.plugin = [...sourcePlugins];
	}
	return queryValues;
};

const MatchChipField = (props: MatchFieldProps) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const { values, setFieldValue } = useFormikContext<any>();
	const { matchOptions } = props;

	const handleClear = () => {
		setFieldValue(props.name, [], true);
	};

	const chips = () => {
		const nodes: ReactNode[] = [];
		for (const [label, v] of Object.entries(matchOptions)) {
			// check chip props from union, not pluginselector
			if (v?.props && !("group" in v.props)) {
				nodes.push(
					<Chip
						{...v.props}
						key={`${props.id}-chip-${label}`}
						role="checkbox"
						disabled={props?.disabled}
						label={i18n._(v.label)}
						aria-checked={values[props.name].includes(label)}
						icon={
							values[props.name].includes(label) ? (
								<RadioButtonCheckedIcon className={v.props?.className} />
							) : (
								<RadioButtonUncheckedIcon className={v.props?.className} />
							)
						}
						clickable={true}
						onClick={() => {
							const newValue: string[] = [...values[props.name]];
							const idx = newValue.findIndex((itm: string) => {
								return itm === label;
							});
							if (idx === -1) {
								newValue.push(label);
							} else {
								newValue.splice(idx, 1);
							}
							setFieldValue(props.name, newValue, true);
						}}
					/>,
				);
			}
		}
		// add clear button if any chips are selected
		if (Array.isArray(values[props.name]) && values[props.name].length > 0) {
			nodes.push(
				<IconButton
					key={`${props.id}-chip-clear`}
					aria-label={i18n._(t`Clear options`)}
					onMouseDown={handleClear}
					onKeyDown={(event) => {
						// " " => Spacebar
						if (event.key === "Enter" || event.key === " ") {
							handleClear();
						}
					}}
					size="small"
				>
					<ClearIcon fontSize="small" />
				</IconButton>,
			);
		}
		return nodes;
	};

	return (
		<FormControl component="fieldset">
			<FormGroup aria-label="position" row>
				<FormControlLabel
					value={props.label}
					control={<div className={classes.chipArray}>{chips()}</div>}
					label={i18n._(props.label)}
					labelPlacement="start"
				/>
			</FormGroup>
		</FormControl>
	);
};

const MatchDateField = (props: MatchFieldProps) => {
	const { classes } = useStyles();
	const { matchOptions, ...fieldProps } = props;

	const menuItems = () => {
		const nodes: ReactNode[] = [];
		for (const [label, values] of Object.entries(matchOptions)) {
			nodes.push(
				<MenuItem value={label} key={`${props.id}-select-date-item-${label}`}>
					<Trans>{values.label}</Trans>
				</MenuItem>,
			);
		}
		return nodes;
	};

	return (
		<FormGroup row>
			<FormControl variant="outlined" className={classes.formControl}>
				<InputLabel
					id={`${props.id}-select-date-label`}
					style={{ display: "none" }}
				>
					<Trans>{props.label}</Trans>
				</InputLabel>
				<Field
					component={Select}
					size="small"
					{...fieldProps}
					labelId={`${props.id}-select-date-label`}
				>
					{menuItems()}
				</Field>
			</FormControl>
		</FormGroup>
	);
};

const MatchPluginsSelectorField = (props: MatchFieldProps) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { matchOptions } = props;

	const selectors = () => {
		const nodes: ReactNode[] = [];
		for (const [label, v] of Object.entries(matchOptions)) {
			// check pluginselector props from union, not chip
			if (v?.props && "group" in v.props) {
				nodes.push(
					<PluginsSelector
						{...v.props}
						key={`${props.id}-plugin-${label}`}
						disabled={props?.disabled}
						label={i18n._(v.label)}
						name={label}
						className={classes.scanCategory}
					/>,
				);
			}
		}
		return nodes;
	};

	return (
		<FormControl component="fieldset">
			<FormLabel component="legend">
				<Trans>{props.label}</Trans>
			</FormLabel>

			<FormGroup row>{selectors()}</FormGroup>
		</FormControl>
	);
};

const MatchStringField = (props: MatchFieldProps) => {
	const { classes } = useStyles();
	const { matchOptions, ...fieldProps } = props;

	const menuItems = () => {
		const nodes: ReactNode[] = [];
		for (const [label, values] of Object.entries(matchOptions)) {
			nodes.push(
				<MenuItem value={label} key={`${props.id}-select-string-item-${label}`}>
					<Trans>{values.label}</Trans>
				</MenuItem>,
			);
		}
		return nodes;
	};

	return (
		<FormGroup row>
			<FormControl variant="outlined" className={classes.formControl}>
				<InputLabel
					id={`${props.id}-select-string-label`}
					style={{ display: "none" }}
				>
					<Trans>{props.label}</Trans>
				</InputLabel>
				<Field
					component={Select}
					{...fieldProps}
					labelId={`${props.id}-select-string-label`}
					size="small"
				>
					{menuItems()}
				</Field>
			</FormControl>
		</FormGroup>
	);
};

const DropdownSelector = (props: MatchFieldProps) => {
	const { classes } = useStyles();
	const { matchOptions, ...fieldProps } = props;

	const menuItems = () => {
		const nodes: ReactNode[] = [];
		for (const [label, values] of Object.entries(matchOptions)) {
			const text = <Trans>{values.label}</Trans>;

			nodes.push(
				<MenuItem value={label} key={`${props.id}-select-string-item-${label}`}>
					{values.icon ? (
						<div style={{ display: "flex", alignItems: "center" }}>
							<ListItemIcon style={{ minWidth: 0 }}>{values.icon}</ListItemIcon>
							<ListItemText
								primary={text}
								style={{ marginTop: 0, marginBottom: 0 }}
							/>
						</div>
					) : (
						text
					)}
				</MenuItem>,
			);
		}
		return nodes;
	};

	const FieldMuiTextField = (props: any) => {
		const { field, form, ...fieldProps } = props;
		return <MuiTextField {...field} {...fieldProps} />;
	};

	return (
		<FormGroup row>
			<FormControl variant="outlined" className={classes.formControl}>
				<Field
					component={FieldMuiTextField}
					defaultValue=""
					{...fieldProps}
					select
					disabled={props.disabled}
					label={props.label}
					id={`${props.id}-dropdown-selector`}
					name={props.name}
					size="small"
				>
					{menuItems()}
				</Field>
			</FormControl>
		</FormGroup>
	);
};

// components: { component1: [version1, version2, ... versionN], ...componentN }
const ComponentsCell = (props: {
	value?: { [name: string]: string[] } | null;
}) => {
	const { i18n } = useLingui();
	const { value } = props;
	if (value) {
		const tooltipTitle: string[] = [];
		for (const [name, versionArray] of Object.entries(value)) {
			tooltipTitle.push(`${name} (${versionArray.join(", ")})`);
		}
		let cellValue = tooltipTitle[0];
		if (tooltipTitle.length > 1) {
			cellValue += " + " + i18n._(t`${tooltipTitle.length - 1} more`);
		}
		return (
			<Tooltip title={tooltipTitle.join(", ")} describeChild>
				<span>{cellValue}</span>
			</Tooltip>
		);
	}
	return <></>;
};

// cell requires full row data to get service/repo/scanid for generating scan link
const LastScanCell = (props: {
	row?: RowDef | null;
	format?: "short" | "long";
	includeLink?: boolean;
}) => {
	const { i18n } = useLingui();
	const { row, format = "short", includeLink = false } = props;
	const scan = row?.last_scan ?? row?.scan;

	let resultsUrl = null;
	if (includeLink && row?.service && row?.repo && scan?.scan_id) {
		resultsUrl = `/results?service=${encodeURIComponent(
			row.service,
		)}&repo=${encodeURIComponent(row.repo)}&id=${encodeURIComponent(
			row.scan.scan_id,
		)}`;
	}

	let cell = (
		<>
			<Trans>No Scans</Trans>
		</>
	);
	if (scan?.created) {
		cell = (
			<>
				<Tooltip
					title={formatDate(scan.created, "long")}
					describeChild
				>
					<span>{formatDate(scan.created, format)}</span>
				</Tooltip>
				{resultsUrl && (
					<Tooltip title={i18n._(t`Open this scan in a new tab`)}>
						<span>
							<IconButton
								size="small"
								aria-label={i18n._(t`Open this scan in a new tab`)}
								href={resultsUrl}
								target="_blank"
							>
								{<OpenInNewIcon fontSize="inherit" />}
							</IconButton>
						</span>
					</Tooltip>
				)}
			</>
		);
	}
	return cell;
};

// cell requires full row data to get service/repo/scanid for generating scan link
const LastQualifiedScanCell = (props: {
	row?: RowDef | null;
	format?: "short" | "long";
	includeLink?: boolean;
}) => {
	const { i18n } = useLingui();
	const { row, format = "short", includeLink = false } = props;
	const qualifiedScan = row?.last_qualified_scan ?? row?.qualified_scan;

	let resultsUrl = null;
	if (includeLink && row?.service && row?.repo && qualifiedScan?.scan_id) {
		resultsUrl = `/results?service=${encodeURIComponent(
			row.service,
		)}&repo=${encodeURIComponent(row.repo)}&id=${encodeURIComponent(
			row.qualified_scan.scan_id,
		)}`;
	}

	let cell = (
		<>
			<Trans>No Qualified Scans</Trans>
		</>
	);
	if (qualifiedScan?.created) {
		cell = (
			<>
				<Tooltip
					title={formatDate(qualifiedScan.created, "long")}
					describeChild
				>
					<span>{formatDate(qualifiedScan.created, format)}</span>
				</Tooltip>
				{resultsUrl && (
					<Tooltip title={i18n._(t`Open this scan in a new tab`)}>
						<span>
							<IconButton
								size="small"
								aria-label={i18n._(t`Open this scan in a new tab`)}
								href={resultsUrl}
								target="_blank"
							>
								{<OpenInNewIcon fontSize="inherit" />}
							</IconButton>
						</span>
					</Tooltip>
				)}
			</>
		);
	}
	return cell;
};

// licenses: [{id, name}, {id, name}, ...]
const LicensesCell = (props: { value?: ComponentLicense[] | null }) => {
	const { i18n } = useLingui();
	const { value } = props;

	if (value && Array.isArray(value) && value.length) {
		// use the human-readable license name field ("name", not "id")
		const licenseNames = value.map((license) => license?.name ?? "");
		let cellValue = licenseNames[0];
		if (licenseNames.length > 1) {
			cellValue += " + " + i18n._(t`${licenseNames.length - 1} more`);
		}
		return (
			<Tooltip title={licenseNames.join(", ")} describeChild>
				<span>{cellValue}</span>
			</Tooltip>
		);
	}
	return <></>;
};

// plugins: [plugin1, plugin2, ... pluginN]
const PluginsCell = (props: { value?: string[] | null }) => {
	const { i18n } = useLingui();
	const { value } = props;

	if (value) {
		const pluginNames = value.map((plugin) => {
			return plugin in pluginKeys && pluginKeys[plugin]?.displayName
				? pluginKeys[plugin].displayName
				: capitalize(plugin);
		});
		let cellValue = pluginNames[0];
		if (pluginNames.length > 1) {
			cellValue += " + " + i18n._(t`${pluginNames.length - 1} more`);
		}
		return (
			<Tooltip title={pluginNames.join(", ")} describeChild>
				<span>{cellValue}</span>
			</Tooltip>
		);
	}
	return <></>;
};

// vulnerabilities: [vuln_id1, vulnid_id2, ... vulnid_idN]
const VulnerabilitiesCell = (props: { value?: string[] | null }) => {
	const { i18n } = useLingui();
	const { value } = props;

	if (value && Array.isArray(value)) {
		let cellValue = value[0];
		if (value.length > 1) {
			cellValue += " + " + i18n._(t`${value.length - 1} more`);
		}
		return (
			<Tooltip title={value.join(", ")} describeChild>
				<span>{cellValue}</span>
			</Tooltip>
		);
	}
	return <></>;
};

// cell requires full row data to get service/repo for generating vcs link
const RepoCell = (props: { row?: RowDef | null }) => {
	const { row } = props;

	return (
		<>
			<Tooltip title={row?.repo ?? ""} describeChild>
				<span
					style={{
						maxWidth: "20rem", // limit field length for long service names
						width: "20rem",
						minWidth: "20rem",
						overflowWrap: "anywhere",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						overflow: "hidden",
					}}
				>
					{row?.repo ?? ""}
				</span>
			</Tooltip>
		</>
	);
};

const formatDateValue = (date?: Date | null) => {
	return date ? date.toJSON() : null;
};

interface AddQueryParams {
	[name: string]: any;
}

const getTableFilters = (values: AddQueryParams) => {
	// convert form field schema to API filters
	const filters: FilterDef = {};
	let queryParams: AddQueryParams = {};
	if (values.category === "vuln") {
		queryParams = getVulnQueryValues(values);
	} else {
		queryParams = { ...values };
	}
	for (const [k, v] of Object.entries(queryParams)) {
		if (!(k.endsWith("_match") || k.endsWith("_to"))) {
			const matcher = values[`${k}_match`] ?? "exact";
			/* FUTURE
			const toValue = formatDateValue(values[`${k}_to`]);
			*/

			let value = v;
			if (Object.prototype.toString.call(v) === "[object Date]") {
				value = formatDateValue(v);
			}

			switch (matcher) {
				case "lt": {
					if (value) {
						filters[k] = {
							match: "lt",
							filter: value,
						};
					}
					break;
				}
				case "gt": {
					if (value) {
						filters[k] = {
							match: "gt",
							filter: value,
						};
					}
					break;
				}
				/* FUTURE
				case "bt": {
					if (value) {
						filters[k] = {
							match: "bt",
							filter: [value, toValue],
						};
					}
					break;
				}
				*/
				case "exact": {
					if (value && (!Array.isArray(value) || value.length)) {
						filters[k] = {
							match: "exact",
							filter: Array.isArray(value) ? [...value] : value,
						};
					}
					break;
				}
				case "icontains": {
					if (value) {
						filters[k] = {
							match: "icontains",
							filter: value,
						};
					}
					break;
				}
				case "null": {
					filters[k] = {
						match: "null",
						filter: "true", // API uses a boolean, must have a value set or field gets removed from query
					};
					break;
				}
				case "notnull": {
					filters[k] = {
						match: "null",
						filter: "false", // API uses a boolean, must have a value set or field gets removed from query
					};
					break;
				}
			}
		}
	}
	delete filters["category"]; // not an api filter, used by web form to determine which search filters to show
	return filters;
};

const NoResults = (props: { title: string }) => (
	<Paper elevation={2}>
		<Typography align="center" style={{ fontStyle: "italic", padding: "2em" }}>
			{props.title}
		</Typography>
	</Paper>
);

const FiltersForm = (props: {
	category: SearchCategoryT;
	onSubmit: (values: any) => void;
	submitting: boolean;
	formValues: SearchFiltersT;
	formRef: React.Ref<FormikProps<SearchFiltersT>>;
	setValid: (isValid: boolean) => void;
	schema: any;
}) => {
	const {
		category,
		onSubmit,
		submitting,
		formValues,
		formRef,
		setValid,
		schema,
	} = props;

	const handleSubmit = (values: SearchFiltersT, actions: any) => {
		console.debug("search form submitted");
		try {
			const validValues: any = schema.validateSync(values, {
				strict: false, // setting to false will trim fields on validate
			});
			onSubmit(validValues);
		} catch (err) {
			handleException(err);
		}
		actions.setSubmitting(false);
	};

	// refs don't notify parent when there are changes, so we can't check ref.current.isValid
	// so define our own validation function that calls the same methods as Formik schema validate
	// and sets a validation state variable we can track
	const validate = async (values: any) => {
		try {
			await validateYupSchema(values, schema);
			setValid(true);
		} catch (err: any) {
			if (err.name === "ValidationError") {
				yupToFormErrors(err);
				setValid(false);
			}
		}
		return;
	};

	return (
		<Formik
			initialValues={formValues}
			enableReinitialize={true}
			validateOnMount={true}
			validationSchema={schema}
			onSubmit={handleSubmit}
			validate={validate}
			innerRef={formRef}
		>
			{({ values, errors, touched, setFieldValue }) => (
				<Form noValidate autoComplete="off" name={`form-search-${category}`}>
					<Grid
						container
						spacing={2}
						alignItems="stretch"
						direction="row"
						justifyContent="flex-start"
					>
						<FormFields
							category={category}
							values={values}
							errors={errors}
							touched={touched}
							submitting={submitting}
							setFieldValue={setFieldValue}
						/>
					</Grid>
				</Form>
			)}
		</Formik>
	);
};

const ComponentFiltersForm = (props: {
	onSubmit: (values: any) => void;
	submitting: boolean;
	formValues: SearchFiltersT;
	formRef: React.Ref<FormikProps<SearchFiltersT>>;
	setValid: (isValid: boolean) => void;
}) => {
	const { i18n } = useLingui();

	const matchLicenseSchema = (message: string) => {
		return Yup.string()
			.trim()
			.oneOf(["null", "notnull", "icontains", "exact"], message);
	};

	const schema = Yup.object({
		name_match: matchStringSchema(i18n._(t`Invalid component name matcher`)),
		name: Yup.string()
			.trim()
			.max(
				COMPONENT_NAME_LENGTH,
				i18n._(
					t`Component name must be less than ${COMPONENT_NAME_LENGTH} characters`,
				),
			),
		version_match: matchStringSchema(
			i18n._(t`Invalid component version matcher`),
		),
		version: Yup.string()
			.trim()
			.max(
				COMPONENT_VERSION_LENGTH,
				i18n._(
					t`Component version must be less than ${COMPONENT_VERSION_LENGTH} characters`,
				),
			),
		license_match: matchLicenseSchema(i18n._(t`Invalid license matcher`)),
		license: Yup.string()
			.trim()
			.max(
				COMPONENT_LICENSE_LENGTH,
				i18n._(
					t`Component license must be less than ${COMPONENT_LICENSE_LENGTH} characters`,
				),
			),
		service_match: matchStringSchema(i18n._(t`Invalid service matcher`)),
		service: serviceSchema().nullable(),
		repo_match: matchStringSchema(i18n._(t`Invalid repository matcher`)),
		repo: repoSchema(),
		last_scan_match: matchDateSchema(i18n._(t`Invalid scan time matcher`)),
		last_scan: Yup.date()
			.typeError(
				i18n._(t`Invalid date format, expected: yyyy/MM/dd HH:mm (24-hour)`),
			)
			.nullable()
			.default(null)
			.max(getMaxDate(), i18n._(t`Scan time can not be in the future`)),
		/* FUTURE:
		last_scan_to: Yup.date()
			.typeError(i18n._(t`Invalid date format, expected: yyyy/MM/dd HH:mm (24-hour)`))
			.nullable()
			.default(null)
			.max(getMaxDate(), i18n._(t`Scan time can not be in the future`)),
			*/
	}).defined();

	/* FUTURE support for "between" scan times
		.test(
			// these checks are applied as tests on the object instead of in a .where clause on each field
			// so that we don't get a circular dependency checking last_scan on last_scan_to field and visa-versa
			"last_scan_to-notnull",
			i18n._(t`Required when filtering between two scan times`),
			function ({ last_scan_match, last_scan_to }, testContext) {
				if (last_scan_match === "bt" && !last_scan_to) {
					// instead of returning false here, create our own error so that we can "assign" this error to the
					// associated field (last_scan_to)
					return testContext.createError({
						path: "last_scan_to",
						message: i18n._(t`Required when comparing two scan times`),
					});
				}
				return true;
			}
		)
		.test(
			"last_scan-notnull",
			i18n._(t`Required when filtering between two scan times`),
			function ({ last_scan_match, last_scan }, testContext) {
				if (last_scan_match === "bt" && !last_scan) {
					return testContext.createError({
						path: "last_scan",
						message: i18n._(t`Required when filtering between two scan times`),
					});
				}
				return true;
			}
		)
		.test(
			"last_scan-max",
			i18n._(t`First scan time must be before second scan time`),
			function ({ last_scan_match, last_scan, last_scan_to }, testContext) {
				if (
					last_scan_match === "bt" &&
					last_scan &&
					last_scan_to &&
					last_scan >= last_scan_to
				) {
					return testContext.createError({
						path: "last_scan",
						message: i18n._(t`First scan time must be before second scan time`),
					});
				}
				return true;
			}
		)
		.test(
			"last_scan_to-min",
			i18n._(t`Second scan time must be after first scan time`),
			function ({ last_scan_match, last_scan, last_scan_to }, testContext) {
				if (
					last_scan_match === "bt" &&
					last_scan &&
					last_scan_to &&
					last_scan_to <= last_scan
				) {
					return testContext.createError({
						path: "last_scan_to",
						message: i18n._(t`Second scan time must be after first scan time`),
					});
				}
				return true;
			}
		);
		*/

	return <FiltersForm category="component" schema={schema} {...props} />;
};

const RepoFiltersForm = (props: {
	onSubmit: (values: any) => void;
	submitting: boolean;
	formValues: SearchFiltersT;
	formRef: React.Ref<FormikProps<SearchFiltersT>>;
	setValid: (isValid: boolean) => void;
}) => {
	const { i18n } = useLingui();

	const riskSchema = Yup.string()
		.trim()
		.oneOf(RiskValues, i18n._(t`Invalid risk`));

	const schema = Yup.object({
		service_match: matchStringSchema(i18n._(t`Invalid service matcher`)),
		service: serviceSchema().nullable(),
		repo_match: matchStringSchema(i18n._(t`Invalid repository matcher`)),
		repo: repoSchema(),
		cicd_tool: cicdToolSchema(),
		risk: Yup.array().of(riskSchema).ensure(), // ensures an array, even when 1 value
		last_scan_match: matchNullDateSchema(
			i18n._(t`Invalid last qualified scan time matcher`),
		),
		last_scan: Yup.date()
			.typeError(
				i18n._(t`Invalid date format, expected: yyyy/MM/dd HH:mm (24-hour)`),
			)
			.nullable()
			.default(null)
			.max(getMaxDate(), i18n._(t`Scan time can not be in the future`)),
		last_qualified_scan_match: matchNullDateSchema(
			i18n._(t`Invalid last qualified scan time matcher`),
		),
		last_qualified_scan: Yup.date()
			.typeError(
				i18n._(t`Invalid date format, expected: yyyy/MM/dd HH:mm (24-hour)`),
			)
			.nullable()
			.default(null)
			.max(getMaxDate(), i18n._(t`Scan time can not be in the future`)),
		/* FUTURE
		last_qualified_scan_to: Yup.date()
			.typeError(i18n._(t`Invalid date format, expected: yyyy/MM/dd HH:mm (24-hour)`))
			.nullable()
			.default(null)
			.max(getMaxDate(), i18n._(t`Scan time can not be in the future`)),
			*/
	})
		.concat(metaSchema())
		.defined();

	/* FUTURE: for comparing "between" 2 scan times
		.test(
			// these checks are applied as tests on the object instead of in a .where clause on each field
			// so that we don't get a circular dependency checking last_scan on last_scan_to field and visa-versa
			"last_qualified_scan_to-notnull",
			i18n._(t`Required when filtering between two scan times`),
			function (
				{ last_qualified_scan_match, last_qualified_scan_to },
				testContext
			) {
				if (last_qualified_scan_match === "bt" && !last_qualified_scan_to) {
					// instead of returning false here, create our own error so that we can "assign" this error to the
					// associated field (last_scan_to)
					return testContext.createError({
						path: "last_qualified_scan_to",
						message: i18n._(t`Required when comparing two scan times`),
					});
				}
				return true;
			}
		)
		.test(
			"last_qualified_scan-notnull",
			i18n._(t`Required when filtering between two scan times`),
			function (
				{ last_qualified_scan_match, last_qualified_scan },
				testContext
			) {
				if (last_qualified_scan_match === "bt" && !last_qualified_scan) {
					return testContext.createError({
						path: "last_qualified_scan",
						message: i18n._(t`Required when filtering between two scan times`),
					});
				}
				return true;
			}
		)
		.test(
			"last_qualified_scan-max",
			i18n._(t`First scan time must be before second scan time`),
			function (
				{
					last_qualified_scan_match,
					last_qualified_scan,
					last_qualified_scan_to,
				},
				testContext
			) {
				if (
					last_qualified_scan_match === "bt" &&
					last_qualified_scan &&
					last_qualified_scan_to &&
					last_qualified_scan >= last_qualified_scan_to
				) {
					return testContext.createError({
						path: "last_qualified_scan",
						message: i18n._(t`First scan time must be before second scan time`),
					});
				}
				return true;
			}
		)
		.test(
			"last_qualified_scan_to-min",
			i18n._(t`Second scan time must be after first scan time`),
			function (
				{
					last_qualified_scan_match,
					last_qualified_scan,
					last_qualified_scan_to,
				},
				testContext
			) {
				if (
					last_qualified_scan_match === "bt" &&
					last_qualified_scan &&
					last_qualified_scan_to &&
					last_qualified_scan_to <= last_qualified_scan
				) {
					return testContext.createError({
						path: "last_qualified_scan_to",
						message: i18n._(t`Second scan time must be after first scan time`),
					});
				}
				return true;
			}
		);
		*/

	return <FiltersForm category="repo" schema={schema} {...props} />;
};

const VulnFiltersForm = (props: {
	onSubmit: (values: any) => void;
	submitting: boolean;
	formValues: SearchFiltersT;
	formRef: React.Ref<FormikProps<SearchFiltersT>>;
	setValid: (isValid: boolean) => void;
}) => {
	const { i18n } = useLingui();

	const pluginSchema = Yup.string()
		.trim()
		.oneOf(PluginValues, i18n._(t`Invalid plugin`));

	const severitySchema = Yup.string()
		.trim()
		.oneOf(
			["null", "", "low", "high", "critical", "medium", "negligible"],
			i18n._(t`Invalid severity`),
		);
	const schema = Yup.object({
		vuln_id_match: matchStringSchema(
			i18n._(t`Invalid vulnerability id matcher`),
		),
		vuln_id: Yup.string()
			.trim()
			.max(
				VULN_ID_LENGTH,
				i18n._(
					t`Vulnerability id must be less than ${VULN_ID_LENGTH} characters`,
				),
			),
		description_match: matchStringSchema(
			i18n._(t`Invalid description matcher`),
		),
		description: Yup.string()
			.trim()
			.max(
				DESCRIPTION_LENGTH,
				i18n._(
					t`Description must be less than ${DESCRIPTION_LENGTH} characters`,
				),
			),
		remediation_match: matchStringSchema(
			i18n._(t`Invalid remediation matcher`),
		),
		remediation: Yup.string()
			.trim()
			.max(
				REMEDIATION_LENGTH,
				i18n._(
					t`Remediation must be less than ${REMEDIATION_LENGTH} characters`,
				),
			),
		severity: Yup.array().of(severitySchema).ensure(), // ensures an array, even when 1 value
		component_name_match: matchStringSchema(
			i18n._(t`Invalid component name matcher`),
		),
		component_name: Yup.string()
			.trim()
			.max(
				COMPONENT_NAME_LENGTH,
				i18n._(
					t`Component name must be less than ${COMPONENT_NAME_LENGTH} characters`,
				),
			),
		component_version_match: matchStringSchema(
			i18n._(t`Invalid component version matcher`),
		),
		component_version: Yup.string()
			.trim()
			.max(
				COMPONENT_VERSION_LENGTH,
				i18n._(
					t`Component version must be less than ${COMPONENT_VERSION_LENGTH} characters`,
				),
			),
		plugin: Yup.array().of(pluginSchema).ensure(), // ensures an array, even when 1 value
	}).defined();

	return <FiltersForm category="vuln" schema={schema} {...props} />;
};

const ComponentRepoDialog = (props: {
	selectedRow: RowDef | null;
	onBack: () => void;
	onClose: () => void;
}) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { selectedRow, onBack, onClose } = props;
	const [submitting, setSubmitting] = useState(true); // load initial repos when accessing dialog page
	const [resultRows, setResultRows] = useState<RowDef[]>([]);
	const [totalRows, setTotalRows] = useState(0);
	const [rowsPerPage] = useState(10);
	const rowsPerPageOptions = [5, 10, 20];

	const onDataLoad = async (meta?: RequestMeta) => {
		try {
			const response = await client.getComponentRepos(
				selectedRow?.name,
				selectedRow?.version,
				{
					meta: {
						...meta,
						filters: {},
					},
				},
			);
			setResultRows([...response.results]);
			setTotalRows(response.count);
			return true;
		} catch (err: any) {
			handleException(err);
			return false;
		} finally {
			setSubmitting(false);
		}
	};

	const exportFetch = async (meta?: RequestMeta) => {
		const response = await client.getComponentRepos(
			selectedRow?.name,
			selectedRow?.version,
			{
				meta: {
					...meta,
					filters: {},
				},
			},
		);
		return response.results.map((r) => ({
			service: r.service,
			repo: r.repo,
			risk: r.risk,
		}));
	};

	const repoSearchResults = () => {
		const columns: ColDef[] = [
			{
				field: "service",
				headerName: i18n._(t`Service`),
				children: TooltipCell,
				bodyStyle: {
					maxWidth: "20rem", // limit field length for long service names
					width: "20rem",
					minWidth: "20rem",
					overflowWrap: "anywhere",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					overflow: "hidden",
				},
			},
			{
				field: "repo",
				headerName: i18n._(t`Repository`),
				children: RepoCell,
			},
			{
				field: "risk",
				headerName: i18n._(t`Risk`),
				children: RiskChip,
				sortable: false,
				// no orderMap, ordered backend by API
			},
			// component sub-repos don't have (last_)qualified_scan or application_metadata fields
		];

		return (
			<>
				<EnhancedTable
					id="_id"
					columns={columns}
					rows={resultRows}
					defaultOrderBy="service"
					disableRowClick={submitting}
					onDataLoad={onDataLoad}
					totalRows={totalRows}
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={rowsPerPageOptions}
					reloadCount={0}
					menuOptions={{
						exportFile: "search_component_repos",
						exportFormats: ["csv", "json"],
						exportFetch: exportFetch,
					}}
				/>
			</>
		);
	};

	return (
		<>
			<DialogContent dividers={true}>
				{submitting && <LinearProgress />}
				<Paper className={classes.tablePaper}>
					<Typography
						component="h2"
						variant="h6"
						align="center"
						className={classes.paperHeader}
					>
						<Trans>Repositories</Trans>
					</Typography>
					{totalRows === 0 && (
						<NoResults
							title={
								submitting
									? i18n._(t`Fetching repositories...`)
									: i18n._(t`No repositories match current filters`)
							}
						/>
					)}
					<div style={{ display: totalRows ? "initial" : "none" }}>
						{repoSearchResults()}
					</div>
				</Paper>
			</DialogContent>
			<DialogActions>
				<Box displayPrint="none" className={classes.dialogButtons}>
					<Button color="primary" onClick={() => onBack()}>
						<Trans>Details</Trans>
					</Button>

					<Button color="primary" onClick={() => onClose()}>
						<Trans>OK</Trans>
					</Button>
				</Box>
			</DialogActions>
		</>
	);
};

const VulnRepoDialog = (props: {
	selectedRow: RowDef | null;
	onBack: () => void;
	onClose: () => void;
}) => {
	const { classes } = useStyles();
	const theme = useTheme();
	const { i18n } = useLingui();
	const { selectedRow, onBack, onClose } = props;
	const [accordionExpanded, setAccordionExpanded] = useState(false);
	const repoFormRef = useRef<FormikProps<SearchFiltersT>>(null);
	const [submitting, setSubmitting] = useState(true); // load initial repos when accessing dialog page
	const [repoFormValid, setRepoFormValid] = useState(true);
	const [repoFormValues, setRepoFormValues] = useState<SearchFiltersT>({
		...initialRepoFilters,
	});
	const [resultRows, setResultRows] = useState<RowDef[]>([]);
	const [totalRows, setTotalRows] = useState(0);
	const [tableFilters, setTableFilters] = useState<FilterDef>({});
	const [rowsPerPage] = useState(10);
	const rowsPerPageOptions = [5, 10, 20];
	const [selectedRepoRow, setSelectedRepoRow] = useState<RowDef | null>(null);
	const containerRef = useRef(null);

	const onSubmit = (values: any) => {
		setTotalRows(0);
		setResultRows([]);
		setTableFilters(getTableFilters(values));
	};

	const handleReset = () => {
		onRepoRowSelect(null);
		setSubmitting(true);
		setTotalRows(0);
		setResultRows([]);
		setTableFilters({}); // reset to full repo list (no filters)
		setAccordionExpanded(false);
		if (repoFormRef.current) {
			setRepoFormValues({ ...initialRepoFilters });
			repoFormRef.current.handleReset();
		}
	};

	const handleSubmit = () => {
		if (repoFormRef.current) {
			setSubmitting(true);
			repoFormRef.current.handleSubmit();
		}
	};

	const setValid = (isValid: boolean) => {
		setRepoFormValid(isValid);
	};

	const onDataLoad = async (meta?: RequestMeta) => {
		try {
			const response = await client.getVulnerabilityRepos(selectedRow?.id, {
				meta: {
					...meta,
					filters: tableFilters,
				},
			});
			setResultRows([...response.results]);
			setTotalRows(response.count);
			return true;
		} catch (err: any) {
			handleException(err);
			return false;
		} finally {
			setSubmitting(false);
		}
	};

	const exportFetch = async (meta?: RequestMeta) => {
		const response = await client.getVulnerabilityRepos(selectedRow?.id, {
			meta: {
				...meta,
				filters: tableFilters,
			},
		});
		return response.results.map((r) => ({
			service: r.service,
			repo: r.repo,
			risk: r.risk,
			scan: r.scan,
			qualified_scan: r.qualified_scan,
			application_metadata: r.application_metadata,
		}));
	};

	const toCsv = (data: SearchRepo) => {
		const getScanUrl = (scan: Scan | null) => {
			if (
				data.service &&
				data.repo &&
				scan?.scan_id &&
				scan?.created
			) {
				return `${window.location.origin}/results?service=${encodeURIComponent(
					data.service,
				)}&repo=${encodeURIComponent(data.repo)}&id=${encodeURIComponent(
					scan.scan_id,
				)} (created ${scan.created})`;
			} else {
				return null;
			}
		}

		const scanUrl = getScanUrl(data.scan);
		const qualifiedScanUrl = getScanUrl(data.qualified_scan);

		return {
			service: data.service,
			repo: data.repo,
			risk: data.risk ?? "",
			scan: scanUrl,
			qualified_scan: qualifiedScanUrl,
			...exportMetaData(data.application_metadata),
		};
	};

	const onRepoRowSelect = (row: RowDef | null) => {
		// filter form dom removed when selecting a row
		// save form values, so form will be re-populated when row de-selected
		if (row && repoFormRef.current) {
			setRepoFormValues({ ...repoFormRef.current.values });
		}
		setSelectedRepoRow(row);
	};

	const repoSearchResults = () => {
		const columns: ColDef[] = [
			{
				field: "service",
				headerName: i18n._(t`Service`),
				children: TooltipCell,
				bodyStyle: {
					maxWidth: "20rem", // limit field length for long service names
					width: "20rem",
					minWidth: "20rem",
					overflowWrap: "anywhere",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					overflow: "hidden",
				},
			},
			{
				field: "repo",
				headerName: i18n._(t`Repository`),
				children: RepoCell,
			},
			{
				field: "risk",
				headerName: i18n._(t`Risk`),
				children: RiskChip,
				// no orderMap, ordered backend by API
			},
			{
				field: "scan",
				headerName: i18n._(t`Last Scan`),
				children: LastScanCell,
				sortable: false,
			},
			{
				field: "last_qualified_scan", // duplicated field from qualified_scan so matches filtering name
				headerName: i18n._(t`Last Qualified Scan`),
				children: LastQualifiedScanCell,
				sortable: false,
			},
		];

		return (
			<>
				<EnhancedTable
					id="_id"
					columns={columns}
					rows={resultRows}
					defaultOrderBy="service"
					onRowSelect={onRepoRowSelect}
					selectedRow={selectedRepoRow}
					disableRowClick={submitting}
					onDataLoad={onDataLoad}
					totalRows={totalRows}
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={rowsPerPageOptions}
					filters={tableFilters}
					menuOptions={{
						exportFile: "search_vuln_repos",
						exportFormats: ["csv", "json"],
						exportFetch: exportFetch,
						toCsv: toCsv,
					}}
				/>
			</>
		);
	};

	return (
		<>
			<DialogContent dividers={true}>
				<Paper
					className={classes.tablePaper}
					style={{ marginBottom: theme.spacing(3) }}
					ref={containerRef}
				>
					<Typography
						component="h2"
						variant="h6"
						align="center"
						className={classes.paperHeader}
					>
						<Trans>Repositories</Trans>
					</Typography>
					{selectedRepoRow ? (
						<Slide
							direction="up"
							in={Boolean(selectedRepoRow)}
							container={containerRef.current}
						>
							<Box>
								<IconButton
									aria-label={i18n._(t`Close repository details`)}
									onClick={() => onRepoRowSelect(null)}
									edge="end"
									size="small"
									style={{ float: "right" }}
								>
									<CloseIcon fontSize="small" />
								</IconButton>
								<RepoDialogContent selectedRow={selectedRepoRow} />
							</Box>
						</Slide>
					) : (
						<Box>
							<Accordion
								expanded={accordionExpanded}
								onChange={() => {
									setAccordionExpanded(!accordionExpanded);
								}}
							>
								<AccordionSummary
									expandIcon={<ExpandMoreIcon />}
									aria-controls="vuln-repos-search-filters-accordion"
									id="vuln-repos-search-filters-accordion"
								>
									<FilterListIcon style={{ marginRight: theme.spacing(2) }} />
									<Typography>
										<Trans>Search Filters</Trans>
									</Typography>
								</AccordionSummary>
								<Divider />
								<AccordionDetails>
									<div className={classes.accordionDetails}>
										<RepoFiltersForm
											onSubmit={onSubmit}
											submitting={submitting}
											formValues={repoFormValues}
											formRef={repoFormRef}
											setValid={setValid}
										/>
									</div>
								</AccordionDetails>
							</Accordion>

							{/* submit button is outside filter forms, so use an innerRef so we can access the various forms' handleSubmit functions */}
							<div className={classes.formButtons}>
								<Button
									className={classes.formButton}
									variant="contained"
									color="primary"
									startIcon={<SearchIcon />}
									disabled={submitting || !repoFormValid}
									onClick={() => {
										onRepoRowSelect(null);
										// only hide scan options when user clicks "Search", not when page loads with pre-populated search options
										// so user can see search options populated in form
										setAccordionExpanded(false);
										handleSubmit();
									}}
								>
									<Trans>Search</Trans>
								</Button>
								<Button
									type="reset"
									style={{ marginLeft: "auto" }}
									className={classes.formButton}
									variant="contained"
									color="primary"
									startIcon={<ReplayIcon />}
									onClick={() => handleReset()}
									disabled={submitting}
								>
									<Trans>Reset Filters</Trans>
								</Button>
							</div>
						</Box>
					)}
				</Paper>

				{submitting && <LinearProgress />}
				<Paper className={classes.tablePaper}>
					{totalRows === 0 && (
						<NoResults
							title={
								submitting
									? i18n._(t`Fetching results...`)
									: i18n._(t`No results match current filters`)
							}
						/>
					)}
					<div style={{ display: totalRows ? "initial" : "none" }}>
						{repoSearchResults()}
					</div>
				</Paper>
			</DialogContent>
			<DialogActions>
				<Box displayPrint="none" className={classes.dialogButtons}>
					<Button
						color="primary"
						onClick={() => {
							onRepoRowSelect(null);
							onBack();
						}}
					>
						<Trans>Details</Trans>
					</Button>

					<Button
						color="primary"
						onClick={() => {
							onRepoRowSelect(null);
							onClose();
						}}
					>
						<Trans>OK</Trans>
					</Button>
				</Box>
			</DialogActions>
		</>
	);
};

const ComponentDialogContent = (props: {
	selectedRow: RowDef | null;
	onClose: () => void;
}) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { selectedRow, onClose } = props;
	const [page, setPage] = useState(0);

	const handleBackClick = () => {
		setPage(0);
	};
	if (page > 0) {
		return (
			<ComponentRepoDialog
				selectedRow={selectedRow}
				onBack={handleBackClick}
				onClose={onClose}
			/>
		);
	}

	const licenseNames: string[] = selectedRow?.licenses
		? selectedRow.licenses.map(
				(license: ComponentLicense) => license?.name ?? "",
			)
		: [];

	return (
		<>
			<DialogContent dividers={true}>
				<Grid container spacing={3}>
					{/* left column */}
					<Grid size={6} className={classes.tabDialogGrid}>
						<List>
							<ListItem key="component-name">
								<ListItemText
									primary={
										<>
											{i18n._(t`Component Name`)}
											{selectedRow?.name && (
												<CustomCopyToClipboard copyTarget={selectedRow?.name} />
											)}
										</>
									}
									secondary={selectedRow?.name ?? ""}
								/>
							</ListItem>
							<ListItem key="component-version">
								<ListItemText
									primary={
										<>
											{i18n._(t`Component Version`)}
											{selectedRow?.version && (
												<CustomCopyToClipboard
													copyTarget={selectedRow?.version}
												/>
											)}
										</>
									}
									secondary={selectedRow?.version ?? ""}
								/>
							</ListItem>
						</List>
					</Grid>

					{/* right column */}
					<Grid size={6}>
						<List>
							<ListItem key="component-licenses">
								<ListItemText
									primary={
										<>
											{i18n._(t`Licenses`) + ` (${licenseNames.length})`}{" "}
											{licenseNames.length > 0 && (
												<CustomCopyToClipboard copyTarget={licenseNames} />
											)}
										</>
									}
									secondary={
										<ol className={classes.dialogListItems}>
											{licenseNames.map((license: string) => {
												return <li key={`license-${license}`}>{license}</li>;
											})}
										</ol>
									}
								/>
							</ListItem>
						</List>
					</Grid>
				</Grid>
			</DialogContent>
			<DialogActions>
				<Box displayPrint="none" className={classes.dialogButtons}>
					<Button color="primary" onClick={() => setPage(1)}>
						<Trans>Repositories</Trans>
					</Button>

					<Button color="primary" onClick={() => onClose()}>
						<Trans>OK</Trans>
					</Button>
				</Box>
			</DialogActions>
		</>
	);
};

const RepoDialogContent = (props: { selectedRow: RowDef | null }) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { selectedRow } = props;

	return (
		<>
			<span className={classes.repoRiskLink}>
				<RiskChip value={selectedRow?.risk} />{" "}
				<SourceCodeHotLink row={selectedRow} addTitle={true} />
			</span>
			<Grid container spacing={3}>
				{/* left column */}
				<Grid size={6} className={classes.tabDialogGrid}>
					<List>
						<ListItem key="repo-service">
							<ListItemText
								primary={
									<>
										{i18n._(t`Service`)}
										{selectedRow?.service && (
											<CustomCopyToClipboard
												copyTarget={selectedRow?.service}
											/>
										)}
									</>
								}
								secondary={selectedRow?.service ?? ""}
							/>
						</ListItem>
						<ListItem key="repo-repo">
							<ListItemText
								primary={
									<>
										{i18n._(t`Repository`)}
										{selectedRow?.repo && (
											<CustomCopyToClipboard copyTarget={selectedRow?.repo} />
										)}
									</>
								}
								secondary={selectedRow?.repo ?? ""}
							/>
						</ListItem>
						<SearchMetaField data={selectedRow} />
					</List>
				</Grid>

				{/* right column */}
				<Grid size={6}>
					<List>
						<ListItemMetaMultiField data={selectedRow} />
						<ListItem key="repo-last-scan">
							<ListItemText
								primary={<>{i18n._(t`Last Scan Time`)}</>}
								secondary={LastScanCell({
									row: selectedRow,
									format: "long",
									includeLink: true,
								})}
							/>
						</ListItem>
						<ListItem key="repo-last-qualified-scan">
							<ListItemText
								primary={<>{i18n._(t`Last Qualified Scan Time`)}</>}
								secondary={LastQualifiedScanCell({
									row: selectedRow,
									format: "long",
									includeLink: true,
								})}
							/>
						</ListItem>
					</List>
				</Grid>
			</Grid>
		</>
	);
};

const VulnDialogContent = (props: {
	selectedRow: RowDef | null;
	onClose: () => void;
}) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { selectedRow, onClose } = props;
	const [page, setPage] = useState(0);

	const handleBackClick = () => {
		setPage(0);
	};
	if (page > 0) {
		return (
			<VulnRepoDialog
				selectedRow={selectedRow}
				onBack={handleBackClick}
				onClose={onClose}
			/>
		);
	}

	const pluginNames: string[] = [];
	const pluginChips: React.ReactNode[] = [];
	const componentNames: string[] = [];

	if (selectedRow?.plugin && Array.isArray(selectedRow?.plugin)) {
		for (const plugin of selectedRow.plugin) {
			const pluginName =
				plugin in pluginKeys && pluginKeys[plugin]?.displayName
					? pluginKeys[plugin].displayName
					: capitalize(plugin);
			pluginNames.push(pluginName);
			pluginChips.push(
				<Chip
					className={classes.chipPlugins}
					key={`source-plugin-${plugin}`}
					label={pluginName}
					size="small"
				/>,
			);
		}
	}

	if (selectedRow?.components) {
		for (const [name, versionArray] of Object.entries(
			selectedRow?.components as VulnComponent,
		)) {
			componentNames.push(`${name} (${versionArray.join(", ")})`);
		}
	}

	return (
		<>
			<DialogContent dividers={true}>
				<span>
					<SeverityChip value={selectedRow?.severity} />
				</span>
				<Grid container spacing={3}>
					{/* left column */}
					<Grid size={6} className={classes.tabDialogGrid}>
						<List>
							<ListItem key="vuln-ids">
								<ListItemText
									primary={
										<>
											{i18n._(t`Vulnerability IDs`) +
												` (${selectedRow?.vuln_id.length})`}{" "}
											{selectedRow?.vuln_id.length > 0 && (
												<CustomCopyToClipboard
													copyTarget={selectedRow?.vuln_id.join(", ")}
												/>
											)}
										</>
									}
									secondary={
										<ol>
											{selectedRow?.vuln_id.map((id: string) => (
												<li key={`vuln-item-${id}`}>
													<VulnLink
														key={`vuln-link-${id}`}
														vulnId={id}
														addTitle={false}
														className={classes.advisoryIdLink}
													/>
												</li>
											))}
										</ol>
									}
								/>
							</ListItem>
							<ListItem key="vuln-description">
								<ListItemText
									primary={
										<>
											{i18n._(t`Description`)}
											{selectedRow?.description && (
												<CustomCopyToClipboard
													copyTarget={selectedRow?.description}
												/>
											)}
										</>
									}
									secondary={selectedRow?.description ?? ""}
								/>
							</ListItem>
							<ListItem key="vuln-remediation">
								<ListItemText
									primary={
										<>
											{i18n._(t`Remediation`)}
											{selectedRow?.remediation && (
												<CustomCopyToClipboard
													copyTarget={selectedRow?.remediation}
												/>
											)}
										</>
									}
									secondary={selectedRow?.remediation ?? ""}
								/>
							</ListItem>
						</List>
					</Grid>

					{/* right column */}
					<Grid size={6}>
						<ListItem key="vuln-components">
							<ListItemText
								primary={
									<>
										{i18n._(t`Components`) + ` (${componentNames.length})`}{" "}
										{componentNames.length > 0 && (
											<CustomCopyToClipboard copyTarget={componentNames} />
										)}
									</>
								}
								secondary={
									<ol className={classes.dialogListItems}>
										{componentNames.map((component: string) => {
											return (
												<li key={`component-${component}`}>{component}</li>
											);
										})}
									</ol>
								}
							/>
						</ListItem>
						<List>
							<ListItem key="vuln-source-plugins">
								<ListItemText
									primary={
										<>
											{i18n._(t`Discovered By Plugins`) +
												` (${pluginNames.length})`}{" "}
											{pluginNames.length > 0 && (
												<CustomCopyToClipboard copyTarget={pluginNames} />
											)}
										</>
									}
									secondary={pluginChips}
								/>
							</ListItem>
						</List>
					</Grid>
				</Grid>
			</DialogContent>
			<DialogActions>
				<Box displayPrint="none" className={classes.dialogButtons}>
					<Button color="primary" onClick={() => setPage(1)}>
						<Trans>Repositories</Trans>
					</Button>

					<Button color="primary" onClick={() => onClose()}>
						<Trans>OK</Trans>
					</Button>
				</Box>
			</DialogActions>
		</>
	);
};

const FormFields = (props: {
	category: SearchCategoryT;
	values: any;
	errors: FormikErrors<SearchFiltersT>;
	touched: FormikTouched<SearchFiltersT>;
	submitting: boolean;
	setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}) => {
	const { i18n } = useLingui();
	const theme = useTheme();
	const { classes } = useStyles();
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self"),
	); // current user is "self" id
	const { category, values, errors, touched, submitting, setFieldValue } =
		props;
	const fields: ReactNode[] = [];

	const filterOptions = createFilterOptions<any>();

	const getUserServices = () => {
		return [
			...new Set(
				currentUser?.scan_orgs
					? currentUser.scan_orgs.map((org) => org.split("/", 1)[0])
					: [],
			),
		];
	};

	const matchDate: MatcherT = {
		lt: {
			label: t`Before`,
		},
		gt: {
			label: t`After`,
		},
		/* FUTURE:
		bt: {
			label: t`Between`,
		},
		*/
	};
	const matchNullDate: MatcherT = {
		null: {
			label: t`No Qualified Scans`,
		},
		notnull: {
			label: t`Any Qualified Scan`,
		},
		...matchDate,
		/* FUTURE:
		bt: {
			label: t`Between`,
		},
		*/
	};
	const matchCicdTools: MatcherT = {
		"": {
			label: "None",
		},
	};
	supportedCicdTools.forEach(
		(item) =>
			(matchCicdTools[item.id] = {
				label: item.displayName,
				icon: <BuildCircle style={{ marginRight: theme.spacing(1) }} />,
			}),
	);
	const matchRisk: MatcherT = {
		/* FUTURE: include null (None)
		null: {
			label: t`None`,
			props: {
				variant: "outlined",
			},
		},
		*/
		low: {
			label: t`Low`,
			props: {
				className: classes.chipLow,
			},
		},
		moderate: {
			label: t`Moderate`,
			props: {
				className: classes.chipMedium,
			},
		},
		high: {
			label: t`High`,
			props: {
				className: classes.chipHigh,
			},
		},
		critical: {
			label: t`Critical`,
			props: {
				className: classes.chipCritical,
			},
		},
		priority: {
			label: t`Priority`,
			props: {
				className: classes.chipPriority,
			},
		},
	};
	const matchPlugins: MatcherT = {
		vulnerability: {
			label: GROUP_VULN,
			props: {
				group: "vulnPlugins",
				plugins: vulnPluginsObjects,
				icon: <SecurityIcon className={classes.scanFeaturesIcon} />,
			},
		},
	};
	const matchSeverity: MatcherT = {
		"": {
			label: t`None`,
			props: {
				variant: "outlined",
			},
		},
		negligible: {
			label: t`Negligible`,
			props: {
				className: classes.chipNegligible,
			},
		},
		low: {
			label: t`Low`,
			props: {
				className: classes.chipLow,
			},
		},
		medium: {
			label: t`Medium`,
			props: {
				className: classes.chipMedium,
			},
		},
		high: {
			label: t`High`,
			props: {
				className: classes.chipHigh,
			},
		},
		critical: {
			label: t`Critical`,
			props: {
				className: classes.chipCritical,
			},
		},
	};
	const matchString: MatcherT = {
		icontains: {
			label: t`Contains`,
		},
		exact: {
			label: t`Exact`,
		},
	};
	const matchLicense: MatcherT = {
		null: {
			label: t`No License`,
		},
		notnull: {
			label: t`Any License`,
		},
		...matchString,
	};

	const componentFields: FormFieldDef = {
		name_match: {
			id: "component-name-match",
			label: t`Component Name Match`,
			component: "MatchStringField",
			size: 3,
		},
		name: {
			id: "component-name",
			label: t`Component Name`,
			component: "TextField",
			icon: <SettingsIcon />,
			size: 9,
		},
		version_match: {
			id: "component-version-match",
			label: t`Component Version Match`,
			component: "MatchStringField",
			size: 3,
		},
		version: {
			id: "component-version",
			label: t`Component Version`,
			component: "TextField",
			icon: <Filter1Icon />,
			size: 9,
		},
		license_match: {
			id: "component-license-match",
			label: t`License Match`,
			component: "MatchStringField",
			matchOptions: matchLicense,
			size: 3,
		},
		license: {
			id: "component-license",
			label: t`License`,
			component: "TextField",
			icon: <DescriptionIcon />,
			size: 9,
		},
		service_match: {
			id: "component-service-match",
			label: t`Service Match`,
			component: "MatchStringField",
			size: 3,
		},
		service: {
			id: "component-service",
			label: t`Service`,
			component: "AutoCompleteField",
			size: 9,
			fieldProps: {
				options: getUserServices(),
				freeSolo: true,
				placeholder: i18n._(t`Select a service or enter a value to search for`),
				filterOptions: (
					options: string[],
					state: {
						inputValue: string;
						getOptionLabel: (option: string) => string;
					},
				) => {
					const filtered = filterOptions(options, state);
					// value not in services options, add it to the array
					if (state.inputValue !== "" && !filtered.includes(state.inputValue)) {
						filtered.push(state.inputValue);
					}
					return filtered;
				},
				InputProps: {
					startAdornment: (
						<InputAdornment
							position="start"
							style={{ paddingLeft: theme.spacing(1) }}
						>
							<CloudIcon />
						</InputAdornment>
					),
				},
			},
		},
		repo_match: {
			id: "component-repo-match",
			label: t`Repository Match`,
			component: "MatchStringField",
			size: 3,
		},
		repo: {
			id: "component-repo",
			label: t`Repository`,
			component: "TextField",
			icon: <FolderIcon />,
			size: 9,
		},
		last_scan_match: {
			id: "component-last-scan-match",
			label: t`Scan Time Match`,
			component: "MatchDateField",
			matchOptions: matchDate,
			size: 3,
		},
		last_scan: {
			id: "component-last-scan",
			label: t`Scan Time`,
			component: "KeyboardDateTimePickerField",
			size: 9,
			fieldProps: {
				disableFuture: true,
				maxDateMessage: i18n._(t`Scan time can not be in the future`),
			},
		},
		/* FUTURE: support for between 2 dates
		spacer_1: {
			id: "component-spacer1",
			label: "",
			component: "SpacerField",
			size: 3,
		},
		// 2nd date field must have same name as first field + _to suffix
		last_scan_to: {
			id: "component-last-scan-to",
			label: t`Scan Time`,
			component: "KeyboardDateTimePickerField",
			size: 9,
			fieldProps: {
				disableFuture: true,
				maxDateMessage: i18n._(t`Scan time can not be in the future`),
			},
		},
		*/
	};

	const repoFields: FormFieldDef = {
		service_match: {
			id: "repo-service-match",
			label: t`Service Match`,
			component: "MatchStringField",
			size: 3,
		},
		service: {
			id: "repo-service",
			label: t`Service`,
			component: "AutoCompleteField",
			size: 9,
			fieldProps: {
				options: getUserServices(),
				freeSolo: true,
				placeholder: i18n._(t`Select a service or enter a value to search for`),
				filterOptions: (
					options: string[],
					state: {
						inputValue: string;
						getOptionLabel: (option: string) => string;
					},
				) => {
					const filtered = filterOptions(options, state);
					// value not in services options, add it to the array
					if (state.inputValue !== "" && !filtered.includes(state.inputValue)) {
						filtered.push(state.inputValue);
					}
					return filtered;
				},
				InputProps: {
					startAdornment: (
						<InputAdornment
							position="start"
							style={{ paddingLeft: theme.spacing(1) }}
						>
							<CloudIcon />
						</InputAdornment>
					),
				},
			},
		},
		repo_match: {
			id: "repo-repo-match",
			label: t`Repository Match`,
			component: "MatchStringField",
			size: 3,
		},
		repo: {
			id: "repo-repo",
			label: t`Repository`,
			component: "TextField",
			icon: <FolderIcon />,
			size: 9,
		},
		...metaFields,
		spacer_1: {
			id: "repo-spacer1",
			label: "",
			component: "SpacerField",
			size: 3,
		},
		risk: {
			id: "repo-risk",
			label: t`Risk`,
			component: "MatchChipField",
			matchOptions: matchRisk,
			size: 9,
		},
		last_scan_match: {
			id: "repo-last-scan-match",
			label: t`Last Scan Time Match`,
			component: "MatchDateField",
			matchOptions: matchDate,
			size: 3,
		},
		last_scan: {
			id: "repo-last-scan",
			label: t`Last Scan Time`,
			component: "KeyboardDateTimePickerField",
			size: 9,
			fieldProps: {
				disableFuture: true,
				maxDateMessage: i18n._(t`Scan time can not be in the future`),
			},
		},
		last_qualified_scan_match: {
			id: "repo-last-qualified-scan-match",
			label: t`Last Qualified Scan Time Match`,
			component: "MatchDateField",
			matchOptions: matchNullDate,
			size: 3,
		},
		last_qualified_scan: {
			id: "repo-last-qualified-scan",
			label: t`Last Qualified Scan Time`,
			component: "KeyboardDateTimePickerField",
			size: 9,
			fieldProps: {
				disableFuture: true,
				maxDateMessage: i18n._(t`Scan time can not be in the future`),
			},
		},
		spacer_cicd: {
			id: "repo-spacer-cicd",
			label: "",
			component: "SpacerField",
			size: 3,
		},
		cicd_tool: {
			id: "repo-cicd-tool",
			label: t`CI/CD Tool`,
			component: "DropdownSelector",
			matchOptions: matchCicdTools,
			size: 9,
		},
		/* FUTURE: support for between 2 scans
		spacer_2: {
			id: "repo-spacer2",
			label: "",
			component: "SpacerField",
			size: 3,
		},
		// 2nd date field must have same name as first field + _to suffix
		last_qualified_scan_to: {
			id: "repo-last-qualified-scan-to",
			label: t`Last Qualified Scan Time`,
			component: "KeyboardDateTimePickerField",
			size: 9,
			fieldProps: {
				disableFuture: true,
				maxDateMessage: i18n._(t`Scan time can not be in the future`),
			},
		},
		*/
	};

	const vulnFields: FormFieldDef = {
		vuln_id_match: {
			id: "vuln-id-match",
			label: t`Vulnerability Match`,
			component: "MatchStringField",
			size: 3,
		},
		vuln_id: {
			id: "vuln-id",
			label: t`Vulnerability`,
			component: "TextField",
			icon: <SecurityIcon />,
			size: 9,
		},
		description_match: {
			id: "vuln-description-match",
			label: t`Description Match`,
			component: "MatchStringField",
			size: 3,
		},
		description: {
			id: "vuln-description",
			label: t`Description`,
			component: "TextField",
			icon: <SubjectIcon />,
			size: 9,
		},
		remediation_match: {
			id: "vuln-remediation-match",
			label: t`Remediation Match`,
			component: "MatchStringField",
			size: 3,
		},
		remediation: {
			id: "vuln-remediation",
			label: t`Remediation`,
			component: "TextField",
			icon: <GradingIcon />,
			size: 9,
		},
		spacer_1: {
			id: "vuln-spacer1",
			label: "",
			component: "SpacerField",
			size: 3,
		},
		severity: {
			id: "vuln-severity",
			label: t`Severity`,
			component: "MatchChipField",
			matchOptions: matchSeverity,
			size: 9,
		},
		component_name_match: {
			id: "vuln-component-name-match",
			label: t`Component Name Match`,
			component: "MatchStringField",
			size: 3,
		},
		component_name: {
			id: "vuln-component-name",
			label: t`Component Name`,
			component: "TextField",
			icon: <SettingsIcon />,
			size: 9,
		},
		component_version_match: {
			id: "vuln-component-version-match",
			label: t`Component Version Match`,
			component: "MatchStringField",
			size: 3,
		},
		component_version: {
			id: "vuln-component-version",
			label: t`Component Version`,
			component: "TextField",
			icon: <Filter1Icon />,
			size: 9,
		},
		spacer_2: {
			id: "vuln-spacer2",
			label: "",
			component: "SpacerField",
			size: 3,
		},
		plugin: {
			id: "vuln-plugin",
			label: t`Discovered by Plugin`,
			component: "MatchPluginsSelectorField",
			size: 9,
			matchOptions: matchPlugins,
		},
	};

	let fieldDef: FormFieldDef = componentFields;
	switch (category) {
		case "repo":
			fieldDef = repoFields;
			break;
		case "vuln":
			fieldDef = vulnFields;
			break;
	}

	const handleMouseDownClear = (event: { preventDefault: () => void }) => {
		event.preventDefault();
	};

	const handleOnClickClear = (name: string) => {
		setFieldValue(name, "", true);
	};

	for (const [name, props] of Object.entries(fieldDef)) {
		const fieldName = name as keyof SearchFiltersT;
		switch (props.component) {
			case "AutoCompleteField": {
				fields.push(
					<Grid size={props.size} key={`grid-item-autocomplete-${props.id}`}>
						<AutoCompleteField
							{...props?.fieldProps}
							id={props.id}
							name={name}
							size="small"
							disabled={submitting}
							label={i18n._(props.label)}
							classes={{
								paper: classes.autoComplete,
								option: classes.autoCompleteSelected,
							}}
							autoHighlight={true}
							variant="outlined"
							error={touched[fieldName] && !!errors[fieldName]}
							helperText={
								touched[fieldName] && !!errors[fieldName]
									? errors[fieldName]
									: ""
							}
							fullWidth
						/>
					</Grid>,
				);
				break;
			}

			case "DropdownSelector": {
				fields.push(
					<Grid size={props.size} key={`grid-item-chip-${props.id}`}>
						<DropdownSelector
							{...props?.fieldProps}
							id={props.id}
							name={name}
							disabled={submitting}
							label={i18n._(props.label)}
							variant="outlined"
							matchOptions={props?.matchOptions}
							fullWidth
						/>
					</Grid>,
				);
				break;
			}

			case "KeyboardDateTimePickerField": {
				// 2nd date field must have same name as first field + _to suffix
				const dateFrom = name.replace(/_to$/, "");
				const dateTo = `${dateFrom}_to`;
				const dateMatcher = `${dateFrom}_match`;
				fields.push(
					<Grid size={props.size} key={`grid-item-datetime-${props.id}`}>
						<Field
							{...props?.fieldProps}
							id={props.id}
							name={name}
							size="small"
							disabled={
								submitting ||
								values[dateMatcher] === "null" ||
								values[dateMatcher] === "notnull" ||
								(name === dateTo && values[dateMatcher] !== "bt")
							}
							label={i18n._(props.label)}
							style={{ width: "100%" }}
							component={DatePickerField}
							inputVariant="outlined"
							ampm={false}
							placeholder={i18n._(t`yyyy/MM/dd HH:mm (24-hour)`)}
							format="yyyy/LL/dd HH:mm"
							invalidDateMessage={i18n._(
								t`Invalid date format, expected: yyyy/MM/dd HH:mm (24-hour)`,
							)}
							mask="____/__/__ __:__"
						/>
					</Grid>,
				);
				break;
			}

			case "MatchChipField": {
				fields.push(
					<Grid size={props.size} key={`grid-item-chip-${props.id}`}>
						<MatchChipField
							{...props?.fieldProps}
							id={props.id}
							name={name}
							disabled={submitting}
							label={i18n._(props.label)}
							labelId
							variant="outlined"
							matchOptions={props?.matchOptions ?? matchSeverity}
							fullWidth
						/>
					</Grid>,
				);
				break;
			}

			case "MatchDateField": {
				fields.push(
					<Grid size={props.size} key={`grid-item-match-date-${props.id}`}>
						<MatchDateField
							{...props?.fieldProps}
							id={props.id}
							name={name}
							disabled={submitting}
							label={i18n._(props.label)}
							labelId
							variant="outlined"
							matchOptions={props?.matchOptions ?? matchDate}
							fullWidth
						/>
					</Grid>,
				);
				break;
			}

			case "MatchPluginsSelectorField": {
				fields.push(
					<Grid size={props.size} key={`grid-item-chip-${props.id}`}>
						<MatchPluginsSelectorField
							{...props?.fieldProps}
							id={props.id}
							name={name}
							disabled={submitting}
							label={i18n._(props.label)}
							matchOptions={props?.matchOptions ?? matchPlugins}
						/>
					</Grid>,
				);
				break;
			}

			case "MatchStringField": {
				fields.push(
					<Grid size={props.size} key={`grid-item-match-string-${props.id}`}>
						<MatchStringField
							{...props?.fieldProps}
							id={props.id}
							name={name}
							disabled={submitting}
							label={i18n._(props.label)}
							labelId
							variant="outlined"
							matchOptions={props?.matchOptions ?? matchString}
							fullWidth
						/>
					</Grid>,
				);
				break;
			}

			case "SpacerField": {
				fields.push(
					<Grid size={props.size} key={`grid-item-spacer-${props.id}`}></Grid>,
				);
				break;
			}

			case "TextField": {
				// disable field if matcher is "null"
				const matcher = `${name}_match`;
				fields.push(
					<Grid size={props.size} key={`grid-item-text-${props.id}`}>
						<Field
							{...props?.fieldProps}
							component={TextField}
							id={props.id}
							name={name}
							disabled={
								submitting ||
								values[matcher] === "null" ||
								values[matcher] === "notnull"
							}
							type="text"
							label={i18n._(props.label)}
							variant="outlined"
							size="small"
							fullWidth
							InputProps={{
								startAdornment: props?.icon && (
									<InputAdornment position="start">{props.icon}</InputAdornment>
								),
								endAdornment: values[name] && (
									<InputAdornment position="end">
										<IconButton
											aria-label={i18n._(t`Clear field`)}
											onClick={() => handleOnClickClear(name)}
											onMouseDown={handleMouseDownClear}
											edge="end"
											size="small"
										>
											<ClearIcon fontSize="small" />
										</IconButton>
									</InputAdornment>
								),
							}}
						/>
					</Grid>,
				);
				break;
			}
		}
	}
	return <>{fields}</>;
};

const SearchPage = () => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const location = useLocation();
	const theme = useTheme();
	const componentFormRef = useRef<FormikProps<SearchFiltersT>>(null);
	const repoFormRef = useRef<FormikProps<SearchFiltersT>>(null);
	const vulnFormRef = useRef<FormikProps<SearchFiltersT>>(null);
	const [submitting, setSubmitting] = useState(false);
	const [resultRows, setResultRows] = useState<RowDef[]>([]);
	const [totalRows, setTotalRows] = useState(0);
	const [rowsPerPage] = useState(50);
	const rowsPerPageOptions = [20, 50, 100];

	const componentQueryParamsSchema = Yup.object({
		name: Yup.string()
			.trim()
			.max(
				COMPONENT_NAME_LENGTH,
				i18n._(
					t`Component name must be less than ${COMPONENT_NAME_LENGTH} characters`,
				),
			),
		name__icontains: Yup.string()
			.trim()
			.max(
				COMPONENT_NAME_LENGTH,
				i18n._(
					t`Component name must be less than ${COMPONENT_NAME_LENGTH} characters`,
				),
			),
		version: Yup.string()
			.trim()
			.max(
				COMPONENT_VERSION_LENGTH,
				i18n._(
					t`Component version must be less than ${COMPONENT_VERSION_LENGTH} characters`,
				),
			),
		version__icontains: Yup.string()
			.trim()
			.max(
				COMPONENT_VERSION_LENGTH,
				i18n._(
					t`Component version must be less than ${COMPONENT_VERSION_LENGTH} characters`,
				),
			),
		license: Yup.string()
			.trim()
			.max(
				COMPONENT_LICENSE_LENGTH,
				i18n._(
					t`Component license must be less than ${COMPONENT_LICENSE_LENGTH} characters`,
				),
			),
		license__null: booleanStringSchema(
			i18n._(t`Component license null must be either "true" or "false"`),
		),
		license__icontains: Yup.string()
			.trim()
			.max(
				COMPONENT_LICENSE_LENGTH,
				i18n._(
					t`Component license must be less than ${COMPONENT_LICENSE_LENGTH} characters`,
				),
			),
		service: serviceSchema(),
		service__icontains: serviceSchema(),
		repo: repoSchema(),
		repo__icontains: repoSchema(),
		//last_scan__null: booleanStringSchema(i18n._(t`Scan time null must be either "true" or "false"`)), // not yet implemented
		last_scan__gt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`),
		),
		last_scan__lt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`),
		),
		/* FUTURE: support between 2 scans
		last_scan__bt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`)
		),
		last_scan_to: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`)
		),
		*/
	}).defined();

	/* FUTURE: support between 2 scans
		.test(
			"last_scan_to-notnull",
			i18n._(t`Required when filtering between two scan times`),
			function ({ last_scan__bt, last_scan_to }, testContext) {
				if (last_scan__bt && !last_scan_to) {
					return testContext.createError({
						path: "last_scan_to",
						message: i18n._(t`Required when comparing two scan times`),
					});
				}
				return true;
			}
		)
		.test(
			"last_scan__bt-max",
			i18n._(t`First scan time must be before second scan time`),
			function ({ last_scan__bt, last_scan_to }, testContext) {
				if (last_scan__bt && last_scan_to && last_scan__bt >= last_scan_to) {
					return testContext.createError({
						path: "last_scan__bt",
						message: i18n._(t`First scan time must be before second scan time`),
					});
				}
				return true;
			}
		)
		.test(
			"last_scan_to-min",
			i18n._(t`Second scan time must be after first scan time`),
			function ({ last_scan__bt, last_scan_to }, testContext) {
				if (last_scan__bt && last_scan_to && last_scan_to <= last_scan__bt) {
					return testContext.createError({
						path: "last_scan_to",
						message: i18n._(t`Second scan time must be after first scan time`),
					});
				}
				return true;
			}
		);
		*/

	const riskSchema = Yup.string()
		.trim()
		.oneOf(RiskValues, i18n._(t`Invalid risk`));

	const repoQueryParamsSchema = Yup.object({
		service: serviceSchema(),
		service__icontains: serviceSchema(),
		repo: repoSchema(),
		repo__icontains: repoSchema(),
		risk: Yup.array().of(riskSchema).ensure(), // ensures an array, even when 1 value
		last_scan__gt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`),
		),
		last_scan__lt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`),
		),
		last_qualified_scan__null: booleanStringSchema(
			i18n._(t`Scan time null must be either "true" or "false"`),
		),
		last_qualified_scan__gt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`),
		),
		last_qualified_scan__lt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`),
		),
		/* FUTURE: support between 2 scans
		last_qualified_scan__bt: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`)
		),
		last_qualified_scan_to: Yup.date().max(
			getMaxDate(),
			i18n._(t`Scan time can not be in the future`)
		),
		*/
	})
		.concat(metaQueryParamsSchema())
		.defined();

	/* FUTURE: support between 2 scans
		.test(
			"last_qualified_scan_to-notnull",
			i18n._(t`Required when filtering between two scan times`),
			function (
				{ last_qualified_scan__bt, last_qualified_scan_to },
				testContext
			) {
				if (last_qualified_scan__bt && !last_qualified_scan_to) {
					return testContext.createError({
						path: "last_qualified_scan_to",
						message: i18n._(t`Required when comparing two scan times`),
					});
				}
				return true;
			}
		)
		.test(
			"last_qualified_scan__bt-max",
			i18n._(t`First scan time must be before second scan time`),
			function (
				{ last_qualified_scan__bt, last_qualified_scan_to },
				testContext
			) {
				if (
					last_qualified_scan__bt &&
					last_qualified_scan_to &&
					last_qualified_scan__bt >= last_qualified_scan_to
				) {
					return testContext.createError({
						path: "last_qualified_scan__bt",
						message: i18n._(t`First scan time must be before second scan time`),
					});
				}
				return true;
			}
		)
		.test(
			"last_qualified_scan_to-min",
			i18n._(t`Second scan time must be after first scan time`),
			function (
				{ last_qualified_scan__bt, last_qualified_scan_to },
				testContext
			) {
				if (
					last_qualified_scan__bt &&
					last_qualified_scan_to &&
					last_qualified_scan_to <= last_qualified_scan__bt
				) {
					return testContext.createError({
						path: "last_qualified_scan_to",
						message: i18n._(t`Second scan time must be after first scan time`),
					});
				}
				return true;
			}
		);
		*/

	const severitySchema = Yup.string()
		.trim()
		.oneOf(
			["null", "", "low", "high", "critical", "medium", "negligible"],
			i18n._(t`Invalid severity`),
		);

	const pluginSchema = Yup.string()
		.trim()
		.oneOf(PluginValues, i18n._(t`Invalid plugin`));

	const vulnQueryParamsSchema = Yup.object({
		vuln_id: Yup.string()
			.trim()
			.max(
				VULN_ID_LENGTH,
				i18n._(
					t`Vulnerability id must be less than ${VULN_ID_LENGTH} characters`,
				),
			),
		vuln_id__icontains: Yup.string()
			.trim()
			.max(
				VULN_ID_LENGTH,
				i18n._(
					t`Vulnerability id must be less than ${VULN_ID_LENGTH} characters`,
				),
			),
		description: Yup.string()
			.trim()
			.max(
				DESCRIPTION_LENGTH,
				i18n._(
					t`Description must be less than ${DESCRIPTION_LENGTH} characters`,
				),
			),
		description__icontains: Yup.string()
			.trim()
			.max(
				DESCRIPTION_LENGTH,
				i18n._(
					t`Description must be less than ${DESCRIPTION_LENGTH} characters`,
				),
			),
		remediation: Yup.string()
			.trim()
			.max(
				REMEDIATION_LENGTH,
				i18n._(
					t`Remediation must be less than ${REMEDIATION_LENGTH} characters`,
				),
			),
		remediation__icontains: Yup.string()
			.trim()
			.max(
				REMEDIATION_LENGTH,
				i18n._(
					t`Remediation must be less than ${REMEDIATION_LENGTH} characters`,
				),
			),
		severity: Yup.array().of(severitySchema).ensure(), // ensures an array, even when 1 value
		component_name: Yup.string()
			.trim()
			.max(
				COMPONENT_NAME_LENGTH,
				i18n._(
					t`Component name must be less than ${COMPONENT_NAME_LENGTH} characters`,
				),
			),
		component_name__icontains: Yup.string()
			.trim()
			.max(
				COMPONENT_NAME_LENGTH,
				i18n._(
					t`Component name must be less than ${COMPONENT_NAME_LENGTH} characters`,
				),
			),
		component_version: Yup.string()
			.trim()
			.max(
				COMPONENT_VERSION_LENGTH,
				i18n._(
					t`Component version must be less than ${COMPONENT_VERSION_LENGTH} characters`,
				),
			),
		component_version__icontains: Yup.string()
			.trim()
			.max(
				COMPONENT_VERSION_LENGTH,
				i18n._(
					t`Component version must be less than ${COMPONENT_VERSION_LENGTH} characters`,
				),
			),
		plugin: Yup.array().of(pluginSchema).ensure(), // ensures an array, even when 1 value
	}).defined();

	const [accordionExpanded, setAccordionExpanded] = useState(true);
	const [componentFormValues, setComponentFormValues] =
		useState<SearchFiltersT>({ ...initialComponentFilters });
	const [repoFormValues, setRepoFormValues] = useState<SearchFiltersT>({
		...initialRepoFilters,
	});
	const [vulnFormValues, setVulnFormValues] = useState<SearchFiltersT>({
		...initialVulnFilters,
	});
	const [componentFormValid, setComponentFormValid] = useState(true);
	const [repoFormValid, setRepoFormValid] = useState(true);
	const [vulnFormValid, setVulnFormValid] = useState(true);
	const [reloadCount, setReloadCount] = useState(0);
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const [tableFilters, setTableFilters] = useState<FilterDef>({});

	type CategoryT = {
		[name: string]: {
			label: string;
			component?: React.ReactNode;
			schema: any;
			initialValues: SearchFiltersT;
			setValues: Dispatch<SetStateAction<SearchFiltersT>>;
		};
	};
	const searchCategories: CategoryT = {
		component: {
			label: t`Components or Licenses`,
			component: (
				<Box className={classes.categoryNodes}>
					<SettingsIcon style={{ marginRight: theme.spacing(2) }} />
					<Trans>Components or Licenses</Trans>
				</Box>
			),
			schema: componentQueryParamsSchema,
			initialValues: initialComponentFilters,
			setValues: setComponentFormValues,
		},
		repo: {
			label: t`Repositories`,
			component: (
				<Box className={classes.categoryNodes}>
					<FolderIcon style={{ marginRight: theme.spacing(2) }} />
					<Trans>Repositories</Trans>
				</Box>
			),
			schema: repoQueryParamsSchema,
			initialValues: initialRepoFilters,
			setValues: setRepoFormValues,
		},
		vuln: {
			label: t`Vulnerabilities`,
			component: (
				<Box className={classes.categoryNodes}>
					<SecurityIcon style={{ marginRight: theme.spacing(2) }} />
					<Trans>Vulnerabilities</Trans>
				</Box>
			),
			schema: vulnQueryParamsSchema,
			initialValues: initialVulnFilters,
			setValues: setVulnFormValues,
		},
	};

	const searchCategorySchema = Yup.object({
		category: Yup.string()
			.trim()
			.required(i18n._(t`Required`))
			.oneOf(Object.keys(searchCategories), i18n._(t`Invalid category`))
			.defined(),
	}).defined();

	const [searchCategory, setSearchCategory] = useState<string>(
		Object.keys(searchCategories)[0] as string,
	);

	// sort plugin array into separate arrays for each plugin category
	// and set category enabled if all plugins in that category are enabled
	// translates plugin passed in url params to form values used by PluginsSelector component
	const getVulnSearchParams = (values: VulnFiltersT) => {
		const queryValues: any = {};
		const pluginsVuln: string[] = [];

		// copy-over each key
		for (const [k, v] of Object.entries(values)) {
			if (k === "plugin" && Array.isArray(v)) {
				// add each plugin to corresponding category array
				for (const plugin of v) {
					if (plugin in vulnPluginsKeys) {
						pluginsVuln.push(plugin);
					}
				}
			}
			queryValues[k] = v;
		}

		queryValues.vulnPlugins = [...pluginsVuln];

		// set categories if all plugins in that category are selected
		queryValues.vulnerability = pluginsVuln.length === vulnPlugins.length;

		// unused by pluginsselector, set empty
		queryValues.plugin = [];
		return queryValues;
	};

	const getSearchParams = (): SearchFiltersT | null => {
		if (location?.search) {
			const search = queryString.parse(location.search);
			if (Object.keys(search)) {
				try {
					// schema validation coerces values to correct types
					const category = searchCategorySchema.validateSync(search, {
						strict: false, // trim fields
					});
					if (category.category && category.category in searchCategories) {
						let values: any = {
							...searchCategories[category.category].initialValues,
						};
						const validValues = searchCategories[
							category.category
						].schema.validateSync(search, {
							strict: false, // trim fields
							stripUnknown: true, // remove any keys we don't support in our validation schema, e.g. last_scan__unsupported=value
						});
						// no valid url params
						if (Object.keys(validValues).length === 0) {
							return null;
						}
						// convert url query string schema to form field schema
						// query string schema combines field+matcher as field__matcher
						// form field schema splits these into separate fields
						for (const [k, v] of Object.entries(validValues)) {
							let [name, matcher] = k.split("__"); // field__matcher
							const matchName = `${name}_match`; // name already validated against schema
							if (name in values) {
								if (Array.isArray(v)) {
									values[name] = [...v];
								} else if (matcher === "null") {
									// convert queryparam __null=false => internal matcher, "notnull"
									// otherwise, assume __null= also means _null=true => internal matcher "null"
									if (typeof v === "string" && v === "false") {
										matcher = "notnull";
									}
								} else {
									// for null matcher, don't set a value, just use the default (blank) initial value
									// for the field type (e.g. null for date, "" for string)
									values[name] = v;
								}
							}
							if (matchName in values) {
								// if there's no matcher, it's an exact match (field=value)
								values[matchName] = matcher ?? "exact";
							}
						}
						if (values.category === "vuln") {
							values = getVulnSearchParams(values);
						}
						return values;
					}
				} catch (err) {
					return null;
				}
			}
		}
		return null;
	};

	type FetchCallbackT = ({
		meta,
		customConfig,
	}: Client) => Promise<
		SearchComponentsResponse | SearchReposResponse | SearchVulnsResponse
	>;

	const onDataLoad = async (meta?: RequestMeta) => {
		let fetchFn: FetchCallbackT = client.getComponents;
		switch (searchCategory) {
			case "repo":
				fetchFn = client.getRepos;
				break;
			case "vuln":
				fetchFn = client.getVulnerabilities;
				break;
		}

		try {
			const response = await fetchFn({
				meta: {
					...meta,
					filters: tableFilters,
				},
			});
			setResultRows([...response.results]);
			setTotalRows(response.count);
			return true;
		} catch (err: any) {
			handleException(err);
			return false;
		} finally {
			setSubmitting(false);
		}
	};

	const exportFetch = async (meta?: RequestMeta) => {
		const config = {
			meta: {
				...meta,
				filters: tableFilters,
			},
		};
		switch (searchCategory) {
			case "repo": {
				const response = await client.getRepos(config);
				return response.results.map((r) => ({
					service: r.service,
					repo: r.repo,
					risk: r.risk,
					scan: r.scan,
					qualified_scan: r.qualified_scan,
					application_metadata: r.application_metadata,
				}));
			}
			case "vuln": {
				const response = await client.getVulnerabilities(config);
				return response.results.map((r) => ({
					id: r.id,
					advisory_ids: r.advisory_ids,
					description: r.description,
					severity: r.severity,
					remediation: r.remediation,
					components: r.components,
					source_plugins: r.source_plugins,
				}));
			}
			default: {
				const response = await client.getComponents(config);
				return response.results.map((r) => ({
					name: r.name,
					version: r.version,
					licenses: r.licenses,
				}));
			}
		}
	};

	const componentToCsv = (data: SearchComponent) => ({
		name: data.name,
		version: data.version,
		licenses: data.licenses.map((license) => license.name).join(", "),
	});

	const repoToCsv = (data: SearchRepo) => {
		const getScanUrl = (scan: Scan | null) => {
			if (
				data.service &&
				data.repo &&
				scan?.scan_id &&
				scan?.created
			) {
				return `${window.location.origin}/results?service=${encodeURIComponent(
					data.service,
				)}&repo=${encodeURIComponent(data.repo)}&id=${encodeURIComponent(
					scan.scan_id,
				)} (created ${scan.created})`;
			} else {
				return null;
			}
		}

		let scanUrl = getScanUrl(data.scan);
		let qualifiedScanUrl = getScanUrl(data.qualified_scan);

		return {
			service: data.service,
			repo: data.repo,
			risk: data.risk ?? "",
			scan: scanUrl,
			qualified_scan: qualifiedScanUrl,
			...exportMetaData(data.application_metadata),
		};
	};

	const vulnToCsv = (data: SearchVulnerability) => {
		const components = [];
		for (const [name, versions] of Object.entries(data.components)) {
			components.push(`${name} (${versions.join(", ")})`);
		}
		const allPlugins = {
			...secretPluginsKeys,
			...staticPluginsKeys,
			...techPluginsKeys,
			...vulnPluginsKeys,
			...sbomPluginsKeys,
		};
		return {
			id: data.id,
			advisory_ids: data.advisory_ids.join(", "),
			description: data.description,
			severity: data.severity,
			remediation: data.remediation,
			components: components.join(", "),
			source_plugins: data.source_plugins
				.map((p) => (p in allPlugins ? allPlugins[p].displayName : p))
				.sort()
				.join(", "),
		};
	};

	useEffect(() => {
		document.title = i18n._(t`Artemis - Search`);
	}, [i18n]);

	const handleReset = (category: string) => {
		navigate("/search", { replace: true }); // reset query params
		setTotalRows(0);
		setResultRows([]);
		setReloadCount(0);
		setAccordionExpanded(true);
		switch (category) {
			case "component": {
				if (componentFormRef.current) {
					// set to empty values, not values that may have come from query params
					setComponentFormValues({ ...initialComponentFilters });
					componentFormRef.current.handleReset();
				}
				break;
			}
			case "repo": {
				if (repoFormRef.current) {
					setRepoFormValues({ ...initialRepoFilters });
					repoFormRef.current.handleReset();
				}
				break;
			}
			case "vuln": {
				if (vulnFormRef.current) {
					setVulnFormValues({ ...initialVulnFilters });
					vulnFormRef.current.handleReset();
				}
				break;
			}
		}
	};

	const handleSubmit = (category: string) => {
		switch (category) {
			case "component": {
				if (componentFormRef.current) {
					setSubmitting(true);
					componentFormRef.current.handleSubmit();
				}
				break;
			}
			case "repo": {
				if (repoFormRef.current) {
					setSubmitting(true);
					repoFormRef.current.handleSubmit();
				}
				break;
			}
			case "vuln": {
				if (vulnFormRef.current) {
					setSubmitting(true);
					vulnFormRef.current.handleSubmit();
				}
				break;
			}
		}
	};

	const handleSearchCategoryChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (typeof event.target.value === "string") {
			const category = event.target.value;
			handleReset(category);
			setSearchCategory(category);
		}
	};

	const searchCategoryNodes = () => {
		const nodes: React.ReactNode[] = [];
		for (const [category, values] of Object.entries(searchCategories)) {
			nodes.push(
				<MenuItem value={category} key={`select-item-${category}`}>
					{values?.component ? values.component : <Trans>{values.label}</Trans>}
				</MenuItem>,
			);
		}
		return nodes;
	};

	const addQueryParams = (values: AddQueryParams) => {
		// convert form field schema to url query string schema
		let queryValues: AddQueryParams = {};
		for (const [k, v] of Object.entries(values)) {
			if (!(k.endsWith("_match") || k.endsWith("_to"))) {
				const matcher = values[`${k}_match`] ?? "exact";
				/* FUTURE:
				const toValue = formatDateValue(values[`${k}_to`]);
				*/

				let value = v;
				if (Object.prototype.toString.call(v) === "[object Date]") {
					value = formatDateValue(v);
				}

				switch (matcher) {
					case "lt": {
						if (value) {
							queryValues[`${k}__lt`] = value;
						}
						break;
					}
					case "gt": {
						if (value) {
							queryValues[`${k}__gt`] = value;
						}
						break;
					}
					/* FUTURE: for comparing between 2 scans
					case "bt": {
						if (value) {
							queryValues[`${k}__bt`] = value;
							queryValues[`${k}_to`] = toValue;
						}
						break;
					}
					*/
					case "exact": {
						if (value && (!Array.isArray(value) || value.length)) {
							queryValues[k] = Array.isArray(value) ? [...value] : value;
						}
						break;
					}
					case "icontains": {
						if (value) {
							queryValues[`${k}__icontains`] = value;
						}
						break;
					}
					case "null": {
						queryValues[`${k}__null`] = "true";
						break;
					}
					case "notnull": {
						queryValues[`${k}__null`] = "false";
						break;
					}
				}
			}
		}
		if (values.category === "vuln") {
			queryValues = getVulnQueryValues(queryValues);
		}
		const search = queryString.stringify({ ...queryValues });
		navigate("/search?" + search); // add search options to url query params
	};

	const onSubmit = (values: any) => {
		setTotalRows(0);
		setResultRows([]);
		addQueryParams(values); // these are validated values from validateSync in handleSubmit()
		setTableFilters(getTableFilters(values));
		// initiate a table reload. table has to initiate calling onDataLoad so it can pass-in current page & other table details
		setReloadCount((priorCount) => (priorCount += 1));
	};

	useEffect(() => {
		const searchParams = getSearchParams();
		if (searchParams) {
			console.debug("restoring prior form state");
			if (searchParams.category && searchParams.category in searchCategories) {
				setSearchCategory(searchParams.category);
				searchCategories[searchParams.category].setValues(searchParams);
				setSubmitting(true);
				// searchParams validated in getSearchParams, don't need to call schema.validateSync again
				// call onSubmit directly instead of form handleSubmit to ensure searchParams values are used in submission instead of current form values
				onSubmit(searchParams);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const searchFilters = () => {
		return (
			<div>
				{searchCategory === "component" && (
					<ComponentFiltersForm
						onSubmit={onSubmit}
						submitting={submitting}
						formValues={componentFormValues}
						formRef={componentFormRef}
						setValid={(isValid: boolean) => setComponentFormValid(isValid)}
					/>
				)}
				{searchCategory === "repo" && (
					<RepoFiltersForm
						onSubmit={onSubmit}
						submitting={submitting}
						formValues={repoFormValues}
						formRef={repoFormRef}
						setValid={(isValid: boolean) => setRepoFormValid(isValid)}
					/>
				)}
				{searchCategory === "vuln" && (
					<VulnFiltersForm
						onSubmit={onSubmit}
						submitting={submitting}
						formValues={vulnFormValues}
						formRef={vulnFormRef}
						setValid={(isValid: boolean) => setVulnFormValid(isValid)}
					/>
				)}
			</div>
		);
	};

	const onRowSelect = (row: RowDef | null) => {
		setSelectedRow(row);
	};

	const handleDialogClose = () => {
		onRowSelect(null);
	};

	const componentSearchResults = () => {
		const columns: ColDef[] = [
			{
				field: "name",
				headerName: i18n._(t`Name`),
				bodyStyle: {
					maxWidth: "20rem", // limit field length for long component names
					width: "20rem",
					minWidth: "20rem",
					overflowWrap: "anywhere",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					overflow: "hidden",
				},
			},
			{
				field: "version",
				headerName: i18n._(t`Version`),
			},
			{
				field: "licenses",
				headerName: i18n._(t`Licenses`),
				children: LicensesCell,
				sortable: false,
			},
		];

		return (
			<>
				<EnhancedTable
					id="_id"
					columns={columns}
					rows={resultRows}
					defaultOrderBy="name"
					onRowSelect={onRowSelect}
					selectedRow={selectedRow}
					disableRowClick={submitting}
					onDataLoad={onDataLoad}
					totalRows={totalRows}
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={rowsPerPageOptions}
					filters={tableFilters}
					menuOptions={{
						exportFile: "search_components",
						exportFormats: ["csv", "json"],
						exportFetch: exportFetch,
						toCsv: componentToCsv,
					}}
				/>
				<DraggableDialog
					open={!!selectedRow}
					onClose={() => onRowSelect(null)}
					title={
						selectedRow?.name && selectedRow?.version
							? `${selectedRow.name}-${selectedRow.version}`
							: i18n._(t`Component`)
					}
					copyTitle={true}
					maxWidth="lg"
					fullWidth={true}
				>
					<ComponentDialogContent
						selectedRow={selectedRow}
						onClose={handleDialogClose}
					/>
				</DraggableDialog>
			</>
		);
	};

	const repoSearchResults = () => {
		const columns: ColDef[] = [
			{
				field: "service",
				headerName: i18n._(t`Service`),
				children: TooltipCell,
				bodyStyle: {
					maxWidth: "20rem", // limit field length for long service names
					width: "20rem",
					minWidth: "20rem",
					overflowWrap: "anywhere",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					overflow: "hidden",
				},
			},
			{
				field: "repo",
				headerName: i18n._(t`Repository`),
				children: RepoCell,
			},
			{
				field: "risk",
				headerName: i18n._(t`Risk`),
				children: RiskChip,
				// no orderMap, ordered backend by API
			},
			{
				field: "scan",
				headerName: i18n._(t`Last Scan`),
				children: LastScanCell,
				sortable: false,
			},
			{
				field: "last_qualified_scan", // duplicated field from qualified_scan so matches filtering name
				headerName: i18n._(t`Last Qualified Scan`),
				children: LastQualifiedScanCell,
				sortable: false,
			},
		];

		return (
			<>
				<EnhancedTable
					id="_id"
					columns={columns}
					rows={resultRows}
					defaultOrderBy="service"
					onRowSelect={onRowSelect}
					selectedRow={selectedRow}
					disableRowClick={submitting}
					onDataLoad={onDataLoad}
					totalRows={totalRows}
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={rowsPerPageOptions}
					filters={tableFilters}
					menuOptions={{
						exportFile: "search_repos",
						exportFormats: ["csv", "json"],
						exportFetch: exportFetch,
						toCsv: repoToCsv,
					}}
				/>
				<DraggableDialog
					open={!!selectedRow}
					onClose={() => onRowSelect(null)}
					title={selectedRow?.repo ?? i18n._(t`Repository`)}
					copyTitle={true}
					maxWidth="md"
					fullWidth={true}
					content={<RepoDialogContent selectedRow={selectedRow} />}
				/>
			</>
		);
	};

	const vulnSearchResults = () => {
		let dialogTitle =
			selectedRow?.vuln_id &&
			Array.isArray(selectedRow?.vuln_id) &&
			selectedRow?.vuln_id.length
				? selectedRow.vuln_id[0]
				: i18n._(t`Vulnerability`);
		if (selectedRow?.vuln_id.length > 1) {
			dialogTitle += " + " + i18n._(t`${selectedRow?.vuln_id.length - 1} more`);
		}

		// no vuln results fields are sortable
		const columns: ColDef[] = [
			{
				field: "vuln_id",
				headerName: i18n._(t`Vulnerabilities`),
				children: VulnerabilitiesCell,
				sortable: false,
			},
			{
				field: "severity",
				headerName: i18n._(t`Severity`),
				children: SeverityChip,
				sortable: false,
			},
			{
				field: "components",
				headerName: i18n._(t`Components`),
				children: ComponentsCell,
				sortable: false,
			},
			{
				field: "plugin",
				headerName: i18n._(t`Discovered By Plugins`),
				children: PluginsCell,
				sortable: false,
			},
		];

		return (
			<>
				<EnhancedTable
					id="id"
					columns={columns}
					rows={resultRows}
					onRowSelect={onRowSelect}
					selectedRow={selectedRow}
					disableRowClick={submitting}
					onDataLoad={onDataLoad}
					totalRows={totalRows}
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={rowsPerPageOptions}
					filters={tableFilters}
					menuOptions={{
						exportFile: "search_vulns",
						exportFormats: ["csv", "json"],
						exportFetch: exportFetch,
						toCsv: vulnToCsv,
					}}
				/>
				<DraggableDialog
					open={!!selectedRow}
					onClose={() => onRowSelect(null)}
					title={dialogTitle}
					copyTitle={true}
					maxWidth="lg"
					fullWidth={true}
				>
					<VulnDialogContent
						selectedRow={selectedRow}
						onClose={handleDialogClose}
					/>
				</DraggableDialog>
			</>
		);
	};

	const searchResults = () => {
		let table = <></>;
		if (reloadCount) {
			switch (searchCategory) {
				case "component":
					table = componentSearchResults();
					break;
				case "repo":
					table = repoSearchResults();
					break;
				case "vuln":
					table = vulnSearchResults();
					break;
			}
		}
		return (
			<>
				{totalRows === 0 && (
					<NoResults
						title={
							submitting
								? i18n._(t`Fetching results...`)
								: i18n._(t`No results match current filters`)
						}
					/>
				)}
				<div style={{ display: totalRows ? "initial" : "none" }}>{table}</div>
			</>
		);
	};

	return (
		<>
			<Container>
				<Box displayPrint="none">
					<Button
						startIcon={<ArrowBackIosIcon />}
						onClick={() => {
							navigate(-1);
						}}
						className={classes.backButton}
					>
						<Trans>Back</Trans>
					</Button>
				</Box>

				<Paper
					className={classes.tablePaper}
					style={{ marginBottom: theme.spacing(3) }}
				>
					<Typography
						component="h2"
						variant="h6"
						align="center"
						className={classes.paperHeader}
					>
						<Trans>Search</Trans>
					</Typography>

					<Box>
						<FormGroup row>
							<FormControl
								variant="outlined"
								style={{ minWidth: "18em", marginBottom: theme.spacing(2) }}
							>
								<MuiTextField
									select
									label={i18n._(t`Search For`)}
									disabled={submitting}
									id="category"
									name="category"
									value={searchCategory}
									onChange={handleSearchCategoryChange}
									autoFocus
								>
									{searchCategoryNodes()}
								</MuiTextField>
							</FormControl>
						</FormGroup>
					</Box>

					<Accordion
						expanded={accordionExpanded}
						onChange={() => {
							setAccordionExpanded(!accordionExpanded);
						}}
					>
						<AccordionSummary
							expandIcon={<ExpandMoreIcon />}
							aria-controls="search-filters-accordion"
							id="search-filters-accordion"
						>
							<FilterListIcon style={{ marginRight: theme.spacing(2) }} />
							<Typography>
								<Trans>Search Filters</Trans>
							</Typography>
						</AccordionSummary>
						<Divider />
						<AccordionDetails>
							<div className={classes.accordionDetails}>{searchFilters()}</div>
						</AccordionDetails>
					</Accordion>

					{/* submit button is outside filter forms, so use an innerRef so we can access the various forms' handleSubmit functions */}
					<div className={classes.formButtons}>
						<Button
							className={classes.formButton}
							variant="contained"
							color="primary"
							startIcon={<SearchIcon />}
							disabled={
								submitting ||
								!componentFormValid ||
								!repoFormValid ||
								!vulnFormValid
							}
							onClick={() => {
								// only hide search options when user clicks "Search", not when page loads with pre-populated search options
								// so user can see search options populated in form
								setAccordionExpanded(false);
								handleSubmit(searchCategory);
							}}
						>
							<Trans>Search</Trans>
						</Button>
						<Button
							type="reset"
							style={{ marginLeft: "auto" }}
							className={classes.formButton}
							variant="contained"
							color="primary"
							startIcon={<ReplayIcon />}
							onClick={() => handleReset(searchCategory)}
							disabled={submitting}
						>
							<Trans>Reset Filters</Trans>
						</Button>
					</div>
				</Paper>

				{submitting && <LinearProgress />}
				<Paper className={classes.tablePaper}>
					<Typography
						component="h2"
						variant="h6"
						align="center"
						className={classes.paperHeader}
					>
						<Trans>Results</Trans>
						{totalRows > 0 && (
							<CustomCopyToClipboard
								icon="share"
								size="small"
								copyTarget={window.location.href}
								copyLabel={i18n._(t`Copy link to these search results`)}
							/>
						)}
					</Typography>

					{searchResults()}
				</Paper>
			</Container>
		</>
	);
};

export default SearchPage;
