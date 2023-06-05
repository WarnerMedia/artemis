import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	AddCircleOutline as AddCircleOutlineIcon,
	Add as AddIcon,
	ArrowBackIos as ArrowBackIosIcon,
	Category as CategoryIcon,
	Clear as ClearIcon,
	Cloud as CloudIcon,
	ContactMail as ContactMailIcon,
	Delete as DeleteIcon,
	FolderShared as FolderSharedIcon,
	GitHub as GitHubIcon,
	HelpOutline as HelpOutlineIcon,
	Info as InfoIcon,
	KeyboardArrowUp as KeyboardArrowUpIcon,
	Link as LinkIcon,
	LinkOff as LinkOffIcon,
	Message as MessageIcon,
	Palette as PaletteIcon,
	RadioButtonChecked as RadioButtonCheckedIcon,
	RadioButtonUnchecked as RadioButtonUncheckedIcon,
	RemoveCircleOutlineOutlined as RemoveCircleOutlineOutlinedIcon,
	SupervisorAccount as SupervisorAccountIcon,
	VpnKey as VpnKeyIcon,
	WatchLater as WatchLaterIcon,
} from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Fab,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormHelperText,
	FormLabel,
	Grid,
	IconButton,
	InputAdornment,
	LinearProgress,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Switch as MuiSwitch,
	TextField as MuiTextField,
	Paper,
	Skeleton,
	Theme,
	Toolbar,
	Tooltip,
	Typography,
	useScrollTrigger,
	Zoom,
} from "@mui/material";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { Checkbox, Switch, TextField } from "formik-mui";
import { DateTime } from "luxon";
import queryString from "query-string";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { makeStyles, withStyles } from "tss-react/mui";
import * as Yup from "yup";

import client from "api/client";
import { IThemeColors, themeColors } from "app/colors";
import { APP_SERVICE_GITHUB_URL, STORAGE_LOCAL_WELCOME } from "app/globals";
import { RootState } from "app/rootReducer";
import { pluginsDisabled } from "app/scanPlugins";
import { AppDispatch } from "app/store";
import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import DateTimeCell, { ExpiringDateTimeCell } from "components/DateTimeCell";
import DraggableDialog from "components/DraggableDialog";
import EnhancedTable, { ColDef, RowDef } from "components/EnhancedTable";
import DatePickerField from "components/FormikPickers";
import MailToLink from "components/MailToLink";
import ScopeCell from "components/ScopeCell";
import TooltipCell from "components/TooltipCell";
import { Key } from "features/keys/keysSchemas";
import {
	deleteUserKey,
	getUserKeys,
	selectAllKeys,
} from "features/keys/keysSlice";
import { addNotification } from "features/notifications/notificationsSlice";
import { selectTheme, setTheme } from "features/theme/themeSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";
import { User } from "features/users/usersSchemas";
import { githubAuthRegex } from "features/vcsServices/vcsServicesSchemas";
import {
	getVcsServices,
	linkVcsService,
	selectServiceById,
	unlinkVcsService,
} from "features/vcsServices/vcsServicesSlice";
import { useDispatch, useSelector } from "react-redux";
import {
	capitalize,
	formatDate,
	SPLIT_MULTILINE_CSN_REGEX,
} from "utils/formatters";

