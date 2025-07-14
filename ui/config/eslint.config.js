// eslint.config.mjs
import pluginJs from "@eslint/js";
const reactPlugin = require("eslint-plugin-react");

const hasJsxRuntime = (() => {
	if (process.env.DISABLE_NEW_JSX_TRANSFORM === "true") {
		return false;
	}

	try {
		require.resolve("react/jsx-runtime");
		return true;
	} catch (e) {
		return false;
	}
})();

export default [
	pluginJs.configs.recommended,
	...reactPlugin.configs.recommended,
	{
		rules: {
			...(!hasJsxRuntime && {
				"react/react-in-jsx-scope": "error",
			}),
		},
	},
];
