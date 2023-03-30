import React, {
	useState,
	useEffect,
	useRef,
	ChangeEvent,
	useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	Location,
	NavigateFunction,
	useNavigate,
	useLocation,
} from "react-router-dom";
import { DateTime } from "luxon";
import { Formik, Form, Field, FormikHelpers } from "formik";
import { Select, TextField } from "formik-mui";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	AlertTitle,
	Badge,
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Chip,
	// horizontally center page content
	Container,
	DialogActions,
	DialogContent,
	Divider,
	Fab,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormLabel,
	Grid,
	IconButton,
	InputAdornment,
	InputLabel,
	LinearProgress,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	MenuItem,
	Paper,
	Tabs,
	Tab,
	TextField as MuiTextField,
	Toolbar,
	Tooltip,
	Typography,
	Theme,
	Zoom,
	InputBaseComponentProps,
	CircularProgress,
} from "@mui/material";
import { keyframes } from "tss-react";
import { makeStyles, withStyles } from "tss-react/mui";
import { useTheme } from "@mui/material/styles";
import createPalette from "@mui/material/styles/createPalette";
import {
	AccountTree as AccountTreeIcon,
	AddCircleOutline as AddCircleOutlineIcon,
	ArrowBackIos as ArrowBackIosIcon,
	Assessment as AssessmentIcon,
	AssignmentLate as AssignmentLateIcon,
	AssignmentTurnedIn as AssignmentTurnedInIcon,
	Autorenew as AutorenewIcon,
	BugReport as BugReportIcon,
	Category as CategoryIcon,
	Clear as ClearIcon,
	Cloud as CloudIcon,
	Code as CodeIcon,
	CreateNewFolder as CreateNewFolderIcon,
	Delete as DeleteIcon,
	Edit as EditIcon,
	ErrorOutlineOutlined as ErrorOutlinedIcon,
	ExpandMore as ExpandMoreIcon,
	Extension as ExtensionIcon,
	FactCheck as FactCheckIcon,
	FilterList as FilterListIcon,
	Folder as FolderIcon,
	FolderOff as FolderOffIcon,
	Help as HelpIcon,
	History as HistoryIcon,
	Info as InfoIcon,
	Inventory as InventoryIcon,
	Layers as LayersIcon,
	LowPriority as LowPriorityIcon,
	OpenInNew as OpenInNewIcon,
	Person as PersonIcon,
	PlayCircleOutline as PlayCircleOutlineIcon,
	Queue as QueueIcon,
	ReportProblemOutlined as ReportProblemOutlinedIcon,
	SaveAlt as SaveAltIcon,
	Security as SecurityIcon,
	Tune as TuneIcon,
	Visibility as VisibilityIcon,
	VisibilityOff as VisibilityOffIcon,
	VpnKey as VpnKeyIcon,
	WatchLater as WatchLaterIcon,
} from "@mui/icons-material";
import {
	Cell,
	Label,
	Legend,
	PieChart,
	Pie,
	ResponsiveContainer,
	Tooltip as ChartTooltip,
} from "recharts";
import { useLingui } from "@lingui/react";
import { Trans, t, plural } from "@lingui/macro";
import * as Yup from "yup";
import queryString from "query-string";

import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
// https://github.com/react-syntax-highlighter/react-syntax-highlighter/issues/221#issuecomment-566502780
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";
import {
	a11yDark,
	atomDark,
	coy,
	dracula,
	materialDark,
	materialLight,
	materialOceanic,
	nord,
	okaidia,
	prism,
	solarizedlight,
	vs,
} from "react-syntax-highlighter/dist/cjs/styles/prism";

import client, {
	FilterDef,
	handleException,
	HiddenFindingsRequest,
} from "api/client";
import { AppDispatch } from "app/store";
import {
	colorCritical,
	colorHigh,
	colorMedium,
	colorLow,
	colorNegligible,
} from "app/colors";
import {
	capitalize,
	compareButIgnoreLeadingDashes,
	DELETED_REGEX,
	exportToJson,
	formatDate,
	vcsHotLink,
} from "utils/formatters";
import { RootState } from "app/rootReducer";
import DraggableDialog from "components/DraggableDialog";
import { ExpiringDateTimeCell } from "components/DateTimeCell";
import DatePickerField from "components/FormikPickers";
import WelcomeDialog from "components/WelcomeDialog";
import ExportDialogContent from "custom/ExportDialogContent";
import {
	addHiddenFinding,
	clearHiddenFindings,
	deleteHiddenFinding,
	getHiddenFindings,
	resetStatus,
	selectAllHiddenFindings,
	selectTotalHiddenFindings,
	updateHiddenFinding,
} from "features/hiddenFindings/hiddenFindingsSlice";
import { addNotification } from "features/notifications/notificationsSlice";
import {
	getScanById,
	clearScans,
	selectScanById,
} from "features/scans/scansSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";
import {
	HiddenFinding,
	HiddenFindingType,
	HiddenFindingTypeValues,
} from "features/hiddenFindings/hiddenFindingsSchemas";
import {
	AnalysisFinding,
	AnalysisReport,
	SbomReport,
	ScanCategories,
	ScanErrors,
	SecretFinding,
	SecretFindingResult,
	SeverityLevels,
} from "features/scans/scansSchemas";
import EnhancedTable, {
	ColDef,
	OrderMap,
	RowDef,
} from "components/EnhancedTable";
import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import ListItemMetaMultiField from "custom/ListItemMetaMultiField";
import ResultsMetaField from "custom/ResultsMetaField";
import MailToLink from "components/MailToLink";
import { User } from "features/users/usersSchemas";
import TooltipCell from "components/TooltipCell";
import { SeverityChip } from "components/ChipCell";
import {
	pluginCatalog,
	pluginKeys,
	isFeatureDisabled,
	getFeatureName,
	secretPlugins,
	staticPlugins,
	techPlugins,
	sbomPlugins,
	vulnPlugins,
	configPlugins,
} from "app/scanPlugins";
import { PREFIX_NVD, STORAGE_LOCAL_EXPORT_ACKNOWLEDGE } from "app/globals";
import { startScan } from "pages/MainPage";

// generates random Material-UI palette colors we use for graphs
// after imports to make TypeScript happy
const randomMC = require("random-material-color");

SyntaxHighlighter.registerLanguage("json", json);

const TAB_OVERVIEW = 0;
const TAB_VULN = 1;
const TAB_ANALYSIS = 2;
const TAB_SECRET = 3;
const TAB_INVENTORY = 4;
const TAB_RAW = 5;
const TAB_HIDDEN = 6;
const TAB_CONFIG = 7;
const TAB_MIN = TAB_OVERVIEW; // lowest tab
const TAB_MAX = TAB_CONFIG; // highest tab

const COMMIT_LENGTH = 40;
const COMPONENT_LENGTH = 120;
const DESCRIPTION_LENGTH = 500;
const FILEPATH_LENGTH = 120;
const LINE_MAX = 9999999999;
const LINE_LENGTH = 10;
const NAME_LENGTH = 128;
const RESOURCE_LENGTH = 40;
const VULN_ID_LENGTH = 120;

export const FILTER_PREFIX_ANALYSIS = "sa_";
export const FILTER_PREFIX_CONFIG = "cg_";
export const FILTER_PREFIX_HIDDEN = "hf_";
export const FILTER_PREFIX_SECRET = "st_";
export const FILTER_PREFIX_VULN = "vn_";

const severitySchema = (message: string) =>
	Yup.string()
		.trim()
		.oneOf(["negligible", "low", "medium", "high", "critical"], message);

const StyledBadge = withStyles(Badge, (theme: Theme) => ({
	badge: {
		right: -3,
		top: 13,
		border: `0.125rem solid ${theme.palette.background.paper}`,
		padding: "0 0.25rem",
	},
}));

const RedButton = withStyles(Button, (theme: Theme) => ({
	root: {
		color: theme.palette.getContrastText(theme.palette.error.main),
		backgroundColor: theme.palette.error.main,
		"&:hover": {
			backgroundColor: theme.palette.error.dark,
		},
	},
}));

const useStyles = makeStyles()((theme) => ({
	accordionDetails: {
		display: "block",
	},
	accordionSummary: {
		height: 0,
		minHeight: "2.5rem",
		"&.Mui-expanded": {
			minHeight: "2.5rem",
		},
	},
	alert: {
		width: theme.spacing(64),
	},
	alertIconError: {
		fill: theme.palette.error.main,
	},
	alertIconWarning: {
		fill: theme.palette.warning.main,
	},
	alertPopup: {
		position: "absolute", // floating over content
		zIndex: 100,
		width: "100%",
		"& > .MuiAlert-action": {
			alignItems: "flex-start",
		},
	},
	// the following alertText classes don't use [error|warning].light
	alertTextError: {
		color:
			theme.palette.mode === "dark" ? "rgb(250, 179, 174)" : "rgb(97, 26, 21)",
	},
	alertTextWarning: {
		color:
			theme.palette.mode === "dark" ? "rgb(255, 213, 153)" : "rgb(102, 60, 0)",
	},
	alertContainer: {
		display: "flex",
		justifyContent: "center",
	},
	chipPlugins: {
		marginRight: theme.spacing(0.5),
		marginBottom: theme.spacing(0.5),
	},
	chartTooltip: {
		border: "1px solid white",
		opacity: 0.9,
		background: "rgba(97, 97, 97, 0.92)",
		color: "#fff",
	},
	dialogButtons: {
		"& > :not(:first-of-type)": {
			marginLeft: theme.spacing(1),
		},
	},
	divider: {
		marginTop: theme.spacing(3),
		marginBottom: theme.spacing(3),
	},
	fieldError: {
		color: theme.palette.error.main,
	},
	filterField: {
		height: "2.75em",
	},
	filterGroup: {
		gap: theme.spacing(1),
	},
	findingDetails: {
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	findingDetailsBox: {
		marginTop: theme.spacing(2),
	},
	findingDetailsLabel: {
		fontWeight: "bold",
		marginRight: theme.spacing(1),
		minWidth: "20rem",
	},
	findingDetailsValueAny: {
		fontStyle: "italic",
	},
	findingFormField: {
		marginTop: theme.spacing(1),
	},
	findingFormStringField: {
		marginLeft: theme.spacing(1),
		width: "55%",
	},
	findingFormSelectField: {
		marginTop: theme.spacing(2),
	},
	findingHelpList: {
		margin: 0,
	},
	formControl: {
		marginRight: theme.spacing(2),
	},
	heading: {
		fontSize: theme.typography.pxToRem(15),
		fontWeight: theme.typography.fontWeightRegular as any,
	},
	helpIcon: {
		marginRight: theme.spacing(1),
	},
	// truncate long items in summary section + add ellipsis
	listItemText: {
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	listItemTextWrapped: {
		whiteSpace: "pre-wrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	longListItemText: {
		whiteSpace: "nowrap",
		overflowX: "hidden",
		overflowY: "auto",
		maxHeight: "5rem",
		textOverflow: "ellipsis",
	},
	metaDataList: {
		paddingLeft: "1em",
	},
	navButtons: {
		marginBottom: theme.spacing(1),
		"& > *": {
			marginLeft: theme.spacing(2),
		},
	},
	numberedList: {
		paddingLeft: 0,
		listStyle: "inside decimal",
	},
	overviewCard: {
		marginTop: theme.spacing(1),
		height: "22rem",
	},
	ocContainer: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		height: "15rem",
	},
	ocExtraTextArea: {
		textOverflow: "ellipsis",
		overflow: "hidden",
		whiteSpace: "nowrap",
		marginLeft: "0.3rem",
		marginRight: "0.3rem",
	},
	ocTitle: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	ocTitleIcon: {
		paddingRight: theme.spacing(0.5),
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	oneHundredPercent: { width: "100%", height: "100%" },
	paper: {
		marginBottom: theme.spacing(3),
		padding: theme.spacing(2),
	},
	paperHeader: {
		marginBottom: theme.spacing(2),
	},
	pieInnerLabel: {
		fill: theme.palette.text.primary,
	},
	rawToolbar: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(2),
		paddingLeft: theme.spacing(3),
		paddingBottom: theme.spacing(1),
	},
	refreshSpin: {
		animation: `${keyframes`
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
		`} 1.4s linear infinite`,
	},
	resultsError: {
		color: theme.palette.error.main,
		borderColor: theme.palette.error.main,
		fill: theme.palette.error.main,
	},
	resultsSuccess: {
		color: theme.palette.success.main,
		borderColor: theme.palette.success.main,
		fill: theme.palette.success.main,
	},
	scanErrorAlert: {
		marginBottom: "1px",
		marginLeft: theme.spacing(1),
		marginRight: theme.spacing(1),
		padding: "0 12px",
	},
	scanErrorsContainer: {
		height: "auto",
		maxHeight: "8.5rem",
		overflowY: "auto",
	},
	scanMessagesAccordionDetails: {
		padding: 0,
	},
	selectFilter: {
		minWidth: "12rem",
	},
	showFilters: {
		[theme.breakpoints.down("md")]: {
			display: "none",
		},
		[theme.breakpoints.up("lg")]: {
			display: "block",
		},
	},
	// ensure source file list doesn't expand dialog width
	sourceFileList: {
		whiteSpace: "normal",
		wordWrap: "break-word",
	},
	sourceFileListScrollable: {
		height: "auto",
		maxHeight: "4rem",
		overflowY: "auto",
	},
	summaryIcon: {
		verticalAlign: "middle",
	},
	tab: {
		// tab hovered - add primary color to icon and label
		// without this it's not as obvious which tabs are navigable vs disabled
		"&.MuiTab-labelIcon:hover": {
			color: theme.palette.primary.main, // use primary color instead of (default) secondary
		},
		// make disabled icon and label just a bit more opaque so it's clearer it's disabled
		"&.MuiTab-labelIcon:disabled": {
			opacity: "0.5",
		},
	},
	tabDialogGrid: {
		overflowWrap: "break-word",
	},
	tableDescription: {
		padding: theme.spacing(2),
		paddingBottom: theme.spacing(3),
		marginTop: theme.spacing(2),
		borderBottom: "1px solid rgba(81, 81, 81, 1)",
		width: "100%",
	},
	tableInfo: {
		padding: theme.spacing(2),
		[theme.breakpoints.down("md")]: {
			paddingBottom: theme.spacing(3),
		},
		[theme.breakpoints.up("lg")]: {
			paddingBottom: 0,
		},
	},
	techChartContainer: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		height: "350px",
	},
	vulnLinkButton: {
		textTransform: "none", // don't uppercase text in button
	},
	warningIcon: {
		fill: theme.palette.warning.main,
		marginLeft: theme.spacing(1),
		verticalAlign: "middle",
	},
}));

// get result filters from url query params hash parameters
// returns new FilterDef object matching input @filters with each field "filter" populated by validated values from url query hash parameters
//
// @schema - Yup schema to validate hash parameter values against
// @prefix - prefix to differentiate hash parameters for various result types, e.g., "vn" for vulnerability. Each parameter in the schema should begin with this prefix
// @filters - FilterDef object to populate with validated data
export const getResultFilters = (
	schema: Yup.ObjectSchema<any>,
	prefix: string = "",
	filters: FilterDef
) => {
	const hash = queryString.parse(window.location.hash);
	try {
		const values = schema.validateSync(hash, {
			strict: false, // trim fields
			stripUnknown: true, // remove keys not in schema
		});
		for (const f in values) {
			const field = f.replace(prefix, "");
			if (values[f] && field in filters) {
				filters[field].filter = String(values[f]);
			}
		}
	} catch (err) {
		console.warn("invalid result filters, discarding");
	}
	return filters;
};

const FindingAccordion = withStyles(Accordion, (theme, _props, classes) => ({
	root: {
		border: "1px solid",
		borderColor: theme.palette.divider,
		borderRadius: "10px",
		[`&.${classes.expanded}`]: {
			// remove 16px margin added at bottom of accordion when expanded
			margin: 0,
		},
	},
	// blank element required here for "&$expanded" in root to take effect
	expanded: {},
}));

const FindingAccordionSummary = withStyles(
	AccordionSummary,
	(_theme, _props, classes) => ({
		root: {
			margin: 0,
			[`&.${classes.expanded}`]: {
				minHeight: "32px",
			},
		},
		content: {
			// ensure icon and text align vertically
			verticalAlign: "middle",
			alignItems: "center",
			[`&.${classes.expanded}`]: {
				// same margin as content (non-expanded)
				margin: "12px 0 0 0",
			},
		},
		expanded: {},
	})
);

const NoResults = (props: { title: string }) => {
	const { title } = props;

	return (
		<Paper elevation={2}>
			<Typography
				align="center"
				style={{ fontStyle: "italic", padding: "2em" }}
			>
				{title}
			</Typography>
		</Paper>
	);
};

interface TabPanelProps {
	children?: React.ReactNode;
	index: any;
	value: any;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`tabpanel-${index}`}
			aria-labelledby={`tab-${index}`}
			{...other}
		>
			{value === index && <Box>{children}</Box>}
		</div>
	);
}

// a11y props added to each tab component
function a11yProps(index: any) {
	return {
		id: `tab-${index}`,
		"aria-controls": `tabpanel-${index}`,
	};
}

// how severity types should be ordered (0 = greatest)
const severityOrderMap: OrderMap & SeverityLevels = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
	negligible: 4,
	"": 5,
};

export const FindingTypeChip = (props: {
	value?: HiddenFindingType;
	count?: number;
}) => {
	const { i18n } = useLingui();
	const { value, count } = props;

	let chip = <></>;
	switch (value) {
		case "configuration": {
			chip = (
				<Chip
					icon={<FactCheckIcon />}
					label={
						count !== undefined
							? i18n._(t`Configuration: ${count}`)
							: i18n._(t`Configuration`)
					}
					size="small"
					variant="outlined"
				/>
			);
			break;
		}
		case "secret": {
			chip = (
				<Chip
					icon={<VpnKeyIcon />}
					label={
						count !== undefined
							? i18n._(t`Secret: ${count}`)
							: i18n._(t`Secret`)
					}
					size="small"
					variant="outlined"
				/>
			);
			break;
		}
		case "secret_raw": {
			chip = (
				<Chip
					icon={<VpnKeyIcon />}
					label={
						count !== undefined
							? i18n._(t`Secret Raw: ${count}`)
							: i18n._(t`Secret Raw`)
					}
					size="small"
					variant="outlined"
				/>
			);
			break;
		}
		case "static_analysis": {
			chip = (
				<Chip
					icon={<BugReportIcon />}
					label={
						count !== undefined
							? i18n._(t`Static Analysis: ${count}`)
							: i18n._(t`Static Analysis`)
					}
					size="small"
					variant="outlined"
				/>
			);
			break;
		}
		case "vulnerability": {
			chip = (
				<Chip
					icon={<SecurityIcon />}
					label={
						count !== undefined
							? i18n._(t`Vulnerability: ${count}`)
							: i18n._(t`Vulnerability`)
					}
					size="small"
					variant="outlined"
				/>
			);
			break;
		}
		case "vulnerability_raw": {
			chip = (
				<Chip
					icon={<SecurityIcon />}
					label={
						count !== undefined
							? i18n._(t`Vulnerability Raw: ${count}`)
							: i18n._(t`Vulnerability Raw`)
					}
					size="small"
					variant="outlined"
				/>
			);
			break;
		}
	}
	return chip;
};

// uses multiple fields in table row
export const SourceCell = (props: { row?: RowDef | null }) => {
	const { classes } = useStyles();
	const { row } = props;
	const fileRegex = /:* .*$/; // trim filename after (optional) : and whitespace

	const unhiddenFindingWarning = () => {
		// hidden findings don't cover all source files
		if (
			row?.unhiddenFindings &&
			Array.isArray(row?.unhiddenFindings) &&
			row?.unhiddenFindings.length > 0
		) {
			const title = plural(row?.unhiddenFindings.length, {
				one: "# Source file not covered by this hidden finding",
				other: "# Source files not covered by this hidden finding",
			});
			return (
				<Tooltip title={title}>
					<ReportProblemOutlinedIcon
						className={classes.warningIcon}
						aria-label={title}
					/>
				</Tooltip>
			);
		}
		return <></>;
	};

	const files = <></>;
	if (row?.source) {
		if (Array.isArray(row.source)) {
			const count = row.source.length;
			if (count === 1) {
				return (
					<>
						<Tooltip describeChild title={row.source[0]}>
							<span>{row.source[0].replace(fileRegex, "")}</span>
						</Tooltip>
						{unhiddenFindingWarning()}
					</>
				);
			}
			if (count > 1) {
				return (
					<>
						<Tooltip describeChild title={row.source.join(", ")}>
							<span>
								{row.source[0].replace(fileRegex, "")} +{" "}
								<Trans>{count - 1} more</Trans>
							</span>
						</Tooltip>
						{unhiddenFindingWarning()}
					</>
				);
			}
		} else {
			return (
				<>
					<Tooltip describeChild title={row.source}>
						<span>{row.source.replace(fileRegex, "")}</span>
					</Tooltip>
					{unhiddenFindingWarning()}
				</>
			);
		}
	}
	return files;
};

const ConfigNameCell = (props: { row?: RowDef | null }) => {
	const { row } = props;
	if (row?.name && row?.description) {
		return (
			<Tooltip describeChild title={row.description}>
				<span>{row.name}</span>
			</Tooltip>
		);
	}
	return <></>;
};

