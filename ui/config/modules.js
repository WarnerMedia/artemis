"use strict";

const fs = require("fs");
const paths = require("./paths");
const chalk = require("react-dev-utils/chalk");
const { parse } = require("jsonc-parser");

/**
 * Get additional module paths based on the baseUrl of a compilerOptions object.
 *
 * @param {Object} options
 */
function getAdditionalModulePaths(options = {}) {
	const pathMappings = options.paths || {};
	const hasSrcPathMapping =
		Array.isArray(pathMappings["*"]) && pathMappings["*"];

	if (
		hasSrcPathMapping &&
		pathMappings["*"].some(
			(mappedPath) => mappedPath === "./src/*" || mappedPath === "src/*",
		)
	) {
		return [paths.appSrc];
	}

	return "";
}

function getModules() {
	let config;

	// If there's a tsconfig.json we assume it's a
	// TypeScript project and set up the config
	// based on tsconfig.json
	const tsConfigText = fs.readFileSync(paths.appTsConfig, "utf8");
	const parseErrors = [];
	config = parse(tsConfigText, parseErrors);

	if (parseErrors.length > 0) {
		throw new Error(
			chalk.red.bold(
				`Unable to parse tsconfig.json. Found ${parseErrors.length} parse error(s).`,
			),
		);
	}

	config = config || {};
	const options = config.compilerOptions || {};

	const additionalModulePaths = getAdditionalModulePaths(options);

	return {
		additionalModulePaths: additionalModulePaths,
	};
}

module.exports = getModules();
