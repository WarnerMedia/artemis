import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field } from "formik";
import { Checkbox, Switch, TextField } from "formik-mui";
import {
	Alert,
	Box,
	Button,
	Container,
	DialogActions,
	DialogContent,
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
	Paper,
	TextField as MuiTextField,
	Toolbar,
	Tooltip,
	Typography,
	useScrollTrigger,
	Zoom,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import {
	Add as AddIcon,
	AddCircleOutline as AddCircleOutlineIcon,
	ArrowBackIos as ArrowBackIosIcon,
	Check as CheckIcon,
	Clear as ClearIcon,
	Delete as DeleteIcon,
	FilterList as FilterListIcon,
	KeyboardArrowUp as KeyboardArrowUpIcon,
	RemoveCircleOutlineOutlined as RemoveCircleOutlineOutlinedIcon,
} from "@mui/icons-material";
import { useLingui } from "@lingui/react";
import { Trans, t } from "@lingui/macro";
import * as Yup from "yup";

import client, { FilterDef, RequestMeta } from "api/client";
import CustomCopyToClipboard from "components/CustomCopyToClipboard";
import DraggableDialog from "components/DraggableDialog";
import DateTimeCell from "components/DateTimeCell";
import EnhancedTable, { ColDef, RowDef } from "components/EnhancedTable";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "app/rootReducer";
import {
	nonDefaultPlugins,
	pluginCatalog,
	pluginsDisabled,
} from "app/scanPlugins";
import { AppDispatch } from "app/store";
import { selectCurrentUser } from "features/users/currentUserSlice";
import {
	addUser,
	deleteUser,
	getUsers,
	resetStatus,
	selectAllUsers,
	updateUser,
} from "features/users/usersSlice";
import { User, ScanFeatures } from "features/users/usersSchemas";
import TooltipCell from "components/TooltipCell";
import ScopeCell from "components/ScopeCell";
import {
	capitalize,
	DELETED_REGEX,
	SPLIT_MULTILINE_CSN_REGEX,
} from "utils/formatters";

const useStyles = makeStyles()((theme) => ({
	addUserFormField: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
	addNewScopeField: {
		marginTop: theme.spacing(1),
	},
	backButton: {
		marginBottom: theme.spacing(1),
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
	filterField: {
		height: "2.75em",
	},
	formScopeAction: {
		flexBasis: 0,
	},
	paper: {
		marginBottom: theme.spacing(3),
		padding: theme.spacing(2),
	},
	removeUser: {
		maxWidth: "40rem",
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	tableToolbar: {
		display: "flex",
		justifyContent: "flex-end",
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

interface FilterFieldProps {
	field: string;
	label: string;
	value?: string | string[];
	autoFocus?: boolean;
	onClear: (field: string) => void;
	onChange: (field: string, value: string) => void;
}

const FilterField = (props: FilterFieldProps) => {
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const {
		field,
		label,
		value = "",
		autoFocus = false,
		onClear,
		onChange,
	} = props;
	// maintain an internal field value
	// so we can echo user input
	// but then debounce changing the filter value and invoking a table filter operation
	const [fieldValue, setFieldValue] = useState(value);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);
	const debounceMs = 1000; // make debounce a little longer than for client-side filtering since this is going to invoke a call to the server

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
			onChange(field, newValue);
			debounceRef.current = null;
		}, debounceMs);
	};

	return (
		<MuiTextField
			id={`filter-${field}`}
			name={`filter-${field}`}
			variant="outlined"
			autoFocus={autoFocus}
			value={fieldValue}
			size="small"
			style={{ maxWidth: "15em" }}
			label={label}
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

const BooleanCell = (props: { value?: string | string[] | null }) => {
	const { value } = props;
	let cell = <></>;
	if (value) {
		cell = <CheckIcon />;
	}
	return cell;
};

interface AddUserForm {
	email: string;
	scope: string[];
	admin: boolean;
	features: ScanFeatures;
}

export default function UsersPage() {
	const navigate = useNavigate();
	const { i18n } = useLingui();
	const { classes } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const [selectedRow, setSelectedRow] = useState<RowDef | null>(null);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	);
	const users = useSelector((state: RootState) => selectAllUsers(state));
	const usersState = useSelector((state: RootState) => state.users);
	const prevUsersState = useRef<RootState["users"]["action"]>(null);
	const [userToDelete, setUserToDelete] = useState<User | null>(null);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [newScopeValue, setNewScopeValue] = useState("");
	const [newScopeValid, setNewScopeValid] = useState(false);
	const [newScopeError, setNewScopeError] = useState<string | null>(null);
	const [scrollTarget, setScrollTarget] = useState<HTMLElement | undefined>(
		undefined
	);
	const [reloadCount, setReloadCount] = useState(0);
	const [filters, setFilters] = useState<FilterDef>({
		email: {
			filter: "",
		},
		scope: {
			filter: "",
		},
	});
	let filterCount = 0;
	for (const [, opts] of Object.entries(filters)) {
		if (opts.filter) {
			filterCount += 1;
		}
	}

	const onDataLoad = (meta?: RequestMeta) => {
		dispatch(getUsers({ meta: meta }));
	};

	const exportFetch = async (meta?: RequestMeta) => {
		const response = await client.getUsers({
			meta: {
				...meta,
				filters: filters,
			},
		});
		return response.results.map((r) => ({
			email: r.email,
			admin: r.admin,
			last_login: r.last_login,
			scope: r.scope,
			features: r.features,
		}));
	};

	const toCsv = (data: User) => {
		const features = [];
		if (data.features) {
			for (const [name, enabled] of Object.entries(data.features)) {
				features.push(`${name} (${enabled ? "enabled" : "disabled"})`);
			}
		}
		return {
			email: data.email
				? data.email.replace(DELETED_REGEX, " (Deleted)")
				: null,
			admin: data.admin,
			last_login: data.last_login,
			scope: data.scope,
			features: features,
		};
	};

	useEffect(() => {
		document.title = i18n._(t`Artemis - User Management`);
	}, [i18n]);

	useEffect(() => {
		// update reloadCount to reload table data when an operation successfully completes that modifies data (add, update, delete)
		// done for add/delete since items on page may need to change
		// done for update so we get the latest changes to the user object
		if (
			usersState.action === null &&
			usersState.status === "succeeded" &&
			["add", "delete", "update"].includes(prevUsersState?.current ?? "")
		) {
			onRowSelect(null); // de-select row to close any open dialog
			setReloadCount((prevCount) => (prevCount += 1));
		}
		prevUsersState.current = usersState.action;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [usersState.action]);

	// scroll to last scope item added to current scope in addUsers
	useEffect(() => {
		// newScopeValue reset to "" after each item added
		if (newScopeValue === "" && scrollTarget?.scrollTo) {
			scrollTarget.scrollTo({
				top: scrollTarget.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [newScopeValue, scrollTarget]);

	const userDialogTitle = () => {
		let title;
		if (selectedRow) {
			title = i18n._(t`Modify User`);
		} else {
			title = i18n._(t`Add New User`);
		}
		return title;
	};

	const resetAddForm = () => {
		setNewScopeValue("");
		setNewScopeError(null);
		setNewScopeValid(false);
	};

	const ActionsCell = (props: { row?: RowDef | null }) => {
		const { i18n } = useLingui();
		const { row } = props;
		return (
			<>
				<Tooltip title={i18n._(t`Remove User`)}>
					<span>
						<IconButton
							size="small"
							color="error"
							aria-label={i18n._(t`Remove User`)}
							disabled={usersState.status === "loading"}
							onClick={(event: React.SyntheticEvent) => {
								event.stopPropagation();
								let user = null;
								if (
									row?.email &&
									(!userToDelete || userToDelete?.email !== row.email)
								) {
									user = row as User;
								}
								setUserToDelete(user);
							}}
						>
							{userToDelete?.email === row?.email ? (
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
					className={classes.removeUser}
				>
					<Trans>Remove user "{userToDelete?.email ?? ""}"?</Trans>
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
							if (userToDelete?.email) {
								dispatch(
									deleteUser({
										email: userToDelete.email,
									})
								);
							}
							setUserToDelete(null);
						}}
					>
						<Trans>Remove</Trans>
					</Button>
					<Button
						aria-label={i18n._(t`Cancel`)}
						size="small"
						className={classes.deleteAltButtonText}
						onClick={() => {
							setUserToDelete(null);
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
			field: "email",
			headerName: i18n._(t`Email`),
			sortable: true,
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
			field: "admin",
			headerName: i18n._(t`Admin`),
			children: BooleanCell,
			sortable: true,
		},
		{
			field: "last_login",
			headerName: i18n._(t`Last Login`),
			children: DateTimeCell,
			sortable: true,
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

	const rows: RowDef[] = users.map((user) => {
		return {
			id: `id-${user.email}`, // unique id column with different value than email column
			email: user.email,
			admin: user.admin,
			last_login: user.last_login,
			scope: user?.scope ? [...user.scope] : [],
			features: user?.features ? { ...user.features } : {},
		};
	});

	const onRowSelect = (row: RowDef | null) => {
		setUserToDelete(null);
		setSelectedRow(row);
		setAddDialogOpen(row !== null);
		addUserForm();
	};

	const addUserToolbar = () => (
		<Toolbar className={classes.tableToolbar}>
			<span>
				<Tooltip title={userDialogTitle()}>
					<span>
						<Fab
							aria-label={userDialogTitle()}
							color="primary"
							size="small"
							disabled={usersState.status === "loading"}
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

	const addUserForm = () => {
		const addUserFormSchema = Yup.object({
			email: Yup.string()
				.required(i18n._(t`Required`))
				.trim()
				.min(1, i18n._(t`Must be between 1-254 characters`))
				.max(254, i18n._(t`Must be between 1-254 characters`))
				// basic HTML5 email validation regex
				.matches(
					/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
					i18n._(t`Invalid email address`)
				),
			scope: Yup.array().of(Yup.string()),
			admin: Yup.boolean(),
			features: Yup.array().of(Yup.object()).nullable(),
		});
		const editUserFormSchema = Yup.object({
			scope: Yup.array().of(Yup.string()),
			admin: Yup.boolean(),
			features: Yup.array().of(Yup.object()).nullable(),
		});

		const defaultFeatures: { [key: string]: boolean } = {};
		nonDefaultPlugins.map((feat) => (defaultFeatures[feat] = false));

		const initialValues = (): AddUserForm => {
			return {
				email: selectedRow?.email ?? "",
				scope: selectedRow?.scope ?? [],
				admin: selectedRow?.admin ?? false,
				features: selectedRow?.features ?? defaultFeatures,
			};
		};

		const onSubmit = async (values: AddUserForm) => {
			if (selectedRow) {
				dispatch(
					updateUser({
						data: {
							email: selectedRow?.email.trim(),
							scope: values?.scope,
							admin: values?.admin ?? false,
							features: values?.features ?? {},
						},
					})
				);
			} else {
				dispatch(
					addUser({
						data: {
							email: values?.email.trim(),
							scope: values?.scope,
							admin: values?.admin ?? false,
							features: values?.features ?? {},
						},
					})
				);
			}
			return true;
		};

		const handleScopeValueChange = (
			event: React.ChangeEvent<HTMLInputElement>,
			currentScopes: string[]
		) => {
			// validate new scope value
			// set field validation true (which will enable/disable add button)
			const fieldValue = event.target.value.trim();
			setNewScopeValue(event.target.value);
			if (fieldValue && currentScopes) {
				// check scope isn't duplicated
				const duplicate = currentScopes.findIndex((scope) => {
					let matchedscope = false;
					getDelimitedSet(fieldValue).forEach((value) => {
						if (value === scope) {
							matchedscope = true;
						}
					});
					return matchedscope;
				});
				if (duplicate !== -1) {
					setNewScopeError(i18n._(t`Duplicate scope`));
					setNewScopeValid(false);
					return;
				}

				// check scope contains only valid characters:
				// hostname chars, repo name chars, python fnmatch glob chars (*, ?, !, [])
				if (
					!fieldValue.match(/^([a-zA-Z0-9.\-_/[\]*?!]+(\s*[,]*\s*)*){1,}$/gm)
				) {
					setNewScopeError(
						i18n._(
							t`May only contain the characters: A-Z, a-z, 0-9, ., -, _, /, [, ], *, ?, !`
						)
					);
					setNewScopeValid(false);
					return;
				}

				setNewScopeError(null);
				setNewScopeValid(true);
				return;
			}
			setNewScopeValid(false);
		};

		const focusNewScopeField = (event: React.SyntheticEvent) => {
			// cancel icon will be hidden so re-focus form field
			const input = (
				(event.target as HTMLDivElement).ownerDocument || document
			).getElementById("add-new-scope-input");
			if (input) {
				input.focus();
			}
		};

		const getDelimitedSet = (input: string) => {
			const valueset = new Set<string>();
			input.split(SPLIT_MULTILINE_CSN_REGEX).forEach((value) => {
				const trimmed = value.trim();
				if (trimmed.length > 0) {
					valueset.add(trimmed);
				}
			});
			return valueset;
		};

		const renderFeatures = (features: ScanFeatures) => {
			const formFeatures: React.ReactNode[] = [];
			const allFeatures = { ...features };

			// don't display a feature for any disabled plugins
			// even if it's in the user's features object
			if (Object.keys(allFeatures).length > 0) {
				for (const p of Object.keys(pluginsDisabled)) {
					if (p in allFeatures) {
						delete allFeatures[p];
					}
				}
			}

			// ensure all scan features available
			// including ones added after user was created
			// new features will be off/disabled by default
			nonDefaultPlugins.forEach((plugin) => {
				if (!(plugin in features)) {
					allFeatures[plugin] = false;
				}
			});
			if (allFeatures) {
				Object.entries(allFeatures).forEach(([name, enabled]) => {
					let label = capitalize(name); // fallback if we can't find a defined plugin display name
					for (const [, values] of Object.entries(pluginCatalog)) {
						const plugin = values.plugins.find((n) => n.apiName === name);
						if (plugin) {
							label = i18n._(
								t`${plugin?.displayName} ${values.displayName} Plugin`
							);
							break;
						}
					}
					formFeatures.push(
						<FormControlLabel
							key={`feature-label-${name}`}
							control={
								<>
									<Field
										key={`feature-${name}`}
										id={`feature-${name}`}
										component={Checkbox}
										type="checkbox"
										name={`features[${name}]`}
										value="true"
										checked={enabled}
										disabled={usersState.status === "loading"}
									/>
								</>
							}
							label={label}
						/>
					);
				});
			}
			return formFeatures.length > 0 ? (
				<Box marginTop={2} marginBottom={1}>
					<FormControl component="fieldset">
						<FormLabel component="legend">Features</FormLabel>
						<FormHelperText style={{ paddingBottom: "1em" }}>
							<Trans>Allow this user to use additional scan features</Trans>
						</FormHelperText>
						<FormGroup row>{formFeatures}</FormGroup>
					</FormControl>
				</Box>
			) : (
				formFeatures
			);
		};

		return (
			<Formik
				initialValues={initialValues()}
				validationSchema={selectedRow ? editUserFormSchema : addUserFormSchema}
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
							{usersState.status === "failed" && usersState.error && (
								<Alert
									aria-label={i18n._(t`error`)}
									elevation={6}
									variant="filled"
									onClose={() => {
										dispatch(resetStatus());
									}}
									severity="error"
								>
									{usersState.error}
								</Alert>
							)}
							<DialogContent dividers={true}>
								<Box className={classes.addUserFormField}>
									<Field
										id="email"
										name="email"
										type="text"
										maxRows={3}
										className={classes.addUserFormField}
										autoFocus={!selectedRow}
										inputProps={{ maxLength: 256 }}
										component={TextField}
										variant="outlined"
										label={i18n._(t`Email Address`)}
										fullWidth
										disabled={
											usersState.status === "loading" || Boolean(selectedRow)
										}
										multiline={true}
									/>
								</Box>

								{currentUser?.admin && (
									<Box className={classes.addUserFormField}>
										<FormControlLabel
											control={
												<Field
													component={Switch}
													disabled={
														usersState.status === "loading" || isSubmitting
													}
													type="checkbox"
													id="admin"
													name="admin"
													color="primary"
													autoFocus={Boolean(selectedRow)}
												/>
											}
											label={i18n._(t`Administrator`)}
										/>
										<FormHelperText style={{ paddingBottom: "1em" }}>
											<Trans>
												Administrators can manage all other users and groups
											</Trans>
										</FormHelperText>
									</Box>
								)}

								<Box className={classes.addUserFormField}>
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
											<Trans>
												Restrict user to only these repositories. Must be a
												subset of scopes from groups user is a member of.
												Supports Unix-style path name pattern expansion syntax,
												e.g. vcs/org/repoprefix-*. * indicates all repositories.
											</Trans>
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
													<Tooltip title={i18n._(t`Scroll to top`)}>
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
														disabled={usersState.status === "loading"}
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
																	getDelimitedSet(newScopeValue).forEach(
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

								{renderFeatures(values.features)}
							</DialogContent>

							{(usersState.status === "loading" || isSubmitting) && (
								<LinearProgress />
							)}
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
										aria-busy={usersState.status === "loading" || isSubmitting}
										disabled={
											usersState.status === "loading" ||
											!isValid ||
											!dirty ||
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
										{usersState.status === "loading" || isSubmitting ? (
											selectedRow ? (
												<Trans>Updating...</Trans>
											) : (
												<Trans>Adding...</Trans>
											)
										) : selectedRow ? (
											<Trans>Update</Trans>
										) : (
											<Trans>Add</Trans>
										)}
									</Button>

									<Button
										color="primary"
										disabled={usersState.status === "loading" || isSubmitting}
										onClick={() => {
											onRowSelect(null);
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

	const handleOnClear = (field: string) => {
		const newFilters = { ...filters };
		newFilters[field].filter = "";
		setFilters(newFilters);
	};

	const clearAllFilters = () => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			for (const field in prevState) {
				newFilters[field].filter = "";
			}
			return newFilters;
		});
	};

	const handleOnChange = (field: string, value: string) => {
		setFilters((prevState: FilterDef) => {
			const newFilters = { ...prevState };
			newFilters[field].filter = value;
			return newFilters;
		});
	};

	const listUsers = () => (
		<>
			{(usersState.totalRecords || usersState.status !== "loading") && (
				<>
					{addUserToolbar()}
					<DraggableDialog
						open={addDialogOpen}
						onClose={() => {
							onRowSelect(null);
						}}
						title={userDialogTitle()}
						maxWidth="md"
						fullWidth={true}
						TransitionProps={{
							onExited: () => {
								resetAddForm();
								dispatch(resetStatus());
							},
						}}
					>
						{addUserForm()}
					</DraggableDialog>

					<Box>
						<Box m={1} component="span">
							<FilterField
								field="email"
								autoFocus={true}
								label={i18n._(t`Email`)}
								value={filters["email"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
							/>
						</Box>
						<Box m={1} component="span">
							<FilterField
								field="scope"
								label={i18n._(t`Scope`)}
								value={filters["scope"].filter}
								onClear={handleOnClear}
								onChange={handleOnChange}
							/>
						</Box>
						<Box component="span" m={1}>
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
						</Box>
					</Box>
				</>
			)}
			{/* don't add/remove table dom element
			table element loads table data so if component is removed neither table nor data will be loaded
			so use display:none to hide the component instead */}
			<div style={{ display: usersState.totalRecords ? "initial" : "none" }}>
				<EnhancedTable
					id="email"
					columns={columns}
					rows={rows}
					defaultOrderBy="email"
					onRowSelect={onRowSelect}
					selectedRow={selectedRow}
					collapsibleRow={CollapsibleRow}
					disableRowClick={usersState.status === "loading"}
					collapsibleOpen={(id: string | number) => {
						return userToDelete?.email === id;
					}}
					collapsibleParentClassName={classes.collapsibleParent}
					onDataLoad={onDataLoad}
					totalRows={usersState.totalRecords}
					reloadCount={reloadCount}
					rowsPerPage={20}
					filters={filters}
					menuOptions={{
						exportFile: "users",
						exportFormats: ["csv", "json"],
						exportFetch: exportFetch,
						toCsv: toCsv,
					}}
				/>
			</div>
			{!usersState.totalRecords && (
				<NoResults
					title={
						usersState.status !== "loading"
							? filterCount
								? i18n._(t`No results match current filters`)
								: i18n._(
										t`No users found. Click the + button to add a new user`
								  )
							: i18n._(t`Fetching users...`)
					}
				/>
			)}
		</>
	);

	return (
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
			{usersState.status === "loading" && <LinearProgress />}
			<Paper className={classes.paper}>
				<Typography component="h2" variant="h6" align="center">
					<Trans>Users</Trans>
				</Typography>

				{listUsers()}
			</Paper>
		</Container>
	);
}
