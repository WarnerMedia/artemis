import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Formik, Form, Field } from "formik";
// note: using webpack > 2 so we can just import everything from @mui/material
// instead of having to import each individual component to reduce bundle size
// see: https://material-ui.com/guides/minimizing-bundle-size/#when-and-how-to-use-tree-shaking
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Container, // horizontally center page content
	Divider,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormHelperText,
	FormLabel,
	LinearProgress,
	Paper,
	Typography,
} from "@mui/material";
import {
	BugReport as BugReportIcon,
	ExpandMore as ExpandMoreIcon,
	Layers as LayersIcon,
	OpenInNew as OpenInNewIcon,
	PlayCircleOutline as PlayCircleOutlineIcon,
	Policy as PolicyIcon,
	Replay as ReplayIcon,
	Security as SecurityIcon,
	Tune as TuneIcon,
	VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { makeStyles } from "tss-react/mui";
import { useTheme } from "@mui/material/styles";
import { Checkbox, TextField } from "formik-mui";
import { useLingui } from "@lingui/react";
import { Trans, t } from "@lingui/macro";
import * as Yup from "yup";
import * as QueryString from "query-string";

import { AppDispatch } from "app/store";
import { RootState } from "app/rootReducer";
import {
	addScan,
	clearScans,
	getCurrentScan,
	getScanHistory,
} from "features/scans/scansSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";
import { clearAllNotifications } from "features/notifications/notificationsSlice";
import { ScanOptionsForm, SubmitContext } from "features/scans/scansSchemas";
import ActivityTable, {
	ActivityDataLoadCallback,
} from "components/ActivityTable";
import AutoCompleteField from "components/AutoCompleteField";

import { handleException } from "api/client";
import {
	ScanPlugin,
	secretPlugins,
	secretPluginsObjects,
	staticPlugins,
	staticPluginsObjects,
	techPlugins,
	techPluginsObjects,
	vulnPlugins,
	vulnPluginsObjects,
} from "../app/scanPlugins";
import WelcomeDialog from "components/WelcomeDialog";
import WelcomeDialogContent from "custom/WelcomeDialogContent";
import {
	APP_DEMO_USER_REPO,
	APP_DEMO_USER_VCSORG,
	APP_URL_PROVISION,
	STORAGE_LOCAL_WELCOME,
} from "app/globals";
import runMigrations from "custom/runMigrations";

const useStyles = makeStyles()((theme) => ({
	accordionDetails: {
		display: "block",
	},
	autoComplete: {
		border: `1px solid ${theme.palette.primary.main}`,
	},
	// change autocomplete option highlight color
	// https://github.com/mui-org/material-ui/issues/19692#issuecomment-621691564
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
	button: {
		marginTop: theme.spacing(3),
		marginLeft: theme.spacing(1),
	},
	buttons: {
		display: "flex",
		justifyContent: "flex-start",
	},
	heading: {
		fontSize: theme.typography.pxToRem(15),
		fontWeight: theme.typography.fontWeightRegular as any,
	},
	formPaper: {
		marginBottom: theme.spacing(3),
		padding: theme.spacing(2),
	},
	tablePaper: {
		padding: theme.spacing(2),
	},
	paperHeader: {
		marginBottom: theme.spacing(2),
	},
	pluginSelectorPlugins: {
		display: "block",
		maxHeight: "17.5rem",
		height: "auto",
		overflowY: "auto",
	},
	scanCategory: {
		flex: 1,
	},
	scanCategoryContainer: {
		width: "100%",
	},
	scanFeaturesIcon: {
		color: "darkgrey",
		marginRight: theme.spacing(1),
	},
}));

const MainPage = () => {
	const { classes } = useStyles();
	const theme = useTheme();
	const { i18n } = useLingui();
	const navigate = useNavigate(); // only for navigation, e.g. replace(), push(), goBack()
	const location = useLocation(); // for location, since history.location is mutable
	const firstFieldRef = useRef<HTMLElement>(null);
	const dispatch: AppDispatch = useDispatch();
	const [accordionExpanded, setAccordionExpanded] = useState(false);
	const [returning, setReturning] = useState(false);

	// Note: we are not using Formik's built-in isSubmitting/setSubmitting implementation
	// for managing form submission state
	// because we are using redux-sagas, which doesn't provide a builtin mechanism to dispatch an action
	// and then setSubmitting when the dispatch resolves (no await or Promise.then)
	// instead using state selectors from the Redux store that will be updated when the
	// saga action completes
	const scansStatus = useSelector((state: RootState) => state.scans.status);
	const usersStatus = useSelector(
		(state: RootState) => state.currentUser.status
	);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	); // current user is "self" id

	// empty form values for initializing form on first load or resetting form
	const emptyValues: ScanOptionsForm = {
		vcsOrg: null, // Autoselect component - when no option selected defaults to null
		repo: "",
		branch: "",
		secrets: true, // all scan categories enabled by default
		staticAnalysis: true,
		inventory: true,
		vulnerability: true,
		// numeric field but init to "", as using null/undefined won't clear field in formik form reset
		depth: "",
		includeDev: false,
		submitContext: "view" as SubmitContext,
		// We need the api names for the formik initial state in order to create the prechecked checkboxes.
		secretPlugins,
		staticPlugins,
		techPlugins,
		vulnPlugins,
	};
	const [submitContext, setSubmitContext] = useState<SubmitContext>("view");
	const [validatedData, setValidatedData] = useState<ScanOptionsForm | null>(
		null
	);
	const [initialValues, setInitialValues] =
		useState<ScanOptionsForm>(emptyValues);
	const [hideWelcome, setHideWelcome] = useState(true);

	// note: this schema lives on the web form page so I can
	// use local state variable vcsOrg as a .oneOf() to check for valid options
	const scanOptionsFormSchema: Yup.SchemaOf<ScanOptionsForm> = Yup.object({
		vcsOrg: Yup.string()
			.trim()
			.nullable()
			.default(null)
			.required(i18n._(t`Required`))
			.oneOf(currentUser?.scan_orgs ?? [], i18n._(t`Invalid value`)),
		repo: Yup.string()
			.trim()
			.required(i18n._(t`Required`))
			.matches(
				/^[a-zA-Z0-9.\-_/]+$/,
				i18n._(t`May only contain the characters: A-Z, a-z, 0-9, ., -, _, /`)
			)
			.when("vcsOrg", {
				// if VCS does not contain /Org suffix, then repo must contain Org/ Prefix
				is: (vcsOrg: string) => vcsOrg && !vcsOrg.includes("/"),
				then: Yup.string().matches(
					/\//,
					i18n._(t`Missing "Organization/" Prefix`)
				),
			}),
		branch: Yup.string()
			// doesn't match all sequences in the git-check-ref-format spec, but prevents most
			// individual disallowed characters
			// see: https://mirrors.edge.kernel.org/pub/software/scm/git/docs/git-check-ref-format.html
			.trim()
			.matches(
				/^[^ ~^:?*[\\]*$/,
				i18n._(
					t`Contains one of more of the following invalid characters: space, \, ~, ^, :, ?, *, [`
				)
			),
		secrets: Yup.boolean().when(
			// at least one scan feature category must be enabled
			["staticAnalysis", "inventory", "vulnerability"],
			{
				is: false,
				then: Yup.boolean().oneOf(
					[true],
					i18n._(t`At least one feature must be enabled`)
				),
			}
		),
		staticAnalysis: Yup.boolean(),
		inventory: Yup.boolean(),
		vulnerability: Yup.boolean(),
		depth: Yup.number()
			.positive(i18n._(t`Positive integer`))
			.integer(i18n._(t`Positive integer`))
			.transform(function (value, originalvalue) {
				// default value "" casts as NaN, so instead cast to undefined
				return originalvalue === "" ? undefined : value;
			}),
		includeDev: Yup.boolean(),
		submitContext: Yup.mixed<SubmitContext>().oneOf(["view", "scan"]),
		secretPlugins: Yup.array(),
		staticPlugins: Yup.array(),
		techPlugins: Yup.array(),
		vulnPlugins: Yup.array(),
	}).defined();

	const setPageTitle = (scan?: ScanOptionsForm) => {
		let title = t`Artemis`;

		if (scan?.vcsOrg && scan?.repo) {
			// get org part of service/org
			// org is anything after first /
			const firstSlash = scan.vcsOrg.indexOf("/");
			if (firstSlash !== -1) {
				title = t`Artemis: ${scan.vcsOrg.substring(firstSlash + 1)}/${
					scan.repo
				}`;
			} else {
				// vcsOrg is just the service name
				title = t`Artemis: ${scan.repo}`;
			}
		}
		document.title = i18n._(title);
	};

	// get any prior form values passed-in URL query params and validate matches schema
	// returns null if no query params or validation fails
	// returns null so validatedData can be initialized to null (if form never submitted)
	const getSearchParams = (): ScanOptionsForm | null => {
		if (location.search) {
			const search = QueryString.parse(location.search);
			if (Object.keys(search)) {
				try {
					// schema validation will also transform query params to their correct types
					const validValues = scanOptionsFormSchema.validateSync(search, {
						strict: false, // setting to false will trim fields on validate
					});
					return { ...emptyValues, ...validValues };
				} catch (err) {
					return null;
				}
			}
		}
		return null;
	};

	// reset form and local component state to initial values
	// note we don't clear loaded user data
	const resetForm = () => {
		// remove form state from URL query string
		navigate("/", { replace: true });
		setPageTitle();
		setSubmitContext(emptyValues.submitContext ?? "view");
		setInitialValues(emptyValues);
		setValidatedData(null);
		sessionStorage.clear(); // clear current scan
		dispatch(clearScans());
		dispatch(clearAllNotifications());
		focusFirstField();
	};

	const onSubmit = (values: ScanOptionsForm) => {
		// remove form state from URL query string
		navigate("/", { replace: true });
		setPageTitle();
		// invalidate any previously validated form data
		setValidatedData(null);
		sessionStorage.clear(); // clear prior current scan
		dispatch(clearScans()); // cleanup our scan state
		dispatch(clearAllNotifications());

		// close accordion if it's expanded
		setAccordionExpanded(false);
		try {
			// trim form value strings
			const validValues = scanOptionsFormSchema.validateSync(values, {
				strict: false, // setting to false will trim fields on validate
			});
			// save form
			// we can't just pass-around the known org/repo/scanid
			// b/c vcs/org may be different elements of org and repo combined

			validValues.submitContext = submitContext;

			// Get just the form fields that are needed to preserve the form values on reload.
			// vcsOrg, repo, and submitContext, then omit everything else to keep it out of the query string in the URL.
			const requiredValidValuesForQueryString = {
				repo: validValues.repo,
				submitContext: validValues.submitContext,
				vcsOrg: validValues.vcsOrg,
			};

			const search = QueryString.stringify(requiredValidValuesForQueryString);
			navigate("/?" + search, { replace: true }); // reload form with data in URL query string
			setPageTitle(validValues);
			if (submitContext === "scan") {
				// no async/await, displayed data from Redux store will be updated in-place when data returned
				dispatch(addScan(validValues));
			}

			// initiate table to reload by updating data passed to it
			setValidatedData(validValues);
		} catch (err) {
			handleException(err);
		}
	};

	// callback to get scan data to display in the scan activity table
	const onDataLoad: ActivityDataLoadCallback = (meta) => {
		if (validatedData && scansStatus !== "loading") {
			const metaOpts = {
				...meta,
				filters: {
					...meta?.filters,
				},
			};
			if (submitContext === "scan") {
				// get a single scan (the one just added)
				metaOpts.filters["format"] = {
					match: "exact",
					filter: "summary",
				};
				delete metaOpts.currentPage;
				delete metaOpts.itemsPerPage;
				dispatch(getCurrentScan({ meta: metaOpts }));
			} else {
				// get scans for the repo
				dispatch(getScanHistory({ data: validatedData, meta: metaOpts }));
			}
		}
	};

	const focusFirstField = () => {
		// find the input field in the ref
		if (firstFieldRef?.current) {
			const input = firstFieldRef.current.querySelector("input");
			if (input) {
				// ensure component is finished rendering before we try to focus the field
				// addresses an issue where field doesn't focus on first load
				setTimeout(() => {
					input.focus();
				});
			}
		}
	};

	const onCloseWelcome = (hideWelcome: boolean) => {
		localStorage.setItem(STORAGE_LOCAL_WELCOME, hideWelcome ? "1" : "0");
		setHideWelcome(true);
		focusFirstField();
	};

	useEffect(() => {
		setPageTitle();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [i18n]);

	useEffect(() => {
		// only show welcome if not returning to page with search params
		if (!location.search) {
			runMigrations();
			setHideWelcome(
				Boolean(Number(localStorage.getItem(STORAGE_LOCAL_WELCOME)))
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// initialize form with values from URL query params
	// AFTER async call to get VCS/Orgs resolves
	// so we can validate that VCS/Org from query params is valid for this user
	useEffect(() => {
		if (currentUser && currentUser.scan_orgs && currentUser.scan_orgs.length) {
			const searchParams = getSearchParams();
			if (searchParams) {
				console.debug("restoring prior form state");
				setReturning(true);
				setSubmitContext(searchParams?.submitContext ?? "view");
				setInitialValues(searchParams ?? emptyValues);
				setValidatedData(searchParams);
				setPageTitle(searchParams);
			} else {
				const userScope =
					currentUser?.scope &&
					Array.isArray(currentUser.scope) &&
					currentUser.scope.length === 1 &&
					currentUser.scope[0];

				// if there's just 1 option available, then make it the default value selected
				if (currentUser.scan_orgs.length === 1) {
					setInitialValues({
						...emptyValues,
						vcsOrg: currentUser.scan_orgs[0],
						repo:
							userScope === `${APP_DEMO_USER_VCSORG}/${APP_DEMO_USER_REPO}`
								? APP_DEMO_USER_REPO
								: emptyValues.repo,
					});
					setReturning(true);
				}
				// VCS/Org options loaded, focus the first form field
				// if page isn't restoring prior state
				if (hideWelcome) {
					focusFirstField();
				}
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentUser]);

	// Formik Material-UI fields MUST include an "id" attribute
	// otherwise the label isn't associated with the input field using "for"
	// this breaks a11y and testing

	// also, ActivityTable is outside the Formik component
	// otherwise it aggressively reloads on form field clicks
	return (
		<>
			<WelcomeDialog
				open={!hideWelcome}
				onClose={onCloseWelcome}
				title={i18n._(t`Welcome to Artemis`)}
			>
				<WelcomeDialogContent />
			</WelcomeDialog>
			<Container>
				<Formik
					initialValues={initialValues}
					enableReinitialize={true}
					validationSchema={scanOptionsFormSchema}
					onSubmit={onSubmit}
				>
					{({ submitForm, isValid, values, errors, touched, dirty }) => (
						<Form noValidate autoComplete="off">
							<Paper className={classes.formPaper}>
								<Typography
									component="h2"
									variant="h6"
									align="center"
									className={classes.paperHeader}
								>
									<Trans>Scan Information</Trans>
								</Typography>
								<div>
									<Box marginBottom={4} marginTop={4}>
										<FormLabel component="legend">
											<Trans>Where is the source code you want to scan?</Trans>
										</FormLabel>
									</Box>
									<Box>
										<AutoCompleteField
											id="vcsOrg"
											name="vcsOrg"
											options={currentUser?.scan_orgs ?? []}
											fullWidth
											classes={{
												paper: classes.autoComplete,
												option: classes.autoCompleteSelected,
											}}
											disabled={usersStatus === "loading"}
											autoFocus={usersStatus !== "loading"}
											autoHighlight={true}
											autoSelect={true}
											ref={firstFieldRef}
											loading={usersStatus === "loading"}
											error={touched["vcsOrg"] && !!errors["vcsOrg"]}
											helperText={
												touched["vcsOrg"] && !!errors["vcsOrg"]
													? errors["vcsOrg"]
													: ""
											}
											label={i18n._(t`Version Control System`)}
											placeholder={i18n._(
												t`Select Version Control System or type to autocomplete`
											)}
										/>
										{APP_URL_PROVISION && (
											<Button
												startIcon={<OpenInNewIcon />}
												href={APP_URL_PROVISION}
												target="_blank"
												rel="noopener noreferrer nofollow"
												size="small"
											>
												<Trans>Missing an option? Request access</Trans>
											</Button>
										)}
									</Box>
									<Box marginTop={2} marginBottom={4}>
										<Field
											id="repo"
											component={TextField}
											type="text"
											label={i18n._(t`Repository`)}
											placeholder={
												!!touched["vcsOrg"] && !values["vcsOrg"]?.includes("/")
													? i18n._(t`Organization/Repository Path`)
													: i18n._(t`Repository Path`)
											}
											name="repo"
											fullWidth
											variant="outlined"
											disabled={usersStatus === "loading"}
										/>
									</Box>
									<Accordion
										expanded={accordionExpanded}
										onChange={() => {
											setAccordionExpanded(!accordionExpanded);
										}}
									>
										<AccordionSummary
											expandIcon={<ExpandMoreIcon />}
											aria-controls="scan-options-section-content"
											id="scan-options-section-header"
										>
											<TuneIcon style={{ marginRight: theme.spacing(2) }} />
											<Typography className={classes.heading}>
												<Trans>New Scan Options...</Trans>
											</Typography>
										</AccordionSummary>
										<Divider />
										<AccordionDetails className={classes.accordionDetails}>
											<div>
												<Box marginBottom={4} marginTop={2}>
													<Field
														id="branch"
														component={TextField}
														type="text"
														label={i18n._(t`Branch Name (optional)`)}
														name="branch"
														placeholder={i18n._(t`Default Branch`)}
														fullWidth
														variant="outlined"
														disabled={usersStatus === "loading"}
													/>
												</Box>
												<Box marginBottom={2}>
													<FormControl
														component="fieldset"
														error={touched["secrets"] && !!errors["secrets"]}
														className={classes.scanCategoryContainer}
													>
														<FormLabel component="legend">
															Restrict Scan Features
														</FormLabel>

														<FormGroup row>
															<FormControlLabel
																className={classes.scanCategory}
																control={
																	<>
																		<Field
																			id="secrets"
																			component={Checkbox}
																			type="checkbox"
																			name="secrets"
																			disabled={usersStatus === "loading"}
																		/>
																		<VpnKeyIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	</>
																}
																label={i18n._(t`Secret Detection`)}
															/>
															<FormControlLabel
																className={classes.scanCategory}
																control={
																	<>
																		<Field
																			id="staticAnalysis"
																			component={Checkbox}
																			type="checkbox"
																			name="staticAnalysis"
																			disabled={usersStatus === "loading"}
																		/>
																		<BugReportIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	</>
																}
																label={i18n._(t`Static Analysis`)}
															/>
															<FormControlLabel
																className={classes.scanCategory}
																control={
																	<>
																		<Field
																			id="inventory"
																			component={Checkbox}
																			type="checkbox"
																			name="inventory"
																			disabled={usersStatus === "loading"}
																		/>
																		<LayersIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	</>
																}
																label={i18n._(t`Technology Inventory`)}
															/>
															<FormControlLabel
																className={classes.scanCategory}
																control={
																	<>
																		<Field
																			id="vulnerability"
																			component={Checkbox}
																			type="checkbox"
																			name="vulnerability"
																			disabled={usersStatus === "loading"}
																		/>
																		<SecurityIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	</>
																}
																label={i18n._(t`Vulnerability Detection`)}
															/>
														</FormGroup>

														{touched["secrets"] && !!errors["secrets"] && (
															<FormHelperText>
																{errors["secrets"]}
															</FormHelperText>
														)}

														<FormGroup row>
															<div className={classes.scanCategory}>
																<PluginsSelector
																	formikStateGroupName={"secretPlugins"}
																	idName={"secret"}
																	isDisabled={!values.secrets}
																	plugins={secretPluginsObjects}
																/>
															</div>
															<div className={classes.scanCategory}>
																<PluginsSelector
																	formikStateGroupName={"staticPlugins"}
																	idName={"static"}
																	isDisabled={!values.staticAnalysis}
																	plugins={staticPluginsObjects}
																/>
															</div>
															<div className={classes.scanCategory}>
																<PluginsSelector
																	formikStateGroupName={"techPlugins"}
																	idName={"tech"}
																	isDisabled={!values.inventory}
																	plugins={techPluginsObjects}
																/>
															</div>
															<div className={classes.scanCategory}>
																<PluginsSelector
																	formikStateGroupName={"vulnPlugins"}
																	idName={"vuln"}
																	isDisabled={!values.vulnerability}
																	plugins={vulnPluginsObjects}
																/>
															</div>
														</FormGroup>
													</FormControl>
												</Box>
												<Box marginBottom={2}>
													<Field
														id="depth"
														component={TextField}
														type="number"
														label={i18n._(t`Commit History (optional)`)}
														name="depth"
														min={1}
														placeholder={"500"}
														style={{
															width: 300,
														}}
														variant="outlined"
														disabled={usersStatus === "loading"}
													/>
												</Box>
												<Box>
													<FormGroup row>
														<FormControlLabel
															control={
																<Field
																	id="includeDev"
																	component={Checkbox}
																	type="checkbox"
																	name="includeDev"
																	disabled={usersStatus === "loading"}
																/>
															}
															label={i18n._(t`Scan Developer Dependencies`)}
														/>
													</FormGroup>
												</Box>
											</div>
										</AccordionDetails>
									</Accordion>
								</div>
								<div className={classes.buttons}>
									<Button
										className={classes.button}
										variant="contained"
										color="primary"
										startIcon={<PlayCircleOutlineIcon />}
										disabled={
											!isValid ||
											scansStatus === "loading" ||
											(!returning && !dirty)
										}
										onClick={() => {
											setSubmitContext("scan");
											submitForm();
										}}
									>
										<Trans>Start Scan</Trans>
									</Button>
									<Button
										className={classes.button}
										variant="contained"
										color="primary"
										startIcon={<PolicyIcon />}
										disabled={
											!isValid ||
											scansStatus === "loading" ||
											(!returning && !dirty)
										}
										onClick={() => {
											setSubmitContext("view");
											submitForm();
										}}
									>
										<Trans>View Scans</Trans>
									</Button>
									<Button
										type="reset"
										style={{ marginLeft: "auto" }}
										className={classes.button}
										variant="contained"
										color="primary"
										startIcon={<ReplayIcon />}
										onClick={resetForm}
										disabled={scansStatus === "loading"}
									>
										<Trans>Reset</Trans>
									</Button>
								</div>
							</Paper>
						</Form>
					)}
				</Formik>
				{scansStatus === "loading" && (
					<LinearProgress id="scan-activity-loading" />
				)}
				<Paper className={classes.tablePaper}>
					<Typography
						component="h2"
						variant="h6"
						align="center"
						className={classes.paperHeader}
					>
						<Trans>Scans</Trans>
					</Typography>

					<ActivityTable
						aria-describedby="scan-activity-loading"
						aria-busy={scansStatus === "loading"}
						onDataLoad={onDataLoad}
						data={validatedData}
					/>
				</Paper>
			</Container>
		</>
	);
};

interface PSProps {
	formikStateGroupName: string;
	idName: string;
	isDisabled: boolean;
	plugins: ScanPlugin[];
}

export const PluginsSelector = ({
	formikStateGroupName,
	idName,
	isDisabled,
	plugins,
}: PSProps) => {
	const [accordionExpanded, setAccordionExpanded] = useState(false);
	const usersStatus = useSelector(
		(state: RootState) => state.currentUser.status
	);
	const { classes } = useStyles();
	const { i18n } = useLingui();

	return (
		<Accordion
			expanded={!isDisabled && accordionExpanded}
			onChange={() => {
				setAccordionExpanded(!accordionExpanded);
			}}
			disabled={isDisabled}
		>
			<AccordionSummary
				expandIcon={<ExpandMoreIcon />}
				aria-controls="scan-options-section-content"
				id={`scan-options-section-header-${idName}`}
			>
				<Typography className={classes.heading}>
					<Trans>Plugins</Trans>
				</Typography>
			</AccordionSummary>
			<Divider />
			<AccordionDetails className={classes.pluginSelectorPlugins}>
				{plugins.map((plugin) => {
					return (
						<Box key={plugin.apiName}>
							<FormControlLabel
								control={
									<Field
										id={plugin.apiName}
										component={Checkbox}
										type="checkbox"
										name={formikStateGroupName}
										value={plugin.apiName}
										disabled={usersStatus === "loading"}
									/>
								}
								label={i18n._(plugin.displayName)}
							/>
						</Box>
					);
				})}
			</AccordionDetails>
		</Accordion>
	);
};

export default MainPage;
