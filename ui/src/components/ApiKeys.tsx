import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	AddCircleOutline as AddCircleOutlineIcon,
	Add as AddIcon,
	Category as CategoryIcon,
	Clear as ClearIcon,
	Cloud as CloudIcon,
	Delete as DeleteIcon,
	HelpOutline as HelpOutlineIcon,
	Info as InfoIcon,
	KeyboardArrowUp as KeyboardArrowUpIcon,
	RemoveCircleOutlineOutlined as RemoveCircleOutlineOutlinedIcon,
	VpnKey as VpnKeyIcon,
	WatchLater as WatchLaterIcon,
} from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Chip,
	Collapse,
	DialogActions,
	DialogContent,
	Fab,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormHelperText,
	FormLabel,
	Grid2 as Grid,
	IconButton,
	InputAdornment,
	LinearProgress,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Paper,
	TextField as MuiTextField,
	Toolbar,
	Tooltip,
	Typography,
	useScrollTrigger,
	Zoom,
} from "@mui/material";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { Checkbox, Switch, TextField } from "formik-mui";
import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import * as Yup from "yup";

import client from "api/client";
import { RootState } from "app/rootReducer";
import { pluginsDisabled } from "app/scanPlugins";
import { AppDispatch } from "app/store";
import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import DateTimeCell, { ExpiringDateTimeCell } from "components/DateTimeCell";
import DraggableDialog from "components/DraggableDialog";
import EnhancedTable, { ColDef, RowDef } from "components/EnhancedTable";
import DatePickerField from "components/FormikPickers";
import ScopeCell from "components/ScopeCell";
import TooltipCell from "components/TooltipCell";
import { Key } from "features/keys/keysSchemas";
import {
	deleteUserKey,
	getUserKeys,
	selectAllKeys,
} from "features/keys/keysSlice";
import { User } from "features/users/usersSchemas";
import { selectCurrentUser } from "features/users/currentUserSlice";
import { useDispatch, useSelector } from "react-redux";
import { capitalize, SPLIT_MULTILINE_CSN_REGEX } from "utils/formatters";

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
	buttonProgress: {
		position: "absolute",
		zIndex: 1,
		top: "2px",
		left: "4px",
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

// RedButton was removed as it's not used in this component

interface ScrollToTopProps {
	children: React.ReactElement; // element to put in the scroller (hint: a fab)
	selector: string; // DOM selector for the element representing top of container
	target?: HTMLElement; // DOM node where scroller will be displayed
}

// element that will appear as user approaches bottom of target element
// and will scroll back to element indentified by selector
// will usually wrap a <Fab> child element
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

// Fix type for expires in AddKeyForm and onSubmit
interface AddKeyForm {
	name: string;
	scope: string[];
	admin: boolean;
	expires: DateTime; // required
	snyk: boolean;
}

// Props that can be passed to ApiKeys component
interface ApiKeysProps {
	title?: string;
	user?: User | null;
}

const ApiKeys: React.FC<ApiKeysProps> = ({ title = "API Keys", user }) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self"),
	);
	const keys = useSelector((state: RootState) => selectAllKeys(state));
	const keysStatus = useSelector((state: RootState) => state.keys.status);
	const keyCount = useSelector((state: RootState) => state.keys.totalRecords);
	const [deleteKey, setDeleteKey] = useState<Key | null>(null);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [showScanOrgs, setShowScanOrgs] = useState(false);
	const [newScopeValue, setNewScopeValue] = useState("");
	const [newScopeValid, setNewScopeValid] = useState(false);
	const [newScopeError, setNewScopeError] = useState<string | null>(null);
	const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
	const [newKeyError, setNewKeyError] = useState<string | null>(null);
	const [scrollTarget, setScrollTarget] = useState<HTMLElement | undefined>(
		undefined,
	);

	useEffect(() => {
		if (user && user.id) {
			dispatch(getUserKeys({ userId: user.id }));
		} else {
			dispatch(getUserKeys({}));
		}
	}, [dispatch, user]);

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
					></Chip>,
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
					></Chip>,
				);
			}
		});
		return [tooltips, chips];
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
								// Use user.id if available (for other users), otherwise use "self" for the current user
								const userPath = user?.id ? user.id : "self";
								dispatch(
									deleteUserKey({
										url: `/users/${userPath}/keys/${deleteKey.id}`,
									}),
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
						t`API keys can not be modified after creation, they can only be removed and re-added`,
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
		const now = DateTime.utc();
		const dateMin = now.plus({ days: 1 }).set({ second: 0, millisecond: 0 });
		const dateMax = now.plus({ years: 1 });
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
				.max(dateMax.toJSDate(), i18n._(t`Date must be before ${dateMax}`))
				.required(i18n._(t`Expiration date is required`)),
			snyk: Yup.boolean(),
		});

		const initialValues: AddKeyForm = {
			name: "",
			scope: ["*"],
			// DateTimePicker component handles transforming string => Luxon DateTime object
			// all associated findings should have same expiration date + reason, so use first occurrence
			admin: false,
			expires: dateMin,
			snyk: false,
		};

		const onSubmit = async (
			values: AddKeyForm,
			actions: FormikHelpers<AddKeyForm>,
		) => {
			let expires: string = values.expires.toUTC().toJSON()!;

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
						userEmail: "",
					},
				});

				setNewKeyValue(response.key);
				// adding a new user key will _only_ return the created key uuid,
				// it doesn't return the new key object
				// need to call getUserKeys() to add new key to redux store
				dispatch(getUserKeys(user && user.id ? { userId: user.id } : {}));
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
							"",
						);

						if (rest.length === 0) {
							// invalid: no repository specified after scan org
							setNewScopeError(
								i18n._(
									t`No repository or path name pattern supplied after scan organization prefix`,
								),
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
									t`May only contain the characters: A-Z, a-z, 0-9, ., -, _, /, [, ], *, ?, !`,
								),
							);
							setNewScopeValid(false);
							return false;
						}
					}
				}

				// not found in user's scan_orgs
				setNewScopeError(
					i18n._(
						t`Scope value not within user's scan organizations or does not end with /repo or /path_name_pattern`,
					),
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
			currentScopes: string[],
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
										<Grid size={6}>
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
												<FormHelperText
													style={{ paddingBottom: "1em" }}
													component="div"
												>
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
										<FormHelperText
											style={{ paddingBottom: "1em" }}
											component="div"
										>
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
																t`What are my scan organizations?`,
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
														spacing={1}
														key={`scope-row-${scope}`}
													>
														<Grid size={11}>
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
														<Grid size={1} className={classes.formScopeAction}>
															<Tooltip
																title={<Trans>Remove scope {idx + 1}</Trans>}
															>
																<span>
																	<IconButton
																		aria-label={i18n._(
																			t`Remove this scope item`,
																		)}
																		onClick={() => {
																			const newScope = values.scope.slice();
																			newScope.splice(idx, 1);
																			setFieldValue("scope", newScope, false);
																			if (newScope.length === 0) {
																				setNewScopeError(
																					i18n._(
																						t`At least 1 scope is required`,
																					),
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
											<Grid container spacing={1}>
												<Grid size={11}>
													<MuiTextField
														id="add-new-scope-input"
														label={<Trans>Add Scope</Trans>}
														value={newScopeValue}
														multiline={true}
														onChange={(
															event: React.ChangeEvent<HTMLInputElement>,
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
																			t`This value has not been added to the Current Scope list above. Either click the + icon to add it or the X icon to clear the field`,
																		),
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
																t`Click + icon to add this value to the Current Scope list above`,
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
												<Grid size={1} className={classes.formScopeAction}>
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
																		},
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
												<FormHelperText
													style={{ paddingBottom: "1em" }}
													component="div"
												>
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
										label={i18n._(t`Expires`)}
										style={{ width: "100%" }}
										disablePast
										component={DatePickerField}
										inputVariant="outlined"
										ampm={false}
										format="yyyy/LL/dd HH:mm"
										mask="____/__/__ __:__"
										required
										maxDate={dateMax}
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

	const viewKey = () => {
		const [featuresTooltip, featuresChips] = getFeatureTooltipChips(
			selectedRow as Key,
		);
		return (
			<Grid container spacing={3}>
				{/* left column */}
				<Grid size={6}>
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
									disableTypography={true}
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
									disableTypography={true}
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
									disableTypography={true}
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
				<Grid size={6}>
					<List dense={true}>
						<ListItem key="key-created">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Created Date`)}
								disableTypography={true}
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
								disableTypography={true}
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
								disableTypography={true}
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

	// Determine if this is the current user's keys or another user's keys
	const isCurrentUserKeys = !user || user.email === currentUser?.email;

	return (
		<Paper className={classes.paper}>
			<Typography component="h2" variant="h6" align="center">
				<Trans>{title}</Trans>
			</Typography>

			<>
				{/* Only show the add key functionality for the current user */}
				{isCurrentUserKeys && (keyCount || keysStatus !== "loading") && (
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
								? isCurrentUserKeys
									? i18n._(
											t`No API keys found. Click the + button to add a new API key`,
										)
									: i18n._(t`No API keys found for this user.`)
								: i18n._(t`Fetching API keys...`)
						}
					/>
				)}
			</>
			{keysStatus === "loading" && <LinearProgress />}
		</Paper>
	);
};

export default ApiKeys;
