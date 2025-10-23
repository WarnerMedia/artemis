// testing utility library for wrapping react-testing-library
// in order to create a custom renderer that injects all necessary providers
// eliminates boilerplate in individual tests
//
// see:
// https://testing-library.com/docs/react-testing-library/setup
//
// note: providers should match the providers we include in App.tsx

import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Provider } from "react-redux";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { messages as enMessages } from "locale/en/messages";
import { MemoryRouter } from "react-router-dom";
import store from "app/store";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterLuxon as DateAdapter } from "@mui/x-date-pickers/AdapterLuxon";

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

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
	const locale = "en";
	i18n.load(locale, enMessages);
	i18n.activate(locale);

	return (
		<Provider store={store}>
			<I18nProvider i18n={i18n}>
				<ThemeProvider theme={theme}>
					<LocalizationProvider dateAdapter={DateAdapter}>
						<MemoryRouter
							future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
							initialEntries={["/"]}
						>
							{children}
						</MemoryRouter>
					</LocalizationProvider>
				</ThemeProvider>
			</I18nProvider>
		</Provider>
	);
};

const customRender = (
	ui: React.ReactElement,
	options?: any,
	userEventOptions?: any,
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
