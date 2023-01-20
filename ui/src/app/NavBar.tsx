import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
	Alert,
	AppBar,
	Box,
	CircularProgress,
	Hidden,
	IconButton,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Toolbar,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	AccountCircle as AccountCircleIcon,
	Help as DocsLinkIcon,
	Menu as MenuIcon,
	MenuOpen as MenuOpenIcon,
	Person as PersonIcon,
	Policy as PolicyIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import { makeStyles } from "tss-react/mui";
import { createTheme, ThemeProvider, Theme } from "@mui/material/styles";
import { useLingui } from "@lingui/react";
import { Trans, t } from "@lingui/macro";

import { RootState } from "app/rootReducer";
import { selectCurrentUser } from "features/users/currentUserSlice";
import { selectSystemStatus } from "features/systemStatus/systemStatusSlice";
import { formatDate } from "utils/formatters";
import React from "react";
import { selectTheme } from "features/theme/themeSlice";
import { APP_CUSTOM_LOGO, APP_DOC_URL_USAGE } from "app/globals";
import Logo from "custom/Logo";

const useStyles = makeStyles()((theme) => ({
	accountProgress: {
		color: theme.custom?.gradientText,
		position: "absolute",
		right: "11px",
		top: "11px",
		zIndex: 1,
	},
	logo: {
		width: "50px",
		height: "50px",
		marginLeft: "5px",
		marginRight: "20px",
	},
	logoSvg: {
		marginRight: "20px",
	},
	root: {
		marginBottom: theme.spacing(3),
	},
}));

interface INavBar {
	className?: string;
}

const NavBar = (props: INavBar) => {
	const navigate = useNavigate();
	const { classes, cx } = useStyles();
	const { i18n } = useLingui();
	const colors = useSelector(selectTheme);
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	); // current user is "self" id
	const userStatus = useSelector(
		(state: RootState) => state.currentUser.status
	);
	const systemStatus = useSelector(selectSystemStatus);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const menuOpen = Boolean(anchorEl);
	const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleMenuClose = (url: string) => {
		setAnchorEl(null);
		navigate(url);
	};

	const windowOpenDocLink = () => {
		window.open(APP_DOC_URL_USAGE, "Artemis basic usage", "noreferrer");
	};

	return (
		<div className={cx(classes.root, props.className)}>
			{/* use white gradientText on dark gradient background and dark gradientText on light gradient background */}
			<ThemeProvider
				theme={(theme: Theme) =>
					createTheme({
						...theme,
						components: {
							...theme.components,
							MuiAppBar: {
								styleOverrides: {
									root: {
										background: colors.gradient,
										color: colors.gradientText,
									},
								},
							},
							MuiIconButton: {
								styleOverrides: {
									root: {
										color: colors.gradientText,
									},
								},
							},
						},
					})
				}
			>
				<AppBar position="static" enableColorOnDark>
					<Toolbar style={{ display: "flex" }}>
						{/* There are 3 Boxes and they work together to center Box 2 regardless of the size of Box 1 & Box 3 */}
						{/* Box 1 - app logo */}
						<Box display="flex">
							{APP_CUSTOM_LOGO ? (
								<Logo className={classes.logo} />
							) : (
								<PolicyIcon fontSize="large" className={classes.logoSvg} />
							)}
						</Box>
						{/* Box 2 - app title, will take up remaining flexbox space */}
						<Box
							display="flex"
							flex="1"
							onClick={() => {
								navigate("/");
							}}
						>
							<div style={{ cursor: "pointer" }}>
								<span>
									<Typography
										component="h1"
										variant="h5"
										style={{ letterSpacing: "1rem" }}
									>
										<Trans>ARTEMIS</Trans>
									</Typography>
									<Typography variant="subtitle2">
										<Trans>[Hunt for security issues in source code]</Trans>
									</Typography>
								</span>
							</div>
						</Box>
						{/* Box 3 - mega-nav icons */}
						<Box display="flex" justifyContent="right">
							<span style={{ marginLeft: "auto" }}>
								<Box displayPrint="none">
									{userStatus !== "loading" && currentUser?.admin && (
										<>
											<IconButton
												id="settings-menu-button"
												aria-label={
													menuOpen
														? i18n._(t`Close Settings Menu`)
														: i18n._(t`Open Settings Menu`)
												}
												aria-controls="settings-menu"
												aria-haspopup="true"
												aria-expanded={menuOpen ? "true" : undefined}
												onClick={handleMenuClick}
											>
												{menuOpen ? (
													<MenuOpenIcon fontSize="large" />
												) : (
													<MenuIcon fontSize="large" />
												)}
											</IconButton>
											<Menu
												id="settings-menu"
												anchorEl={anchorEl}
												transformOrigin={{
													horizontal: "center",
													vertical: "top",
												}}
												open={menuOpen}
												onClose={handleMenuClose}
												MenuListProps={{
													"aria-labelledby": "settings-menu-button",
												}}
											>
												<MenuItem onClick={() => handleMenuClose("/users")}>
													<ListItemIcon>
														<PersonIcon fontSize="small" />
													</ListItemIcon>
													<ListItemText>
														<Trans>Manage Users</Trans>
													</ListItemText>
												</MenuItem>
											</Menu>
										</>
									)}
									<Tooltip
										title={i18n._(
											t`Search for Components, Licenses, and Repositories`
										)}
									>
										<span>
											<IconButton
												aria-label={i18n._(
													t`Search for Components, Licenses, and Repositories`
												)}
												component={Link}
												to="/search"
												size="large"
											>
												<SearchIcon fontSize="large" />
											</IconButton>
										</span>
									</Tooltip>
									{APP_DOC_URL_USAGE && (
										<Tooltip title={i18n._(t`Open documentation`)}>
											<IconButton
												onClick={windowOpenDocLink}
												aria-label={i18n._(t`Open documentation`)}
												size="large"
											>
												<DocsLinkIcon fontSize="large" />
											</IconButton>
										</Tooltip>
									)}
									<Tooltip title={i18n._(t`Manage User Settings`)}>
										<span>
											<IconButton
												aria-label={i18n._(t`Manage User Settings`)}
												disabled={userStatus === "loading"}
												aria-busy={userStatus === "loading"}
												component={Link}
												to="/settings"
												size="large"
											>
												<AccountCircleIcon fontSize="large" />
												{userStatus === "loading" && (
													<CircularProgress
														size={38}
														className={classes.accountProgress}
													/>
												)}
											</IconButton>
										</span>
									</Tooltip>
								</Box>
							</span>
						</Box>
					</Toolbar>
				</AppBar>
			</ThemeProvider>
			{systemStatus.maintenance.message && (
				<Alert severity="warning" variant="filled">
					{systemStatus.maintenance.message}
				</Alert>
			)}
			<Hidden mdDown>
				<Box
					displayPrint="none"
					style={{ position: "absolute", right: "1rem" }}
				>
					{currentUser?.last_login && (
						<Typography variant="caption">
							<Trans>
								Last Login: {formatDate(currentUser.last_login, "long")}
							</Trans>
						</Typography>
					)}
				</Box>
			</Hidden>
		</div>
	);
};
export default NavBar;
