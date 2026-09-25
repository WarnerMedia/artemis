const { formatter } = require("@lingui/format-po");

/** @type {import("@lingui/conf").LinguiConfig} */
module.exports = {
	catalogs: [
		{
			path: "src/locale/{locale}/messages",
			include: ["src/"],
			exclude: ["**/node_modules/**"],
		},
	],
	locales: ["en"],
	format: formatter(),
	sourceLocale: "en",
	compileNamespace: "cjs",
	orderBy: "messageId",
	runtimeConfigModule: ["locale/i18n", "i18n"],
};
