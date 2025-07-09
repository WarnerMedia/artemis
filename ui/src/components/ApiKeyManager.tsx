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
	VpnKey as VpnKeyIcon,
	WatchLater as WatchLaterIcon,
} from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Chip,
	Collapse,
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
	Grid2 as Grid,
	IconButton,
	InputAdornment,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Paper,
	TextField as MuiTextField,
	Theme,
	Toolbar,
	Tooltip,
	Typography,
} from "@mui/material";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { Checkbox, Switch, TextField } from "formik-mui";
import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { makeStyles, withStyles } from "tss-react/mui";
import * as Yup from "yup";

import client from "api/client";
import { APP_SERVICE_GITHUB_URL, STORAGE_LOCAL_WELCOME } from "app/globals";
import { RootState } from "app/rootReducer";
import { pluginsDisabled } from "app/scanPlugins";
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
import { addNotification } from "features/notifications/notificationsSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";
import { User } from "features/users/usersSchemas";
import { useDispatch, useSelector } from "react-redux";
import {
	capitalize,
	formatDate,
	SPLIT_MULTILINE_CSN_REGEX,
} from "utils/formatters";

// Utility functions
const getFeatureTooltipChips = (row: Key) => {
	// Prepare feature chips and tooltips
	const pluginCatalog = pluginsDisabled; // this could be passed in as a prop if needed
	const features = row?.features;
	const featuresTooltip: string[] = [];
	const featuresChips: JSX.Element[] = [];

	if (features && Object.keys(features).length > 0) {
		// Add feature chips
		Object.entries(features).forEach(([key, value]) => {
			// Skip any disabled plugins
			if (key in pluginCatalog) return;

			// Convert key to display name, e.g. "snyk" => "Snyk"
			const displayName = capitalize(key);
			
			if (value === true) {
				featuresTooltip.push(displayName);
				featuresChips.push(
					<Chip
						key={`feature-${key}`}
						size="small"
						label={displayName}
						style={{ marginRight: "4px", marginBottom: "4px" }}
					/>
				);
			}
		});
	}

	return [featuresTooltip, featuresChips];
};

// Interfaces
export interface AddKeyForm {
	name: string;
	scope: string[];
	admin: boolean;
	expires: DateTime;
	snyk?: boolean;
}

export interface ApiKeyManagerProps {
	onAddKey?: () => void;
	onDeleteKey?: (key: Key) => void;
	onViewKey?: (key: Key) => void;
}

