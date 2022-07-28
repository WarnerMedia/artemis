import AppGlobals, { APP_VERSION } from "app/globals";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
	Navigate,
	BrowserRouter as Router,
	Routes,
	Route,
} from "react-router-dom";
import "typeface-roboto";

import store, { AppDispatch } from "app/store";
import { Provider } from "react-redux";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { en } from "make-plural/plurals";
import { messages as enMessages } from "locale/en/messages";

// apply material-ui cross-browser style normalizaion
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { makeStyles } from "tss-react/mui";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Container, Skeleton } from "@mui/material";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterLuxon as DateAdapter } from "@mui/x-date-pickers/AdapterLuxon";

import NavBar from "app/NavBar";
import { RootState } from "app/rootReducer";
import GlobalException from "features/globalException/GlobalException";
import Notifications from "features/notifications/Notifications";
import { getSystemStatus } from "features/systemStatus/systemStatusSlice";
import { getTheme, selectTheme } from "features/theme/themeSlice";
import {
	getCurrentUser,
	selectCurrentUser,
} from "features/users/currentUserSlice";
import { useSelector } from "react-redux";

// footer appears on all pages, so load it statically
import Footer from "custom/Footer";

// load each SPA route dynamically only if user acceses page
// enables code-splitting to reduce bundle size and page load times
const MainPage = React.lazy(() => import("pages/MainPage"));
const ResultsPage = React.lazy(() => import("pages/ResultsPage"));
const SearchPage = React.lazy(() => import("pages/SearchPage"));
const UsersPage = React.lazy(() => import("pages/UsersPage"));
const UserSettings = React.lazy(() => import("pages/UserSettings"));

export const muiCache = createCache({
	key: "mui",
	prepend: true,
});

// browser language preference
// currently used for displaying times in locale-specific format
export const browserLanguage = navigator.language || "en-US";

// language hard-coded for now, can come from user profile in the future
const locale = "en";
// locales must be loaded AND loaded before load() to prevent the exception: "plurals is not a function"
// see:
// https://github.com/lingui/js-lingui/issues/683#issuecomment-620424893
i18n.loadLocaleData(locale, { plurals: en });
// @ts-ignore
i18n.load(locale, enMessages);
i18n.activate(locale);

const useStyles = makeStyles()((theme) => ({
	footer: {
		minHeight: "2%",
		position: "relative",
		textAlign: "center",
		bottom: "0",
	},
	main: {
		minHeight: "92%",
	},
	navbar: {
		minHeight: "5%",
	},
	formPaper: {
		marginBottom: theme.spacing(3),
	},
}));

// SPA routing note:
// because static app is deployed to S3 and is using SPA routing
// for ANY route outside / we need to create a "placeholder" file for this in S3
// e.g.
// to allow SPA routing to "results" page we need to:
// - copy the index.html file from a npm build to "results" file
// - set the "Content-Type" on "results" file to "text/html" in S3
// refer to deploy.sh
export const AppRoutes = () => {
	const { classes } = useStyles();
	const dispatch: AppDispatch = useDispatch();
	const currentUser = useSelector((state: RootState) =>
		selectCurrentUser(state, "self")
	);

	// load current user in app and not in NavBar since it's global throughout the app
	// done here in AppRoutes() instead of in App() since this needs to be wrapped in the redux provider
	useEffect(() => {
		let isMounted = true;
		let interval: NodeJS.Timeout | null = setInterval(() => {
			if (isMounted) {
				dispatch(getSystemStatus());
			}
		}, AppGlobals.APP_MAINT_CHECK_INTERVAL);

		// load current user
		dispatch(getSystemStatus());
		dispatch(getCurrentUser());

		return () => {
			isMounted = false;
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
			<CssBaseline />
			<div className="App">
				<NavBar className={classes.navbar} />
				<GlobalException />
				<Notifications />
				<main className={classes.main}>
					<React.Suspense
						fallback={
							<Container>
								<Skeleton
									variant="rectangular"
									height={400}
									className={classes.formPaper}
								/>
								<Skeleton variant="rectangular" height={400} />
							</Container>
						}
					>
						<Routes>
							<Route path="/" element={<MainPage />} />
							<Route path="/results" element={<ResultsPage />} />
							{currentUser?.admin && (
								<Route path="/users" element={<UsersPage />} />
							)}
							<Route path="/settings" element={<UserSettings />} />
							<Route path="/search" element={<SearchPage />} />
							<Route path="*" element={<Navigate to="/" />} />
						</Routes>
					</React.Suspense>
				</main>
				<Footer
					className={classes.footer}
					year={new Date().getFullYear()}
					version={APP_VERSION}
				/>
			</div>
		</>
	);
};

// augment MUI style ts definitions to include our custom styles (in "custom" attribute)
declare module "@mui/material/styles" {
	interface CustomTheme {
		custom?: {
			gradient?: string;
			gradientText?: string;
		};
	}

	interface Theme extends CustomTheme {}
	interface ThemeOptions extends CustomTheme {}
}

const ThemedApp = () => {
	// create a simple MUI theme
	// also sets user's light/dark mode theme preference
	// https://material-ui.com/customization/palette/
	const dispatch: AppDispatch = useDispatch();
	const colors = useSelector(selectTheme);
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
	useEffect(() => {
		dispatch(getTheme());

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	let theme = React.useMemo(
		() =>
			createTheme(
				{
					palette: {
						mode: prefersDarkMode ? "dark" : "light",
						primary: {
							main: colors.main,
							dark: colors.dark,
							light: colors.light,
						},
					},
					components: {
						MuiCheckbox: {
							defaultProps: {
								color: "primary", // default is secondary
							},
						},
						MuiLinearProgress: {
							styleOverrides: {
								barColorPrimary: colors.gradient,
							},
						},
					},
				},
				{
					// merge custom styles outside MUI
					custom: {
						gradient: colors.gradient,
						gradientText: colors.gradientText,
					},
				}
			),
		[prefersDarkMode, colors]
	);

	theme = React.useMemo(
		() =>
			createTheme(theme, {
				breakpoints: {
					values: {
						...theme.breakpoints.values,
						lg: 1280, // lg breakpoint was 1280 in MUIv4 and is 1200 in MUIv5, reset back to 1280 so items in Container don't start wrapping
					},
				},
			}),
		[theme]
	);

	// TODO i18n: Date/Time pickers have changed the way they handle i18n
	// instead of overriding indivudal strings like okText, cancelText, etc. you now wrap the component in a <LocalizationProvider> with an "adapterLocale" set
	// this is more complete, since it also translates items like calendar month names
	// see:  https://mui.com/x/react-date-pickers/date-picker/#localization

	return (
		<ThemeProvider theme={theme}>
			<LocalizationProvider dateAdapter={DateAdapter}>
				<Router>
					<AppRoutes />
				</Router>
			</LocalizationProvider>
		</ThemeProvider>
	);
};

export function App() {
	return (
		<Provider store={store}>
			<I18nProvider i18n={i18n}>
				<CacheProvider value={muiCache}>
					<ThemedApp />
				</CacheProvider>
			</I18nProvider>
		</Provider>
	);
}

export default App;
