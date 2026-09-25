import { defineConfig, globalIgnores } from "eslint/config";

import eslintReact from "@eslint-react/eslint-plugin";
import { importX } from "eslint-plugin-import-x";
import jest from "eslint-plugin-jest";
import jsxA11Y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default defineConfig([
	globalIgnores(["src/locale/_build/", "src/locale/**/*.*js"]),

	...typescriptEslint.configs["flat/recommended"],
	eslintReact.configs["recommended-typescript"],
	jsxA11Y.configs.recommended,
	{
		plugins: {
			import: importX,
			reactHooks: reactHooks,
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"jsx-a11y-x/no-autofocus": "off",
		},
	},

	{
		files: ["**/__tests__/*.test.tsx"],
		plugins: { jest },
		languageOptions: {
			globals: jest.environments.globals.globals,
		},
		rules: {
			...jest.configs.recommended.rules,
			...jest.configs.style.rules,
			"jest/no-conditional-expect": "off",
			"jest/no-disabled-tests": "off",
			"jest/expect-expect": [
				"warn",
				{
					assertFunctionNames: ["expect", "within"],
				},
			],
		},
	},
]);