const useStyles = makeStyles()((theme: Theme) => ({
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
	formScopeAction: {
		flexBasis: 0,
	},
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
	scopeHelpIcon: {
		paddingTop: "3px",
	},
	scopeItemIcon: {
		minWidth: "40px",
	},
	scopeList: {
		padding: 0,
		margin: 0,
		listStyleType: "none",
	},
	tableToolbar: {
		padding: theme.spacing(1),
		marginBottom: theme.spacing(1),
		borderBottom: `1px solid ${theme.palette.divider}`,
	},
}));

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onAddKey, onDeleteKey, onViewKey }) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const dispatch = useDispatch();

	// Redux state
	const keys = useSelector(selectAllKeys);
	const currentUser = useSelector(selectCurrentUser);
	const keysStatus = useSelector((state: RootState) => state.keys.status);
	const keyCount = useSelector((state: RootState) => state.keys.totalRecords);

	// Component state
	const [selectedRow, setSelectedRow] = useState<Key | null>(null);
	const [deleteKey, setDeleteKey] = useState<Key | null>(null);
	const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
	const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
	const [newKeyError, setNewKeyError] = useState<string | null>(null);
	const [newScopeValue, setNewScopeValue] = useState<string>("");
	const [newScopeValid, setNewScopeValid] = useState<boolean>(false);
	const [newScopeError, setNewScopeError] = useState<string | null>(null);
	const [showScanOrgs, setShowScanOrgs] = useState<boolean>(false);

	// Get API keys when the component mounts
	useEffect(() => {
		dispatch(getUserKeys());
	}, [dispatch]);

	// Table columns definition
	const columns: ColDef[] = [
		{
			id: "name",
			disablePadding: false,
			label: i18n._(t`Name`),
		},
		{
			id: "admin",
			disablePadding: false,
			label: i18n._(t`Type`),
			format: (value: boolean) => (value ? i18n._(t`Administrator`) : i18n._(t`Standard`)),
		},
		{
			id: "created",
			disablePadding: false,
			label: i18n._(t`Created`),
			format: (value: string) => <DateTimeCell value={value} />,
		},
		{
			id: "last_used",
			disablePadding: false,
			label: i18n._(t`Last Used`),
			format: (value: string | null) => <DateTimeCell value={value} />,
		},
		{
			id: "expires",
			disablePadding: false,
			label: i18n._(t`Expires`),
			format: (value: string | null) => <ExpiringDateTimeCell value={value} />,
		},
	];

	// Row select handler
	const onRowSelect = (row: Key | null) => {
		if (onViewKey && row) {
			onViewKey(row);
		}
		setSelectedRow(row);
	};

	// Delete key handling
	const handleDeleteKey = (key: Key | null) => {
		if (!key) return;
		setDeleteKey(key);
	};

	const confirmDeleteKey = async () => {
		if (!deleteKey) return;

		try {
			await dispatch(deleteUserKey(deleteKey.id)).unwrap();
			dispatch(
				addNotification({
					message: i18n._(t`API key deleted`),
					severity: "success",
				})
			);
			if (onDeleteKey) onDeleteKey(deleteKey);
		} catch (error: any) {
			dispatch(
				addNotification({
					message: error?.message || i18n._(t`Failed to delete API key`),
					severity: "error",
				})
			);
		}
		setDeleteKey(null);
	};

	const cancelDeleteKey = () => {
		setDeleteKey(null);
	};

	// CSV export handling
	const toCsv = (rows: Key[]) => {
		return rows.map((row) => {
			return {
				name: row.name,
				type: row.admin ? i18n._(t`Administrator`) : i18n._(t`Standard`),
				created: formatDate(row.created),
				last_used: formatDate(row.last_used),
				expires: formatDate(row.expires),
			};
		});
	};

	const exportData = (rows: Key[]) => {
		return rows.map((row) => {
			// Convert the Key object to a simpler object for export
			const obj: any = { ...row };
			// Don't include the id in exports
			delete obj.id;
			return obj;
		});
	};

	// Reset form handler
	const resetAddForm = () => {
		setNewScopeValue("");
		setNewScopeError(null);
		setNewScopeValid(false);
	};

	// Collapsible row for delete confirmation
	const CollapsibleRow = ({ row }: { row: Key }) => (
		<Paper className={classes.collapsibleRow}>
			<Grid container spacing={2} alignItems="center" justifyContent="flex-end">
				<Grid>
					<Typography variant="body2">
						<Trans>Delete API key?</Trans>
					</Typography>
				</Grid>
				<Grid>
					<Button
						aria-label={i18n._(t`Cancel`)}
						variant="contained"
						size="small"
						onClick={cancelDeleteKey}
						className={classes.deleteAltButton}
					>
						<Trans>Cancel</Trans>
					</Button>
				</Grid>
				<Grid>
					<Button
						aria-label={i18n._(t`Delete`)}
						variant="contained"
						color="error"
						size="small"
						onClick={confirmDeleteKey}
						startIcon={<DeleteIcon />}
					>
						<Trans>Delete</Trans>
					</Button>
				</Grid>
			</Grid>
		</Paper>
	);

	// Toolbar with add button
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
								if (onAddKey) onAddKey();
							}}
						>
							<AddIcon fontSize="small" />
						</Fab>
					</span>
				</Tooltip>
			</span>
		</Toolbar>
	);

	// New key content display
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

	// Add key form handling
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
																style={{
																	paddingLeft: "1.5em",
																	margin: 0,
																}}
															>
																{currentUser.scan_orgs.map((org) => (
																	<li key={`scan-org-${org}`}>{org}</li>
																))}
															</ul>
														) : (
															<span>
																<Trans>
																	You don't have any scan organizations
																</Trans>
															</span>
														)}
													</Paper>
												</Collapse>
											</Box>
										</FormHelperText>

										<Paper
											variant="outlined"
											className={classes.currentScopeSection}
										>
											<div>
												{values?.scope &&
												Array.isArray(values.scope) &&
												values.scope.length > 0 ? (
													values.scope.map((scopeItem) => (
														<Chip
															key={`scope-${scopeItem}`}
															label={scopeItem}
															onDelete={() => {
																setFieldValue(
																	"scope",
																	values.scope.filter(
																		(s) => s !== scopeItem,
																	),
																);
															}}
															className={classes.chipFeatures}
														/>
													))
												) : (
													<span>
														<Trans>At least 1 scope is required</Trans>
													</span>
												)}
											</div>
										</Paper>

										<FormHelperText style={{ paddingBottom: "1em" }}>
											<Trans>
												Supports Unix-style path name pattern expansion syntax,
												e.g. vcs/org/repoprefix-*. * indicates all
												repositories.
											</Trans>
										</FormHelperText>

										<Grid container spacing={1}>
											<Grid size={10}>
												<MuiTextField
													id="add-new-scope-input"
													value={newScopeValue}
													onChange={(e) =>
														handleScopeValueChange(e, values?.scope ?? [])
													}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															if (
																newScopeValue &&
																newScopeValid &&
																values?.scope
															) {
																// Support adding multiple scope values at once
																const scopeValues = getDelimitedValues(
																	newScopeValue,
																);

																// Check if any of the values are already in the list
																const newValues: string[] = [];
																for (let i = 0; i < scopeValues.length; i += 1) {
																	const val = scopeValues[i].trim();
																	if (
																		val.length > 0 &&
																		!values.scope.includes(val)
																	) {
																		newValues.push(val);
																	}
																}

																if (newValues.length > 0) {
																	setFieldValue("scope", [
																		...values.scope,
																		...newValues,
																	]);
																}

																setNewScopeValue("");
																setNewScopeError(null);
																setNewScopeValid(false);
															}
														}
													}}
													fullWidth
													variant="outlined"
													placeholder={i18n._(t`Add Scope`)}
													error={!!newScopeError}
													helperText={newScopeError}
													InputProps={{
														endAdornment: (
															<>
																{newScopeValue && (
																	<InputAdornment position="end">
																		<IconButton
																			aria-label={i18n._(t`Clear`)}
																			onClick={(e) => {
																				setNewScopeValue("");
																				setNewScopeError(null);
																				setNewScopeValid(false);
																				focusNewScopeField(e);
																			}}
																			size="small"
																			edge="end"
																		>
																			<ClearIcon />
																		</IconButton>
																	</InputAdornment>
																)}
															</>
														),
													}}
												/>
											</Grid>

											<Grid size={2} className={classes.formScopeAction}>
												<Tooltip
													title={i18n._(t`Add to scope`)}
													placement="top"
												>
													<span>
														<IconButton
															aria-label={i18n._(t`Add this item to scope`)}
															onClick={(e) => {
																if (
																	newScopeValue &&
																	newScopeValid &&
																	values?.scope
																) {
																	// Support adding multiple scope values at once
																	const scopeValues = getDelimitedValues(
																		newScopeValue,
																	);

																	// Check if any of the values are already in the list
																	const newValues: string[] = [];
																	for (
																		let i = 0;
																		i < scopeValues.length;
																		i += 1
																	) {
																		const val = scopeValues[i].trim();
																		if (
																			val.length > 0 &&
																			!values.scope.includes(val)
																		) {
																			newValues.push(val);
																		}
																	}

																	if (newValues.length > 0) {
																		setFieldValue("scope", [
																			...values.scope,
																			...newValues,
																		]);
																	}

																	setNewScopeValue("");
																	setNewScopeError(null);
																	setNewScopeValid(false);
																}
															}}
															disabled={!newScopeValid}
															color="primary"
															size="large"
														>
															<AddCircleOutlineIcon />
														</IconButton>
													</span>
												</Tooltip>
												<FormHelperText>
													<Trans>
														Click + icon to add this value to the Current
														Scope list above
													</Trans>
												</FormHelperText>
											</Grid>
										</Grid>
									</Paper>
								</Box>

								{/* Scan Features */}
								{currentUser?.features?.snyk && !("snyk" in pluginsDisabled) && (
									<Box className={classes.addKeyFormField}>
										<Paper variant="outlined" style={{ padding: "1em" }}>
											<FormLabel component="legend">
												<Trans>Features</Trans>
											</FormLabel>
											<FormHelperText style={{ paddingBottom: "1em" }}>
												<Trans>
													Allow this key to use additional scan features
												</Trans>
											</FormHelperText>
											<FormGroup>
												<FormControlLabel
													control={
														<Field
															component={Switch}
															type="checkbox"
															name="snyk"
															color="primary"
														/>
													}
													label="Snyk"
												/>
											</FormGroup>
										</Paper>
									</Box>
								)}

								<Box className={classes.addKeyFormField}>
									<Field
										component={DatePickerField}
										label={i18n._(t`Expires (optional)`)}
										name="expires"
										inputVariant="outlined"
										format="yyyy-MM-dd HH:mm:ss"
										className={classes.addKeyFormField}
										minDate={dateMin.toJSDate()}
										maxDate={dateMax.toJSDate()}
										disablePast={true}
										fullWidth
									/>
								</Box>
							</DialogContent>
							<DialogActions>
								<Box displayPrint="none">
									<Button
										disabled={isSubmitting}
										onClick={() => {
											setAddDialogOpen(false);
										}}
									>
										<Trans>Cancel</Trans>
									</Button>
									<Button
										disabled={!isValid || isSubmitting || !dirty}
										color="primary"
										onClick={submitForm}
									>
										{isSubmitting ? (
											<Trans>Adding...</Trans>
										) : (
											<Trans>Add</Trans>
										)}
									</Button>
								</Box>
							</DialogActions>
						</>
					</Form>
				)}
			</Formik>
		);
	};

	// View key content display
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
				<Grid size={6}>
					<List dense={true}>
						<ListItem key="key-created">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Created`)}
								secondary={<DateTimeCell value={selectedRow?.created} />}
							/>
						</ListItem>

						<ListItem key="key-expires">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Expires`)}
								secondary={
									<ExpiringDateTimeCell value={selectedRow?.expires} />
								}
							/>
						</ListItem>

						<ListItem key="key-last-used">
							<ListItemIcon>
								<WatchLaterIcon />
							</ListItemIcon>
							<ListItemText
								primary={i18n._(t`Last Used`)}
								secondary={<DateTimeCell value={selectedRow?.last_used} />}
							/>
						</ListItem>
					</List>
				</Grid>

				<Grid size={12}>
					<Box display="flex" justifyContent="flex-end">
						<Button
							variant="contained"
							color="error"
							startIcon={<DeleteIcon />}
							onClick={() => {
								handleDeleteKey(selectedRow);
								onRowSelect(null);
							}}
						>
							<Trans>Delete</Trans>
						</Button>
					</Box>
				</Grid>
			</Grid>
		);
	};

	return (
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
				<Typography variant="body1" align="center" style={{ padding: "2rem" }}>
					{keysStatus !== "loading"
						? i18n._(t`No API keys found. Click the + button to add a new API key`)
						: i18n._(t`Fetching API keys...`)}
				</Typography>
			)}
		</>
	);
};

export default ApiKeyManager;
