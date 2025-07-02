import { Field, Form, Formik, useFormikContext } from "formik";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavigateFunction, useLocation, useNavigate } from "react-router-dom";
import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import {
	AccountTree as AccountTreeIcon,
	BugReport as BugReportIcon,
	CreateNewFolder as CreateNewFolderIcon,
	ExpandMore as ExpandMoreIcon,
	FactCheck as FactCheckIcon,
	Folder as FolderIcon,
	FolderOff as FolderOffIcon,
	History as HistoryIcon,
	Inventory as InventoryIcon,
	Layers as LayersIcon,
	OpenInNew as OpenInNewIcon,
	PlayCircleOutline as PlayCircleOutlineIcon,
	Policy as PolicyIcon,
	Replay as ReplayIcon,
	Security as SecurityIcon,
	Tune as TuneIcon,
	VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Container,
	Divider,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormHelperText,
	FormLabel,
	Grid2 as Grid,
	InputAdornment,
	LinearProgress,
	Paper,
	Typography,
} from "@mui/material";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { useTheme } from "@mui/material/styles";
import { Checkbox, TextField } from "formik-mui";
import queryString from "query-string";
import { makeStyles } from "tss-react/mui";

import { RootState } from "app/rootReducer";
import store, { AppDispatch } from "app/store";
import ActivityTable, {
	ActivityDataLoadCallback,
} from "components/ActivityTable";
import AutoCompleteField from "components/AutoCompleteField";
import { clearAllNotifications } from "features/notifications/notificationsSlice";
import {
	AnalysisReport,
	SCAN_DEPTH,
	ScanHistoryResponse,
	ScanOptionsForm,
	scanOptionsFormSchema,
	ScanResultsSummary,
	SubmitContext,
} from "features/scans/scansSchemas";
import {
	addScan,
	clearScans,
	getCurrentScan,
	getScanHistory,
} from "features/scans/scansSlice";
import { selectCurrentUser } from "features/users/currentUserSlice";

import client, { handleException, RequestMeta } from "api/client";
import {
	APP_API_BATCH_SIZE,
	APP_DEMO_USER_REPO,
	APP_DEMO_USER_VCSORG,
	APP_TABLE_EXPORT_MAX,
	APP_URL_PROVISION,
	STORAGE_LOCAL_WELCOME,
} from "app/globals";
import WelcomeDialog from "components/WelcomeDialog";
import runMigrations from "custom/runMigrations";
import { exportMetaData } from "custom/SearchMetaField";
import WelcomeDialogContent from "custom/WelcomeDialogContent";
import { User } from "features/users/usersSchemas";
import { DELETED_REGEX } from "utils/formatters";
import {
	configPlugins,
	configPluginsKeys,
	configPluginsObjects,
	excludePlugins,
	GROUP_ANALYSIS,
	GROUP_CONFIG,
	GROUP_INVENTORY,
	GROUP_SBOM,
	GROUP_SECRETS,
	GROUP_VULN,
	pluginCatalog,
	sbomPluginsKeys,
	sbomPluginsObjects,
	ScanPlugin,
	secretPlugins,
	secretPluginsKeys,
	secretPluginsObjects,
	staticPlugins,
	staticPluginsKeys,
	staticPluginsObjects,
	techPlugins,
	techPluginsKeys,
	techPluginsObjects,
	vulnPlugins,
	vulnPluginsKeys,
	vulnPluginsObjects,
} from "../app/scanPlugins";

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
	categoryHelpText: {
		color: theme.palette.text.secondary,
	},
	heading: {
		fontSize: theme.typography.pxToRem(15),
		fontWeight: theme.typography.fontWeightRegular,
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
	pluginsSelectorAccordionSummary: {
		"& .MuiAccordionSummary-content": {
			margin: `${theme.spacing(1)} 0`,
		},
	},
	pluginSelectorPlugins: {
		display: "block",
		position: "absolute",
		zIndex: "500",
		maxHeight: "17.5rem",
		height: "auto",
		overflowY: "auto",
		backgroundColor: theme.palette.background.default,
		width: "100%",
		borderTop: `0 solid ${theme.palette.primary.main}`,
		borderRight: `1px solid ${theme.palette.primary.main}`,
		borderLeft: `1px solid ${theme.palette.primary.main}`,
		borderBottom: `2px solid ${theme.palette.primary.main}`,
	},
	scanCategoryContainer: {
		width: "100%",
	},
	scanFeaturesIcon: {
		color: "darkgrey",
		marginRight: theme.spacing(1),
	},
}));

