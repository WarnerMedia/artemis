/* istanbul ignore file */
// ^ ignoring for coverage since we are individually testing each component
// via react-testing-library
// and this file is primarily app bootstrap, dev-only config,
// and unregistering the serviceWorker
import React from "react";
import { createRoot } from "react-dom/client";
import * as serviceWorker from "serviceWorker";
import { makeServer } from "api/server";

// only include the MirageJS test REST API server in Dev mode
// tests will create a custom server themselves
if (process.env.NODE_ENV === "development") {
	console.log("Starting MirageJS server...");
	makeServer();
}

function render() {
	const App = require("App").default;

	const container = document.getElementById("root");
	const root = createRoot(container!);
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}
render();

// enable Webpack Hot Module Replacement (HMR)
// allows app changes to be applied to running app on editor save without full reload
// also maintains redux store state in most cases
if (process.env.NODE_ENV === "development" && module.hot) {
	module.hot.accept("App", render);
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