const useStyles = makeStyles()((theme) => ({
	addKeyFormField: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
	addNewScopeField: {
		marginTop: theme.spacing(1),
	},
	apiKey: {
		marginBottom: theme.spacing(3),
	},
	backButton: {
		marginBottom: theme.spacing(1),
	},
	buttonProgress: {
		position: "absolute",
		zIndex: 1,
		top: "2px",
		left: "4px",
	},
	chipClickable: {
		"&:focus": {
			border: `2px solid ${theme.palette.primary.main}`,
		},
	},
	chipFeatures: {
		marginRight: theme.spacing(0.5),
		marginBottom: theme.spacing(0.5),
	},
	collapsibleParent: {
		border: "2px solid " + theme.palette.error.main,
	},
	collapsibleRow: {
		paddingTop: theme.spacing(1),
		paddingBottom: theme.spacing(1),
		paddingLeft: theme.spacing(3),
		paddingRight: theme.spacing(3),
		display: "flex",
		justifyContent: "flex-end",
		color: "white",
		backgroundColor: theme.palette.error.main,
	},
	currentScopeSection: {
		background: theme.palette.background.default,
		overflowY: "auto",
		overflowX: "hidden",
		paddingTop: "1em",
		minHeight: "5em",
		maxHeight: "8em",
		"& input + fieldset": {
			border: 0,
		},
	},
	deleteAltButton: {
		backgroundColor: theme.palette.grey[300],
		color: theme.palette.error.dark,
		"&:hover": {
			backgroundColor: theme.palette.grey[100],
			color: theme.palette.error.main,
		},
	},
	deleteAltButtonText: {
		color: theme.palette.text.primary,
		"&:hover": {
			backgroundColor: theme.palette.error.light,
		},
	},
	fabScrollTop: {
		textAlign: "center",
		position: "relative",
		top: "-1rem",
	},
	formScopeAction: {
		flexBasis: 0,
	},
	// truncate long items in summary section + add ellipsis
	listItemText: {
		whiteSpace: "nowrap",
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
	numberedList: {
		paddingLeft: 0,
		listStyle: "inside decimal",
	},
	paper: {
		marginBottom: theme.spacing(3),
		padding: theme.spacing(2),
	},
	removeKey: {
		maxWidth: "40rem",
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	scopeHelpIcon: {
		marginTop: "-9px",
	},
	scopeItemIcon: {
		alignSelf: "flex-start",
		paddingTop: "1rem",
	},
	scopeList: {
		listStyleType: "none",
		paddingLeft: 0,
	},
	serviceDetailsList: {
		listStyleType: "none",
		paddingLeft: "2rem",
		color: theme.palette.text.secondary,
	},
	tableToolbar: {
		display: "flex",
		paddingLeft: 0,
	},
	tableToolbarButtons: {
		marginLeft: theme.spacing(3),
		"& > :not(:first-of-type)": {
			marginLeft: theme.spacing(1),
		},
	},
	// matches MUI DialogActions
	viewActions: {
		flex: "0 0 auto",
		display: "flex",
		padding: "8px",
		alignItems: "center",
		justifyContent: "flex-end",
		"& > button": {
			marginLeft: theme.spacing(1),
		},
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

interface ScrollToTopProps {
	children: React.ReactElement; // element to put in the scroller (hint: a fab)
	selector: string; // DOM selector for the element representing top of container
	target?: HTMLElement; // DOM node where scroller will be displayed
}

// element that will appear as user approaches bottom of target element
// and will scroll back to element indentified by selector
// will usually wray a <Fab> child element
function ScrollTop(props: ScrollToTopProps) {
	const { children, selector, target } = props;
	const { classes } = useStyles();
	const trigger = useScrollTrigger({
		target: target ?? undefined,
		disableHysteresis: true,
		threshold: 100,
	});

	const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const anchor = (
			(event.target as HTMLDivElement).ownerDocument || document
		).querySelector(selector);

		if (anchor) {
			anchor.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	return (
		<Zoom in={trigger}>
			<div
				onClick={handleClick}
				role="presentation"
				className={classes.fabScrollTop}
			>
				{children}
			</div>
		</Zoom>
	);
}

const NoResults = (props: { title: string }) => (
	<Paper elevation={2}>
		<Typography align="center" style={{ fontStyle: "italic", padding: "2em" }}>
			{props.title}
		</Typography>
	</Paper>
);

export const BackButton = (props: { fromRedirect?: boolean }) => {
	const { classes } = useStyles();
	const navigate = useNavigate();

	const onBack = () => {
		if (props.fromRedirect) {
			// redirected here via service auth code,
			// back should go back to page before auth redirect
			navigate(-2);
		} else if (window.history.length > 2) {
			// navigated here from another page, so return to it
			navigate(-1);
		} else {
			// navigated directly here (such as via URL), force nav to scans page
			navigate("/");
		}
	};

	return (
		<Button
			autoFocus
			startIcon={<ArrowBackIosIcon />}
			onClick={onBack}
			className={classes.backButton}
		>
			<Trans>Back</Trans>
		</Button>
	);
};

export const LinkedAccounts = () => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const isLinking = useSelector(
		(state: RootState) => state.vcsServices.linking
	);
	const isUnlinking = useSelector(
		(state: RootState) => state.vcsServices.unlinking
	);
	const serviceGithub = useSelector((state: RootState) =>
		selectServiceById(state, "github")
	);
	const vcsServicesStatus = useSelector(
		(state: RootState) => state.vcsServices.status
	);
	const [service, setService] = useState<"github" | "">("");

	const handleClose = () => {
		setService("");
	};

	const onConfirmUnlink = () => {
		dispatch(
			unlinkVcsService({
				url: `/users/self/services/${service}`,
			})
		);
		handleClose();
	};

	const onStartUnlink = (service: "github") => {
		setService(service);
	};

	const onLinkGithub = () => {
		// redirect to service auth page
		window.location.href = APP_SERVICE_GITHUB_URL;
	};

	return (
		<>
			<Dialog
				open={Boolean(service)}
				onClose={handleClose}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">
					<Trans>Unlink service?</Trans>
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						Are you sure you want to unlink this service?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<RedButton
						variant="contained"
						autoFocus
						startIcon={<LinkOffIcon />}
						onClick={onConfirmUnlink}
					>
						<Trans>Unlink</Trans>
					</RedButton>
					<Button onClick={handleClose}>Cancel</Button>
				</DialogActions>
			</Dialog>
			<Box style={{ paddingBottom: "1em" }}>
				<Trans>
					Link a Version Control System account to scan additional repositories
					within that account
				</Trans>
			</Box>
			{serviceGithub ? (
				<Box>
					<Button
						aria-label={
							isUnlinking.github
								? i18n._(t`Unlinking GitHub User...`)
								: i18n._(t`Unlink GitHub User`)
						}
						size="small"
						variant="outlined"
						disabled={isUnlinking.github}
						color="error"
						startIcon={
							<>
								<LinkOffIcon />
								{isUnlinking.github && (
									<CircularProgress
										size={24}
										className={classes.buttonProgress}
									/>
								)}
							</>
						}
						onClick={() => onStartUnlink("github")}
					>
						{isUnlinking.github ? (
							<Trans>Unlinking GitHub User...</Trans>
						) : (
							<Trans>Unlink GitHub User</Trans>
						)}
					</Button>
					<ul className={classes.serviceDetailsList}>
						<li>
							<Trans>Username:</Trans> {serviceGithub.username}
						</li>
						<li>
							<Trans>Linked:</Trans> {formatDate(serviceGithub.linked, "long")}
						</li>
					</ul>
				</Box>
			) : isLinking.github || vcsServicesStatus !== "loading" ? (
				<Box>
					<Button
						aria-label={
							isLinking.github
								? i18n._(t`Linking GitHub User...`)
								: i18n._(t`Link GitHub User`)
						}
						size="small"
						variant="outlined"
						disabled={isLinking.github}
						startIcon={
							<>
								<GitHubIcon />
								{isLinking.github && (
									<CircularProgress
										size={24}
										className={classes.buttonProgress}
									/>
								)}
							</>
						}
						onClick={onLinkGithub}
					>
						{isLinking.github ? (
							<Trans>Linking GitHub User...</Trans>
						) : (
							<Trans>Link GitHub User</Trans>
						)}
					</Button>
				</Box>
			) : (
				<Skeleton />
			)}
		</>
	);
};

interface AddKeyForm {
	name: string;
	scope: string[];
	admin: boolean;
	// Luxon DateTime so we can manage time zone
	expires?: DateTime | null;
	snyk: boolean;
}

// options that can be passed to page as querystring params /settings?foo=bar
interface PageQueryParams {
	code?: string; // response from authentication to GitHub user account for linking
}

export default function UserSettings() {
	const navigate = useNavigate();
	const location = useLocation(); // for location, since history.location is mutable
	const { i18n } = useLingui();
	const { classes, cx } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	);
	const keys = useSelector((state: RootState) => selectAllKeys(state));
	const currentUserStatus = useSelector(
		(state: RootState) => state.currentUser.status
	);
	const keysStatus = useSelector((state: RootState) => state.keys.status);
	const keyCount = useSelector((state: RootState) => state.keys.totalRecords);
	const colors = useSelector(selectTheme);
	const [deleteKey, setDeleteKey] = useState<Key | null>(null);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [showScanOrgs, setShowScanOrgs] = useState(false);
	const [newScopeValue, setNewScopeValue] = useState("");
	const [newScopeValid, setNewScopeValid] = useState(false);
	const [newScopeError, setNewScopeError] = useState<string | null>(null);
	const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
	const [newKeyError, setNewKeyError] = useState<string | null>(null);
	const [scrollTarget, setScrollTarget] = useState<HTMLElement | undefined>(
		undefined
	);
	const [hideWelcome, setHideWelcome] = useState(false);
	const [fromRedirect, setFromRedirect] = useState(false);

	const pageQueryParamsSchema = Yup.object().shape({
		code: Yup.string()
			.trim()
			.matches(githubAuthRegex, i18n._(t`Invalid authorization code`)),
	});

	useEffect(() => {
		setHideWelcome(
			Boolean(Number(localStorage.getItem(STORAGE_LOCAL_WELCOME)))
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		document.title = i18n._(t`Artemis - User Settings`);
	}, [i18n]);

	useEffect(() => {
		dispatch(getUserKeys());
		dispatch(getVcsServices());

		// get page query params & validate (e.g., github auth code)
		// returns null if there are no query params
		// throws an exception if validation fails
		const getSearchParams = (): PageQueryParams | null => {
			if (location.search) {
				const search = queryString.parse(location.search);
				if (Object.keys(search)) {
					// schema validation will also transform query params to their correct types
					const validValues = pageQueryParamsSchema.validateSync(search, {
						strict: false, // setting to false will trim fields on validate
					});
					if (validValues?.code) {
						return validValues;
					}
					return null;
				}
			}
			return null;
		};

		let searchParams = null;
		try {
			searchParams = getSearchParams();
		} catch (err: any) {
			if ("errors" in err && Array.isArray(err.errors)) {
				dispatch(
					addNotification(
						i18n._(t`Unable to link service account: ${err.errors.join(", ")}`)
					)
				);
			} else if ("message" in err) {
				dispatch(
					addNotification(
						i18n._(t`Unable to link service account: ${err.message}`)
					)
				);
			}
		}

		// replace page history to remove any query params
		// prevents auth code from being processed again on reload or page navigation
		// re-add other query params if other page params added in future
		navigate(location.pathname, { replace: true }); // /settings
		if (searchParams?.code) {
			setFromRedirect(true);
			dispatch(
				linkVcsService({
					url: "/users/self/services",
					data: {
						name: "github",
						params: {
							auth_code: searchParams?.code,
						},
					},
				})
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, i18n]);

	// scroll to last scope item added to current scope in addKeys
	useEffect(() => {
		// newScopeValue reset to "" after each item added
		if (newScopeValue === "" && scrollTarget?.scrollTo) {
			scrollTarget.scrollTo({
				top: scrollTarget.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [newScopeValue, scrollTarget]);

	const resetAddForm = () => {
		setNewScopeValue("");
		setNewScopeError(null);
		setNewScopeValid(false);
	};

	const getFeatureTooltipChips = (obj?: User | Key | null) => {
		const tooltips: string[] = [];
		const chips: React.ReactNode[] = [];

		if (!obj) {
			return [tooltips, chips];
		}

		// order & remove any disabled plugins
		const orderedFeatures = Object.keys(obj?.features ?? {})
			.filter((f) => !(f in pluginsDisabled))
			.sort((a, b) => {
				return a.localeCompare(b);
			});

		orderedFeatures.forEach((feat: string) => {
			const featName = capitalize(feat);
			// feature = true (enabled)
			if (obj?.features && obj?.features[feat]) {
				tooltips.push(featName);
				chips.push(
					<Chip
						size="small"
						className={classes.chipFeatures}
						label={featName}
						key={feat}
					></Chip>
				);
			} else {
				tooltips.push(`${featName} ` + i18n._(t`(disabled)`));
				// setting non-clickable chips as disabled does not set aria-disabled for a11y, so also set this
				chips.push(
					<Chip
						disabled
						aria-disabled
						size="small"
						variant="outlined"
						className={classes.chipFeatures}
						label={featName}
						key={feat}
					></Chip>
				);
			}
		});
		return [tooltips, chips];
	};

	const getThemeChips = () => {
		const chips: React.ReactNode[] = [];
		const handleClick = (theme: keyof IThemeColors) => {
			if (theme !== colors.name) {
				dispatch(setTheme(theme));
			}
		};
		for (const [id, palette] of Object.entries(themeColors)) {
			chips.push(
				<Chip
					size="small"
					role="radio"
					aria-checked={id === colors.name}
					icon={
						id === colors.name ? (
							<RadioButtonCheckedIcon />
						) : (
							<RadioButtonUncheckedIcon />
						)
					}
					clickable={id !== colors.name}
					className={cx(classes.chipFeatures, classes.chipClickable)}
					style={{
						minWidth: "6em",
						background: palette.preview,
					}}
					onClick={() => handleClick(id as keyof IThemeColors)}
					label={i18n._(palette.displayName)}
					key={`user-theme-${id}`}
				/>
			);
		}
		return chips;
	};

	const userInfo = () => {
		const [featuresTooltip, featuresChips] =
			getFeatureTooltipChips(currentUser);
		const themeChips = getThemeChips();
		return (
			<Paper className={classes.paper}>
				<Typography component="h2" variant="h6" align="center">
					<Trans>User Information</Trans>
				</Typography>

				<Grid container spacing={3}>
					{/* left column */}
					<Grid item xs={6}>
						<List dense={true}>
							<ListItem key="user-email">
								<ListItemIcon>
									<ContactMailIcon />
								</ListItemIcon>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Email`)}
									secondary={
										currentUserStatus !== "loading" ? (
											currentUser?.email ? (
												<MailToLink
													recipient={currentUser.email}
													text={currentUser.email}
													tooltip
												/>
											) : (
												<i>
													<Trans>Unknown</Trans>
												</i>
											)
										) : (
											<Skeleton />
										)
									}
								/>
							</ListItem>

							<ListItem key="user-scope">
								<ListItemIcon className={classes.scopeItemIcon}>
									<CloudIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										currentUser?.scope
											? currentUser?.scope.join(", ")
											: i18n._(t`None`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.longListItemText }}
										primary={i18n._(
											t`Scope  (${
												currentUser?.scope ? currentUser.scope.length : 0
											})`
										)}
										secondary={
											currentUserStatus !== "loading" ? (
												currentUser?.scope &&
												Array.isArray(currentUser.scope) &&
												currentUser.scope.length > 0 ? (
													<ol className={classes.numberedList}>
														{currentUser.scope.map((scope) => (
															<li key={`user-scope-${scope}`}>{scope}</li>
														))}
													</ol>
												) : (
													<i>
														<Trans>None</Trans>
													</i>
												)
											) : (
												<Skeleton />
											)
										}
									/>
								</Tooltip>
							</ListItem>

							<ListItem key="user-welcome">
								<ListItemIcon className={classes.scopeItemIcon}>
									<MessageIcon />
								</ListItemIcon>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Show Welcome Message`)}
									secondary={
										<MuiSwitch
											checked={!hideWelcome}
											onChange={() => {
												localStorage.setItem(
													STORAGE_LOCAL_WELCOME,
													hideWelcome ? "0" : "1"
												);
												setHideWelcome(!hideWelcome);
											}}
											name="showWelcome"
											color="primary"
										/>
									}
								/>
							</ListItem>

							<ListItem key="user-theme">
								<ListItemIcon className={classes.scopeItemIcon}>
									<PaletteIcon />
								</ListItemIcon>
								<ListItemText
									primary={i18n._(t`Theme`)}
									secondary={themeChips}
								/>
							</ListItem>
						</List>
					</Grid>

					{/* right column */}
					<Grid item xs={6}>
						<List dense={true}>
							<ListItem key="user-last-login">
								<ListItemIcon>
									<WatchLaterIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										currentUser?.last_login
											? formatDate(currentUser?.last_login, "long")
											: i18n._(t`None`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.listItemText }}
										primary={i18n._(t`Last Login`)}
										secondary={
											currentUserStatus !== "loading" ? (
												currentUser?.last_login ? (
													formatDate(currentUser?.last_login, "long")
												) : (
													<i>
														<Trans>None</Trans>
													</i>
												)
											) : (
												<Skeleton />
											)
										}
									/>
								</Tooltip>
							</ListItem>

							<ListItem key="user-features">
								<ListItemIcon>
									<CategoryIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										featuresTooltip &&
										Array.isArray(featuresTooltip) &&
										featuresTooltip.length > 0
											? featuresTooltip.join(", ")
											: i18n._(t`None`)
									}
								>
									<ListItemText
										primary={i18n._(t`Features`)}
										secondary={
											currentUserStatus !== "loading" ? (
												featuresChips &&
												Array.isArray(featuresChips) &&
												featuresChips.length > 0 ? (
													<>{featuresChips}</>
												) : (
													<i>
														<Trans>None</Trans>
													</i>
												)
											) : (
												<Skeleton />
											)
										}
									/>
								</Tooltip>
							</ListItem>

							<ListItem key="user-category">
								<ListItemIcon>
									<SupervisorAccountIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										currentUser?.admin
											? i18n._(t`Administrator`)
											: i18n._(t`Standard`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.listItemText }}
										primary={i18n._(t`User Category`)}
										secondary={
											currentUserStatus !== "loading" ? (
												currentUser?.admin ? (
													i18n._(t`Administrator`)
												) : (
													i18n._(t`Standard`)
												)
											) : (
												<Skeleton />
											)
										}
									/>
								</Tooltip>
							</ListItem>

							<ListItem key="user-scan-orgs">
								<ListItemIcon className={classes.scopeItemIcon}>
									<FolderSharedIcon />
								</ListItemIcon>
								<Tooltip
									describeChild
									title={
										currentUser?.scan_orgs
											? currentUser?.scan_orgs.join(", ")
											: i18n._(t`None`)
									}
								>
									<ListItemText
										classes={{ secondary: classes.longListItemText }}
										primary={i18n._(
											t`Scan Organizations (${
												currentUser?.scan_orgs
													? currentUser.scan_orgs.length
													: 0
											})`
										)}
										secondary={
											currentUserStatus !== "loading" ? (
												currentUser?.scan_orgs &&
												Array.isArray(currentUser.scan_orgs) &&
												currentUser.scan_orgs.length > 0 ? (
													<ol className={classes.numberedList}>
														{currentUser.scan_orgs.map((org) => (
															<li key={`user-scan-org-${org}`}>{org}</li>
														))}
													</ol>
												) : (
													<i>
														<Trans>None</Trans>
													</i>
												)
											) : (
												<Skeleton />
											)
										}
									/>
								</Tooltip>
							</ListItem>

							<ListItem key="user-services">
								<ListItemIcon className={classes.scopeItemIcon}>
									<LinkIcon />
								</ListItemIcon>
								<ListItemText
									primary={i18n._(t`Linked Accounts`)}
									secondary={<LinkedAccounts />}
								/>
							</ListItem>
						</List>
					</Grid>
				</Grid>
			</Paper>
		);
	};

	const ActionsCell = (props: { row?: RowDef | null }) => {
		const { i18n } = useLingui();
		const { row } = props;
		return (
			<>
				<Tooltip title={i18n._(t`Remove API key`)}>
					<span>
						<IconButton
							size="small"
							color="error"
							aria-label={i18n._(t`Remove API key`)}
							disabled={keysStatus === "loading"}
							onClick={(event: React.SyntheticEvent) => {
								event.stopPropagation();
								let key = null;
								if (row?.id && (!deleteKey || deleteKey?.id !== row.id)) {
									key = row as Key;
								}
								setDeleteKey(key);
							}}
						>
							{deleteKey?.id === row?.id ? (
								<KeyboardArrowUpIcon />
							) : (
								<DeleteIcon />
							)}
						</IconButton>
					</span>
				</Tooltip>
			</>
		);
	};

	const CollapsibleRow = () => {
		return (
			<Box className={classes.collapsibleRow}>
				<Typography
					color="inherit"
					variant="subtitle1"
					component="div"
					className={classes.removeKey}
				>
					<Trans>Remove API key named "{deleteKey?.name ?? ""}"?</Trans>
				</Typography>
				<Box className={classes.tableToolbarButtons}>
					<Button
						aria-label={i18n._(t`Remove`)}
						size="small"
						variant="contained"
						className={classes.deleteAltButton}
						startIcon={<DeleteIcon />}
						autoFocus
						onClick={() => {
							if (deleteKey?.id) {
								dispatch(
									deleteUserKey({
										url: `/users/self/keys/${deleteKey.id}`,
									})
								);
							}
							setDeleteKey(null);
						}}
					>
						<Trans>Remove</Trans>
					</Button>
					<Button
						aria-label={i18n._(t`Cancel`)}
						size="small"
						className={classes.deleteAltButtonText}
						onClick={() => {
							setDeleteKey(null);
						}}
					>
						<Trans>Cancel</Trans>
					</Button>
				</Box>
			</Box>
		);
	};

	const columns: ColDef[] = [
		{
			field: "name",
			headerName: i18n._(t`Name`),
			children: TooltipCell,
			bodyStyle: {
				maxWidth: "20rem", // limit field length for long email addresses
				width: "20rem",
				minWidth: "20rem",
				overflowWrap: "anywhere",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				overflow: "hidden",
			},
		},
		{
			field: "scope",
			headerName: i18n._(t`Scope`),
			children: ScopeCell,
			sortable: false,
		},
		{
			field: "created",
			headerName: i18n._(t`Created`),
			children: DateTimeCell,
		},
		{
			field: "expires",
			headerName: i18n._(t`Expires`),
			children: ExpiringDateTimeCell,
		},
		{
			field: "last_used",
			headerName: i18n._(t`Last Used`),
			children: DateTimeCell,
		},
		{
			field: "id",
			headerName: i18n._(t`Actions`),
			children: ActionsCell,
			disableRowClick: true,
			sortable: false,
			bodyStyle: {
				maxWidth: "5rem",
				width: "5rem",
			},
		},
	];

	const onRowSelect = (row: RowDef | null) => {
		setDeleteKey(null);
		setSelectedRow(row);
	};

	const addKeyToolbar = () => (
		<Toolbar className={classes.tableToolbar}>
			<span style={{ flexGrow: 1 }}>
				<Chip
					label={i18n._(
						t`API keys can not be modified after creation, they can only be removed and re-added`
					)}
					icon={<InfoIcon />}
				/>
			</span>
			<span>
				<Tooltip title={i18n._(t`Add API key`)}>
					<span>
						<Fab
							aria-label={i18n._(t`Add API key`)}
							color="primary"
							size="small"
							disabled={keysStatus === "loading"}
							onClick={() => {
								setAddDialogOpen(true);
							}}
						>
							<AddIcon fontSize="small" />
						</Fab>
					</span>
				</Tooltip>
			</span>
		</Toolbar>
	);

	const newKeyContent = () => (
		<>
			<DialogContent dividers={true}>
				<Typography color="inherit" variant="subtitle1" component="div">
					<Box>
						<Trans>API Key:</Trans>
					</Box>
					<Box className={classes.apiKey}>
						{newKeyValue}{" "}
						<CustomCopyToClipboard autoFocus={true} copyTarget={newKeyValue} />
					</Box>
					<Alert variant="outlined" severity="warning">
						<Trans>
							This will be the only time this key will be displayed! Do not
							close this dialog until you record this key in an approved secret
							manager
						</Trans>
					</Alert>
				</Typography>
			</DialogContent>
			<DialogActions>
				<Box displayPrint="none">
					<Button
						color="primary"
						onClick={() => {
							setAddDialogOpen(false);
						}}
					>
						<Trans>OK</Trans>
					</Button>
				</Box>
			</DialogActions>
		</>
	);

	const addKey = () => {
		// set min date = tomorrow, so user can't create an api keythat immediately expires
		const dateMin = DateTime.utc().plus({ days: 1 });
		const dateMaxStr = "2050/12/31";
		const dateMax = DateTime.fromFormat(dateMaxStr, "yyyy/LL/dd", {
			zone: "utc",
		});
		const addKeyFormSchema = Yup.object({
			name: Yup.string()
				.required(i18n._(t`Required`))
				.trim()
				.min(1, i18n._(t`Must be between 1-256 characters`))
				.max(256, i18n._(t`Must be between 1-256 characters`)),
			scope: Yup.array()
				.of(Yup.string().required(i18n._(t`Required`)))
				.min(1, i18n._(t`Must have at least 1 item`))
				.required(i18n._(t`Required`)),
			admin: Yup.boolean().required(i18n._(t`Required`)),
			expires: Yup.date()
				.typeError(i18n._(t`Invalid date format`))
				.min(dateMin.toJSDate(), i18n._(t`Must be a future date`))
				.max(dateMax.toJSDate(), i18n._(t`Date must be before ${dateMaxStr}`))
				.nullable()
				.default(null),
			snyk: Yup.boolean(),
		});

		const initialValues: AddKeyForm = {
			name: "",
			scope: ["*"],
			// DateTimePicker component handles transforming string => Luxon DateTime object
			// all associated findings should have same expiration date + reason, so use first occurrence
			admin: false,
			expires: null,
			snyk: false,
		};

		const onSubmit = async (
			values: AddKeyForm,
			actions: FormikHelpers<AddKeyForm>
		) => {
			let expires: string | undefined = undefined;
			if (values?.expires) {
				// value may be a string instead of Luxon DateTime if
				// coming from a saved value that hasn't been modified
				if (typeof values.expires === "string") {
					expires = values.expires;
				} else {
					// Luxon DateTime
					expires = values?.expires.toUTC().toJSON() ?? undefined;
				}
			}

			try {
				// not using redux-saga here because we aren't storing result in redux store
				let features = {};
				if (currentUser?.features?.snyk && !("snyk" in pluginsDisabled)) {
					features = { snyk: values?.snyk ?? false };
				}
				const response = await client.addUserKey({
					url: "/users/self/keys",
					data: {
						name: values?.name.trim(),
						scope: values?.scope,
						admin: values?.admin ?? false,
						expires: expires,
						features: features,
					},
				});

				setNewKeyValue(response.key);
				// adding a new user key will _only_ return the created key uuid,
				// it doesn't return the new key object
				// need to call getUserKeys() to add new key to redux store
				dispatch(getUserKeys());
				return true;
			} catch (err: any) {
				setNewKeyError(err.message);
				return false;
			} finally {
				actions.setSubmitting(false);
			}
		};

		const validateScope = (fieldValue: string, currentScopes: string[]) => {
			// validate against user's scope regex
			// set field validation true (which will enable/disable add button)
			if (fieldValue && currentScopes && currentUser?.scan_orgs) {
				if (currentScopes.includes(fieldValue)) {
					// invalid, duplicate
					setNewScopeError(i18n._(t`Duplicate scope`));
					setNewScopeValid(false);
					return false;
				}

				if (fieldValue === "*") {
					// valid, special case, *
					setNewScopeError(null);
					setNewScopeValid(true);
					return true;
				}

				// check any user scan org begins with this scope
				// e.g., scan_org/valid_repo_regex_chars
				for (let i = 0; i < currentUser?.scan_orgs.length; i += 1) {
					if (fieldValue.startsWith(currentUser?.scan_orgs[i] + "/")) {
						const rest = fieldValue.replace(
							currentUser?.scan_orgs[i] + "/",
							""
						);

						if (rest.length === 0) {
							// invalid: no repository specified after scan org
							setNewScopeError(
								i18n._(
									t`No repository or path name pattern supplied after scan organization prefix`
								)
							);
							setNewScopeValid(false);
							return false;
						}

						// check remainder of scope path contains at least one valid character, including:
						// hostname chars, repo name chars, python fnmatch glob chars ([], *, ?, !)
						if (rest.match(/^[a-zA-Z0-9.\-_/[\]*?!]+$/)) {
							// valid
							setNewScopeError(null);
							setNewScopeValid(true);
							return true;
						} else {
							// invalid characters
							setNewScopeError(
								i18n._(
									t`May only contain the characters: A-Z, a-z, 0-9, ., -, _, /, [, ], *, ?, !`
								)
							);
							setNewScopeValid(false);
							return false;
						}
					}
				}

				// not found in user's scan_orgs
				setNewScopeError(
					i18n._(
						t`Scope value not within user's scan organizations or does not end with /repo or /path_name_pattern`
					)
				);
			}
			setNewScopeValid(false);
			return false;
		};

		const getDelimitedValues = (input: string) => {
			const values: string[] = [];
			input.split(SPLIT_MULTILINE_CSN_REGEX).forEach((value) => {
				const trimmed = value.trim();
				if (trimmed.length > 0) {
					values.push(trimmed);
				}
			});
			return values;
		};

		const handleScopeValueChange = (
			event: React.ChangeEvent<HTMLInputElement>,
			currentScopes: string[]
		) => {
			setNewScopeValue(event.target.value);
			const scopes = getDelimitedValues(event.target.value);
			for (let j = 0; j < scopes.length; j += 1) {
				if (!validateScope(scopes[j], currentScopes)) {
					break;
				}
			}
		};

		if (newKeyValue) {
			return newKeyContent();
		}

		const focusNewScopeField = (event: React.SyntheticEvent) => {
			// cancel icon will be hidden so re-focus form field
			const input = (
				(event.target as HTMLDivElement).ownerDocument || document
			).getElementById("add-new-scope-input");
			if (input) {
				input.focus();
			}
		};

		const handleHelpClick = () => {
			setShowScanOrgs(!showScanOrgs);
		};

		return (
			<Formik
				initialValues={initialValues}
				validationSchema={addKeyFormSchema}
				onSubmit={onSubmit}
			>
				{({
					submitForm,
					isValid,
					isSubmitting,
					values,
					dirty,
					setFieldValue,
				}) => (
					<Form noValidate autoComplete="off">
						<>
							{newKeyError && (
								<Alert
									aria-label={i18n._(t`error`)}
									elevation={6}
									variant="filled"
									onClose={() => {
										setNewKeyError(null);
									}}
									severity="error"
								>
									{newKeyError}
								</Alert>
							)}
							<DialogContent dividers={true}>
								<Box className={classes.addKeyFormField}>
									<Field
										id="name"
										name="name"
										type="text"
										maxRows="3"
										className={classes.addKeyFormField}
										autoFocus
										inputProps={{ maxLength: 256 }}
										component={TextField}
										variant="outlined"
										label={i18n._(t`Name`)}
										fullWidth
										multiline={true}
									/>
								</Box>

								{currentUser?.admin && (
									<Grid container spacing={2}>
										<Grid item xs={6}>
											<Box className={classes.addKeyFormField}>
												<FormControlLabel
													control={
														<Field
															component={Switch}
															disabled={
																keysStatus === "loading" || isSubmitting
															}
															type="checkbox"
															id="admin"
															name="admin"
															color="primary"
														/>
													}
													label={i18n._(t`Create a user administrator API key`)}
												/>
												<FormHelperText style={{ paddingBottom: "1em" }}>
													<Trans>
														User administrator keys can manage other users
													</Trans>
												</FormHelperText>
											</Box>
										</Grid>
									</Grid>
								)}

								<Box className={classes.addKeyFormField}>
									{/*
									 * Scope add/remove field elements aren't part of Formik form state
									 * but values are added/removed from Formik "scope" value array
									 */}
									<Paper variant="outlined" style={{ padding: "1em" }}>
										<FormLabel component="legend">
											<Trans>Current Scope</Trans>
											{values?.scope &&
												Array.isArray(values.scope) &&
												values.scope.length > 0 && (
													<CustomCopyToClipboard copyTarget={values?.scope} />
												)}
										</FormLabel>
										<FormHelperText style={{ paddingBottom: "1em" }}>
											<Box>
												<Trans>
													Restrict API key to only these repositories. Must be
													within a user's scan organizations.
												</Trans>
												<Tooltip
													title={i18n._(t`What are my scan organizations?`)}
												>
													<span>
														<IconButton
															aria-label={i18n._(
																t`What are my scan organizations?`
															)}
															onClick={handleHelpClick}
															size="small"
															edge="start"
															className={classes.scopeHelpIcon}
														>
															<HelpOutlineIcon fontSize="small" />
														</IconButton>
													</span>
												</Tooltip>
												<Collapse in={showScanOrgs}>
													<Paper
														elevation={0}
														variant="outlined"
														style={{ padding: "1em" }}
													>
														{currentUser?.scan_orgs &&
														Array.isArray(currentUser.scan_orgs) &&
														currentUser.scan_orgs.length > 0 ? (
															<ul
																className={classes.scopeList}
																style={{ marginTop: 0, marginBottom: 0 }}
															>
																{currentUser.scan_orgs.map((org) => (
																	<li key={`scan-org-help-${org}`}>{org}</li>
																))}
															</ul>
														) : (
															<i>
																<Trans>None</Trans>
															</i>
														)}
													</Paper>
												</Collapse>
											</Box>
											<Box>
												<Trans>
													Supports Unix-style path name pattern expansion
													syntax, e.g. vcs/org/repoprefix-*. * indicates all
													repositories.
												</Trans>
											</Box>
										</FormHelperText>

										{/* scrolling window for added scopes */}
										<Paper
											variant="outlined"
											className={classes.currentScopeSection}
											ref={(node: HTMLElement | undefined | null) => {
												if (node) {
													setScrollTarget(node);
												}
											}}
										>
											<div id="scope-scroll-top-anchor" />
											<Grid container spacing={1} alignItems="flex-end">
												{values.scope.length === 0 && (
													<Typography
														align="center"
														style={{ fontStyle: "italic", paddingLeft: "2em" }}
													>
														<Trans>No scope is currently defined</Trans>
													</Typography>
												)}
												{values.scope.map((scope: string, idx: number) => (
													<Grid
														container
														item
														xs={12}
														spacing={1}
														key={`scope-row-${scope}`}
													>
														<Grid item xs={11}>
															<MuiTextField
																id={`scope-${idx}`}
																label={<Trans>Scope {idx + 1}</Trans>}
																value={scope}
																size="small"
																variant="outlined"
																fullWidth
																disabled
															/>
														</Grid>
														<Grid
															item
															xs={1}
															className={classes.formScopeAction}
														>
															<Tooltip
																title={<Trans>Remove scope {idx + 1}</Trans>}
															>
																<span>
																	<IconButton
																		aria-label={i18n._(
																			t`Remove this scope item`
																		)}
																		onClick={() => {
																			const newScope = values.scope.slice();
																			newScope.splice(idx, 1);
																			setFieldValue("scope", newScope, false);
																			if (newScope.length === 0) {
																				setNewScopeError(
																					i18n._(
																						t`At least 1 scope is required`
																					)
																				);
																				setNewScopeValid(false);
																			}
																		}}
																		size="large"
																	>
																		<RemoveCircleOutlineOutlinedIcon fontSize="small" />
																	</IconButton>
																</span>
															</Tooltip>
														</Grid>
													</Grid>
												))}
											</Grid>

											<span style={{ position: "relative" }}>
												{values.scope.length > 2 && (
													<Tooltip
														describeChild
														title={i18n._(t`Scroll to top`)}
													>
														<span>
															<ScrollTop
																target={scrollTarget}
																selector="#scope-scroll-top-anchor"
															>
																<Fab
																	color="primary"
																	size="small"
																	variant="extended"
																	aria-label={i18n._(t`Scroll to top`)}
																>
																	<KeyboardArrowUpIcon />
																	<Trans>Top</Trans>
																</Fab>
															</ScrollTop>
														</span>
													</Tooltip>
												)}
											</span>
										</Paper>

										{/* Add new scope option */}
										<Grid
											container
											spacing={1}
											alignItems="flex-end"
											className={classes.addNewScopeField}
										>
											<Grid container item xs={12} spacing={1}>
												<Grid item xs={11}>
													<MuiTextField
														id="add-new-scope-input"
														label={<Trans>Add Scope</Trans>}
														value={newScopeValue}
														multiline={true}
														onChange={(
															event: React.ChangeEvent<HTMLInputElement>
														) => handleScopeValueChange(event, values.scope)}
														onKeyDown={(event) => {
															if (
																event.key === "Escape" ||
																event.key === "Esc"
															) {
																// clear field on escape
																event.preventDefault();
																event.stopPropagation();
																resetAddForm();
																focusNewScopeField(event);
															}
														}}
														onBlur={(event) => {
															// don't generate an error field data hasn't been saved if user just clicked the clear or add buttons
															if (
																event?.relatedTarget?.id !==
																	"clear-new-scope-button" &&
																event?.relatedTarget?.id !==
																	"add-new-scope-button"
															) {
																if (newScopeValue && !newScopeError) {
																	setNewScopeError(
																		i18n._(
																			t`This value has not been added to the Current Scope list above. Either click the + icon to add it or the X icon to clear the field`
																		)
																	);
																} else if (!newScopeValue) {
																	setNewScopeError(null);
																}
															}
														}}
														error={!!newScopeError}
														helperText={
															newScopeError ??
															i18n._(
																t`Click + icon to add this value to the Current Scope list above`
															)
														}
														placeholder="One or more scope entries separated by a comma, space, or newline"
														size="small"
														variant="outlined"
														fullWidth
														InputProps={{
															endAdornment: newScopeValue && (
																<InputAdornment position="end">
																	<Tooltip title={i18n._(t`Clear`)}>
																		<span>
																			<IconButton
																				id="clear-new-scope-button"
																				aria-label={i18n._(t`Clear`)}
																				onClick={(event) => {
																					resetAddForm();
																					focusNewScopeField(event);
																				}}
																				edge="end"
																				size="large"
																			>
																				<ClearIcon />
																			</IconButton>
																		</span>
																	</Tooltip>
																</InputAdornment>
															),
														}}
													/>
												</Grid>
												<Grid item xs={1} className={classes.formScopeAction}>
													<Tooltip title={<Trans>Add to scope</Trans>}>
														<span>
															<Fab
																id="add-new-scope-button"
																aria-label={i18n._(t`Add this item to scope`)}
																disabled={!newScopeValid}
																color="primary"
																size="small"
																onClick={(event) => {
																	const newScope = values.scope.slice();
																	getDelimitedValues(newScopeValue).forEach(
																		(value) => {
																			newScope.push(value);
																		}
																	);
																	setFieldValue("scope", newScope, false);
																	resetAddForm();
																	focusNewScopeField(event);
																}}
															>
																<AddIcon />
															</Fab>
														</span>
													</Tooltip>
												</Grid>
											</Grid>
										</Grid>
									</Paper>
								</Box>

								{currentUser?.features?.snyk &&
									!("snyk" in pluginsDisabled) && (
										<Box marginTop={2} marginBottom={1}>
											<FormControl component="fieldset">
												<FormLabel component="legend">Features</FormLabel>
												<FormHelperText style={{ paddingBottom: "1em" }}>
													<Trans>
														Allow this key to use additional scan features
													</Trans>
												</FormHelperText>

												<FormGroup row>
													<FormControlLabel
														control={
															<>
																<Field
																	id="snyk"
																	component={Checkbox}
																	type="checkbox"
																	name="snyk"
																/>
															</>
														}
														label={i18n._(t`Snyk Vulnerability Plugin`)}
													/>
												</FormGroup>
											</FormControl>
										</Box>
									)}

								<Box className={classes.addKeyFormField}>
									<Field
										id="expires"
										name="expires"
										className={classes.addKeyFormField}
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

							{(keysStatus === "loading" || isSubmitting) && <LinearProgress />}
							<DialogActions>
								<Box displayPrint="none" className={classes.viewActions}>
									{(!!newScopeError || !isValid) && (
										<Alert variant="outlined" severity="error">
											<Trans>
												This form contains unresolved errors. Please resolve
												these errors
											</Trans>
										</Alert>
									)}
									<Button
										variant="contained"
										color="primary"
										startIcon={<AddCircleOutlineIcon />}
										aria-busy={keysStatus === "loading" || isSubmitting}
										disabled={
											keysStatus === "loading" ||
											!isValid ||
											!dirty ||
											values.scope.length === 0 ||
											!!newScopeValue ||
											isSubmitting
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
										{keysStatus === "loading" || isSubmitting ? (
											<Trans>Adding...</Trans>
										) : (
											<Trans>Add</Trans>
										)}
									</Button>

									<Button
										color="primary"
										disabled={keysStatus === "loading" || isSubmitting}
										onClick={() => {
											setAddDialogOpen(false);
										}}
									>
										<Trans>Cancel</Trans>
									</Button>
								</Box>
							</DialogActions>
						</>
					</Form>
				)}
			</Formik>
		);
	};

	const exportData = () => {
		return keys.map((k) => ({
			id: k.id,
			name: k.name,
			created: k.created,
			last_used: k.last_used,
			expires: k.expires,
			scope: k.scope,
			admin: k.admin,
			features: k.features,
		}));
	};

	const toCsv = (data: Key) => {
		const features = [];
		if (data.features) {
			for (const [name, enabled] of Object.entries(data.features)) {
				features.push(`${name} (${enabled ? "enabled" : "disabled"})`);
			}
		}
		return {
			id: data.id,
			name: data.name,
			created: data.created,
			last_used: data.last_used,
			expires: data.expires,
			scope: data.scope,
			admin: data.admin,
			features: features,
		};
	};

	const listKeys = () => (
		<>
			{(keyCount || keysStatus !== "loading") && (
				<>
					{addKeyToolbar()}
					<DraggableDialog
						open={addDialogOpen}
						onClose={() => setAddDialogOpen(false)}
						title={
							newKeyValue
								? i18n._(t`API Key Added`)
								: i18n._(t`Add New API Key`)
						}
						maxWidth="md"
						fullWidth={true}
						TransitionProps={{
							onExited: () => {
								resetAddForm();
								setNewKeyValue(null);
								setNewKeyError(null);
								setShowScanOrgs(false);
							},
						}}
					>
						{addKey()}
					</DraggableDialog>
				</>
			)}
			{keyCount ? (
				<>
					<EnhancedTable
						id="id"
						columns={columns}
						rows={keys}
						defaultOrderBy="name"
						onRowSelect={onRowSelect}
						selectedRow={selectedRow}
						disableRowClick={keysStatus === "loading"}
						collapsibleRow={CollapsibleRow}
						collapsibleOpen={(id: string | number) => {
							return deleteKey?.id === id;
						}}
						collapsibleParentClassName={classes.collapsibleParent}
						menuOptions={{
							exportFile: "keys",
							exportFormats: ["csv", "json"],
							exportData: exportData,
							toCsv: toCsv,
						}}
					/>
					<DraggableDialog
						open={!!selectedRow}
						onClose={() => onRowSelect(null)}
						title={selectedRow?.name ?? i18n._(t`API Keys`)}
						copyTitle={true}
						maxWidth="md"
						content={viewKey()}
					/>
				</>
			) : (
				<NoResults
					title={
						keysStatus !== "loading"
							? i18n._(
									t`No API keys found. Click the + button to add a new API key`
							  )
							: i18n._(t`Fetching API keys...`)
					}
				/>
			)}
		</>
	);

	const viewKey = () => {
		const [featuresTooltip, featuresChips] = getFeatureTooltipChips(
			selectedRow as Key
		);
		return (
			<Grid container spacing={3}>
				{/* left column */}
				<Grid item xs={6}>
					<List dense={true}>
						<ListItem key="key-scope">
							<ListItemIcon className={classes.scopeItemIcon}>
								<CloudIcon />
							</ListItemIcon>
							<Tooltip
								describeChild
								title={
									selectedRow?.scope
										? selectedRow?.scope.join(", ")
										: i18n._(t`None`)
								}
							>
								<ListItemText
									classes={{ secondary: classes.listItemText }}
									primary={i18n._(t`Scope`)}
									secondary={
										selectedRow?.scope &&
										Array.isArray(selectedRow.scope) &&
										selectedRow.scope.length > 0 ? (
											<ul className={classes.scopeList}>
												{selectedRow.scope.map((scope) => (
													<li key={`key-scope-${scope}`}>{scope}</li>
												))}
											</ul>
										) : (
											<i>
												<Trans>None</Trans>
											</i>
										)
									}
								/>
							</Tooltip>
						</ListItem>

						<ListItem key="key-features">
							<ListItemIcon>
								<CategoryIcon />
							</ListItemIcon>
							<Tooltip
								describeChild
								title={
									featuresTooltip &&
									Array.isArray(featuresTooltip) &&
									featuresTooltip.length > 0
										? featuresTooltip.join(", ")
										: i18n._(t`None`)
								}
							>
								<ListItemText
									primary={i18n._(t`Features`)}
									secondary={
										featuresChips &&
										Array.isArray(featuresChips) &&
										featuresChips.length > 0 ? (
											<>{featuresChips}</>
										) : (
											<i>
												<Trans>None</Trans>
											</i>
										)
									}
								/>
							</Tooltip>
						</ListItem>

						<ListItem key="key-type">
							<ListItemIcon>
								<VpnKeyIcon />
							</ListItemIcon>
							<Tooltip
								describeChild
								title={
									selectedRow?.admin
										? i18n._(t`Administrator`)
										: i18n._(t`Standard`)
								}
							>
								<ListItemText
									primary={i18n._(t`Type`)}
									secondary={
										selectedRow?.admin
											? i18n._(t`Administrator`)
											: i18n._(t`Standard`)
									}
								/>
							</Tooltip>
						</ListItem>
					</List>
				</Grid>

				{/* right column */}
				<Grid item xs={6}>
					<List dense={true}>
						<ListItem key="key-created">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Created Date`)}
								secondary={
									selectedRow?.created ? (
										<DateTimeCell value={selectedRow?.created} format="long" />
									) : (
										<Tooltip describeChild title={i18n._(t`None`)}>
											<i>
												<Trans>None</Trans>
											</i>
										</Tooltip>
									)
								}
							/>
						</ListItem>

						<ListItem key="key-expires">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Expiration Date`)}
								secondary={
									selectedRow?.expires ? (
										<ExpiringDateTimeCell
											value={selectedRow?.expires}
											format="long"
										/>
									) : (
										<Tooltip describeChild title={i18n._(t`None`)}>
											<i>
												<Trans>None</Trans>
											</i>
										</Tooltip>
									)
								}
							/>
						</ListItem>

						<ListItem key="key-last-used">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Last Used Date`)}
								secondary={
									selectedRow?.last_used ? (
										<DateTimeCell
											value={selectedRow?.last_used}
											format="long"
										/>
									) : (
										<Tooltip describeChild title={i18n._(t`None`)}>
											<i>
												<Trans>None</Trans>
											</i>
										</Tooltip>
									)
								}
							/>
						</ListItem>
					</List>
				</Grid>
			</Grid>
		);
	};

	return (
		<Container>
			<Box displayPrint="none">
				<BackButton fromRedirect={fromRedirect} />
			</Box>

			{userInfo()}
			{keysStatus === "loading" && <LinearProgress />}
			<Paper className={classes.paper}>
				<Typography component="h2" variant="h6" align="center">
					<Trans>API Keys</Trans>
				</Typography>

				{listKeys()}
			</Paper>
		</Container>
	);
}
