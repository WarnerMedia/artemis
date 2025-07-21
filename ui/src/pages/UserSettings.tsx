import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import ApiKeys from "components/ApiKeys";
import {
	ArrowBackIos as ArrowBackIosIcon,
	Category as CategoryIcon,
	Cloud as CloudIcon,
	ContactMail as ContactMailIcon,
	FolderShared as FolderSharedIcon,
	GitHub as GitHubIcon,
	Link as LinkIcon,
	LinkOff as LinkOffIcon,
	Message as MessageIcon,
	Palette as PaletteIcon,
	RadioButtonChecked as RadioButtonCheckedIcon,
	RadioButtonUnchecked as RadioButtonUncheckedIcon,
	SupervisorAccount as SupervisorAccountIcon,
	WatchLater as WatchLaterIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Grid2 as Grid,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Switch as MuiSwitch,
	Paper,
	Skeleton,
	Theme,
	Tooltip,
	Typography,
} from "@mui/material";
import queryString from "query-string";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { makeStyles, withStyles } from "tss-react/mui";
import * as Yup from "yup";

import { IThemeColors, themeColors } from "app/colors";
import { APP_SERVICE_GITHUB_URL, STORAGE_LOCAL_WELCOME } from "app/globals";
import { RootState } from "app/rootReducer";
import { pluginsDisabled } from "app/scanPlugins";
import { AppDispatch } from "app/store";
import MailToLink from "components/MailToLink";
import { Key } from "features/keys/keysSchemas";
import { getUserKeys } from "features/keys/keysSlice";
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
import { capitalize, formatDate } from "utils/formatters";

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
		(state: RootState) => state.vcsServices.linking,
	);
	const isUnlinking = useSelector(
		(state: RootState) => state.vcsServices.unlinking,
	);
	const serviceGithub = useSelector((state: RootState) =>
		selectServiceById(state, "github"),
	);
	const vcsServicesStatus = useSelector(
		(state: RootState) => state.vcsServices.status,
	);
	const [service, setService] = useState<"github" | "">("");

	const handleClose = () => {
		setService("");
	};

	const onConfirmUnlink = () => {
		dispatch(
			unlinkVcsService({
				url: `/users/self/services/${service}`,
			}),
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
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self"),
	);
	const currentUserStatus = useSelector(
		(state: RootState) => state.currentUser.status,
	);
	const colors = useSelector(selectTheme);

	const [newScopeValue] = useState("");
	const [scrollTarget] = useState<HTMLElement | undefined>(undefined);
	const [hideWelcome, setHideWelcome] = useState(false);
	const [fromRedirect, setFromRedirect] = useState(false);

	const pageQueryParamsSchema = Yup.object().shape({
		code: Yup.string()
			.trim()
			.matches(githubAuthRegex, i18n._(t`Invalid authorization code`)),
	});

	useEffect(() => {
		setHideWelcome(
			Boolean(Number(localStorage.getItem(STORAGE_LOCAL_WELCOME))),
		);
	}, []);

	useEffect(() => {
		document.title = i18n._(t`Artemis - User Settings`);
	}, [i18n]);

	useEffect(() => {
		dispatch(getUserKeys({}));
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
						i18n._(t`Unable to link service account: ${err.errors.join(", ")}`),
					),
				);
			} else if ("message" in err) {
				dispatch(
					addNotification(
						i18n._(t`Unable to link service account: ${err.message}`),
					),
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
				}),
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
				/>,
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
					<Grid xs={6}>
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
										disableTypography={true}
										primary={i18n._(
											t`Scope  (${
												currentUser?.scope ? currentUser.scope.length : 0
											})`,
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
													hideWelcome ? "0" : "1",
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
					<Grid size={6}>
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
											})`,
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

	return (
		<Container>
			<Box displayPrint="none">
				<BackButton fromRedirect={fromRedirect} />
			</Box>

			{userInfo()}
			<ApiKeys title={i18n._(t`API Keys`)} />
		</Container>
	);
}