const getCategoryHelpText = (enabledCount = 0, totalCount = 0) => {
	return (
		<Trans>
			{enabledCount} of {totalCount} plugins selected
		</Trans>
	);
};

// whether category checkbox should display in an indeterminate state, i.e. [-]
// true = indeterminate indicating subset of plugins are selected
const isCategoryIndeterminate = (enabledCount = 0, totalCount = 0) => {
	return enabledCount > 0 && enabledCount < totalCount;
};

const setPageTitle = (scan?: ScanOptionsForm) => {
	let title = "Artemis";
	if (scan?.vcsOrg && scan?.repo) {
		// get org part of service/org
		// org is anything after first /
		const firstSlash = scan.vcsOrg.indexOf("/");
		if (firstSlash !== -1) {
			title = `Artemis: ${scan.vcsOrg.substring(firstSlash + 1)}/${scan.repo}`;
		} else {
			// vcsOrg is just the service name
			title = `Artemis: ${scan.repo}`;
		}
	}
	document.title = title;
};

// start a scan
// validates values (currentUser required to validate vcsOrg scope)
// navigate passed so that SPA doesn't reload when calling window.location.replace()
export const startScan = (
	navigate: NavigateFunction,
	values: ScanOptionsForm,
	currentUser?: User,
) => {
	try {
		const validValues = scanOptionsFormSchema(currentUser).validateSync(
			values,
			{
				strict: false,
			},
		);
		sessionStorage.clear();
		store.dispatch(clearScans());
		store.dispatch(addScan(validValues));

		navigate(
			"/?" +
				queryString.stringify({
					repo: validValues.repo,
					submitContext: "scan",
					vcsOrg: validValues.vcsOrg,
				}),
			{ replace: true },
		); // reload form with data in URL query string
	} catch (err) {
		handleException(err);
	}
};

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
		(state: RootState) => state.currentUser.status,
	);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self"),
	); // current user is "self" id

	// empty form values for initializing form on first load or resetting form
	const emptyValues: ScanOptionsForm = {
		vcsOrg: null, // Autoselect component - when no option selected defaults to null
		repo: "",
		branch: "",
		secrets: true, // all scan categories except sbom selected by default
		staticAnalysis: true,
		inventory: true,
		vulnerability: true,
		configuration: true,
		sbom: false,
		// numeric field but init to "", as using null/undefined won't clear field in formik form reset
		depth: "",
		includeDev: false,
		submitContext: "view" as SubmitContext,
		// We need the api names for the formik initial state in order to create the prechecked checkboxes.
		secretPlugins,
		staticPlugins: staticPlugins.filter((p) => !excludePlugins.includes(p)),
		techPlugins,
		vulnPlugins,
		configPlugins,
		sbomPlugins: [], // no sbom plugins selected by default
		includePaths: "",
		excludePaths: "",
	};
	const [submitContext, setSubmitContext] = useState<SubmitContext>("view");
	const [validatedData, setValidatedData] = useState<ScanOptionsForm | null>(
		null,
	);
	const [initialValues, setInitialValues] =
		useState<ScanOptionsForm>(emptyValues);
	const [hideWelcome, setHideWelcome] = useState(true);
	const [pluginAccordionExpanded, setPluginAccordionExpanded] = useState("");

	// get any prior form values passed-in URL query params and validate matches schema
	// returns null if no query params or validation fails
	// returns null so validatedData can be initialized to null (if form never submitted)
	const getSearchParams = (): ScanOptionsForm | null => {
		if (location.search) {
			const search = queryString.parse(location.search);
			if (Object.keys(search)) {
				try {
					// schema validation will also transform query params to their correct types
					const validValues = scanOptionsFormSchema(currentUser).validateSync(
						search,
						{
							strict: false, // setting to false will trim fields on validate
						},
					);
					return { ...emptyValues, ...validValues };
				} catch {
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
			const validValues = scanOptionsFormSchema(currentUser).validateSync(
				values,
				{
					strict: false, // setting to false will trim fields on validate
				},
			);
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

			const search = queryString.stringify(requiredValidValuesForQueryString);
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
				// clear any "view" context filters
				delete metaOpts.filters.initiated_by;
				delete metaOpts.filters.include_batch;
				delete metaOpts.currentPage;
				delete metaOpts.itemsPerPage;
				dispatch(getCurrentScan({ meta: metaOpts }));
			} else {
				// get scans for the repo
				dispatch(getScanHistory({ data: validatedData, meta: metaOpts }));
			}
		}
	};

	// callback to get scan data for export
	const exportFetch = async (meta?: RequestMeta) => {
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
				// clear any "view" context filters
				delete metaOpts.filters.initiated_by;
				delete metaOpts.filters.include_batch;
				delete metaOpts.currentPage;
				delete metaOpts.itemsPerPage;
				const response: AnalysisReport = await client.getCurrentScan({
					meta: metaOpts,
				});
				return [response];
			} else {
				// get scans for the repo
				const batchSize = APP_API_BATCH_SIZE; // resolve results in batches to avoid rate limits
				metaOpts.currentPage = 0;
				metaOpts.itemsPerPage = APP_TABLE_EXPORT_MAX;
				const response: ScanHistoryResponse = await client.getScanHistory({
					data: validatedData,
					meta: metaOpts,
				});
				let batchPromises: Promise<AnalysisReport>[] = [];
				let batchStart = 0;
				for (let i = 0; i < response.results.length; i += 1) {
					const result = response.results[i];
					if (
						"service" in result &&
						"repo" in result &&
						"scan_id" in result &&
						result.status !== "queued"
					) {
						// fetch scan fields missing from history (AnalysisReport extending ScanHistory, e.g., success, results_summary)
						// get summary results not full
						const url = [result.service, result.repo, result.scan_id].join("/");
						batchPromises.push(
							client.getScanById(url, {
								meta: {
									filters: {
										format: {
											match: "exact",
											filter: "summary",
										},
									},
								},
							}),
						);
						if (
							batchPromises.length === batchSize ||
							i === response.results.length - 1
						) {
							const batchResults = await Promise.all(batchPromises);
							for (
								let j = batchStart, k = 0;
								k < batchResults.length;
								j += 1, k += 1
							) {
								response.results[j].results_summary = batchResults[k]
									.results_summary
									? ({
											...batchResults[k].results_summary,
										} as ScanResultsSummary)
									: undefined;
								response.results[j].engine_id = batchResults[k].engine_id;
								response.results[j].application_metadata = batchResults[k]
									.application_metadata
									? { ...batchResults[k].application_metadata }
									: undefined;
								response.results[j].success = batchResults[k].success;
								response.results[j].truncated = batchResults[k].truncated;
								response.results[j].errors = batchResults[k].errors
									? { ...batchResults[k].errors }
									: undefined;
								response.results[j].alerts = batchResults[k].alerts
									? { ...batchResults[k].alerts }
									: undefined;
								response.results[j].debug = batchResults[k].debug
									? { ...batchResults[k].debug }
									: undefined;
							}
							batchPromises = [];
							batchStart = i + 1;
						}
					}
				}
				return response.results;
			}
		}
		return [];
	};

	const toCsv = (data: AnalysisReport) => {
		const allPlugins = {
			...configPluginsKeys,
			...sbomPluginsKeys,
			...secretPluginsKeys,
			...staticPluginsKeys,
			...techPluginsKeys,
			...vulnPluginsKeys,
		};

		const plugins = data.scan_options.plugins
			? data.scan_options.plugins
					.map((p) => {
						const disabled = p.startsWith("-");
						const name = p.replace(/^-/, "");
						const displayName =
							name in allPlugins ? allPlugins[name].displayName : name;
						return disabled ? `${displayName} (not run)` : displayName;
					})
					.sort()
			: undefined;

		const categories = data.scan_options.categories
			? data.scan_options.categories
					.map((c) => {
						const disabled = c.startsWith("-");
						const name = c.replace(/^-/, "");
						const displayName =
							name in pluginCatalog ? pluginCatalog[name].displayName : name;
						return disabled ? `${displayName} (not run)` : displayName;
					})
					.sort()
			: undefined;

		let pluginName = data.status_detail.plugin_name;
		if (pluginName && pluginName in allPlugins) {
			pluginName = allPlugins[pluginName].displayName;
		}

		return {
			scan_id: data.scan_id,
			repo: data.repo,
			service: data.service,
			branch: data.branch,
			"timestamps.queued": data.timestamps.queued,
			"timestamps.start": data.timestamps.start,
			"timestamps.end": data.timestamps.end,
			initiated_by: data.initiated_by
				? data.initiated_by.replace(DELETED_REGEX, " (Deleted)")
				: null,
			status: data.status,
			"status_detail.current_plugin": data.status_detail.current_plugin,
			"status_detail.plugin_name": pluginName,
			"status_detail.plugin_start_time": data.status_detail.plugin_start_time,
			"status_detail.total_plugins": data.status_detail.total_plugins,
			"scan_options.categories": categories,
			"scan_options.plugins": plugins,
			"scan_options.depth": data.scan_options.depth,
			"scan_options.include_dev": data.scan_options.include_dev,
			"scan_options.callback.client_id": data.scan_options.callback?.client_id,
			"scan_options.callback.url": data.scan_options.callback?.url,
			"scan_options.batch_priority": data.scan_options.batch_priority,
			"scan_options.include_paths": data.scan_options.include_paths,
			"scan_options.exclude_paths": data.scan_options.exclude_paths,
			qualified: data.qualified,
			batch_id: data.batch_id,
			batch_description: data.batch_description,
			engine_id: data.engine_id,
			...exportMetaData(data.application_metadata ?? null),
			success: data.success,
			truncated: data.truncated,
			errors: data.errors,
			alerts: data.alerts,
			debug: data.debug,
			"results_summary.vulnerabilities.critical":
				data.results_summary?.vulnerabilities?.critical,
			"results_summary.vulnerabilities.high":
				data.results_summary?.vulnerabilities?.high,
			"results_summary.vulnerabilities.medium":
				data.results_summary?.vulnerabilities?.medium,
			"results_summary.vulnerabilities.low":
				data.results_summary?.vulnerabilities?.low,
			"results_summary.vulnerabilities.negligible":
				data.results_summary?.vulnerabilities?.negligible,
			"results_summary.vulnerabilities.not_specified": data.results_summary
				?.vulnerabilities
				? data.results_summary.vulnerabilities[""]
				: null,
			"results_summary.secrets": data.results_summary?.secrets,
			"results_summary.static_analysis.critical":
				data.results_summary?.static_analysis?.critical,
			"results_summary.static_analysis.high":
				data.results_summary?.static_analysis?.high,
			"results_summary.static_analysis.medium":
				data.results_summary?.static_analysis?.medium,
			"results_summary.static_analysis.low":
				data.results_summary?.static_analysis?.low,
			"results_summary.static_analysis.negligible":
				data.results_summary?.static_analysis?.negligible,
			"results_summary.static_analysis.not_specified": data.results_summary
				?.static_analysis
				? data.results_summary.static_analysis[""]
				: null,
			"results_summary.inventory.technology_discovery":
				data.results_summary?.inventory?.technology_discovery,
			"results_summary.inventory.base_images":
				data.results_summary?.inventory?.base_images,
			"results_summary.configuration.critical":
				data.results_summary?.configuration?.critical,
			"results_summary.configuration.high":
				data.results_summary?.configuration?.high,
			"results_summary.configuration.medium":
				data.results_summary?.configuration?.medium,
			"results_summary.configuration.low":
				data.results_summary?.configuration?.low,
			"results_summary.configuration.negligible":
				data.results_summary?.configuration?.negligible,
			"results_summary.configuration.not_specified": data.results_summary
				?.configuration
				? data.results_summary.configuration[""]
				: null,
		};
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

	const onPluginAccordionExpanded = (name: string) => {
		// if same name received as is currently expanded then clear the currently expanded accordion
		setPluginAccordionExpanded(pluginAccordionExpanded === name ? "" : name);
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
				Boolean(Number(localStorage.getItem(STORAGE_LOCAL_WELCOME))),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// because startScan updates url with SPA routing, app will not reload & parse updated query params
	// instead, monitor search location for changes to ensure submitContext and validatedData.submitContext are current
	// (submitContext controls state of scan activity table, i.e. whether showing a single running scan progress or viewing a list of scans)
	useEffect(() => {
		if (location.search) {
			const search = queryString.parse(location.search);
			if (
				"submitContext" in search &&
				search["submitContext"] !== submitContext &&
				(search["submitContext"] === "scan" ||
					search["submitContext"] === "view")
			) {
				setSubmitContext(search["submitContext"] as SubmitContext);
				setValidatedData((prevState) => {
					return {
						...prevState,
						submitContext: search["submitContext"],
					} as ScanOptionsForm;
				});
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.search]);

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
				onOk={onCloseWelcome}
				title={i18n._(t`Welcome to Artemis`)}
			>
				<WelcomeDialogContent />
			</WelcomeDialog>
			<Container>
				<Formik
					initialValues={initialValues}
					enableReinitialize={true}
					validationSchema={scanOptionsFormSchema(currentUser)}
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
												t`Select Version Control System or type to autocomplete`,
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
											InputProps={{
												startAdornment: (
													<InputAdornment position="start">
														<FolderIcon />
													</InputAdornment>
												),
											}}
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
														InputProps={{
															startAdornment: (
																<InputAdornment position="start">
																	<AccountTreeIcon />
																</InputAdornment>
															),
														}}
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

														{touched["secrets"] && !!errors["secrets"] && (
															<FormHelperText>
																{errors["secrets"]}
															</FormHelperText>
														)}

														<Grid container>
															<Grid size={4}>
																<PluginsSelector
																	name="vulnerability"
																	group="vulnPlugins"
																	plugins={vulnPluginsObjects}
																	label={i18n._(GROUP_VULN)}
																	icon={
																		<SecurityIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	}
																	disabled={usersStatus === "loading"}
																	expanded={
																		pluginAccordionExpanded === "vulnerability"
																	}
																	onExpandedChange={onPluginAccordionExpanded}
																/>
															</Grid>
															<Grid size={4}>
																<PluginsSelector
																	name="staticAnalysis"
																	group="staticPlugins"
																	plugins={staticPluginsObjects}
																	label={i18n._(GROUP_ANALYSIS)}
																	icon={
																		<BugReportIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	}
																	disabled={usersStatus === "loading"}
																	expanded={
																		pluginAccordionExpanded === "staticAnalysis"
																	}
																	onExpandedChange={onPluginAccordionExpanded}
																/>
															</Grid>
															<Grid size={4}>
																<PluginsSelector
																	name="secrets"
																	group="secretPlugins"
																	plugins={secretPluginsObjects}
																	label={i18n._(GROUP_SECRETS)}
																	icon={
																		<VpnKeyIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	}
																	disabled={usersStatus === "loading"}
																	expanded={
																		pluginAccordionExpanded === "secrets"
																	}
																	onExpandedChange={onPluginAccordionExpanded}
																/>
															</Grid>
															<Grid size={4}>
																<PluginsSelector
																	name="configuration"
																	group="configPlugins"
																	plugins={configPluginsObjects}
																	label={i18n._(GROUP_CONFIG)}
																	icon={
																		<FactCheckIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	}
																	disabled={usersStatus === "loading"}
																	expanded={
																		pluginAccordionExpanded === "configuration"
																	}
																	onExpandedChange={onPluginAccordionExpanded}
																/>
															</Grid>
															<Grid size={4}>
																<PluginsSelector
																	name="inventory"
																	group="techPlugins"
																	plugins={techPluginsObjects}
																	label={i18n._(GROUP_INVENTORY)}
																	icon={
																		<LayersIcon
																			className={classes.scanFeaturesIcon}
																		/>
																	}
																	disabled={usersStatus === "loading"}
																	expanded={
																		pluginAccordionExpanded === "inventory"
																	}
																	onExpandedChange={onPluginAccordionExpanded}
																/>
															</Grid>
															{sbomPluginsObjects.length > 0 && (
																<Grid size={4}>
																	<PluginsSelector
																		name="sbom"
																		group="sbomPlugins"
																		plugins={sbomPluginsObjects}
																		label={i18n._(GROUP_SBOM)}
																		icon={
																			<InventoryIcon
																				className={classes.scanFeaturesIcon}
																			/>
																		}
																		disabled={usersStatus === "loading"}
																		expanded={
																			pluginAccordionExpanded === "sbom"
																		}
																		onExpandedChange={onPluginAccordionExpanded}
																	/>
																</Grid>
															)}
														</Grid>
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
														placeholder={String(SCAN_DEPTH)}
														style={{
															width: 300,
														}}
														variant="outlined"
														disabled={usersStatus === "loading"}
														InputProps={{
															startAdornment: (
																<InputAdornment position="start">
																	<HistoryIcon />
																</InputAdornment>
															),
														}}
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
												<Box marginTop={2} marginBottom={2}>
													<Field
														id="includePaths"
														component={TextField}
														type="text"
														label={i18n._(t`Include Paths (optional)`)}
														name="includePaths"
														disabled={usersStatus === "loading"}
														multiline={true}
														placeholder={i18n._(
															t`One or more file or directory paths separated by a comma or newline. Supports glob patterns (*, **, etc.)`,
														)}
														variant="outlined"
														fullWidth
														helperText={
															touched["includePaths"] &&
															!!errors["includePaths"]
																? errors["includePaths"]
																: i18n._(
																		t`Include these files or directories in the scan. Defined alone, limits the scan to only these paths`,
																	)
														}
														InputProps={{
															startAdornment: (
																<InputAdornment position="start">
																	<CreateNewFolderIcon />
																</InputAdornment>
															),
														}}
													/>
												</Box>
												<Box marginTop={2}>
													<Field
														id="excludePaths"
														component={TextField}
														type="text"
														label={i18n._(t`Exclude Paths (optional)`)}
														name="excludePaths"
														disabled={usersStatus === "loading"}
														multiline={true}
														placeholder={i18n._(
															t`One or more file or directory paths separated by a comma or newline. Supports glob patterns (*, **, etc.)`,
														)}
														variant="outlined"
														fullWidth
														helperText={
															touched["excludePaths"] &&
															!!errors["excludePaths"]
																? errors["excludePaths"]
																: i18n._(
																		t`Exclude these files or directories from the scan`,
																	)
														}
														InputProps={{
															startAdornment: (
																<InputAdornment position="start">
																	<FolderOffIcon />
																</InputAdornment>
															),
														}}
													/>
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
						exportFetch={exportFetch}
						data={validatedData}
						toCsv={toCsv}
					/>
				</Paper>
			</Container>
		</>
	);
};

export interface PSProps {
	label: string;
	group: string;
	name: string;
	plugins: ScanPlugin[];
	icon: React.ReactNode;
	disabled?: boolean;
	className?: string;
	// for controlled component, such as if you have multiple PluginsSelector components on a page
	// and want expanding one to close the others
	onExpandedChange?: (name: string) => void;
	expanded?: boolean;
}

export const PluginsSelector = ({
	label,
	group,
	name,
	plugins,
	icon,
	disabled = false,
	className,
	onExpandedChange,
	expanded,
}: PSProps) => {
	const [accordionExpanded, setAccordionExpanded] = useState(false);
	const { classes } = useStyles();
	const { i18n } = useLingui();
	const { values, setFieldValue } = useFormikContext<any>();
	const theme = useTheme();
	const pluginNames = plugins.map((p: ScanPlugin) => p.apiName);
	const isExpanded = expanded ?? accordionExpanded;

	const handleAccordionChange = (id: string) => {
		if (onExpandedChange) {
			onExpandedChange(id);
		} else {
			setAccordionExpanded(Boolean(id));
		}
	};

	const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.stopPropagation();
		setFieldValue(name, event.target.checked);
		setFieldValue(group, event.target.checked ? [...pluginNames] : []);
	};

	const handlePluginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.stopPropagation();
		const currentPlugins = values[group] ? [...values[group]] : [];
		if (event.target.checked) {
			currentPlugins.push(event.target.value);
		} else {
			const index = currentPlugins.indexOf(event.target.value);
			if (index > -1) {
				currentPlugins.splice(index, 1);
			}
		}
		setFieldValue(group, currentPlugins);

		if (currentPlugins.length === 0) {
			setFieldValue(name, false);
		} else if (currentPlugins.length === pluginNames.length) {
			setFieldValue(name, true);
		}
	};

	const handleClickAway = () => {
		if (isExpanded) {
			handleAccordionChange(onExpandedChange ? name : "");
		}
	};

	return (
		<div className={className}>
			<ClickAwayListener onClickAway={handleClickAway}>
				<Accordion
					expanded={isExpanded}
					onChange={(_event, expanded) =>
						handleAccordionChange(expanded ? name : "")
					}
					disableGutters
					variant="outlined"
					sx={{
						"&.MuiAccordion-root:focus-within": {
							borderTop: `1px solid ${theme.palette.primary.main}`,
							borderLeft: `1px solid ${theme.palette.primary.main}`,
							borderRight: `1px solid ${theme.palette.primary.main}`,
							borderBottom: `1px solid ${
								isExpanded ? theme.palette.divider : theme.palette.primary.main
							}`,
						},
					}}
				>
					<AccordionSummary
						expandIcon={<ExpandMoreIcon />}
						aria-label={
							isExpanded
								? i18n._(t`Hide ${label} plugins`)
								: i18n._(t`Show ${label} plugins`)
						}
						aria-controls={`scan-features-${name}-content`}
						id={`scan-features-${name}-header`}
						className={classes.pluginsSelectorAccordionSummary}
					>
						<Typography component="div" className={classes.heading}>
							<>
								<FormControlLabel
									className={className}
									control={
										<>
											<Field
												id={name}
												component={Checkbox}
												type="checkbox"
												name={name}
												disabled={disabled}
												indeterminate={isCategoryIndeterminate(
													Array(values[group]) ? values[group].length : 0,
													pluginNames.length,
												)}
												onChange={handleCategoryChange}
											/>
											{icon}
										</>
									}
									label={label}
									onFocus={(event) => event.stopPropagation()}
									onClick={(event) => event.stopPropagation()}
								/>
								<Box style={{ paddingLeft: "35px" }}>
									<Typography
										variant="caption"
										className={classes.categoryHelpText}
									>
										{getCategoryHelpText(
											Array(values[group]) ? values[group].length : 0,
											pluginNames.length,
										)}
									</Typography>
								</Box>
							</>
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
												name={group}
												value={plugin.apiName}
												disabled={disabled}
												onChange={handlePluginChange}
											/>
										}
										label={i18n._(plugin.displayName)}
									/>
								</Box>
							);
						})}
					</AccordionDetails>
				</Accordion>
			</ClickAwayListener>
		</div>
	);
};

export default MainPage;
