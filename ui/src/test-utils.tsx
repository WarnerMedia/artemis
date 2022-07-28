// testing utility library for wrapping react-testing-library
// in order to create a custom renderer that injects all necessary providers
// eliminates boilerplate in individual tests
//
// see:
// https://testing-library.com/docs/react-testing-library/setup
//
// note: providers should match the providers we include in App.tsx

import React, { useLayoutEffect, useState } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createMemoryHistory } from "history";
import { Provider } from "react-redux";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { en } from "make-plural/plurals";
import { messages as enMessages } from "locale/en/messages";
import { Router } from "react-router-dom";
import store from "app/store";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterLuxon as DateAdapter } from "@mui/x-date-pickers/AdapterLuxon";

export const muiCache = createCache({
	key: "mui",
	prepend: true,
});

const theme = createTheme({});

class ResizeObserver {
	// do nothing, just bare function mocks for TS
	observe() {}
	unobserve() {}
	disconnect() {}
}

window.ResizeObserver = ResizeObserver;

interface AllTheProvidersProps {
	children: React.ReactNode;
}

interface CustomRouterProps {
	history: any;
	children?: React.ReactNode;
}

// see https://stackoverflow.com/a/70000286
// with some modifications to support typescript
const CustomRouter = ({ history, children }: CustomRouterProps) => {
	const [state, setState] = useState({
		action: history.action,
		location: history.location,
	});

	useLayoutEffect(() => history.listen(setState), [history]);

	return (
		<Router
			location={state.location}
			navigationType={state.action}
			navigator={history}
		>
			{children}
		</Router>
	);
};

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
	const history = createMemoryHistory();
	const locale = "en";
	i18n.loadLocaleData(locale, { plurals: en });
	// @ts-ignore
	i18n.load(locale, enMessages);
	i18n.activate(locale);

	return (
		<Provider store={store}>
			<I18nProvider i18n={i18n}>
				<CacheProvider value={muiCache}>
					<ThemeProvider theme={theme}>
						<LocalizationProvider dateAdapter={DateAdapter}>
							<CustomRouter history={history}>{children}</CustomRouter>
						</LocalizationProvider>
					</ThemeProvider>
				</CacheProvider>
			</I18nProvider>
		</Provider>
	);
};

const customRender = (
	ui: React.ReactElement,
	options?: any,
	userEventOptions?: any
) => {
	return {
		user: userEvent.setup({ ...userEventOptions }),
		...render(ui, { wrapper: AllTheProviders, ...options }),
	};
};

// re-export everything
export * from "@testing-library/react";

// override render method
export { customRender as render };