interface HiddenFindingForm {
	type: string;
	hideFor: "this" | "all";
	secretString?: string | null;
	// Luxon DateTime so we can manage time zone
	expires?: DateTime | null;
	reason: string;
}

// a11y list item
export const FindingListItem = (props: {
	id: string;
	label: React.ReactNode;
	value: React.ReactNode;
}) => {
	const { classes } = useStyles();
	const { id, label, value } = props;
	return (
		<li aria-labelledby={id}>
			<span className={classes.findingDetailsLabel} id={id}>
				{label}
			</span>
			<span>{value}</span>
		</li>
	);
};

export const HiddenFindingDialog = (props: {
	row?: RowDef | null;
	open: boolean;
	onClose: any;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const dispatch: AppDispatch = useDispatch();
	const hiddenFindingState = useSelector(
		(state: RootState) => state.hiddenFindings
	);
	const { row, open, onClose } = props;
	const [deleteConfirm, setDeleteConfirm] = useState(false);
	const [accordionExpanded, setAccordionExpanded] = useState(false);
	// set min date = tomorrow, so user can't create a hidden finding that immediately expires
	const dateMin = DateTime.utc().plus({ days: 1 });
	const dateMaxStr = "2050/12/31";
	const dateMax = DateTime.fromFormat(dateMaxStr, "yyyy/LL/dd", {
		zone: "utc",
	});
	let dialogTitle = i18n._(t`Hide This Finding`);
	if (deleteConfirm) {
		dialogTitle = i18n._(t`Remove Hidden Finding`);
	} else if (row?.hiddenFindings) {
		dialogTitle = i18n._(t`Modify Hidden Finding`);
	}

	const hiddenFindingFormSchema = Yup.object({
		type: Yup.string(),
		secretString: Yup.string().when(
			["type", "hideFor"],
			([type, hideFor], schema) => {
				if ((type === "secret" || type === "secret_raw") && hideFor === "all") {
					return schema
						.required(i18n._(t`Required`))
						.min(4, i18n._(t`Must be 4 or more characters`));
				}
				return schema;
			}
		),
		expires: Yup.date()
			.typeError(i18n._(t`Invalid date format`))
			.min(dateMin.toJSDate(), i18n._(t`Must be a future date`))
			.max(dateMax.toJSDate(), i18n._(t`Date must be before ${dateMaxStr}`))
			.nullable()
			.default(null),
		reason: Yup.string()
			.required(i18n._(t`Required`))
			.trim()
			.min(1, i18n._(t`Must be between 1-512 characters`))
			.max(512, i18n._(t`Must be between 1-512 characters`)),
	});

	// form submission succeeds, reset hiddingFinding redux status
	// and close the dialog
	// success notification will be viewed as a global app notification
	useEffect(() => {
		if (open) {
			switch (hiddenFindingState.status) {
				case "succeeded": {
					dispatch(resetStatus());
					setDeleteConfirm(false);
					setAccordionExpanded(false);
					onClose();
					break;
				}
			}
		}
	}, [open, hiddenFindingState.status, dispatch, onClose]);

	// short-circuit if dialog closed
	if (!open) {
		return <></>;
	}
	// required cell fields for display & form
	if (!row) {
		console.error("row undefined");
		return <></>;
	}
	if (!("type" in row) || typeof row?.type !== "string") {
		console.error("type undefined");
		return <></>;
	}
	if (!("url" in row) || typeof row?.url !== "string") {
		console.error("url undefined");
		return <></>;
	}

	const initialValues: HiddenFindingForm = {
		// DateTimePicker component handles transforming string => Luxon DateTime object
		// all associated findings should have same expiration date + reason, so use first occurrence
		type: row?.type,
		hideFor: row?.type.endsWith("_raw") ? "all" : "this",
		secretString:
			row?.type === "secret_raw" &&
			row?.hiddenFindings &&
			row.hiddenFindings.length
				? row.hiddenFindings[0].value?.value
				: "",
		expires:
			row?.hiddenFindings &&
			row.hiddenFindings.length &&
			row.hiddenFindings[0]?.expires
				? row.hiddenFindings[0].expires
				: null,
		reason:
			row?.hiddenFindings &&
			row.hiddenFindings.length &&
			row.hiddenFindings[0]?.reason
				? row.hiddenFindings[0].reason
				: "",
	};

	// add/update submit button clicked
	const onSubmit = (values: HiddenFindingForm) => {
		const url = row?.url + "/whitelist";
		const reason = values?.reason.trim() ?? "";
		let expires: string | undefined = undefined;
		if (values?.expires) {
			// value may be a string instead of Luxon DateTime if
			// coming from a saved value that hasn't been modified
			if (typeof values.expires === "string") {
				expires = values.expires;
			} else {
				// Luxon DateTime
				expires = values?.expires.toUTC().toJSON();
			}
		}

		let type = row?.type;
		if (values?.hideFor === "all" && !type.endsWith("_raw")) {
			type += "_raw";
		}

		let request: HiddenFindingsRequest;
		// update "global" fields (reason, expires) for each finding type
		if (row?.hiddenFindings && Array.isArray(row.hiddenFindings)) {
			row.hiddenFindings.forEach((hf: HiddenFinding) => {
				if (hf.type === type) {
					let data: HiddenFinding | Record<string, unknown> = {};
					if (type === "secret_raw") {
						data = {
							value: {
								value: values?.secretString?.trim(),
							},
						};
					}
					request = {
						url: [url, hf.id].join("/"),
						// keep same data, just update expires, reason fields
						data: {
							...hf,
							...data,
							updated_by: row?.createdBy ?? undefined, // API doesn't return updated_by field, so infer current user made latest update
							expires: expires,
							reason: reason,
						},
					};
					dispatch(updateHiddenFinding(request));
				}
			});

			if (
				type === "vulnerability" &&
				row?.unhiddenFindings &&
				Array.isArray(row.unhiddenFindings)
			) {
				// add new hidden findings for each source file not covered by this hidden finding
				row.unhiddenFindings.forEach((source: string) => {
					const request: HiddenFindingsRequest = {
						url,
						data: {
							created_by: row?.createdBy ?? undefined,
							expires: expires,
							reason: reason,
							type: "vulnerability",
							value: {
								id: row?.id ?? row?.location, // vulnid can be different fields if this is viewed from vuln tab vs hidden findings tab
								component: row?.component ?? "",
								source,
							},
						},
					};
					dispatch(addHiddenFinding(request));
				});
			}
		} else {
			// create a new hidden finding per type (different value obj structures)
			const data = {
				// common fields for all allowlist objs
				created_by: row?.createdBy ?? undefined,
				expires: expires,
				reason: reason,
			};
			switch (type) {
				case "configuration": {
					request = {
						url,
						data: {
							...data,
							type: "configuration",
							value: {
								id: row?.rule ?? "",
							},
						},
					};
					dispatch(addHiddenFinding(request));
					break;
				}
				case "secret": {
					request = {
						url,
						data: {
							...data,
							type: "secret",
							value: {
								filename: row?.filename ?? "",
								line: row?.line ?? "",
								commit: row?.commit ?? "",
							},
						},
					};
					dispatch(addHiddenFinding(request));
					break;
				}
				case "secret_raw": {
					request = {
						url,
						data: {
							...data,
							type: "secret_raw",
							value: {
								value: values?.secretString?.trim() ?? "",
							},
						},
					};
					dispatch(addHiddenFinding(request));
					break;
				}
				case "static_analysis": {
					request = {
						url,
						data: {
							...data,
							type: "static_analysis",
							value: {
								filename: row?.filename ?? "",
								line: row?.line ?? "",
								type: row?.resource ?? "",
							},
						},
					};
					dispatch(addHiddenFinding(request));
					break;
				}
				case "vulnerability": {
					if (row.source && Array.isArray(row.source)) {
						// create separate hidden finding for each source file
						row.source.forEach((source: string) => {
							const request: HiddenFindingsRequest = {
								url,
								data: {
									...data,
									type: "vulnerability",
									value: {
										id: row?.id ?? "",
										component: row?.component ?? "",
										source,
									},
								},
							};
							dispatch(addHiddenFinding(request));
						});
					} else {
						console.error(
							"unable to add or update vulnerability hidden finding"
						);
					}
					break;
				}
				case "vulnerability_raw": {
					request = {
						url,
						data: {
							...data,
							type: "vulnerability_raw",
							value: {
								id: row?.id ?? "",
							},
						},
					};
					dispatch(addHiddenFinding(request));
					break;
				}
				default: {
					console.error("unknown finding type");
					break;
				}
			}
		}
		return;
	};

	// alert displayed in dialog if async form submission encounters errors
	const hiddenFindingAlert = (
		isSubmitting: boolean,
		setSubmitting: FormikHelpers<HiddenFindingForm>["setSubmitting"]
	) => {
		let alert = <></>;
		if (open && hiddenFindingState.status === "failed") {
			alert = (
				<Alert
					aria-label={i18n._(t`error`)}
					elevation={6}
					variant="filled"
					onClose={() => {
						dispatch(resetStatus());
					}}
					severity="error"
				>
					{hiddenFindingState.error}
				</Alert>
			);

			// form submitted and encountered an error
			// reset form submittion state (isSubmitting)
			// so form fields are editable again
			if (isSubmitting) {
				setSubmitting(false);
			}
		}
		return alert;
	};

	const findingDetails = (isRaw: boolean) => {
		let item = row;
		let createdBy = null;
		let created = null;
		let updatedBy = null;
		let updated = null;
		let type = row?.type;
		const warningTitle = i18n._(
			t`Click the "Update" button to add these source files to this hidden finding`
		);

		if (isRaw && (type === "vulnerability" || type === "secret")) {
			type += "_raw";
		}

		const hiddenFindingCount =
			row?.hiddenFindings && Array.isArray(row.hiddenFindings)
				? row.hiddenFindings.length
				: 0;
		const details = [
			<FindingListItem
				key="finding-details-category"
				id="finding-details-category"
				label={<Trans>Category:</Trans>}
				value={<FindingTypeChip value={type} />}
			/>,
		];

		if (hiddenFindingCount) {
			createdBy = row.hiddenFindings[0].created_by;
			created = row.hiddenFindings[0].created;
			updatedBy = row.hiddenFindings[0].updated_by;
			updated = row.hiddenFindings[0].updated;
			if (row.hiddenFindings[0].value) {
				item = row.hiddenFindings[0].value;
			}
		}

		if (updated) {
			details.unshift(
				<FindingListItem
					key="finding-details-updated-date"
					id="finding-details-updated-date"
					label={<Trans>Hidden finding last updated:</Trans>}
					value={formatDate(updated, "long")}
				/>
			);
		}

		if (updatedBy) {
			details.unshift(
				<FindingListItem
					key="finding-details-updated-by"
					id="finding-details-updated-by"
					label={<Trans>Hidden finding last updated by:</Trans>}
					value={<MailToLink recipient={updatedBy} text={updatedBy} tooltip />}
				/>
			);
		}

		if (created) {
			details.unshift(
				<FindingListItem
					key="finding-details-hidden-date"
					id="finding-details-hidden-date"
					label={<Trans>Hidden finding created:</Trans>}
					value={formatDate(created, "long")}
				/>
			);
		}

		// last unshifted item, so this will appear as first item in list
		if (createdBy) {
			details.unshift(
				<FindingListItem
					key="finding-details-hidden-by"
					id="finding-details-hidden-by"
					label={<Trans>Hidden finding created by:</Trans>}
					value={<MailToLink recipient={createdBy} text={createdBy} tooltip />}
				/>
			);
		}

		switch (type) {
			case "configuration": {
				if (item?.severity) {
					details.push(
						<FindingListItem
							key="finding-details-severity"
							id="finding-details-severity"
							label={<Trans>Severity:</Trans>}
							value={<SeverityChip value={row?.severity} />}
						/>
					);
				}
				details.push(
					<FindingListItem
						key="finding-details-name"
						id="finding-details-name"
						label={<Trans>Name:</Trans>}
						value={item?.name ?? item?.id}
					/>
				);
				if (item?.description) {
					details.push(
						<FindingListItem
							key="finding-details-description"
							id="finding-details-description"
							label={<Trans>Description:</Trans>}
							value={item.description}
						/>
					);
				}
				break;
			}

			case "secret": {
				if (item?.resource) {
					details.push(
						<FindingListItem
							key="finding-details-type"
							id="finding-details-type"
							label={<Trans>Type:</Trans>}
							value={capitalize(item?.resource)}
						/>
					);
				}
				details.push(
					<FindingListItem
						key="finding-details-commit"
						id="finding-details-commit"
						label={<Trans>Commit:</Trans>}
						value={item?.commit ?? ""}
					/>
				);
				details.push(
					<FindingListItem
						key="finding-details-fileline"
						id="finding-details-fileline"
						label={
							hiddenFindingCount ? (
								<Trans>Hidden in source file:</Trans>
							) : (
								<Trans>Found in source file:</Trans>
							)
						}
						value={
							<ul>
								<li>
									<span>
										<Trans>
											{item?.filename ?? ""} (Line {item?.line ?? ""})
										</Trans>
										<SourceCodeHotLink row={row} addTitle={true} />
									</span>
								</li>
							</ul>
						}
					/>
				);
				break;
			}

			case "secret_raw": {
				details.push(
					<FindingListItem
						key="finding-details-type"
						id="finding-details-type"
						label={<Trans>Type:</Trans>}
						value={
							<span className={classes.findingDetailsValueAny}>
								<Trans>Any</Trans>
							</span>
						}
					/>
				);
				details.push(
					<FindingListItem
						key="finding-details-commit"
						id="finding-details-commit"
						label={<Trans>Commit:</Trans>}
						value={
							<span className={classes.findingDetailsValueAny}>
								<Trans>Any</Trans>
							</span>
						}
					/>
				);
				details.push(
					<FindingListItem
						key="finding-details-fileline"
						id="finding-details-fileline"
						label={
							hiddenFindingCount ? (
								<Trans>Hidden in source file:</Trans>
							) : (
								<Trans>Found in source file:</Trans>
							)
						}
						value={
							<span className={classes.findingDetailsValueAny}>
								<Trans>Any</Trans>
							</span>
						}
					/>
				);
				break;
			}

			case "static_analysis": {
				if (item?.severity) {
					details.push(
						<FindingListItem
							key="finding-details-severity"
							id="finding-details-severity"
							label={<Trans>Severity:</Trans>}
							value={<SeverityChip value={row?.severity} />}
						/>
					);
				}
				details.push(
					<FindingListItem
						key="finding-details-resource"
						id="finding-details-resource"
						label={<Trans>Type:</Trans>}
						value={capitalize(item?.resource ?? item?.type ?? "")}
					/>
				);
				details.push(
					<FindingListItem
						key="finding-details-fileline"
						id="finding-details-fileline"
						label={
							hiddenFindingCount ? (
								<Trans>Hidden in source file:</Trans>
							) : (
								<Trans>Found in source file:</Trans>
							)
						}
						value={
							<ul>
								<li>
									<span>
										<Trans>
											{item?.filename ?? ""} (Line {item?.line ?? ""})
										</Trans>
										<SourceCodeHotLink row={row} addTitle={true} />
									</span>
								</li>
							</ul>
						}
					/>
				);
				break;
			}

			case "vulnerability": {
				if (item?.severity) {
					details.push(
						<FindingListItem
							key="finding-details-severity"
							id="finding-details-severity"
							label={<Trans>Severity:</Trans>}
							value={<SeverityChip value={row?.severity} />}
						/>
					);
				}
				details.push(
					<FindingListItem
						key="finding-details-vulnerability"
						id="finding-details-vulnerability"
						label={<Trans>Vulnerability:</Trans>}
						value={<VulnLink vulnId={item?.id} />}
					/>
				);
				details.push(
					<FindingListItem
						key="finding-details-component"
						id="finding-details-component"
						label={<Trans>Component:</Trans>}
						value={item?.component ?? ""}
					/>
				);
				if (hiddenFindingCount) {
					// viewing existing hidden finding
					details.push(
						<FindingListItem
							key="finding-details-files"
							id="finding-details-files"
							label={
								<Trans>Hidden in source files ({hiddenFindingCount}):</Trans>
							}
							value={
								<ol
									className={cx(
										classes.sourceFileList,
										classes.sourceFileListScrollable
									)}
								>
									{findingSourceFiles(row?.hiddenFindings)}
								</ol>
							}
						/>
					);
					if (
						row?.unhiddenFindings &&
						Array.isArray(row?.unhiddenFindings) &&
						row?.unhiddenFindings.length > 0
					) {
						details.push(
							<FindingListItem
								key="finding-details-unhidden-files"
								id="finding-details-unhidden-files"
								label={
									<span className={classes.fieldError}>
										<Trans>
											Source files <em>not</em> covered by this hidden finding (
											{row?.unhiddenFindings.length}):
										</Trans>
										<Tooltip title={warningTitle}>
											<ReportProblemOutlinedIcon
												className={classes.warningIcon}
												aria-label={warningTitle}
											/>
										</Tooltip>
									</span>
								}
								value={
									<ol
										className={cx(
											classes.sourceFileList,
											classes.sourceFileListScrollable,
											classes.fieldError
										)}
									>
										{sourceFiles(row?.unhiddenFindings as string[])}
									</ol>
								}
							/>
						);
					}
				} else {
					// viewing vuln details to add a new hidden finding
					details.push(
						<FindingListItem
							key="finding-details-files"
							id="finding-details-files"
							label={
								<Trans>
									Found in source files (
									{row?.source ? (row?.source as string[]).length : 0}):
								</Trans>
							}
							value={
								<ol
									className={cx(
										classes.sourceFileList,
										classes.sourceFileListScrollable
									)}
								>
									{sourceFiles(row?.source as string[])}
								</ol>
							}
						/>
					);
				}
				break;
			}

			case "vulnerability_raw": {
				if (item?.severity) {
					details.push(
						<FindingListItem
							key="finding-details-severity"
							id="finding-details-severity"
							label={<Trans>Severity:</Trans>}
							value={<SeverityChip value={row?.severity} />}
						/>
					);
				}
				details.push(
					<FindingListItem
						key="finding-details-vulnerability"
						id="finding-details-vulnerability"
						label={<Trans>Vulnerability:</Trans>}
						value={<VulnLink vulnId={item?.id} />}
					/>
				);
				details.push(
					<FindingListItem
						key="finding-details-component"
						id="finding-details-component"
						label={<Trans>Component:</Trans>}
						value={
							<span className={classes.findingDetailsValueAny}>
								<Trans>Any</Trans>
							</span>
						}
					/>
				);
				if (hiddenFindingCount) {
					// viewing existing hidden finding
					details.push(
						<FindingListItem
							key="finding-details-files"
							id="finding-details-files"
							label={<Trans>Hidden in source files:</Trans>}
							value={
								<span className={classes.findingDetailsValueAny}>
									<Trans>Any</Trans>
								</span>
							}
						/>
					);
				} else {
					// viewing vuln details to add a new hidden finding
					details.push(
						<FindingListItem
							key="finding-details-files"
							id="finding-details-files"
							label={<Trans>Found in source files:</Trans>}
							value={
								<span className={classes.findingDetailsValueAny}>
									<Trans>Any</Trans>
								</span>
							}
						/>
					);
				}
				break;
			}
		}
		return details;
	};

	const dialogChildren = () => {
		return (
			<>
				{/* note: validateOnMount=true on edit so form will disable "Update button" if expiration is invalid date (already expired) */}
				<Formik
					initialValues={initialValues}
					validationSchema={hiddenFindingFormSchema}
					onSubmit={onSubmit}
					validateOnMount={row?.hiddenFindings}
				>
					{({
						submitForm,
						isValid,
						isSubmitting,
						dirty,
						setSubmitting,
						values,
					}) => (
						<Form noValidate autoComplete="off">
							{hiddenFindingAlert(isSubmitting, setSubmitting)}
							{/* replace dialog content+actions with delete confirmation */}
							{deleteConfirm ? (
								<>
									<DialogContent dividers={true}>
										<Box>
											<Trans>
												Remove this hidden finding? This finding will again
												appear in scan results for this repository.
											</Trans>
										</Box>
									</DialogContent>
									{hiddenFindingState.status === "loading" && (
										<LinearProgress />
									)}
									<DialogActions>
										<Box displayPrint="none" className={classes.dialogButtons}>
											<RedButton
												variant="contained"
												disabled={hiddenFindingState.status === "loading"}
												startIcon={<DeleteIcon />}
												aria-busy={hiddenFindingState.action === "delete"}
												onClick={() => {
													if (
														row?.url &&
														row?.hiddenFindings &&
														Array.isArray(row.hiddenFindings)
													) {
														row.hiddenFindings.forEach((hf: HiddenFinding) => {
															const request: HiddenFindingsRequest = {
																url: `${row?.url}/whitelist/${hf.id}`,
															};
															dispatch(deleteHiddenFinding(request));
														});
													} else {
														console.error("url or finding id undefined");
													}
												}}
											>
												{hiddenFindingState.action === "delete" ? (
													<Trans>Removing...</Trans>
												) : (
													<Trans>Remove</Trans>
												)}
											</RedButton>

											<Button
												color="primary"
												disabled={hiddenFindingState.status === "loading"}
												onClick={() => {
													setDeleteConfirm(false);
												}}
											>
												<Trans>Cancel</Trans>
											</Button>
										</Box>
									</DialogActions>
								</>
							) : (
								<>
									{/* dialog content + actions for adding/updating/removing a hidden finding item */}
									<DialogContent dividers={true}>
										<FindingAccordion
											expanded={accordionExpanded}
											onChange={() => {
												setAccordionExpanded(!accordionExpanded);
											}}
											elevation={0}
											square={true}
										>
											<FindingAccordionSummary
												aria-controls="finding-info-section-content"
												id="finding-info-section-header"
											>
												<Tooltip
													title={i18n._(t`Click for more information`)}
													aria-hidden={true}
												>
													<HelpIcon className={classes.helpIcon} />
												</Tooltip>
												<Typography className={classes.heading}>
													<Trans>What are hidden findings?</Trans>
												</Typography>
											</FindingAccordionSummary>
											<AccordionDetails>
												<Trans>
													<ul className={classes.findingHelpList}>
														<li key="finding-rules-1">
															Hidden findings are global to this repository.
															They will be applied to <i>all</i> scan results
															for this repository (past, present, future, and
															for all branches), with the exception of "Secret
															Raw" types, that will only apply to future scans
														</li>
														<li key="finding-rules-2">
															Findings can be hidden on the applicable finding
															type scan results tab ("Vulnerability", "Static
															Analysis", "Secrets", "Configuration")
														</li>
														<li key="finding-rules-3">
															Once a finding is hidden, it can be viewed or
															managed (removed/modified) on the "Hidden
															Findings" scan results tab
														</li>
														<li key="finding-rules-4">
															Hiding a finding <i>DOES NOT</i> remediate the
															underlying security issue, it <i>only</i> prevents
															it from appearing in scan results. Hidden findings
															allow hiding of false-positive (F+) results or to
															temporarily hide a finding that does not yet have
															an upstream vendor fix available
														</li>
													</ul>
												</Trans>
											</AccordionDetails>
										</FindingAccordion>

										<Box className={classes.findingDetailsBox}>
											<Typography variant="body1">
												<Trans>Finding Details</Trans>
											</Typography>
											<Typography variant="body2">
												<ul className={classes.findingDetails}>
													{findingDetails(values.hideFor === "all")}
												</ul>
											</Typography>
										</Box>
										<Divider className={classes.divider} />
										<Box>
											<FormLabel component="legend">
												<Trans>
													Include a clear and meaningful reason for why this
													finding is being hidden
												</Trans>
											</FormLabel>
											<Field
												id="reason"
												name="reason"
												type="text"
												maxRows="3"
												className={classes.findingFormField}
												autoFocus
												inputProps={{ maxLength: 512 }}
												component={TextField}
												variant="outlined"
												label={i18n._(t`Reason`)}
												placeholder={i18n._(
													t`Justification for hiding this security finding`
												)}
												fullWidth
												multiline={true}
											/>
										</Box>
										{/* only provide option to assign standard or raw typed in "add" mode, not "edit" */}
										{(row.type === "vulnerability" ||
											row.type === "vulnerability_raw" ||
											row.type === "secret" ||
											row.type === "secret_raw") && (
											<Box className={classes.findingFormSelectField}>
												<FormControl variant="outlined">
													{/*
													 * Note: MUIv5 requires a label on the form field and also an independent InputLabel for a11y access to that field
													 * adding the InputLabel creates an extra visual label that overlaps the field value,
													 * so keep it for a11y, but add CSS "display: none" to hide it
													 */}
													<InputLabel
														id="hide-for-label"
														style={{ display: "none" }}
													>
														<Trans>Hide For</Trans>
													</InputLabel>
													<Field
														component={Select}
														name="hideFor"
														labelId="hide-for-label"
														id="hide-for"
														label={i18n._(t`Hide For`)}
														fullWidth
														disabled={!!row?.hiddenFindings}
													>
														<MenuItem value={"this"}>
															{row.type === "vulnerability" ||
															row.type === "vulnerability_raw" ? (
																<Trans>
																	This vulnerability in THIS component
																</Trans>
															) : (
																<Trans>
																	This secret in THIS specific location
																</Trans>
															)}
														</MenuItem>
														<MenuItem value={"all"}>
															{row.type === "vulnerability" ||
															row.type === "vulnerability_raw" ? (
																<Trans>
																	This vulnerability in ALL components
																</Trans>
															) : (
																<Trans>
																	This secret ANYWHERE in this repository
																</Trans>
															)}
														</MenuItem>
													</Field>
												</FormControl>
												{(row.type === "secret" || row.type === "secret_raw") &&
													values.hideFor === "all" && (
														<Field
															id="secret-string"
															name="secretString"
															type="text"
															component={TextField}
															className={classes.findingFormStringField}
															label={i18n._(
																t`String to exclude from secret findings (future scans only)`
															)}
															variant="outlined"
															placeholder={i18n._(
																t`This should not be a real secret`
															)}
														/>
													)}
											</Box>
										)}
										<Box className={classes.findingFormSelectField}>
											<Field
												id="expires"
												name="expires"
												className={classes.findingFormField}
												label={i18n._(t`Expires (optional)`)}
												style={{ width: "100%" }}
												disablePast
												component={DatePickerField}
												inputVariant="outlined"
												ampm={false}
												inputFormat="yyyy/LL/dd HH:mm"
												placeholder={i18n._(t`yyyy/MM/dd HH:mm (24-hour)`)}
												mask="____/__/__ __:__"
											/>
										</Box>
									</DialogContent>
									{hiddenFindingState.status === "loading" && (
										<LinearProgress />
									)}
									<DialogActions>
										{!isValid && (
											<Alert variant="outlined" severity="error">
												<Trans>
													This form contains unresolved errors. Please resolve
													these errors
												</Trans>
											</Alert>
										)}

										<Box displayPrint="none" className={classes.dialogButtons}>
											{row?.hiddenFindings && (
												<RedButton
													variant="contained"
													disabled={hiddenFindingState.status === "loading"}
													startIcon={<DeleteIcon />}
													aria-busy={hiddenFindingState.action === "delete"}
													onClick={() => {
														if (
															row?.url &&
															row?.hiddenFindings &&
															Array.isArray(row.hiddenFindings)
														) {
															setDeleteConfirm(true);
														} else {
															console.error("url or finding id undefined");
														}
													}}
												>
													<Trans>Remove</Trans>
												</RedButton>
											)}

											<Button
												variant="contained"
												color="primary"
												startIcon={
													row?.hiddenFindings ? (
														<EditIcon />
													) : (
														<AddCircleOutlineIcon />
													)
												}
												aria-busy={
													hiddenFindingState.action === "add" ||
													hiddenFindingState.action === "update"
												}
												disabled={
													hiddenFindingState.status === "loading" ||
													!isValid ||
													(!row?.hiddenFindings && !dirty)
												}
												onClick={() => {
													if (isValid) {
														submitForm();
													} else {
														// we shouldn't get here since form validates as user enters input
														console.error("form validation failed");
													}
												}}
											>
												{row?.hiddenFindings ? (
													hiddenFindingState.action === "update" ? (
														<Trans>Updating...</Trans>
													) : (
														<Trans>Update</Trans>
													)
												) : hiddenFindingState.action === "add" ? (
													<Trans>Adding...</Trans>
												) : (
													<Trans>Add</Trans>
												)}
											</Button>

											<Button
												color="primary"
												disabled={hiddenFindingState.status === "loading"}
												onClick={() => {
													setAccordionExpanded(false);
													onClose();
												}}
											>
												<Trans>Cancel</Trans>
											</Button>
										</Box>
									</DialogActions>
								</>
							)}
						</Form>
					)}
				</Formik>
			</>
		);
	};

	return (
		<DraggableDialog
			open={open}
			onClose={() => {
				onClose();
			}}
			title={dialogTitle}
			maxWidth="md"
		>
			<>{dialogChildren()}</>
		</DraggableDialog>
	);
};

const HiddenFindingCell = (props: { row?: RowDef | null }) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const { row } = props;
	const [dialogOpen, setDialogOpen] = useState(false);

	let CellButton = <VisibilityIcon />;
	let title = i18n._(t`Hide this finding`);
	const warnings = [];
	if (row?.hiddenFindings && row?.hiddenFindings.length > 0) {
		CellButton = <VisibilityOffIcon />;
		title = i18n._(t`Modify hidden finding`);

		// source files not covered by this hidden finding
		if (
			row?.unhiddenFindings &&
			Array.isArray(row?.unhiddenFindings) &&
			row?.unhiddenFindings.length
		) {
			warnings.push(
				plural(row?.unhiddenFindings.length, {
					one: "# Source file not covered by this hidden finding",
					other: "# Source files not covered by this hidden finding",
				})
			);
		}
		// check expiration on each hidden finding to see if it's expired
		for (let i = 0; i < row?.hiddenFindings.length; i += 1) {
			if (row?.hiddenFindings[i].expires) {
				const expirationDate = DateTime.fromISO(row?.hiddenFindings[i].expires);
				const diff = expirationDate.diffNow();
				if (diff.milliseconds < 0) {
					warnings.push(i18n._(t`This item has expired`));
					break;
				}
			}
		}
	}

	return (
		<div>
			<Tooltip title={title}>
				<span>
					<IconButton
						size="small"
						color="primary"
						aria-label={title}
						onClick={(event: React.SyntheticEvent) => {
							event.stopPropagation();
							// reset finding load state to idle so dialog stays open (refer to HiddenFindingDialog useEffect auto-close)
							dispatch(resetStatus());
							setDialogOpen(true);
						}}
					>
						{CellButton}
					</IconButton>
				</span>
			</Tooltip>
			{warnings.length > 0 && (
				<Tooltip title={warnings.join(", ")}>
					<ReportProblemOutlinedIcon
						className={classes.warningIcon}
						aria-label={warnings.join(", ")}
					/>
				</Tooltip>
			)}
			<HiddenFindingDialog
				row={row}
				open={dialogOpen}
				onClose={() => {
					setDialogOpen(false);
				}}
			/>
		</div>
	);
};

interface Palette {
	background: string;
	text: string;
}

interface ChartData {
	name: string;
	value: number;
	palette: Palette;
}

type TabChangerFunction = () => void;

interface OverviewCardProps {
	titleText: string;
	titleIcon: React.ReactNode;
	scanOptionWasNotRun: boolean;
	chartData: ChartData[];
	nothingFoundText: string;
	hasExtraText?: boolean;
	extraText?: string;
	tabChanger?: TabChangerFunction | undefined;
	isTabDisabled: boolean;
}

interface CustomTooltipPayloadI {
	dataKey: string;
	name: string;
	payload: {
		palette: Palette;
	};
	type?: string;
	value: number;
}

interface CustomTooltipI {
	active: boolean;
	payload: CustomTooltipPayloadI[];
}

export const CustomChartTooltip = ({ active, payload }: CustomTooltipI) => {
	const { classes } = useStyles();
	if (active && payload && payload.length) {
		return (
			<Chip
				className={classes.chartTooltip}
				style={{
					background: payload[0].payload.palette.background ?? "",
					color: payload[0].payload.palette.text ?? "",
				}}
				label={
					// add percentage if value is a decimal
					`${payload[0].name}: ${
						payload[0].value % 1 !== 0
							? `${payload[0].value}%`
							: payload[0].value
					}`
				}
			/>
		);
	}

	return null;
};

export const OverviewCard = ({
	titleText,
	titleIcon,
	scanOptionWasNotRun,
	tabChanger,
	chartData,
	nothingFoundText,
	hasExtraText = false,
	extraText,
	isTabDisabled,
}: OverviewCardProps) => {
	const { classes } = useStyles();

	const countFound = chartData.reduce((prev, curr) => {
		return prev + curr.value;
	}, 0);
	const nothingFound = countFound === 0;

	return (
		<Grid item xs={6} sm={4}>
			<Card
				elevation={2}
				className={classes.overviewCard}
				style={isTabDisabled ? {} : { cursor: "pointer" }}
				onClick={
					!isTabDisabled ? tabChanger && (() => tabChanger()) : undefined
				}
			>
				<CardContent>
					<Typography
						variant="h5" // styles
						component="h3" // html element
						color={scanOptionWasNotRun ? "textSecondary" : "primary"}
						className={classes.ocTitle}
					>
						<span className={classes.ocTitleIcon}>{titleIcon}</span>
						{scanOptionWasNotRun ? <i>{titleText}</i> : titleText}
					</Typography>
					<div className={classes.ocContainer}>
						{scanOptionWasNotRun && (
							<Typography
								variant="h6"
								component="h4"
								align="center"
								color="textSecondary"
							>
								<i>
									<Trans>This scan option was not used</Trans>
								</i>
							</Typography>
						)}
						{!scanOptionWasNotRun && nothingFound && (
							<Typography
								variant="h6"
								component="h4"
								align="center"
								color="textSecondary"
							>
								{nothingFoundText}
							</Typography>
						)}
						{!scanOptionWasNotRun && !nothingFound && (
							<div
								className={classes.oneHundredPercent}
								data-testid="a-donut-chart"
							>
								<ResponsiveContainer width="100%" height={240}>
									<PieChart style={{ cursor: "pointer" }}>
										<Pie
											startAngle={180}
											endAngle={0}
											data={chartData}
											nameKey="name"
											dataKey="value"
											cx="50%"
											cy="70%"
											innerRadius="60%"
											outerRadius="85%"
											isAnimationActive={false}
											label
											paddingAngle={5}
										>
											{chartData.map((entry) => (
												<Cell
													fill={entry.palette.background}
													key={entry.name}
												/>
											))}
										</Pie>
										<ChartTooltip
											content={
												// @ts-ignore
												<CustomChartTooltip />
											}
										/>
										<Legend iconType="circle" />
									</PieChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
					{!scanOptionWasNotRun && hasExtraText && (
						<Tooltip describeChild title={extraText || ""}>
							<Typography
								variant="h6"
								component="h4"
								align="center"
								color="textSecondary"
								className={classes.ocExtraTextArea}
							>
								{extraText}
							</Typography>
						</Tooltip>
					)}
				</CardContent>
			</Card>
		</Grid>
	);
};

export const ScanMessages = (props: {
	messages?: ScanErrors;
	severity?: "error" | "warning";
	startExpanded?: boolean;
}) => {
	const { classes, cx } = useStyles();
	const { messages, severity = "warning", startExpanded = false } = props;
	const [accordionExpanded, setAccordionExpanded] = useState(startExpanded);
	const title =
		severity === "warning" ? (
			<Trans>Scan Warnings</Trans>
		) : (
			<Trans>Scan Errors</Trans>
		);
	const icon =
		severity === "warning" ? (
			<ReportProblemOutlinedIcon
				className={cx(classes.helpIcon, classes.alertIconWarning)}
			/>
		) : (
			<ErrorOutlinedIcon
				className={cx(classes.helpIcon, classes.alertIconError)}
			/>
		);
	const alertTitleClass =
		severity === "warning" ? classes.alertTextWarning : classes.alertTextError;

	let messageTexts = null;
	if (messages && Object.entries(messages).length > 0) {
		messageTexts = messages
			? Object.entries(messages).map((errArr) => {
					if (errArr.length > 1) {
						return (
							errArr[0] +
							": " +
							(Array.isArray(errArr[1]) ? errArr[1].join(", ") : errArr[1])
						);
					}
					return errArr[0];
			  })
			: null;
	}
	return (
		<>
			{messageTexts && (
				<Box displayPrint="none">
					<Accordion
						expanded={accordionExpanded}
						onChange={() => {
							setAccordionExpanded(!accordionExpanded);
						}}
					>
						<AccordionSummary
							className={classes.accordionSummary}
							expandIcon={
								<Box displayPrint="none">
									<ExpandMoreIcon />
								</Box>
							}
							aria-controls="scan-errors-section-content"
							id="scan-errors-section-header"
						>
							{icon}
							<Typography className={cx(classes.heading, alertTitleClass)}>
								{title} ({messageTexts.length})
							</Typography>
						</AccordionSummary>

						<AccordionDetails
							className={cx(
								classes.accordionDetails,
								classes.scanMessagesAccordionDetails
							)}
						>
							<Grid className={classes.scanErrorsContainer}>
								{messageTexts.map((txt) => (
									<Alert
										severity={severity}
										className={classes.scanErrorAlert}
										key={txt}
										icon={false}
									>
										{txt}
									</Alert>
								))}
							</Grid>
						</AccordionDetails>
					</Accordion>
				</Box>
			)}
		</>
	);
};

export const OverviewTabContent = (props: {
	scan: AnalysisReport;
	hfRows: RowDef[];
	tabChanger?: (n: number) => void;
	sharedColors: Palette[];
	tabsStatus: {
		isDisabledVulns: boolean;
		isDisabledStat: boolean;
		isDisabledSecrets: boolean;
		isDisabledInventory: boolean;
		isDisabledHFs: boolean;
		isDisabledConfig: boolean;
	};
}) => {
	const { i18n } = useLingui();
	const { hfRows, scan, tabChanger, sharedColors, tabsStatus } = props;
	const { results_summary, errors, alerts } = scan;

	const defaultSevLevObject: SeverityLevels = {
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
		negligible: 0,
		"": 0,
	};

	const defaultSecretFindingResult: SecretFindingResult = {};

	const config = results_summary?.configuration ?? defaultSevLevObject;
	const vulns = results_summary?.vulnerabilities ?? defaultSevLevObject;
	const statAnalysis = results_summary?.static_analysis ?? defaultSevLevObject;
	const secrets = scan.results?.secrets ?? defaultSecretFindingResult;
	const techDiscovered = scan.results?.inventory?.technology_discovery ?? {};

	interface NameTransType {
		[key: string]: string;
	}

	const nameTrans: NameTransType = {
		critical: t`Critical`,
		high: t`High`,
		medium: t`Medium`,
		low: t`Low`,
		negligible: t`Negligible`,
	};

	const hfTrans: NameTransType = {
		configuration: t`Configuration`,
		vulnerability: t`Vulnerabilities`,
		vulnerability_raw: t`Vulnerabilities (Raw)`,
		secret: t`Secrets`,
		secret_raw: t`Secrets (Raw)`,
		static_analysis: t`Static Analysis`,
	};

	// chart data selecting and formatting
	const configChartData = Object.entries(config).map((c) => ({
		name: c[0] in nameTrans ? nameTrans[c[0]] : i18n._(t`Not Specified`),
		value: c[1],
		palette: getSeverityColor(c[0]),
	}));

	const vulnsChartData = Object.entries(vulns).map((v) => ({
		name: v[0] in nameTrans ? nameTrans[v[0]] : i18n._(t`Not Specified`),
		value: v[1],
		palette: getSeverityColor(v[0]),
	}));

	const statAnalysisChartData = Object.entries(statAnalysis).map((sa) => ({
		name: sa[0] in nameTrans ? nameTrans[sa[0]] : i18n._(t`Not Specified`),
		value: sa[1],
		palette: getSeverityColor(sa[0]),
	}));

	const dictSecrets: { [type: string]: number } = {};
	Object.values(secrets).forEach((arr) => {
		arr.forEach((secObject) => {
			const { type } = secObject;
			dictSecrets[type] ? (dictSecrets[type] += 1) : (dictSecrets[type] = 1);
			return;
		});
	});

	const secretsSummarizedChartData = Object.entries(dictSecrets)
		.sort((aArr, bArr) => bArr[1] - aArr[1])
		.map((sec, i) => ({
			name: sec[0].length > 3 ? capitalize(sec[0]) : sec[0].toUpperCase(),
			value: Number(sec[1]),
			palette: sharedColors[i % sharedColors.length],
		}));

	const techDiscoveredChartData = Object.entries(techDiscovered)
		.sort((aObj, bObj) => {
			return bObj[1] - aObj[1];
		})
		.map((tech, i) => ({
			name: tech[0],
			value: tech[1],
			palette: sharedColors[i % sharedColors.length],
		}));

	const baseImagesSummarized = Object.keys(
		scan.results?.inventory?.base_images ?? {}
	).sort((a, b) => a.localeCompare(b));

	const techInventoryExtraText = baseImagesSummarized.length
		? i18n._(t`Images:`) + " " + baseImagesSummarized.join(", ")
		: i18n._(t`No images detected`);

	const hfDict = hfRows.reduce((prev, curr) => {
		const t = curr["type"];
		prev[t] ? (prev[t] += 1) : (prev[t] = 1);
		return prev;
	}, {});

	const hfChartData = Object.entries(hfDict)
		.sort((aArr, bArr) => {
			return bArr[1] - aArr[1];
		})
		.map((hf, i) => ({
			name: hf[0] in hfTrans ? hfTrans[hf[0]] : hf[0],
			value: Number(hf[1]),
			palette: sharedColors[i % sharedColors.length],
		}));

	const hfCount = hfChartData.reduce((prev, curr) => {
		return prev + curr.value;
	}, 0);

	const hiddenFindingsExtraText = plural(hfCount, {
		one: `${hfCount} hidden finding`,
		other: `${hfCount} hidden findings`,
	});

	return (
		<>
			<ScanMessages messages={errors} severity="error" startExpanded={true} />
			<ScanMessages messages={alerts} severity="warning" />

			<Grid container spacing={1}>
				<OverviewCard
					titleText={i18n._(t`Vulnerabilities`)}
					titleIcon={<SecurityIcon />}
					scanOptionWasNotRun={results_summary?.vulnerabilities === null}
					chartData={vulnsChartData}
					nothingFoundText={i18n._(t`No vulnerabilities detected`)}
					tabChanger={tabChanger && (() => tabChanger(TAB_VULN))}
					isTabDisabled={tabsStatus.isDisabledVulns}
				/>
				<OverviewCard
					titleText={i18n._(t`Static Analysis`)}
					titleIcon={<BugReportIcon />}
					scanOptionWasNotRun={results_summary?.static_analysis === null}
					chartData={statAnalysisChartData}
					nothingFoundText={i18n._(t`No static analysis findings detected`)}
					tabChanger={tabChanger && (() => tabChanger(TAB_ANALYSIS))}
					isTabDisabled={tabsStatus.isDisabledStat}
				/>
				<OverviewCard
					titleText={i18n._(t`Secrets`)}
					titleIcon={<VpnKeyIcon />}
					scanOptionWasNotRun={results_summary?.secrets === null}
					chartData={secretsSummarizedChartData}
					nothingFoundText={i18n._(t`No secrets detected`)}
					tabChanger={tabChanger && (() => tabChanger(TAB_SECRET))}
					isTabDisabled={tabsStatus.isDisabledSecrets}
				/>
				<OverviewCard
					titleText={i18n._(t`Configuration`)}
					titleIcon={<FactCheckIcon />}
					scanOptionWasNotRun={results_summary?.configuration === null}
					chartData={configChartData}
					nothingFoundText={i18n._(t`No configuration findings detected`)}
					tabChanger={tabChanger && (() => tabChanger(TAB_CONFIG))}
					isTabDisabled={tabsStatus.isDisabledConfig}
				/>
				<OverviewCard
					titleText={i18n._(t`Inventory`)}
					titleIcon={<LayersIcon />}
					scanOptionWasNotRun={results_summary?.inventory === null}
					chartData={techDiscoveredChartData}
					nothingFoundText={i18n._(t`No technology inventory detected`)}
					hasExtraText={true}
					extraText={techInventoryExtraText}
					tabChanger={tabChanger && (() => tabChanger(TAB_INVENTORY))}
					isTabDisabled={tabsStatus.isDisabledInventory}
				/>
				<OverviewCard
					titleText={i18n._(t`Hidden Findings`)}
					titleIcon={<VisibilityOffIcon />}
					scanOptionWasNotRun={false} // "always runs"
					chartData={hfChartData}
					nothingFoundText={i18n._(t`No findings are hidden`)}
					hasExtraText={true}
					extraText={hiddenFindingsExtraText}
					tabChanger={tabChanger && (() => tabChanger(TAB_HIDDEN))}
					isTabDisabled={tabsStatus.isDisabledHFs}
				/>
			</Grid>
		</>
	);
};

function getSeverityColor(severity: string) {
	const colorBlack = "rgba(0, 0, 0, 0.87)";
	const colorWhite = "#fff";
	switch (severity) {
		case "critical":
			return { background: colorCritical, text: colorWhite };
		case "high":
			return { background: colorHigh, text: colorWhite };
		case "medium":
			return { background: colorMedium, text: colorBlack };
		case "low":
			return { background: colorLow, text: colorBlack };
		case "negligible":
			return { background: colorNegligible, text: colorBlack };
		case "":
			return { background: colorNegligible, text: colorBlack };
		default:
			console.warn(`Unexpected severity found: ${severity}`);
			return { background: colorNegligible, text: colorBlack };
	}
}

const FindingDialogActions = (props: {
	row?: RowDef | null;
	onClose: any;
	onFindingHidden: any;
}) => {
	const { classes } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const { row, onClose, onFindingHidden } = props;

	const onClickHideFinding = () => {
		dispatch(resetStatus());
		onFindingHidden();
		onClose();
	};

	return (
		<DialogActions>
			<Box displayPrint="none" className={classes.dialogButtons}>
				{row?.hiddenFindings ? (
					<Button
						color="primary"
						startIcon={<VisibilityOffIcon />}
						autoFocus
						onClick={() => onClickHideFinding()}
					>
						<Trans>Modify Hidden Finding</Trans>
					</Button>
				) : (
					<Button
						color="primary"
						startIcon={<VisibilityIcon />}
						autoFocus
						onClick={() => onClickHideFinding()}
					>
						<Trans>Hide This Finding</Trans>
					</Button>
				)}

				<Button color="primary" onClick={() => onClose()}>
					<Trans>OK</Trans>
				</Button>
			</Box>
		</DialogActions>
	);
};

interface FilterFieldProps {
	field: string;
	label: string;
	placeholder?: string;
	value?: string | string[];
	autoFocus?: boolean;
	onClear: (field: string) => void;
	onChange: (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => void;
	inputProps?: InputBaseComponentProps;
	type?: React.InputHTMLAttributes<unknown>["type"];
}

const FilterField = (props: FilterFieldProps) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const {
		field,
		label,
		placeholder,
		value = "",
		autoFocus = false,
		onClear,
		onChange,
		inputProps,
		type = "text",
	} = props;
	// maintain an internal field value
	// so we can echo user input
	// but then debounce changing the filter value and invoking a table filter operation
	const [fieldValue, setFieldValue] = useState(value);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);
	const debounceMs = 350;

	useEffect(() => {
		setFieldValue(value);
		return () => {
			if (debounceRef && debounceRef.current) {
				clearTimeout(debounceRef.current);
				debounceRef.current = null;
			}
		};
	}, [value]);

	const handleMouseDownClear = (event: { preventDefault: () => void }) => {
		event.preventDefault();
	};

	const handleOnClickClear = () => {
		onClear(field);
	};

	const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.value;
		if (debounceRef && debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		setFieldValue(newValue);
		debounceRef.current = setTimeout(() => {
			onChange(event, field, newValue);
			debounceRef.current = null;
		}, debounceMs);
	};

	return (
		<MuiTextField
			id={`filter-${field}`}
			name={`filter-${field}`}
			type={type}
			variant="outlined"
			autoFocus={autoFocus}
			value={fieldValue}
			size="small"
			style={{ maxWidth: "13em" }}
			label={label}
			placeholder={placeholder}
			inputProps={inputProps}
			InputProps={{
				className: classes.filterField,
				autoComplete: "off",
				startAdornment: (
					<InputAdornment position="start">
						<FilterListIcon />
					</InputAdornment>
				),
				endAdornment: value && (
					<InputAdornment position="end">
						<IconButton
							aria-label={i18n._(t`Clear field`)}
							onClick={handleOnClickClear}
							onMouseDown={handleMouseDownClear}
							edge="end"
							size="small"
						>
							<ClearIcon fontSize="small" />
						</IconButton>
					</InputAdornment>
				),
			}}
			onChange={handleOnChange}
		/>
	);
};

interface SeverityFilterFieldProps {
	value?: string | string[];
	summary?: SeverityLevels | null;
	autoFocus?: boolean;
	onChange: (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => void;
}

const SeverityFilterField = (props: SeverityFilterFieldProps) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const { value = "", summary, autoFocus = false, onChange } = props;

	return (
		<MuiTextField
			select
			id="filter-severity"
			name="filter-severity"
			label={i18n._(t`Severity`)}
			variant="outlined"
			autoFocus={autoFocus}
			value={value}
			size="small"
			className={classes.selectFilter}
			onChange={(event) => {
				onChange(event, "severity", event.target.value);
			}}
			InputProps={{
				className: classes.filterField,
				startAdornment: (
					<InputAdornment position="start">
						<FilterListIcon />
					</InputAdornment>
				),
			}}
		>
			<MenuItem value="">
				<i>
					<Trans>None</Trans>
				</i>
			</MenuItem>
			<MenuItem value="negligible">
				<SeverityChip value="negligible" count={summary?.negligible} />
			</MenuItem>
			<MenuItem value="low">
				<SeverityChip value="low" count={summary?.low} />
			</MenuItem>
			<MenuItem value="medium">
				<SeverityChip value="medium" count={summary?.medium} />
			</MenuItem>
			<MenuItem value="high">
				<SeverityChip value="high" count={summary?.high} />
			</MenuItem>
			<MenuItem value="critical">
				<SeverityChip value="critical" count={summary?.critical} />
			</MenuItem>
		</MuiTextField>
	);
};

const sourceFiles = (source?: string[]) => {
	if (source) {
		return source.map((source: string, index: number) => (
			<li key={"source-file-" + index.toString()}>{source}</li>
		));
	}
	return <></>;
};

const findingSourceFiles = (findings?: HiddenFinding[]) => {
	if (findings && findings.length > 0 && findings[0].type === "vulnerability") {
		return findings.map((finding: HiddenFinding, index: number) => {
			if (finding.type === "vulnerability") {
				return (
					<li key={"finding-source-file-" + index.toString()}>
						{finding.value.source}
					</li>
				);
			}
			return <></>;
		});
	}
	return <></>;
};

export const VulnLink = (props: {
	vulnId: string;
	addTitle?: boolean;
	className?: string;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { vulnId, addTitle, className } = props;
	const cveIdRegex = /^CVE-\d{4}-\d{4,8}$/;
	// strict www regex for now, only allow alphanum, _, ., /, &, =, -, prefixed with https://
	// we can expand this if new vulnids are added later
	const wwwAllowed = /^https:\/\/[\w./&=-]+$/;

	let link = <></>;
	let url = null;
	// note: use i18n instead of <Trans> element for tooltip title
	// otherwise, a11y can't determine the title properly
	let text = addTitle ? (
		<Trans>View in the National Vulnerability Database</Trans>
	) : (
		i18n._(t`View in the National Vulnerability Database`)
	);

	if (cveIdRegex.test(vulnId)) {
		url = `${PREFIX_NVD}${vulnId}`;
	} else if (wwwAllowed.test(vulnId)) {
		url = vulnId;
		text = addTitle ? (
			<Trans>View in external site</Trans>
		) : (
			i18n._(t`View in external site`)
		);
	}

	if (url) {
		if (addTitle) {
			link = (
				<Button
					startIcon={<OpenInNewIcon />}
					href={url}
					target="_blank"
					rel="noopener noreferrer nofollow"
					size="small"
					className={cx(className)}
				>
					{text}
				</Button>
			);
		} else {
			link = (
				<Tooltip describeChild title={text}>
					<span>
						<Button
							endIcon={<OpenInNewIcon />}
							href={url}
							target="_blank"
							rel="noopener noreferrer nofollow"
							size="small"
							className={cx(classes.vulnLinkButton, className)}
						>
							{vulnId}
						</Button>
					</span>
				</Tooltip>
			);
		}
	} else if (!addTitle) {
		link = <>{vulnId}</>;
	}
	return link;
};

type SaveFiltersT = (prefix: string, filters: FilterDef) => void;

export const VulnTabContent = (props: {
	scan: AnalysisReport;
	hiddenFindings: HiddenFinding[];
	currentUser: User;
	saveFilters: SaveFiltersT;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { scan, hiddenFindings, currentUser, saveFilters } = props;
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const [selectedRowNum, setSelectedRowNum] = useState<number | null>(null);
	const [hideRowNum, setHideRowNum] = useState<number | null>(null);
	const hashPrefix = FILTER_PREFIX_VULN;
	// validates url hash params, so must begin with hashPrefix
	const schema = Yup.object().shape({
		vn_component: Yup.string()
			.trim()
			.max(
				COMPONENT_LENGTH,
				i18n._(t`Component must be less than ${COMPONENT_LENGTH} characters`)
			),
		vn_id: Yup.string()
			.trim()
			.max(
				VULN_ID_LENGTH,
				i18n._(t`Vulnerability must be less than ${VULN_ID_LENGTH} characters`)
			),
		vn_severity: severitySchema(i18n._(t`Invalid severity`)),
	});
	const [filters, setFilters] = useState<FilterDef>(
		getResultFilters(schema, hashPrefix, {
			component: {
				filter: "",
			},
			id: {
				filter: "",
			},
			severity: {
				filter: "",
			},
		})
	);

	const dialogTitle = (): string => {
		let title = selectedRow?.id ?? "";
		if (selectedRow?.component) {
			title =
				title + " : " + capitalize((selectedRow?.component as string) ?? "");
		}
		return title as string;
	};
	const pluginChips: React.ReactNode[] = [];

	if (
		selectedRow?.source_plugins &&
		Array.isArray(selectedRow?.source_plugins)
	) {
		// don't need to convert plugin api name => displayName
		// API already returns the display names
		for (const plugin of selectedRow.source_plugins) {
			pluginChips.push(
				<Chip
					className={classes.chipPlugins}
					key={`source-plugin-${plugin}`}
					label={plugin}
					size="small"
				/>
			);
		}
	}

	const vulnDialogContent = () => {
		return (
			<>
				<DialogContent dividers={true}>
					<span>
						<SeverityChip value={selectedRow?.severity} />{" "}
						<VulnLink vulnId={selectedRow?.id} addTitle={true} />
					</span>
					<Grid container spacing={3}>
						{/* left column */}
						<Grid item xs={6} className={classes.tabDialogGrid}>
							<List>
								{/* TODO: consider making long individual list items scroll instead of scrolling all dialog content */}
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
						<Grid item xs={6}>
							<List>
								<ListItem key="vuln-source">
									<ListItemText
										primary={
											<>
												{i18n._(t`Found in Source Files`) +
													` (${
														selectedRow?.source
															? (selectedRow?.source as string[]).length
															: 0
													})`}{" "}
												{selectedRow?.source && (
													<CustomCopyToClipboard
														copyTarget={selectedRow?.source as string[]}
													/>
												)}
											</>
										}
										secondary={
											/* list of source files */
											<ol className={classes.sourceFileList}>
												{sourceFiles(selectedRow?.source as string[])}
											</ol>
										}
									/>
								</ListItem>
							</List>
							<List>
								<ListItem key="vuln-source-plugins">
									<ListItemText
										primary={
											<>
												{i18n._(t`Discovered By Plugins`) +
													` (${pluginChips.length})`}{" "}
												{pluginChips.length > 0 && (
													<CustomCopyToClipboard
														copyTarget={selectedRow?.source_plugins.join(", ")}
													/>
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
				<FindingDialogActions
					row={selectedRow}
					onClose={() => onRowSelect(null)}
					onFindingHidden={() => {
						setHideRowNum(selectedRowNum);
					}}
				/>
			</>
		);
	};

	const columns: ColDef[] = [
		{ field: "component", headerName: i18n._(t`Component`) },
		{ field: "id", headerName: i18n._(t`Vulnerability`) },
		{
			field: "severity",
			headerName: i18n._(t`Severity`),
			children: SeverityChip,
			orderMap: severityOrderMap,
		},
		{
			field: "hasHiddenFindings",
			headerName: i18n._(t`Actions`),
			children: HiddenFindingCell,
			disableRowClick: true,
			bodyStyle: {
				maxWidth: "5rem",
				width: "5rem",
			},
		},
	];
	const rows: RowDef[] = [];

	for (const [component, vulns] of Object.entries(
		scan.results?.vulnerabilities ?? {}
	)) {
		for (const [id, details] of Object.entries(vulns ?? {})) {
			let hasRaw = false;

			// multiple matching hidden findings (1 for each source file)
			const findings = hiddenFindings.filter((hf) => {
				return (
					(hf.type === "vulnerability" &&
						hf.value.component === component &&
						hf.value.id === id) ||
					(hf.type === "vulnerability_raw" && hf.value.id === id)
				);
			});
			let unhiddenFindings: string[] = [];
			if (findings.length > 0) {
				hasRaw = findings.some((h) => h.type === "vulnerability_raw");
				if (!hasRaw) {
					unhiddenFindings = [...details.source];
					for (const hf of findings) {
						if (hf.type === "vulnerability" && unhiddenFindings.length > 0) {
							const i = unhiddenFindings.indexOf(hf.value.source);
							if (i > -1) {
								unhiddenFindings.splice(i, 1);
							}
						}
					}
				}
			}
			// note: only data passed in the row object will be accessible in the cell's render function ("children" ColDef field)
			// this is why fields such as url and createdBy are added here
			rows.push({
				keyId: [
					hasRaw ? "vulnerability_raw" : "vulnerability",
					component,
					id,
					details.severity,
				].join("-"),
				type: hasRaw ? "vulnerability_raw" : "vulnerability",
				url: scan.service + "/" + scan.repo,
				createdBy: currentUser.email,
				// hidden finding data stored in "hiddenFindings" field
				// boolean "hasHiddenFindings" used for column definition bc boolean provides for column sortability
				hasHiddenFindings: Boolean(findings.length),
				hiddenFindings: findings.length ? findings : undefined,
				unhiddenFindings,
				component,
				id,
				severity: details.severity,
				source: details.source,
				description: details.description,
				remediation: details.remediation ?? "",
				source_plugins:
					details.source_plugins &&
					Array.isArray(details.source_plugins) &&
					details.source_plugins.length
						? [...details.source_plugins].sort() // copy array to sort const
						: undefined,
			});
		}
	}

	const exportData = () => {
		const data: RowDef[] = [];
		for (const [component, vulns] of Object.entries(
			scan.results?.vulnerabilities ?? {}
		)) {
			for (const [id, details] of Object.entries(vulns ?? {})) {
				data.push({
					component,
					id,
					severity: details.severity,
					source: details.source,
					description: details.description,
					remediation: details.remediation,
					source_plugins: details.source_plugins,
				});
			}
		}
		return data;
	};

	const onRowSelect = (row: RowDef | null) => {
		setSelectedRow(row);
		setSelectedRowNum(null);
		if (row) {
			const rowId = rows.findIndex((r) => {
				return r?.keyId === row?.keyId;
			});
			if (rowId !== -1) {
				setSelectedRowNum(rowId);
			}
		}
	};

	const handleOnClear = (field: string) => {
		const newFilters = { ...filters };
		newFilters[field].filter = "";
		setFilters(newFilters);
		saveFilters(hashPrefix, newFilters);
	};

	const clearAllFilters = () => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			for (const field in prevState) {
				newFilters[field].filter = "";
			}
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	const handleOnChange = (
		_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			newFilters[field].filter = value;
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	return (
		<>
			{rows.length ? (
				<>
					<FormControl
						component="fieldset"
						className={cx(classes.tableDescription, classes.showFilters)}
					>
						<FormLabel component="legend">
							<Trans>Filter Results</Trans>
						</FormLabel>

						<FormGroup row className={classes.filterGroup}>
							<FilterField
								field="component"
								autoFocus={true}
								label={i18n._(t`Component`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["component"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: COMPONENT_LENGTH }}
							/>
							<FilterField
								field="id"
								label={i18n._(t`Vulnerability`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["id"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: VULN_ID_LENGTH }}
							/>
							<SeverityFilterField
								value={filters["severity"].filter}
								onChange={handleOnChange}
								summary={scan?.results_summary?.vulnerabilities}
							/>
							<Zoom
								in={Object.values(filters).some((value) => value.filter)}
								unmountOnExit
							>
								<Fab
									aria-label={i18n._(t`Clear all filters`)}
									color="primary"
									size="small"
									onClick={clearAllFilters}
								>
									<ClearIcon fontSize="small" />
								</Fab>
							</Zoom>
						</FormGroup>
					</FormControl>

					<EnhancedTable
						columns={columns}
						rows={rows}
						defaultOrderBy="severity"
						onRowSelect={onRowSelect}
						selectedRow={selectedRow}
						filters={filters}
						menuOptions={{
							exportFile: "scan_vulnerabilities",
							exportFormats: ["csv", "json"],
							exportData: exportData,
						}}
					/>
					<DraggableDialog
						open={!!selectedRow}
						title={dialogTitle()}
						copyTitle={true}
						maxWidth="md"
						fullWidth={true}
					>
						{vulnDialogContent()}
					</DraggableDialog>
					<HiddenFindingDialog
						row={hideRowNum !== null ? rows[hideRowNum] : null}
						open={hideRowNum !== null}
						onClose={() => {
							setHideRowNum(null);
						}}
					/>
				</>
			) : (
				<NoResults title={i18n._(t`No vulnerabilities found`)} />
			)}
		</>
	);
};

export const SourceCodeHotLink = (props: {
	row: RowDef | null;
	addTitle?: boolean;
}) => {
	const { i18n } = useLingui();
	const { row, addTitle } = props;

	let link = <></>;
	let url = null;
	if (row) {
		url = vcsHotLink(row);
	}
	// note: use i18n instead of <Trans> element for tooltip title
	// otherwise, a11y can't determine the title properly
	const text = addTitle ? (
		<Trans>View in Version Control</Trans>
	) : (
		i18n._(t`View in Version Control`)
	);

	if (url) {
		if (addTitle) {
			link = (
				<Box>
					<Button
						startIcon={<OpenInNewIcon />}
						href={url}
						target="_blank"
						rel="noopener noreferrer nofollow"
						size="small"
					>
						{text}
					</Button>
				</Box>
			);
		} else {
			link = (
				<Box>
					<Tooltip title={text}>
						<span>
							<Button
								endIcon={<OpenInNewIcon />}
								href={url}
								target="_blank"
								rel="noopener noreferrer nofollow"
								size="small"
							></Button>
						</span>
					</Tooltip>
				</Box>
			);
		}
	} else {
		link = <></>;
	}
	return link;
};

export const AnalysisTabContent = (props: {
	scan: AnalysisReport;
	hiddenFindings: HiddenFinding[];
	currentUser: User;
	saveFilters: SaveFiltersT;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { scan, hiddenFindings, currentUser, saveFilters } = props;
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const [selectedRowNum, setSelectedRowNum] = useState<number | null>(null);
	const [hideRowNum, setHideRowNum] = useState<number | null>(null);
	const hashPrefix = FILTER_PREFIX_ANALYSIS;
	// validates url hash params, so must begin with hashPrefix
	const schema = Yup.object().shape({
		sa_filename: Yup.string()
			.trim()
			.max(
				FILEPATH_LENGTH,
				i18n._(t`File path must be less than ${FILEPATH_LENGTH} characters`)
			),
		sa_line: Yup.number()
			.positive(i18n._(t`Line must be a positive integer`))
			.integer(i18n._(t`Line must be a positive integer`))
			.max(LINE_MAX, i18n._(t`Line must be less than ${LINE_MAX}`)),
		sa_resource: Yup.string()
			.trim()
			.max(
				RESOURCE_LENGTH,
				i18n._(t`Resource must be less than ${RESOURCE_LENGTH} characters`)
			),
		sa_severity: severitySchema(i18n._(t`Invalid severity`)),
	});
	const [filters, setFilters] = useState<FilterDef>(
		getResultFilters(schema, hashPrefix, {
			filename: {
				filter: "",
			},
			line: {
				filter: "",
				match: "exact",
			},
			resource: {
				filter: "",
			},
			severity: {
				filter: "",
			},
		})
	);

	const columns: ColDef[] = [
		{ field: "filename", headerName: i18n._(t`File`) },
		{ field: "line", headerName: i18n._(t`Line`) },
		{ field: "resource", headerName: i18n._(t`Type`) },
		{
			field: "severity",
			headerName: i18n._(t`Severity`),
			children: SeverityChip,
			orderMap: severityOrderMap,
		},
		{
			field: "hasHiddenFindings",
			headerName: i18n._(t`Actions`),
			children: HiddenFindingCell,
			disableRowClick: true,
			bodyStyle: {
				maxWidth: "5rem",
				width: "5rem",
			},
		},
	];

	const rows: RowDef[] = [];

	for (const [filename, items] of Object.entries(
		scan.results?.static_analysis ?? {}
	)) {
		items.forEach((item: AnalysisFinding) => {
			// single matching hidden finding
			const findings = hiddenFindings.find((hf) => {
				return (
					hf.type === "static_analysis" &&
					hf.value.filename === filename &&
					hf.value.line === item.line &&
					hf.value.type === item.type
				);
			});
			// note: only data passed in the row object will be accessible in the cell's render function ("children" ColDef field)
			// this is why fields such as url and createdBy are added here
			rows.push({
				keyId: [
					"static_analysis",
					filename,
					item.line,
					item.type,
					item.severity,
					item.message,
				].join("-"),
				type: "static_analysis",
				url: scan.service + "/" + scan.repo,
				createdBy: currentUser.email,
				// hidden finding data stored in "hiddenFindings" field
				// boolean "hasHiddenFindings" used for column definition bc boolean provides for column sortability
				hasHiddenFindings: Boolean(findings),
				hiddenFindings: findings ? [findings] : undefined,
				filename,
				line: item.line,
				resource: item.type,
				message: item.message,
				severity: item.severity,
				repo: scan.repo,
				service: scan.service,
				branch: scan.branch,
			});
		});
	}

	const analysisDialogContent = () => {
		return (
			<>
				<DialogContent dividers={true}>
					<span>
						<SeverityChip value={selectedRow?.severity} />
					</span>
					<Grid container spacing={3}>
						{/* left column */}
						<Grid item xs={6} className={classes.tabDialogGrid}>
							<List>
								{/* TODO: consider making long individual list items scroll instead of scrolling all dialog content */}
								<ListItem key="analysis-source">
									<ListItemText
										primary={
											<>
												{i18n._(t`Found in Source File`)}
												{selectedRow?.filename && selectedRow?.line && (
													<CustomCopyToClipboard
														copyTarget={`${selectedRow.filename} (Line ${selectedRow.line})`}
													/>
												)}
											</>
										}
										secondary={
											<>
												<span>
													<Trans>
														{selectedRow?.filename ?? ""} (Line{" "}
														{selectedRow?.line}){" "}
													</Trans>
												</span>
												<SourceCodeHotLink row={selectedRow} addTitle={true} />
											</>
										}
									/>
								</ListItem>
							</List>
						</Grid>

						{/* right column */}
						<Grid item xs={6}>
							<List>
								<ListItem key="analysis-details">
									<ListItemText
										primary={
											<>
												{i18n._(t`Details`)}
												{selectedRow?.message && (
													<CustomCopyToClipboard
														copyTarget={selectedRow?.message}
													/>
												)}
											</>
										}
										secondary={selectedRow?.message ?? ""}
									/>
								</ListItem>
							</List>
						</Grid>
					</Grid>
				</DialogContent>
				<FindingDialogActions
					row={selectedRow}
					onClose={() => onRowSelect(null)}
					onFindingHidden={() => {
						setHideRowNum(selectedRowNum);
					}}
				/>
			</>
		);
	};

	const exportData = () => {
		const data: RowDef[] = [];
		for (const [filename, items] of Object.entries(
			scan.results?.static_analysis ?? {}
		)) {
			items.forEach((item: AnalysisFinding) => {
				data.push({
					filename,
					line: item.line,
					resource: item.type,
					message: item.message,
					severity: item.severity,
				});
			});
		}
		return data;
	};

	const onRowSelect = (row: RowDef | null) => {
		setSelectedRow(row);
		setSelectedRowNum(null);
		if (row) {
			const rowId = rows.findIndex((r) => {
				return r?.keyId === row?.keyId;
			});
			if (rowId !== -1) {
				setSelectedRowNum(rowId);
			}
		}
	};

	const handleOnClear = (field: string) => {
		const newFilters = { ...filters };
		newFilters[field].filter = "";
		setFilters(newFilters);
		saveFilters(hashPrefix, newFilters);
	};

	const clearAllFilters = () => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			for (const field in prevState) {
				newFilters[field].filter = "";
			}
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	const handleOnChange = (
		_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			newFilters[field].filter = value;
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	return (
		<>
			{rows.length ? (
				<>
					<FormControl
						component="fieldset"
						className={cx(classes.tableDescription, classes.showFilters)}
					>
						<FormLabel component="legend">
							<Trans>Filter Results</Trans>
						</FormLabel>

						<FormGroup row className={classes.filterGroup}>
							<FilterField
								field="filename"
								autoFocus={true}
								label={i18n._(t`File`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["filename"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: FILEPATH_LENGTH }}
							/>
							<FilterField
								field="line"
								label={i18n._(t`Line`)}
								placeholder={i18n._(t`Exact`)}
								value={filters["line"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: LINE_LENGTH }}
							/>
							<FilterField
								field="resource"
								label={i18n._(t`Type`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["resource"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: RESOURCE_LENGTH }}
							/>
							<SeverityFilterField
								value={filters["severity"].filter}
								onChange={handleOnChange}
								summary={scan?.results_summary?.static_analysis}
							/>
							<Zoom
								in={Object.values(filters).some((value) => value.filter)}
								unmountOnExit
							>
								<Fab
									aria-label={i18n._(t`Clear all filters`)}
									color="primary"
									size="small"
									onClick={clearAllFilters}
								>
									<ClearIcon fontSize="small" />
								</Fab>
							</Zoom>
						</FormGroup>
					</FormControl>

					<EnhancedTable
						columns={columns}
						rows={rows}
						defaultOrderBy="severity"
						onRowSelect={onRowSelect}
						selectedRow={selectedRow}
						filters={filters}
						menuOptions={{
							exportFile: "scan_static_analysis",
							exportFormats: ["csv", "json"],
							exportData: exportData,
						}}
					/>
					<DraggableDialog
						open={!!selectedRow}
						onClose={() => onRowSelect(null)}
						title={
							selectedRow?.resource && typeof selectedRow.resource === "string"
								? capitalize(selectedRow.resource)
								: i18n._(t`No Type`)
						}
						copyTitle={true}
						maxWidth={"md"}
						fullWidth={true}
					>
						{analysisDialogContent()}
					</DraggableDialog>
					<HiddenFindingDialog
						row={hideRowNum !== null ? rows[hideRowNum] : null}
						open={hideRowNum !== null}
						onClose={() => {
							setHideRowNum(null);
						}}
					/>
				</>
			) : (
				<NoResults title={i18n._(t`No static analysis findings`)} />
			)}
		</>
	);
};

export const SecretsTabContent = (props: {
	scan: AnalysisReport;
	hiddenFindings: HiddenFinding[];
	currentUser: User;
	saveFilters: SaveFiltersT;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { scan, hiddenFindings, currentUser, saveFilters } = props;
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const [selectedRowNum, setSelectedRowNum] = useState<number | null>(null);
	const [hideRowNum, setHideRowNum] = useState<number | null>(null);
	const hashPrefix = FILTER_PREFIX_SECRET;
	// validates url hash params, so must begin with hashPrefix
	const schema = Yup.object().shape({
		st_filename: Yup.string()
			.trim()
			.max(
				FILEPATH_LENGTH,
				i18n._(t`File path must be less than ${FILEPATH_LENGTH} characters`)
			),
		st_line: Yup.number()
			.positive(i18n._(t`Line must be a positive integer`))
			.integer(i18n._(t`Line must be a positive integer`))
			.max(LINE_MAX, i18n._(t`Line must be less than ${LINE_MAX}`)),
		st_resource: Yup.string()
			.trim()
			.max(
				RESOURCE_LENGTH,
				i18n._(t`Resource must be less than ${RESOURCE_LENGTH} characters`)
			),
		st_commit: Yup.string()
			.trim()
			.max(
				COMMIT_LENGTH,
				i18n._(t`Commit must be less than ${COMMIT_LENGTH} characters`)
			),
	});
	const [filters, setFilters] = useState<FilterDef>(
		getResultFilters(schema, hashPrefix, {
			filename: {
				filter: "",
			},
			line: {
				filter: "",
				match: "exact",
			},
			resource: {
				filter: "",
			},
			commit: {
				filter: "",
			},
		})
	);

	const columns: ColDef[] = [
		{ field: "filename", headerName: i18n._(t`File`) },
		{ field: "line", headerName: i18n._(t`Line`) },
		{ field: "resource", headerName: i18n._(t`Type`) },
		{ field: "commit", headerName: i18n._(t`Commit`) },
		{
			field: "hasHiddenFindings",
			headerName: i18n._(t`Actions`),
			children: HiddenFindingCell,
			disableRowClick: true,
			bodyStyle: {
				maxWidth: "5rem",
				width: "5rem",
			},
		},
	];
	const rows: RowDef[] = [];

	for (const [filename, items] of Object.entries(scan.results?.secrets ?? {})) {
		items.forEach((item: SecretFinding) => {
			// single matching hidden finding
			const findings = hiddenFindings.find((hf) => {
				return (
					hf.type === "secret" &&
					hf.value.filename === filename &&
					hf.value.line === item.line &&
					hf.value.commit === item.commit
				);
			});
			// note: only data passed in the row object will be accessible in the cell's render function ("children" ColDef field)
			// this is why fields such as url and createdBy are added here
			rows.push({
				keyId: ["secret", filename, item.line, item.type, item.commit].join(
					"-"
				),
				type: "secret",
				url: scan.service + "/" + scan.repo,
				createdBy: currentUser.email,
				// hidden finding data stored in "hiddenFindings" field
				// boolean "hasHiddenFindings" used for column definition bc boolean provides for column sortability
				hasHiddenFindings: Boolean(findings),
				hiddenFindings: findings ? [findings] : undefined,
				filename,
				line: item.line,
				resource: item.type,
				commit: item.commit,
				repo: scan.repo,
				service: scan.service,
				branch: scan.branch,
			});
		});
	}

	const secretDialogContent = () => {
		return (
			<>
				<DialogContent dividers={true}>
					<Grid container spacing={3}>
						{/* left column */}
						<Grid item xs={6} className={classes.tabDialogGrid}>
							<List>
								{/* TODO: consider making long individual list items scroll instead of scrolling all dialog content */}
								<ListItem key="secret-source">
									<ListItemText
										primary={
											<>
												{i18n._(t`Found in Source File`)}
												{selectedRow?.filename && selectedRow?.line && (
													<CustomCopyToClipboard
														copyTarget={`${selectedRow.filename} (Line ${selectedRow.line})`}
													/>
												)}
											</>
										}
										secondary={
											<>
												<span>
													<Trans>
														{selectedRow?.filename ?? ""} (Line{" "}
														{selectedRow?.line})
													</Trans>
												</span>
												<SourceCodeHotLink row={selectedRow} addTitle={true} />
											</>
										}
									/>
								</ListItem>
							</List>
						</Grid>

						{/* right column */}
						<Grid item xs={6}>
							<List>
								<ListItem key="secret-commit">
									<ListItemText
										primary={
											<>
												{i18n._(t`Commit`)}
												{selectedRow?.commit && (
													<CustomCopyToClipboard
														copyTarget={selectedRow.commit}
													/>
												)}
											</>
										}
										secondary={selectedRow?.commit ?? ""}
									/>
								</ListItem>
							</List>
						</Grid>
					</Grid>
				</DialogContent>
				<FindingDialogActions
					row={selectedRow}
					onClose={() => onRowSelect(null)}
					onFindingHidden={() => {
						setHideRowNum(selectedRowNum);
					}}
				/>
			</>
		);
	};

	const exportData = () => {
		const data: RowDef[] = [];
		for (const [filename, items] of Object.entries(
			scan.results?.secrets ?? {}
		)) {
			items.forEach((item: SecretFinding) => {
				data.push({
					filename,
					line: item.line,
					resource: item.type,
					commit: item.commit,
				});
			});
		}
		return data;
	};

	const onRowSelect = (row: RowDef | null) => {
		setSelectedRow(row);
		setSelectedRowNum(null);
		if (row) {
			const rowId = rows.findIndex((r) => {
				return r?.keyId === row?.keyId;
			});
			if (rowId !== -1) {
				setSelectedRowNum(rowId);
			}
		}
	};

	const handleOnClear = (field: string) => {
		const newFilters = { ...filters };
		newFilters[field].filter = "";
		setFilters(newFilters);
		saveFilters(hashPrefix, newFilters);
	};

	const clearAllFilters = () => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			for (const field in prevState) {
				newFilters[field].filter = "";
			}
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	const handleOnChange = (
		_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			newFilters[field].filter = value;
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	return (
		<>
			{rows.length ? (
				<>
					<FormControl
						component="fieldset"
						className={cx(classes.tableDescription, classes.showFilters)}
					>
						<FormLabel component="legend">
							<Trans>Filter Results</Trans>
						</FormLabel>

						<FormGroup row className={classes.filterGroup}>
							<FilterField
								field="filename"
								autoFocus={true}
								label={i18n._(t`File`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["filename"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: FILEPATH_LENGTH }}
							/>
							<FilterField
								field="line"
								label={i18n._(t`Line`)}
								placeholder={i18n._(t`Exact`)}
								value={filters["line"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: LINE_LENGTH }}
							/>
							<FilterField
								field="resource"
								label={i18n._(t`Type`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["resource"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: RESOURCE_LENGTH }}
							/>
							<FilterField
								field="commit"
								label={i18n._(t`Commit`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["commit"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: COMMIT_LENGTH }}
							/>
							<Zoom
								in={Object.values(filters).some((value) => value.filter)}
								unmountOnExit
							>
								<Fab
									aria-label={i18n._(t`Clear all filters`)}
									color="primary"
									size="small"
									onClick={clearAllFilters}
								>
									<ClearIcon fontSize="small" />
								</Fab>
							</Zoom>
						</FormGroup>
					</FormControl>

					<EnhancedTable
						columns={columns}
						rows={rows}
						defaultOrderBy="type"
						onRowSelect={onRowSelect}
						selectedRow={selectedRow}
						filters={filters}
						menuOptions={{
							exportFile: "scan_secrets",
							exportFormats: ["csv", "json"],
							exportData: exportData,
						}}
					/>
					<DraggableDialog
						open={!!selectedRow}
						onClose={() => onRowSelect(null)}
						title={
							selectedRow?.resource && typeof selectedRow.resource === "string"
								? capitalize(selectedRow.resource)
								: ""
						}
						copyTitle={true}
						maxWidth={"md"}
						fullWidth={true}
					>
						{secretDialogContent()}
					</DraggableDialog>
					<HiddenFindingDialog
						row={hideRowNum !== null ? rows[hideRowNum] : null}
						open={hideRowNum !== null}
						onClose={() => {
							setHideRowNum(null);
						}}
					/>
				</>
			) : (
				<NoResults title={i18n._(t`No secrets found`)} />
			)}
		</>
	);
};

export const ConfigTabContent = (props: {
	scan: AnalysisReport;
	hiddenFindings: HiddenFinding[];
	currentUser: User;
	saveFilters: SaveFiltersT;
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { scan, hiddenFindings, currentUser, saveFilters } = props;
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const [selectedRowNum, setSelectedRowNum] = useState<number | null>(null);
	const [hideRowNum, setHideRowNum] = useState<number | null>(null);
	const hashPrefix = FILTER_PREFIX_CONFIG;
	// validates url hash params, so must begin with hashPrefix
	const schema = Yup.object().shape({
		cg_name: Yup.string()
			.trim()
			.max(
				NAME_LENGTH,
				i18n._(t`Name must be less than ${NAME_LENGTH} characters`)
			),
		cg_description: Yup.string()
			.trim()
			.max(
				DESCRIPTION_LENGTH,
				i18n._(
					t`Description must be less than ${DESCRIPTION_LENGTH} characters`
				)
			),
		cg_severity: severitySchema(i18n._(t`Invalid severity`)),
	});
	const [filters, setFilters] = useState<FilterDef>(
		getResultFilters(schema, hashPrefix, {
			name: {
				filter: "",
			},
			description: {
				filter: "",
			},
			severity: {
				filter: "",
			},
		})
	);

	const columns: ColDef[] = [
		{ field: "name", headerName: i18n._(t`Name`), children: ConfigNameCell },
		{
			field: "severity",
			headerName: i18n._(t`Severity`),
			children: SeverityChip,
			orderMap: severityOrderMap,
		},
		{
			field: "hasHiddenFindings",
			headerName: i18n._(t`Actions`),
			children: HiddenFindingCell,
			disableRowClick: true,
			bodyStyle: {
				maxWidth: "5rem",
				width: "5rem",
			},
		},
	];

	const rows: RowDef[] = [];

	for (const [rule, info] of Object.entries(
		scan.results?.configuration ?? {}
	)) {
		// single matching hidden finding
		const findings = hiddenFindings.find((hf) => {
			return hf.type === "configuration" && hf.value.id === rule;
		});
		// note: only data passed in the row object will be accessible in the cell's render function ("children" ColDef field)
		// this is why fields such as url and createdBy are added here
		rows.push({
			keyId: ["configuration", rule].join("-"),
			type: "configuration",
			url: scan.service + "/" + scan.repo,
			createdBy: currentUser.email,
			// hidden finding data stored in "hiddenFindings" field
			// boolean "hasHiddenFindings" used for column definition bc boolean provides for column sortability
			hasHiddenFindings: Boolean(findings),
			hiddenFindings: findings ? [findings] : undefined,
			rule,
			name: info.name,
			description: info.description,
			severity: info.severity,
			repo: scan.repo,
			service: scan.service,
			branch: scan.branch,
		});
	}

	const configDialogContent = () => {
		return (
			<>
				<DialogContent dividers={true}>
					<span>
						<SeverityChip value={selectedRow?.severity} />
					</span>
					<Grid container spacing={3}>
						{/* single large column */}
						<Grid item xs={12} className={classes.tabDialogGrid}>
							<List>
								<ListItem key="config-description">
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
							</List>
						</Grid>
					</Grid>
				</DialogContent>
				<FindingDialogActions
					row={selectedRow}
					onClose={() => onRowSelect(null)}
					onFindingHidden={() => {
						setHideRowNum(selectedRowNum);
					}}
				/>
			</>
		);
	};

	const exportData = () => {
		const data: RowDef[] = [];
		for (const [rule, info] of Object.entries(
			scan.results?.configuration ?? {}
		)) {
			data.push({
				id: rule,
				name: info.name,
				description: info.description,
				severity: info.severity,
			});
		}
		return data;
	};

	const onRowSelect = (row: RowDef | null) => {
		setSelectedRow(row);
		setSelectedRowNum(null);
		if (row) {
			const rowId = rows.findIndex((r) => {
				return r?.keyId === row?.keyId;
			});
			if (rowId !== -1) {
				setSelectedRowNum(rowId);
			}
		}
	};

	const handleOnClear = (field: string) => {
		const newFilters = { ...filters };
		newFilters[field].filter = "";
		setFilters(newFilters);
		saveFilters(hashPrefix, newFilters);
	};

	const clearAllFilters = () => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			for (const field in prevState) {
				newFilters[field].filter = "";
			}
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	const handleOnChange = (
		_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			newFilters[field].filter = value;
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	return (
		<>
			{rows.length ? (
				<>
					<FormControl
						component="fieldset"
						className={cx(classes.tableDescription, classes.showFilters)}
					>
						<FormLabel component="legend">
							<Trans>Filter Results</Trans>
						</FormLabel>

						<FormGroup row className={classes.filterGroup}>
							<FilterField
								field="name"
								autoFocus={true}
								label={i18n._(t`Name`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["name"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: NAME_LENGTH }}
							/>
							<FilterField
								field="description"
								label={i18n._(t`Description`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["description"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: DESCRIPTION_LENGTH }}
							/>
							<SeverityFilterField
								value={filters["severity"].filter}
								onChange={handleOnChange}
								summary={scan?.results_summary?.configuration}
							/>
							<Zoom
								in={Object.values(filters).some((value) => value.filter)}
								unmountOnExit
							>
								<Fab
									aria-label={i18n._(t`Clear all filters`)}
									color="primary"
									size="small"
									onClick={clearAllFilters}
								>
									<ClearIcon fontSize="small" />
								</Fab>
							</Zoom>
						</FormGroup>
					</FormControl>

					<EnhancedTable
						columns={columns}
						rows={rows}
						defaultOrderBy="severity"
						onRowSelect={onRowSelect}
						selectedRow={selectedRow}
						filters={filters}
						menuOptions={{
							exportFile: "scan_configuration",
							exportFormats: ["csv", "json"],
							exportData: exportData,
						}}
					/>
					<DraggableDialog
						open={!!selectedRow}
						onClose={() => onRowSelect(null)}
						title={
							selectedRow?.name && typeof selectedRow.name === "string"
								? capitalize(selectedRow.name)
								: i18n._(t`No Name`)
						}
						copyTitle={true}
						maxWidth={"md"}
						fullWidth={true}
					>
						{configDialogContent()}
					</DraggableDialog>
					<HiddenFindingDialog
						row={hideRowNum !== null ? rows[hideRowNum] : null}
						open={hideRowNum !== null}
						onClose={() => {
							setHideRowNum(null);
						}}
					/>
				</>
			) : (
				<NoResults title={i18n._(t`No configuration findings`)} />
			)}
		</>
	);
};

const InventoryTabContent = (props: {
	scan: AnalysisReport;
	sharedColors: Palette[];
}) => {
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const { scan, sharedColors } = props;

	const columns: ColDef[] = [
		{ field: "image", headerName: i18n._(t`Image`) },
		{ field: "tag", headerName: i18n._(t`Tag`) },
	];
	const rows: RowDef[] = [];

	for (const [image, items] of Object.entries(
		scan.results?.inventory?.base_images ?? {}
	)) {
		items?.tags.forEach((tag: string) => {
			rows.push({
				keyId: ["image", image, tag].join("-"),
				image,
				tag,
			});
		});
	}

	const exportData = () => {
		const data: RowDef[] = [];
		for (const [image, items] of Object.entries(
			scan.results?.inventory?.base_images ?? {}
		)) {
			items?.tags.forEach((tag: string) => {
				data.push({
					image,
					tag,
				});
			});
		}
		return data;
	};

	interface TechData {
		name: string;
		value: number;
		palette: Palette;
	}

	const techData: TechData[] = [];
	let i = 0;
	for (const [name, value] of Object.entries(
		scan.results?.inventory?.technology_discovery ?? {}
	)) {
		techData.push({
			name,
			value,
			palette: sharedColors[i % sharedColors.length],
		});
		i += 1;
	}
	// sort technology discovery by % discovered descending
	// also ensures pie graph orders slices by size
	techData.sort((a, b) => {
		return b.value - a.value;
	});

	const renderLabel = (entry: any) => {
		return `${entry.name} (${entry.value}%)`;
	};

	return (
		<>
			<Paper square className={classes.paper}>
				<Toolbar>
					<Typography variant="h6" id="inventory-title" component="div">
						<Trans>Technology</Trans>
						<CustomCopyToClipboard
							copyTarget={techData
								.map((data) => {
									// format tech inventory results
									return `${data.name} - ${data.value}%`;
								})
								.join(", ")}
						/>
					</Typography>
				</Toolbar>
				{scan.results?.inventory?.technology_discovery ? (
					<Card>
						<CardContent>
							<div className={classes.techChartContainer}>
								<ResponsiveContainer width="100%" height={350}>
									<PieChart>
										<Pie
											data={techData}
											cx="50%"
											cy="50%"
											innerRadius="60%"
											outerRadius="80%"
											fill="#82ca9d"
											label={renderLabel}
											nameKey="name"
											dataKey="value"
											paddingAngle={2}
											minAngle={4}
											isAnimationActive={false}
										>
											{/* label displays technology count in center of pie chart torus */}
											<Label
												className={cx(
													classes.pieInnerLabel,
													"MuiTypography-h4"
												)}
												value={
													scan.results_summary?.inventory
														?.technology_discovery ?? 0
												}
												position="center"
											/>

											{
												/* pie chart slices */
												// eg [{'name': 'Java', 'value': 66.77},{},{},...]
												techData.map((entry, i) => (
													<Cell
														key={`cell-${i}`}
														fill={entry.palette.background}
													/>
												))
											}
										</Pie>

										<ChartTooltip
											content={
												// @ts-ignore
												<CustomChartTooltip />
											}
										/>

										{/* legend to left of pie chart with items listed vertically */}
										<Legend
											layout="vertical"
											iconType="circle"
											wrapperStyle={{ top: 0, left: 25, maxHeight: 10 }}
											formatter={(value, entry) => {
												// recharts LegendPayload includes a payload object that is not in the type description
												// overriding type checking here but ensuring existence before use
												// @ts-ignore
												if (entry && entry.payload && entry.payload.value) {
													// @ts-ignore
													return `${value} (${entry.payload.value}%)`;
												}
												return value;
											}}
										/>
										<ChartTooltip />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				) : (
					<NoResults title={i18n._(t`No technologies found`)} />
				)}
			</Paper>
			<Paper square className={classes.paper}>
				<Toolbar>
					<Typography variant="h6" id="base-images-title" component="div">
						<Trans>Base Images</Trans>
						{rows && (
							<CustomCopyToClipboard
								copyTarget={rows
									.map((data) => {
										// format base image results
										return `${data.image} - ${data.tag}`;
									})
									.join(", ")}
							/>
						)}
					</Typography>
				</Toolbar>
				{scan.results?.inventory?.base_images ? (
					<EnhancedTable
						columns={columns}
						rows={rows}
						defaultOrderBy="image"
						menuOptions={{
							exportFile: "scan_images",
							exportFormats: ["csv", "json"],
							exportData: exportData,
						}}
					/>
				) : (
					<NoResults title={i18n._(t`No base images found`)} />
				)}
			</Paper>
		</>
	);
};

interface CodeTabState {
	style: string;
	showLineNumbers: boolean;
	wrapLongLines: boolean;
}

type SetCodeTabState = (s: CodeTabState) => void;

interface AllStylesT {
	[key: string]: { [key: string]: React.CSSProperties };
}

type DownloadType = "sbom" | "scan";

const CodeTabContent = (props: {
	scan: AnalysisReport;
	state: CodeTabState;
	setState: SetCodeTabState;
}) => {
	const dispatch = useDispatch();
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { scan, state, setState } = props;
	const [creatingJson, setCreatingJson] = useState(false);
	const [skipDialog, setSkipDialog] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [downloadType, setDownloadType] = useState<DownloadType>("scan");
	const allStyles: AllStylesT = {
		a11yDark: { ...a11yDark },
		atomDark: { ...atomDark },
		coy: { ...coy },
		dracula: { ...dracula },
		materialDark: { ...materialDark },
		materialLight: { ...materialLight },
		materialOceanic: { ...materialOceanic },
		nord: { ...nord },
		okaidia: { ...okaidia },
		prism: { ...prism },
		solarizedlight: { ...solarizedlight },
		vs: { ...vs },
	};
	const hasSbomResults =
		scan.scan_options.categories?.includes("sbom") ||
		scan.scan_options.plugins?.some((plugin) => {
			return sbomPlugins.includes(plugin);
		});

	const handleStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setState({
			style: event.target.value,
			showLineNumbers: state.showLineNumbers,
			wrapLongLines: state.wrapLongLines,
		});
	};

	const handleJsonDownload = async () => {
		let data: AnalysisReport | SbomReport["sbom"] = scan;
		dispatch(addNotification(i18n._(t`Generating JSON File`), "info"));
		setCreatingJson(true);

		if (downloadType === "sbom") {
			data = [];
			const url = [scan.service, scan.repo, scan.scan_id].join("/");
			try {
				// call getSbomScanById directly instead of dispatching an action
				// not storing results in redux state b/c SBOM results aren't displayed in the UI, only fetched for download
				const results: SbomReport = await client.getSbomScanById(url, {});
				// only download the sbom portion of the results, not the additional scan information (repo, branch, etc.)
				data = results.sbom;
			} catch (e) {
				handleException(e);
				setCreatingJson(false);
				return;
			}
		}

		try {
			exportToJson(downloadType, data);
		} catch (e) {
			handleException(e);
		} finally {
			setCreatingJson(false);
		}
	};

	const onDialogOk = (disable: boolean) => {
		localStorage.setItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE, disable ? "1" : "0");
		handleJsonDownload();
		setDialogOpen(false);
		setSkipDialog(disable);
	};

	useEffect(() => {
		setSkipDialog(
			Boolean(Number(localStorage.getItem(STORAGE_LOCAL_EXPORT_ACKNOWLEDGE)))
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
			<WelcomeDialog
				open={dialogOpen}
				onOk={onDialogOk}
				onCancel={() => setDialogOpen(false)}
				title={i18n._(t`Confirm Download`)}
				okText={<Trans>I Acknowledge</Trans>}
			>
				<ExportDialogContent />
			</WelcomeDialog>

			<FormGroup row className={classes.rawToolbar}>
				<FormControl variant="outlined" className={classes.formControl}>
					{/* not using Formik fields here as its overkill for just an unvalidated immediate-change selector */}
					<MuiTextField
						select
						id="theme-select"
						label={i18n._(t`Theme`)}
						variant="outlined"
						autoFocus
						value={state.style}
						size="small"
						onChange={handleStyleChange}
					>
						<MenuItem value="a11yDark">
							a11yDark <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="atomDark">
							atomDark <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="coy">
							coy <Trans>(light)</Trans>
						</MenuItem>
						<MenuItem value="dracula">
							dracula <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="materialDark">
							materialDark <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="materialLight">
							materialLight <Trans>(light)</Trans>
						</MenuItem>
						<MenuItem value="materialOceanic">
							materialOceanic <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="nord">
							nord <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="okaidia">
							okaidia <Trans>(dark)</Trans>
						</MenuItem>
						<MenuItem value="prism">
							prism <Trans>(light)</Trans>
						</MenuItem>
						<MenuItem value="solarizedlight">
							solarizedLight <Trans>(light)</Trans>
						</MenuItem>
						<MenuItem value="vs">
							vs <Trans>(light)</Trans>
						</MenuItem>
					</MuiTextField>
				</FormControl>

				<FormControlLabel
					control={
						<Checkbox
							checked={state.showLineNumbers}
							onChange={() => {
								setState({
									style: state.style,
									showLineNumbers: !state.showLineNumbers,
									wrapLongLines: state.wrapLongLines,
								});
							}}
							name="showLineNumbers"
						/>
					}
					label={i18n._(t`Show line numbers`)}
				/>
				<FormControlLabel
					control={
						<Checkbox
							checked={state.wrapLongLines}
							onChange={() => {
								setState({
									style: state.style,
									showLineNumbers: state.showLineNumbers,
									wrapLongLines: !state.wrapLongLines,
								});
							}}
							name="wrapLongLines"
						/>
					}
					label={i18n._(t`Wrap long lines`)}
				/>

				<CustomCopyToClipboard size="medium" copyTarget={scan} />

				<Tooltip title={i18n._(t`Download scan results`)}>
					<span>
						<IconButton
							aria-label={i18n._(t`Download scan results`)}
							onClick={() => {
								setDownloadType("scan");
								if (skipDialog) {
									handleJsonDownload();
								} else {
									setDialogOpen(true);
								}
							}}
							size="medium"
							disabled={creatingJson}
						>
							{creatingJson && downloadType === "scan" ? (
								<CircularProgress color="inherit" size={24} />
							) : (
								<SaveAltIcon fontSize="medium" />
							)}
						</IconButton>
					</span>
				</Tooltip>

				{hasSbomResults && (
					<Tooltip title={i18n._(t`Download SBOM results`)}>
						<span>
							<IconButton
								aria-label={i18n._(t`Download SBOM results`)}
								onClick={() => {
									setDownloadType("sbom");
									if (skipDialog) {
										handleJsonDownload();
									} else {
										setDialogOpen(true);
									}
								}}
								size="medium"
								disabled={creatingJson}
							>
								{creatingJson && downloadType === "sbom" ? (
									<CircularProgress color="inherit" size={24} />
								) : (
									<InventoryIcon fontSize="medium" />
								)}
							</IconButton>
						</span>
					</Tooltip>
				)}
			</FormGroup>

			<SyntaxHighlighter
				language="json"
				style={allStyles[state.style]}
				showLineNumbers={state.showLineNumbers}
				wrapLongLines={state.wrapLongLines}
			>
				{JSON.stringify(scan, null, 2)}
			</SyntaxHighlighter>
		</>
	);
};

interface HiddenFindingsSummary extends SeverityLevels {
	secret: number;
	secret_raw: number;
	static_analysis: number;
	vulnerability: number;
	vulnerability_raw: number;
	configuration: number;
}

export const HiddenFindingsTabContent = (props: {
	hiddenFindingsConsolidatedRows: RowDef[];
	hiddenFindingsSummary: HiddenFindingsSummary;
	saveFilters: SaveFiltersT;
}) => {
	const { i18n } = useLingui();
	const { classes, cx } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const { hiddenFindingsConsolidatedRows, hiddenFindingsSummary, saveFilters } =
		props;
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const hashPrefix = FILTER_PREFIX_HIDDEN;
	// validates url hash params, so must begin with hashPrefix
	const schema = Yup.object().shape({
		hf_type: Yup.string()
			.trim()
			.oneOf(HiddenFindingTypeValues, i18n._(t`Invalid category`)),
		hf_source: Yup.string()
			.trim()
			.max(
				FILEPATH_LENGTH,
				i18n._(t`File path must be less than ${FILEPATH_LENGTH} characters`)
			),
		hf_location: Yup.string()
			.trim()
			.max(
				VULN_ID_LENGTH,
				i18n._(
					t`Id/Line location must be less than ${VULN_ID_LENGTH} characters`
				)
			),
		hf_component: Yup.string()
			.trim()
			.max(
				COMPONENT_LENGTH,
				i18n._(
					t`Component/commit must be less than ${COMPONENT_LENGTH} characters`
				)
			),
		hf_severity: severitySchema(i18n._(t`Invalid severity`)),
	});
	const [filters, setFilters] = useState<FilterDef>(
		getResultFilters(schema, hashPrefix, {
			type: {
				filter: "",
				match: "exact",
			},
			source: {
				filter: "",
			},
			location: {
				filter: "",
			},
			component: {
				filter: "",
			},
			severity: {
				filter: "",
			},
		})
	);

	const onRowSelect = (row: RowDef | null) => {
		// reset finding load state to idle so dialog stays open (refer to HiddenFindingDialog useEffect auto-close)
		dispatch(resetStatus());
		setSelectedRow(row);
	};

	const columns: ColDef[] = [
		{
			field: "type",
			headerName: i18n._(t`Category`),
			children: FindingTypeChip,
		},
		{
			field: "source",
			headerName: i18n._(t`File`),
			children: SourceCell,
			bodyStyle: {
				maxWidth: "20rem", // add limits to source file width, otherwise CVE and/or expiration may wrap
				width: "20rem",
				overflowWrap: "break-word",
			},
		},
		{
			field: "location",
			headerName: i18n._(t`Id/Line`),
			children: TooltipCell,
			bodyStyle: {
				maxWidth: "10rem", // add limits to source file width, otherwise CVE and/or expiration may wrap
				width: "10rem",
				minWidth: "10rem",
				overflowWrap: "anywhere",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				overflow: "hidden",
			},
		},
		{
			field: "component",
			headerName: i18n._(t`Component/Commit`),
			children: TooltipCell,
		},
		{
			field: "severity",
			headerName: i18n._(t`Severity`),
			children: SeverityChip,
			orderMap: severityOrderMap,
		},
		{
			field: "expires",
			headerName: i18n._(t`Expires`),
			children: ExpiringDateTimeCell,
			bodyStyle: {
				maxWidth: "110rem", // add limits to source file width, otherwise CVE and/or expiration may wrap
				width: "110rem",
				whiteSpace: "nowrap",
			},
		},
	];

	const exportData = () => {
		const data: RowDef[] = [];
		hiddenFindingsConsolidatedRows.forEach((hf) => {
			hf.hiddenFindings.forEach((f: HiddenFinding) => {
				data.push({
					id: f.id,
					type: f.type,
					location: hf.location,
					component: hf.component,
					source: "source" in f.value ? f.value.source : "",
					severity: "severity" in f.value ? f.value.severity : "",
					expires: f.expires,
					reason: f.reason,
					created_by: f.created_by,
					created: f.created,
					updated_by: f.updated_by,
					updated: f.updated,
				});
			});
		});
		return data;
	};

	const toCsv = (data: HiddenFinding) => {
		return {
			...data,
			created_by: data.created_by
				? data.created_by.replace(DELETED_REGEX, " (Deleted)")
				: null,
			updated_by: data.updated_by
				? data.updated_by.replace(DELETED_REGEX, " (Deleted)")
				: null,
		};
	};

	const handleOnClear = (field: string) => {
		const newFilters = { ...filters };
		newFilters[field].filter = "";
		setFilters(newFilters);
		saveFilters(hashPrefix, newFilters);
	};

	const clearAllFilters = () => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			for (const field in prevState) {
				newFilters[field].filter = "";
			}
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	const handleOnChange = (
		_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		field: string,
		value: string
	) => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			newFilters[field].filter = value;
			saveFilters(hashPrefix, newFilters);
			return newFilters;
		});
	};

	return (
		<>
			{hiddenFindingsConsolidatedRows.length ? (
				<>
					<Box className={classes.tableInfo}>
						<Box>
							<Chip
								label={i18n._(
									t`These findings will be excluded from all results for this repository, including all branches`
								)}
								icon={<InfoIcon />}
							/>
						</Box>
					</Box>
					<FormControl
						component="fieldset"
						className={cx(classes.tableDescription, classes.showFilters)}
					>
						<FormLabel component="legend">
							<Trans>Filter Results</Trans>
						</FormLabel>

						<FormGroup row className={classes.filterGroup}>
							<MuiTextField
								select
								id="filter-type"
								name="filter-type"
								label={i18n._(t`Category`)}
								variant="outlined"
								autoFocus={true}
								value={filters["type"].filter}
								size="small"
								className={classes.selectFilter}
								onChange={(
									event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
								) => {
									handleOnChange(event, "type", event.target.value);
								}}
								InputProps={{
									className: classes.filterField,
									startAdornment: (
										<InputAdornment position="start">
											<FilterListIcon />
										</InputAdornment>
									),
								}}
							>
								<MenuItem value="">
									<i>
										<Trans>None</Trans>
									</i>
								</MenuItem>
								<MenuItem value="configuration">
									<FindingTypeChip
										value="configuration"
										count={hiddenFindingsSummary.configuration}
									/>
								</MenuItem>
								<MenuItem value="secret">
									<FindingTypeChip
										value="secret"
										count={hiddenFindingsSummary.secret}
									/>
								</MenuItem>
								<MenuItem value="secret_raw">
									<FindingTypeChip
										value="secret_raw"
										count={hiddenFindingsSummary.secret_raw}
									/>
								</MenuItem>
								<MenuItem value="static_analysis">
									<FindingTypeChip
										value="static_analysis"
										count={hiddenFindingsSummary.static_analysis}
									/>
								</MenuItem>
								<MenuItem value="vulnerability">
									<FindingTypeChip
										value="vulnerability"
										count={hiddenFindingsSummary.vulnerability}
									/>
								</MenuItem>
								<MenuItem value="vulnerability_raw">
									<FindingTypeChip
										value="vulnerability_raw"
										count={hiddenFindingsSummary.vulnerability_raw}
									/>
								</MenuItem>
							</MuiTextField>
							<FilterField
								field="source"
								label={i18n._(t`File`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["source"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: FILEPATH_LENGTH }}
							/>
							<FilterField
								field="location"
								label={i18n._(t`Id/Line`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["location"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: VULN_ID_LENGTH }}
							/>
							<FilterField
								field="component"
								label={i18n._(t`Component/Commit`)}
								placeholder={i18n._(t`Contains`)}
								value={filters["component"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
								inputProps={{ maxLength: COMPONENT_LENGTH }}
							/>
							<SeverityFilterField
								value={filters["severity"].filter}
								onChange={handleOnChange}
								summary={hiddenFindingsSummary}
							/>
							<Zoom
								in={Object.values(filters).some((value) => value.filter)}
								unmountOnExit
							>
								<Fab
									aria-label={i18n._(t`Clear all filters`)}
									color="primary"
									size="small"
									onClick={clearAllFilters}
								>
									<ClearIcon fontSize="small" />
								</Fab>
							</Zoom>
						</FormGroup>
					</FormControl>

					<EnhancedTable
						columns={columns}
						rows={hiddenFindingsConsolidatedRows}
						defaultOrderBy="type"
						onRowSelect={onRowSelect}
						selectedRow={selectedRow}
						filters={filters}
						menuOptions={{
							exportFile: "repo_allowlist",
							exportFormats: ["csv", "json"],
							exportData: exportData,
							toCsv: toCsv,
						}}
					/>
					<HiddenFindingDialog
						open={!!selectedRow}
						onClose={() => onRowSelect(null)}
						row={selectedRow}
					/>
				</>
			) : (
				<NoResults title={i18n._(t`No hidden findings`)} />
			)}
		</>
	);
};

interface ResultsScan {
	service?: string;
	org?: string;
	repo: string;
	id: string;
	tab?: number;
}

interface ScanOptionsProps {
	scan: AnalysisReport;
}

export const ScanOptionsSummary = (props: ScanOptionsProps) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const theme = useTheme();
	const { scan } = props;
	const [accordionExpanded, setAccordionExpanded] = useState(false);

	const categories =
		scan?.scan_options.categories ??
		([
			"-vulnerability",
			"-secret",
			"-static_analysis",
			"-configuration",
			"-inventory",
			"-sbom",
		] as ScanCategories[]);
	const pluginsList =
		scan?.scan_options?.plugins?.slice().sort(compareButIgnoreLeadingDashes) ||
		[];

	const getFeatureChip = (apiName: string, label: string) => {
		const disabled = isFeatureDisabled(apiName);
		return (
			<Chip
				className={classes.chipPlugins}
				disabled={disabled}
				aria-disabled={disabled}
				key={apiName}
				label={<Trans>{label}</Trans>}
				size="small"
				variant={disabled ? "outlined" : "filled"}
			/>
		);
	};

	const categoryChips: React.ReactNode[] = categories.map((apiName) =>
		getFeatureChip(apiName, getFeatureName(apiName, pluginCatalog))
	);

	const pluginChips: React.ReactNode[] | undefined = pluginsList.map(
		(apiName) => getFeatureChip(apiName, getFeatureName(apiName, pluginKeys))
	);

	const categoriesTooltip = categories.map((apiName) =>
		isFeatureDisabled(apiName)
			? i18n._(t`${getFeatureName(apiName, pluginCatalog)} (not run)`)
			: i18n._(t`${getFeatureName(apiName, pluginCatalog)}`)
	);

	const pluginsListTooltip = pluginsList.map((apiName) =>
		isFeatureDisabled(apiName)
			? i18n._(t`${getFeatureName(apiName, pluginKeys)} (not run)`)
			: i18n._(t`${getFeatureName(apiName, pluginKeys)}`)
	);

	return (
		<Accordion
			expanded={accordionExpanded}
			onChange={() => {
				setAccordionExpanded(!accordionExpanded);
			}}
		>
			<AccordionSummary
				expandIcon={
					<Box displayPrint="none">
						<ExpandMoreIcon />
					</Box>
				}
				aria-controls="scan-options-section-content"
				id="scan-options-section-header"
			>
				<TuneIcon style={{ marginRight: theme.spacing(2) }} />
				<Typography className={classes.heading}>
					<Trans>Scan Options</Trans>
				</Typography>
			</AccordionSummary>

			<Divider />

			<AccordionDetails className={classes.accordionDetails}>
				<Grid container spacing={3}>
					<Grid item xs={6}>
						<List dense={true}>
							<ListItem key="scan-options-categories" alignItems="flex-start">
								<ListItemIcon>
									<CategoryIcon />
								</ListItemIcon>
								<Tooltip describeChild title={categoriesTooltip.join(", ")}>
									<ListItemText
										primary={i18n._(t`Categories`)}
										secondary={categoryChips}
									/>
								</Tooltip>
							</ListItem>
							<ListItem key="scan-options-plugins" alignItems="flex-start">
								<ListItemIcon>
									<ExtensionIcon />
								</ListItemIcon>
								<Tooltip describeChild title={pluginsListTooltip.join(", ")}>
									<ListItemText
										primary={i18n._(t`Plugins`)}
										secondary={
											pluginChips?.length ? pluginChips : i18n._(t`None`)
										}
									/>
								</Tooltip>
							</ListItem>
							<ListItem key="scan-options-depth" alignItems="flex-start">
								<ListItemIcon>
									<HistoryIcon />
								</ListItemIcon>
								<Tooltip describeChild title={scan?.scan_options?.depth ?? ""}>
									<ListItemText
										primary={i18n._(t`Commit History`)}
										secondary={scan?.scan_options?.depth ?? ""}
									/>
								</Tooltip>
							</ListItem>
						</List>
					</Grid>
					<Grid item xs={6}>
						<List dense={true}>
							<ListItem key="scan-options-include-dev" alignItems="flex-start">
								<ListItemIcon>
									<CodeIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										scan?.scan_options?.include_dev
											? i18n._(t`Yes`)
											: i18n._(t`No`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.listItemText }}
										primary={i18n._(t`Scan Developer Dependencies`)}
										secondary={
											scan?.scan_options?.include_dev
												? i18n._(t`Yes`)
												: i18n._(t`No`)
										}
									/>
								</Tooltip>
							</ListItem>
							<ListItem
								key="scan-options-batch-priority"
								alignItems="flex-start"
							>
								<ListItemIcon>
									<QueueIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										scan?.scan_options?.batch_priority
											? i18n._(t`Yes`)
											: i18n._(t`No`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.listItemText }}
										primary={i18n._(t`Batch Priority`)}
										secondary={
											scan?.scan_options?.batch_priority
												? i18n._(t`Yes`)
												: i18n._(t`No`)
										}
									/>
								</Tooltip>
							</ListItem>
							{scan?.batch_description && (
								<ListItem key="batch-description" alignItems="flex-start">
									<ListItemIcon>
										<LowPriorityIcon />
									</ListItemIcon>
									<Tooltip describeChild title={scan?.batch_description}>
										<ListItemText
											classes={{ secondary: classes.listItemText }}
											primary={i18n._(t`Batch Description`)}
											secondary={scan?.batch_description}
										/>
									</Tooltip>
								</ListItem>
							)}
							<ListItem
								key="scan_options-include-paths"
								alignItems="flex-start"
							>
								<ListItemIcon>
									<CreateNewFolderIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										scan?.scan_options?.include_paths
											? scan?.scan_options?.include_paths.join(", ")
											: i18n._(t`None`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.longListItemText }}
										primary={i18n._(
											t`Include Paths (${
												scan?.scan_options?.include_paths
													? scan?.scan_options?.include_paths.length
													: 0
											})`
										)}
										secondary={
											scan?.scan_options?.include_paths &&
											Array.isArray(scan?.scan_options?.include_paths) &&
											scan?.scan_options?.include_paths.length > 0 ? (
												<ol className={classes.numberedList}>
													{scan?.scan_options?.include_paths.map((path) => (
														<li key={`include-path-${path}`}>{path}</li>
													))}
												</ol>
											) : (
												<i>
													<Trans>None</Trans>
												</i>
											)
										}
									/>
								</Tooltip>
							</ListItem>
							<ListItem
								key="scan_options-exclude-paths"
								alignItems="flex-start"
							>
								<ListItemIcon>
									<FolderOffIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										scan?.scan_options?.exclude_paths
											? scan?.scan_options?.exclude_paths.join(", ")
											: i18n._(t`None`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.longListItemText }}
										primary={i18n._(
											t`Exclude Paths (${
												scan?.scan_options?.exclude_paths
													? scan?.scan_options?.exclude_paths.length
													: 0
											})`
										)}
										secondary={
											scan?.scan_options?.exclude_paths &&
											Array.isArray(scan?.scan_options?.exclude_paths) &&
											scan?.scan_options?.exclude_paths.length > 0 ? (
												<ol className={classes.numberedList}>
													{scan?.scan_options?.exclude_paths.map((path) => (
														<li key={`exclude-path-${path}`}>{path}</li>
													))}
												</ol>
											) : (
												<i>
													<Trans>None</Trans>
												</i>
											)
										}
									/>
								</Tooltip>
							</ListItem>
						</List>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};

interface ResultsSummaryProps {
	scan: AnalysisReport;
}

// displayEnd - boolean, whether to display the endTime
// defaults to false, display the startTime
function elapsedTime(
	startTime?: string,
	endTime?: string,
	displayEnd?: boolean
) {
	const dt = formatDate((displayEnd ? endTime : startTime) || "", "long");
	const elapsed = DateTime.fromISO(endTime || DateTime.now().toString())
		.diff(DateTime.fromISO(startTime || DateTime.now().toString()))
		.toFormat("hh:mm:ss");
	return (
		<Trans>
			{dt} / {elapsed} Elapsed
		</Trans>
	);
}

export const ResultsSummary = (props: ResultsSummaryProps) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { scan } = props;

	let resultsIcon = <AssignmentLateIcon className={classes.resultsError} />;
	let resultsChip = (
		<Chip
			size="small"
			variant="outlined"
			className={classes.resultsError}
			label={i18n._(t`Issues Found`)}
		></Chip>
	);
	if (scan?.success) {
		resultsIcon = <AssignmentTurnedInIcon className={classes.resultsSuccess} />;
		resultsChip = (
			<Chip
				size="small"
				variant="outlined"
				className={classes.resultsSuccess}
				label={i18n._(t`No Issues Found`)}
			></Chip>
		);
	}

	return (
		<Paper className={classes.paper}>
			<Typography
				component="h2"
				variant="h6"
				align="center"
				className={classes.paperHeader}
			>
				<Trans>Scan Results</Trans>
				<CustomCopyToClipboard
					icon="share"
					size="small"
					copyTarget={window.location.href}
					copyLabel={i18n._(t`Copy link to these scan results`)}
				/>
			</Typography>

			<Grid container spacing={3}>
				{/* left column */}
				<Grid item xs={4}>
					<List dense={true}>
						<ListItem key="scan-repo" alignItems="flex-start">
							<ListItemIcon>
								<FolderIcon />
							</ListItemIcon>
							<Tooltip describeChild title={scan?.repo || ""}>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Organization / Repository`)}
									secondary={scan?.repo}
								/>
							</Tooltip>
						</ListItem>
						<ListItemMetaMultiField data={scan} includeIcon={true} />
						<ResultsMetaField data={scan} />
						<ListItem key="scan-service" alignItems="flex-start">
							<ListItemIcon>
								<CloudIcon />
							</ListItemIcon>
							<Tooltip describeChild title={scan?.service || ""}>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Service`)}
									secondary={scan?.service}
								/>
							</Tooltip>
						</ListItem>
						<ListItem key="scan-branch" alignItems="flex-start">
							<ListItemIcon>
								<AccountTreeIcon />
							</ListItemIcon>
							<Tooltip describeChild title={scan?.branch || i18n._(t`Default`)}>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Branch`)}
									secondary={
										scan?.branch || (
											<i>
												<Trans>Default</Trans>
											</i>
										)
									}
								/>
							</Tooltip>
						</ListItem>
					</List>
				</Grid>

				{/* middle column */}
				<Grid item xs={4}>
					<List dense={true}>
						<ListItem key="scan-initiated-by" alignItems="flex-start">
							<ListItemIcon>
								<PersonIcon />
							</ListItemIcon>
							<Box className={classes.listItemText}>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Initiated By`)}
									secondary={
										scan?.initiated_by ? (
											<MailToLink
												recipient={scan.initiated_by}
												text={scan.initiated_by}
												tooltip
											/>
										) : (
											<i>
												<Trans>Not specified</Trans>
											</i>
										)
									}
								/>
							</Box>
						</ListItem>
						<ListItem key="scan-status" alignItems="flex-start">
							<ListItemIcon>
								<InfoIcon />
							</ListItemIcon>
							<Tooltip describeChild title={scan?.status || ""}>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Status`)}
									secondary={scan?.status ? capitalize(scan?.status) : ""}
								/>
							</Tooltip>
						</ListItem>

						<ListItem key="scan-success" alignItems="flex-start">
							<ListItemIcon>{resultsIcon}</ListItemIcon>
							<Tooltip
								describeChild
								title={
									scan?.success
										? i18n._(t`No Issues Found`)
										: i18n._(t`Potential Security Issues Found`)
								}
							>
								<ListItemText
									primary={i18n._(t`Results`)}
									secondary={resultsChip}
								/>
							</Tooltip>
						</ListItem>

						<ListItem key="scan-id" alignItems="flex-start">
							<ListItemIcon>
								<SecurityIcon />
							</ListItemIcon>
							<Tooltip describeChild title={scan?.scan_id || ""}>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Scan ID`)}
									secondary={scan?.scan_id}
								/>
							</Tooltip>
						</ListItem>
					</List>
				</Grid>

				{/* right column */}
				<Grid item xs={4}>
					<List dense={true}>
						<ListItem key="scan-time-queued" alignItems="flex-start">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<Tooltip
								describeChild
								title={elapsedTime(
									scan?.timestamps?.queued || undefined,
									scan?.timestamps?.start || DateTime.now().toString()
								)}
							>
								<ListItemText
									classes={{ secondary: classes.listItemTextWrapped }}
									primary={i18n._(t`Queued Date / Queued Time Elapsed`)}
									secondary={elapsedTime(
										scan?.timestamps?.queued || undefined,
										scan?.timestamps?.start || DateTime.now().toString()
									)}
								/>
							</Tooltip>
						</ListItem>
						<ListItem key="scan-time-start" alignItems="flex-start">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<Tooltip
								describeChild
								title={formatDate(scan?.timestamps?.start || "", "long")}
							>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Start Date`)}
									secondary={formatDate(scan?.timestamps?.start || "", "long")}
								/>
							</Tooltip>
						</ListItem>
						<ListItem key="scan-time-end" alignItems="flex-start">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<Tooltip
								describeChild
								title={elapsedTime(
									scan?.timestamps?.start || undefined,
									scan?.timestamps?.end || DateTime.now().toString(),
									true
								)}
							>
								<ListItemText
									classes={{ secondary: classes.listItemTextWrapped }}
									primary={i18n._(t`End Date / Scan Time Elapsed`)}
									secondary={elapsedTime(
										scan?.timestamps?.start || undefined,
										scan?.timestamps?.end || DateTime.now().toString(),
										true
									)}
								/>
							</Tooltip>
						</ListItem>
					</List>
				</Grid>
			</Grid>

			<ScanOptionsSummary scan={scan} />
		</Paper>
	);
};

// updates url to match current result filters
// @prefix - prefix to differentiate hash parameters for various result types, e.g., "vn" for vulnerability. Each hash parameter will be prefixed with this value
// @filters - FilterDef object with result filters to convert to url query hash params
// @returns - void, performs page navigation
export const setResultFilters = (
	prefix: string = "",
	filters: FilterDef | null = null,
	location: Location,
	navigate: NavigateFunction
): void => {
	const hash = queryString.parse(window.location.hash);
	const keys = Object.keys(hash);

	// remove existing filters matching prefix
	if (keys.length) {
		for (const k of keys) {
			if (k.startsWith(prefix)) {
				delete hash[k];
			}
		}
	}
	// add new filters
	const addFilters: { [key: string]: string } = {};
	if (filters && Object.keys(filters).length) {
		for (const f in filters) {
			if (filters[f].filter) {
				addFilters[`${prefix}${f}`] = String(filters[f].filter);
			}
		}
	}

	const hashString = "#" + queryString.stringify({ ...hash, ...addFilters });
	if (hashString !== window.location.hash) {
		// invoke navigation although we only want to update url hash params
		// this is done b/c we need to use navigate() to maintain state so Back button properly navigates to prior page
		// this will invoke a page reload, but so does setting window.location.hash
		navigate(`${location.pathname}${location?.search}${hashString}`, {
			state: location?.state,
			replace: true,
			preventScrollReset: true,
		});
	}
};

export const TabContent = (props: {
	activeTab: number;
	onTabChange: (n: number) => void;
	scan: AnalysisReport;
	hiddenFindings: HiddenFinding[];
	currentUser: User;
	sharedColors: Palette[];
}) => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const location = useLocation();
	const navigate = useNavigate();
	const theme = useTheme();
	const [codeTabState, setCodeTabState] = useState<CodeTabState>({
		style: theme.palette.mode === "dark" ? "materialDark" : "materialLight",
		showLineNumbers: false,
		wrapLongLines: false,
	});
	const {
		activeTab,
		scan,
		hiddenFindings,
		currentUser,
		sharedColors,
		onTabChange,
	} = props;

	const getTotalCounts = useCallback(() => {
		const imageCount = scan?.results_summary?.inventory?.base_images ?? 0;
		const techCount =
			scan?.results_summary?.inventory?.technology_discovery ?? 0;
		return {
			secrets: scan?.results_summary?.secrets ?? 0,
			inventory: imageCount || techCount ? `${techCount}/${imageCount}` : 0,
			// sum the key totals
			vulnerabilities: scan?.results_summary?.vulnerabilities
				? Object.values(scan.results_summary.vulnerabilities).reduce(
						(a, b) => a + b
				  )
				: 0,
			staticAnalysis: scan?.results_summary?.static_analysis
				? Object.values(scan.results_summary.static_analysis).reduce(
						(a, b) => a + b
				  )
				: 0,
			config: scan?.results_summary?.configuration
				? Object.values(scan.results_summary.configuration).reduce(
						(a, b) => a + b
				  )
				: 0,
		};
	}, [scan?.results_summary]);

	const [counts, setCount] = useState(getTotalCounts());
	const [hiddenFindingsConsolidatedRows, setHiddenFindingsConsolidatedRows] =
		useState<RowDef[]>([]);
	const [hiddenFindingsSummary, setHiddenFindingsSummary] =
		useState<HiddenFindingsSummary>({
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
			secret: 0,
			secret_raw: 0,
			static_analysis: 0,
			vulnerability: 0,
			vulnerability_raw: 0,
			configuration: 0,
		});

	// calculate hiddenFinding count
	// rollup vulnerability findings with only differing source files into single finding
	// to match other areas in results
	useEffect(() => {
		const rows: RowDef[] = [];
		const summary = {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
			secret: 0,
			secret_raw: 0,
			static_analysis: 0,
			vulnerability: 0,
			vulnerability_raw: 0,
			configuration: 0,
		};

		hiddenFindings.forEach((item: HiddenFinding) => {
			// common fields for all types
			let row: any = {
				keyId: ["hiddenFinding", item.id].join("-"),
				url: scan.service + "/" + scan.repo,
				createdBy: currentUser.email,
				type: item.type,
				// set items without an expiration to "Never" instead of ""
				// so they sort (asc) oldest => newest => never using cell strcmp
				expires: item.expires ?? i18n._(t`Never`),
				repo: scan.repo,
				service: scan.service,
				branch: scan.branch,
			};
			let unhiddenFindings: string[] = [];

			switch (item.type) {
				case "configuration": {
					row = {
						...row,
						source: "",
						filename: "",
						location: item.value.id,
						component: "",
						severity: item.value?.severity ?? "",
						hiddenFindings: [{ ...item }],
						unhiddenFindings,
					};
					rows.push(row);
					summary.configuration += 1;
					if (item.value?.severity && item.value.severity in summary) {
						summary[item.value.severity] += 1;
					}
					break;
				}

				case "static_analysis": {
					row = {
						...row,
						source: item.value.filename,
						filename: item.value.filename,
						location: item.value.line,
						component: item.value.type,
						severity: item.value?.severity ?? "",
						hiddenFindings: [{ ...item }],
						unhiddenFindings,
					};
					rows.push(row);
					summary.static_analysis += 1;
					if (item.value?.severity && item.value.severity in summary) {
						summary[item.value.severity] += 1;
					}
					break;
				}

				case "secret": {
					row = {
						...row,
						source: item.value.filename,
						filename: item.value.filename,
						location: item.value.line,
						component: item.value.commit,
						severity: "", // default to "" instead of null so it sorts correctly among other severities
						hiddenFindings: [{ ...item }],
						unhiddenFindings,
					};
					rows.push(row);
					summary.secret += 1;
					break;
				}

				case "secret_raw": {
					row = {
						...row,
						source: i18n._(t`Any`),
						location: item.value.value,
						component: i18n._(t`Any`),
						severity: "",
						hiddenFindings: [{ ...item }],
						unhiddenFindings,
					};
					rows.push(row);
					summary.secret_raw += 1;
					break;
				}

				// combine vuln findings with same id & component, this matches how these would be hidden in the vulns tab
				case "vulnerability": {
					const rowMatch = rows.find((er) => {
						if (
							er.type === "vulnerability" &&
							er.location === item.value.id &&
							er.component === item.value.component
						) {
							return true;
						}
						return false;
					});
					if (rowMatch && Array.isArray(rowMatch.source)) {
						rowMatch.source.push(item.value.source);
						rowMatch.hiddenFindings.push({ ...item });
						rowMatch.unhiddenFindings = rowMatch.unhiddenFindings.filter(
							(src: string) => src !== item.value.source
						);
					} else {
						// source files associated with this component/vuln that are not already covered by this hidden finding
						if (
							scan?.results?.vulnerabilities &&
							item.value.component in scan.results.vulnerabilities
						) {
							if (
								item.value.id in
								scan.results.vulnerabilities[item.value.component]
							) {
								unhiddenFindings = scan.results.vulnerabilities[
									item.value.component
								][item.value.id].source.filter(
									(src: string) => src !== item.value.source
								);
							}
						}
						row = {
							...row,
							source: [item.value.source],
							location: item.value.id,
							component: item.value.component,
							severity: item.value?.severity ?? "",
							hiddenFindings: [{ ...item }],
							unhiddenFindings,
						};
						rows.push(row);
						summary.vulnerability += 1;
						if (item.value?.severity && item.value.severity in summary) {
							summary[item.value.severity] += 1;
						}
					}
					break;
				}

				case "vulnerability_raw": {
					row = {
						...row,
						source: i18n._(t`Any`),
						location: item.value.id,
						component: i18n._(t`Any`),
						severity: item.value?.severity ?? "",
						hiddenFindings: [{ ...item }],
						unhiddenFindings,
					};
					rows.push(row);
					summary.vulnerability_raw += 1;
					if (item.value?.severity && item.value.severity in summary) {
						summary[item.value.severity] += 1;
					}
					break;
				}
			}
		});

		setHiddenFindingsConsolidatedRows(rows);
		setHiddenFindingsSummary(summary);
	}, [hiddenFindings, scan, currentUser.email, i18n]);

	// update tab badge counts if user or scan results change
	useEffect(() => {
		setCount(getTotalCounts());
	}, [getTotalCounts, currentUser.email, scan?.results_summary]);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		onTabChange(newValue);
	};

	// This is so the overview chart can change the current tab
	const tabChanger = (n: number) => onTabChange(n);

	// When tabs are disabled, then OverviewCards should not be clickable links to those tabs
	const isDisabledConfig = !scan?.results_summary?.configuration;
	const isDisabledVulns = !scan?.results_summary?.vulnerabilities;
	const isDisabledStat = !scan?.results_summary?.static_analysis;
	const isDisabledSecrets = typeof scan?.results_summary?.secrets !== "number";
	const isDisabledInventory = !scan?.results_summary?.inventory;
	const isDisabledHFs = false; // always available to allowlist a new HF

	return (
		<Paper id="tab-paper">
			<Paper square>
				<Tabs
					value={activeTab}
					indicatorColor="primary"
					textColor="primary"
					onChange={handleTabChange}
					aria-label={i18n._(t`Report Sections Tabs`)}
					variant="fullWidth"
				>
					<Tab
						value={TAB_OVERVIEW}
						className={classes.tab}
						label={i18n._(t`Overview`)}
						icon={<AssessmentIcon />}
						{...a11yProps(TAB_OVERVIEW)}
					/>
					<Tab
						value={TAB_VULN}
						className={classes.tab}
						label={i18n._(t`Vulnerabilities`)}
						icon={
							<StyledBadge
								badgeContent={counts.vulnerabilities}
								max={999}
								color="primary"
							>
								<SecurityIcon />
							</StyledBadge>
						}
						{...a11yProps(TAB_VULN)}
						disabled={isDisabledVulns}
					/>
					<Tab
						value={TAB_ANALYSIS}
						className={classes.tab}
						label={i18n._(t`Static Analysis`)}
						icon={
							<StyledBadge
								badgeContent={counts.staticAnalysis}
								max={999}
								color="primary"
							>
								<BugReportIcon />
							</StyledBadge>
						}
						{...a11yProps(TAB_ANALYSIS)}
						disabled={isDisabledStat}
					/>
					<Tab
						value={TAB_SECRET}
						className={classes.tab}
						label={i18n._(t`Secrets`)}
						icon={
							<StyledBadge
								badgeContent={counts.secrets}
								max={999}
								color="primary"
							>
								<VpnKeyIcon />
							</StyledBadge>
						}
						{...a11yProps(TAB_SECRET)}
						disabled={isDisabledSecrets}
					/>
					<Tab
						value={TAB_CONFIG}
						className={classes.tab}
						label={i18n._(t`Configuration`)}
						icon={
							<StyledBadge
								badgeContent={counts.config}
								max={999}
								color="primary"
							>
								<FactCheckIcon />
							</StyledBadge>
						}
						{...a11yProps(TAB_CONFIG)}
						disabled={isDisabledConfig}
					/>
					<Tab
						value={TAB_INVENTORY}
						className={classes.tab}
						label={i18n._(t`Inventory`)}
						icon={
							<StyledBadge
								badgeContent={counts.inventory}
								max={999}
								color="primary"
							>
								<LayersIcon />
							</StyledBadge>
						}
						{...a11yProps(TAB_INVENTORY)}
						disabled={isDisabledInventory}
					/>
					<Tab
						value={TAB_RAW}
						className={classes.tab}
						label={i18n._(t`Raw`)}
						icon={<CodeIcon />}
						{...a11yProps(TAB_RAW)}
					/>
					<Tab
						value={TAB_HIDDEN}
						className={classes.tab}
						label={i18n._(t`Hidden Findings`)}
						icon={
							<StyledBadge
								badgeContent={hiddenFindingsConsolidatedRows.length}
								max={999}
								color="primary"
							>
								<VisibilityOffIcon />
							</StyledBadge>
						}
						{...a11yProps(TAB_HIDDEN)}
					/>
				</Tabs>
			</Paper>

			<TabPanel value={activeTab} index={TAB_OVERVIEW}>
				<OverviewTabContent
					scan={scan}
					hfRows={hiddenFindingsConsolidatedRows}
					tabChanger={tabChanger}
					sharedColors={sharedColors}
					tabsStatus={{
						isDisabledVulns,
						isDisabledStat,
						isDisabledSecrets,
						isDisabledInventory,
						isDisabledHFs,
						isDisabledConfig,
					}}
				/>
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_VULN}>
				<VulnTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={currentUser}
					saveFilters={(prefix, filters) =>
						setResultFilters(prefix, filters, location, navigate)
					}
				/>
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_ANALYSIS}>
				<AnalysisTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={currentUser}
					saveFilters={(prefix, filters) =>
						setResultFilters(prefix, filters, location, navigate)
					}
				/>
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_SECRET}>
				<SecretsTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={currentUser}
					saveFilters={(prefix, filters) =>
						setResultFilters(prefix, filters, location, navigate)
					}
				/>
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_CONFIG}>
				<ConfigTabContent
					scan={scan}
					hiddenFindings={hiddenFindings}
					currentUser={currentUser}
					saveFilters={(prefix, filters) =>
						setResultFilters(prefix, filters, location, navigate)
					}
				/>
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_INVENTORY}>
				<InventoryTabContent scan={scan} sharedColors={sharedColors} />
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_RAW}>
				<CodeTabContent
					scan={scan}
					state={codeTabState}
					setState={setCodeTabState}
				/>
			</TabPanel>
			<TabPanel value={activeTab} index={TAB_HIDDEN}>
				<HiddenFindingsTabContent
					hiddenFindingsConsolidatedRows={hiddenFindingsConsolidatedRows}
					hiddenFindingsSummary={hiddenFindingsSummary}
					saveFilters={(prefix, filters) =>
						setResultFilters(prefix, filters, location, navigate)
					}
				/>
			</TabPanel>
		</Paper>
	);
};

const ResultsPage = () => {
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const theme = useTheme();
	const dispatch: AppDispatch = useDispatch();
	const navigate = useNavigate(); // only for navigation, e.g. replace(), push(), goBack()
	const location = useLocation(); // for location, since history.location is mutable
	const [id, setId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
	const [initialFindingCount, setInitialFindingCount] = useState<number | null>(
		null
	);
	const hiddenFindings = useSelector((state: RootState) =>
		selectAllHiddenFindings(state)
	);
	const hiddenFindingsTotal = useSelector(selectTotalHiddenFindings);
	const scansStatus = useSelector((state: RootState) => state.scans.status);
	const scan = useSelector((state: RootState) =>
		selectScanById(state, id || -1)
	);

	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	); // current user is "self" id
	const usersStatus = useSelector(
		(state: RootState) => state.currentUser.status
	);
	const [sharedColors, setSharedColors] = useState<Palette[]>([]);
	const [startingRescan, setStartingRescan] = useState(false);
	const [rescanDialogOpen, setRescanDialogOpen] = useState(false);

	const resultsScanSchema = Yup.object().shape(
		{
			org: Yup.string()
				.trim()
				.when("service", {
					is: (service: string) => service && service.length > 0,
					then: (schema) => schema,
					otherwise: (schema) =>
						schema.required(i18n._(t`Service or org required`)),
				})
				.oneOf(currentUser?.scan_orgs ?? [], i18n._(t`Invalid value`)),
			service: Yup.string()
				.trim()
				.when("org", {
					is: (org: string) => org && org.length > 0,
					then: (schema) => schema,
					otherwise: (schema) =>
						schema.required(i18n._(t`Service or org required`)),
				})
				.test(
					"userScanOrg",
					i18n._(t`User does not have access to this service`),
					(value, context) => {
						if (context?.parent?.org) {
							return true;
						}
						if (value && currentUser?.scan_orgs) {
							for (let i = 0; i < currentUser.scan_orgs.length; i += 1) {
								if (currentUser.scan_orgs[i].startsWith(value)) {
									return true;
								}
							}
						}
						return false;
					}
				),
			repo: Yup.string()
				.trim()
				.required()
				.matches(/^[a-zA-Z0-9.\-_/]+$/)
				.when("org", {
					// if org does not contain /Org suffix, then repo must contain Org/ Prefix
					is: (org: string) => org && !org.includes("/"),
					then: (schema) => schema.matches(/\//),
				}),
			id: Yup.string()
				.defined()
				.length(36)
				.matches(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
				), // UUID
			tab: Yup.number().min(TAB_MIN).max(TAB_MAX).integer(),
		},
		[["org", "service"]]
	);

	// get report params from passed-in URL query params and validate matches schema
	// returns null if no hash params or validation fails
	const getSearchParams = (): ResultsScan | null => {
		if (location.search) {
			const search = queryString.parse(location.search);
			if (Object.keys(search).length) {
				try {
					// schema validation will also transform query params to their correct types
					const validValues = resultsScanSchema.validateSync(search, {
						strict: false, // setting to false will trim fields on validate
					});
					if (
						validValues?.repo &&
						validValues?.id &&
						(validValues?.org || validValues?.service)
					) {
						return validValues;
					}
					return null;
				} catch (err) {
					return null;
				}
			}
		}
		return null;
	};

	const onTabChange = (tab: number) => {
		setActiveTab(tab);

		// add new tab id to url search query string
		if (location.search) {
			const search = queryString.parse(location.search);
			if (Object.keys(search).length) {
				search["tab"] = String(tab);
				navigate(
					`${location.pathname}?${queryString.stringify(search)}${
						window.location.hash
					}`,
					{
						state: location?.state,
						replace: true,
						preventScrollReset: true,
					}
				);
			}
		}
	};

	useEffect(() => {
		document.title = i18n._(t`Artemis - Scan Results`);
	}, [i18n]);

	// initial page load
	useEffect(() => {
		// because we are using a SPA router, opening a report will not automatically scroll to top of page
		// so do this manually when report is first viewed
		if (currentUser && currentUser.scan_orgs && currentUser.scan_orgs.length) {
			window.scrollTo(0, 0);

			const searchParams = getSearchParams();
			if (searchParams) {
				setId(searchParams.id);
				const repoUrl = [
					searchParams.org ?? searchParams.service,
					searchParams.repo,
				].join("/");
				const scanUrl = [repoUrl, searchParams.id].join("/");
				dispatch(
					getScanById({
						url: scanUrl,
						meta: {
							filters: {
								format: { match: "exact", filter: "full" },
							}, // get full results
						},
					})
				);

				// clear stale hidden findings (could be for a different repo)
				dispatch(clearHiddenFindings());

				// get any hidden findings for the repo
				dispatch(
					getHiddenFindings({
						url: repoUrl,
					})
				);
			}
		}

		// run as currentUser changes,
		// getting loaded async to validate vcsOrg option passed in URL
		// are valid for current user

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser]);

	useEffect(() => {
		if (initialFindingCount === null) {
			setInitialFindingCount(hiddenFindingsTotal);
		}
	}, [hiddenFindingsTotal, initialFindingCount]);

	useEffect(() => {
		if (
			currentUser &&
			currentUser.scan_orgs &&
			currentUser.scan_orgs.length &&
			scan &&
			// full scan results have been fetched
			Object.keys(scan?.results ?? {}).length > 0
		) {
			// add repo & branch name to page title now that we have that info from the loaded scan data
			document.title = scan?.branch
				? i18n._(t`Artemis - Scan Results: ${scan?.repo} (${scan.branch})`)
				: i18n._(t`Artemis - Scan Results: ${scan?.repo} (default)`);

			const searchParams = getSearchParams();
			if (searchParams?.tab) {
				let tab = searchParams.tab;
				// don't activate a disabled tab (category that wasn't run)
				// instead, redirect to overview tab
				if (
					(tab === TAB_VULN && !scan?.results_summary?.vulnerabilities) ||
					(tab === TAB_ANALYSIS && !scan?.results_summary?.static_analysis) ||
					(tab === TAB_CONFIG && !scan?.results_summary?.configuration) ||
					(tab === TAB_SECRET &&
						typeof scan?.results_summary?.secrets !== "number") ||
					(tab === TAB_INVENTORY && !scan?.results_summary?.inventory)
				) {
					tab = TAB_OVERVIEW;
				}
				setActiveTab(tab);
			}

			// scan still running
			if (
				scan.status === "queued" ||
				scan.status === "processing" ||
				scan.status.startsWith("running ")
			) {
				dispatch(
					addNotification(
						i18n._(t`Scan in progress, results subject to change`),
						"info"
					)
				);
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser, scan]);

	useEffect(() => {
		function generateChartColors(count: number) {
			const colors: Palette[] = [];

			const shades =
				theme.palette.mode === "dark"
					? ["100", "200"] // how light or dark to make pie chart segment colors
					: ["400", "500"];
			for (let i = 0; i < count; i += 1) {
				let color = randomMC.getColor({ shades: shades });
				// don't reuse an existing selected color
				while (colors.indexOf(color) !== -1) {
					color = randomMC.getColor({ shades: shades });
				}
				// create a mui palette for this color so we can get the contrasting text color
				const palette = createPalette({
					primary: { main: color },
				});
				colors.push({
					background: color,
					text: palette.primary.contrastText,
				});
			}

			return colors;
		}

		const numberOfColors = 25; // beyond approx 35, generating colors becomes an infinite loop, there must be a limited number of material ui colors available.
		setSharedColors(generateChartColors(numberOfColors));
	}, [theme.palette.mode]);

	const ErrorContent = () => (
		<Container className={classes.alertContainer}>
			<Alert variant="outlined" severity="error" className={classes.alert}>
				<AlertTitle>
					<Trans>Error</Trans>
				</AlertTitle>
				<Trans>Results for the specified scan can not be found.</Trans>
			</Alert>
		</Container>
	);

	const LoadingContent = () => (
		<Container className={classes.alertContainer}>
			<Alert variant="outlined" severity="info" className={classes.alert}>
				<AlertTitle>
					<Trans>Please wait</Trans>
				</AlertTitle>
				<Trans>Fetching scan results...</Trans>
			</Alert>
		</Container>
	);

	const BackButton = () => {
		const handBackButton = (event: React.SyntheticEvent) => {
			event.preventDefault();

			if (location?.state?.fromScanForm && window.history.length > 1) {
				// user modified hidden findings while viewing scan results
				// clear the scan cache so hidden finding changes will be applied to new scan results
				// that will be fetched when navigating back to viewing scans on main page
				if (initialFindingCount !== hiddenFindingsTotal) {
					dispatch(clearScans());
				}
				// navigated here from scans form, so return to it
				navigate(-1);
			} else {
				// navigated directly here (such as via URL), force nav to scans page
				navigate("/");
			}
		};

		return (
			<Button
				startIcon={<ArrowBackIosIcon />}
				onClick={handBackButton}
				disabled={startingRescan}
			>
				<Trans>Back to Scans</Trans>
			</Button>
		);
	};

	// create a new scan based on options from current scan results
	const handleRescan = async (scan: AnalysisReport) => {
		setStartingRescan(true);

		// determine service + org from service + repo (where org may be part of the repo string)
		const serviceRepo = `${scan.service}/${scan.repo}`;
		const vcsOrg = currentUser?.scan_orgs
			? currentUser?.scan_orgs.find((org) => serviceRepo.startsWith(org))
			: null;
		const repo = vcsOrg ? serviceRepo.replace(`${vcsOrg}/`, "") : null;

		startScan(
			navigate,
			{
				vcsOrg: vcsOrg ?? scan.service,
				repo: repo ?? scan.repo,
				branch: scan.branch ?? "",
				secrets: scan.scan_options.categories?.includes("secret") ?? true,
				staticAnalysis:
					scan.scan_options.categories?.includes("static_analysis") ?? true,
				inventory: scan.scan_options.categories?.includes("inventory") ?? true,
				vulnerability:
					scan.scan_options.categories?.includes("vulnerability") ?? true,
				sbom: scan.scan_options.categories?.includes("sbom") ?? true,
				configuration:
					scan.scan_options.categories?.includes("configuration") ?? true,
				depth: scan.scan_options?.depth ?? "",
				includeDev: scan.scan_options?.include_dev ?? false,
				// removes any disabled plugins from new scan
				secretPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => secretPlugins.includes(p) || secretPlugins.includes(`-${p}`)
					),
				staticPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => staticPlugins.includes(p) || staticPlugins.includes(`-${p}`)
					),
				techPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => techPlugins.includes(p) || techPlugins.includes(`-${p}`)
					),
				vulnPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => vulnPlugins.includes(p) || vulnPlugins.includes(`-${p}`)
					),
				sbomPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => sbomPlugins.includes(p) || sbomPlugins.includes(`-${p}`)
					),
				configPlugins:
					scan.scan_options?.plugins &&
					scan.scan_options?.plugins.filter(
						(p) => configPlugins.includes(p) || configPlugins.includes(`-${p}`)
					),
				includePaths: scan.scan_options?.include_paths
					? scan.scan_options?.include_paths.join(", ")
					: "",
				excludePaths: scan.scan_options?.exclude_paths
					? scan.scan_options?.exclude_paths.join(", ")
					: "",
			},
			currentUser
		);
	};

	return (
		<Container>
			<Box displayPrint="none" className={classes.navButtons}>
				<BackButton />

				<Button
					startIcon={
						<AutorenewIcon
							className={scansStatus === "loading" ? classes.refreshSpin : ""}
						/>
					}
					disabled={!scan || scansStatus === "loading" || startingRescan}
					onClick={() => {
						dispatch(
							getScanById({
								url: [scan?.service, scan?.repo, scan?.scan_id].join("/"),
								meta: {
									filters: {
										format: { match: "exact", filter: "full" },
									}, // get full results
								},
							})
						);
					}}
				>
					<Trans>Refresh Scan Results</Trans>
				</Button>

				<DraggableDialog
					open={rescanDialogOpen}
					title={i18n._(t`New Scan`)}
					maxWidth="md"
				>
					<DialogContent dividers={true}>
						<Trans>
							Start a new scan using the same options used in this scan?
							<br />
							Initiating a new scan will navigate to the main scan page to
							display scan progress.
						</Trans>
					</DialogContent>

					<DialogActions>
						<Button
							aria-label={i18n._(t`Start Scan`)}
							size="small"
							variant="contained"
							startIcon={<PlayCircleOutlineIcon />}
							disabled={!scan || scansStatus === "loading" || startingRescan}
							autoFocus={rescanDialogOpen}
							onClick={() => {
								setRescanDialogOpen(false);
								if (scan) {
									handleRescan(scan);
								}
							}}
						>
							<Trans>Start Scan</Trans>
						</Button>

						<Button
							aria-label={i18n._(t`Cancel`)}
							size="small"
							onClick={() => {
								setRescanDialogOpen(false);
							}}
						>
							<Trans>Cancel</Trans>
						</Button>
					</DialogActions>
				</DraggableDialog>

				<Button
					startIcon={<PlayCircleOutlineIcon />}
					disabled={!scan || scansStatus === "loading" || startingRescan}
					onClick={() => setRescanDialogOpen(true)}
				>
					<Trans>New scan with these options</Trans>
				</Button>
			</Box>

			{scansStatus === "loading" || usersStatus === "loading" ? (
				<LoadingContent />
			) : scan && currentUser ? (
				<>
					<ResultsSummary scan={scan} />
					<TabContent
						activeTab={activeTab}
						onTabChange={onTabChange}
						scan={scan}
						hiddenFindings={hiddenFindings}
						currentUser={currentUser}
						sharedColors={sharedColors}
					/>
				</>
			) : (
				<ErrorContent />
			)}
		</Container>
	);
};
export default ResultsPage;
