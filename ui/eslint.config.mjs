import { defineConfig, globalIgnores } from "eslint/config";

import react from "eslint-plugin-react";
import _import from "eslint-plugin-import";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

import globals from "globals";

import babelParser from "@babel/eslint-parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
	globalIgnores(["src/locale/_build/", "src/locale/**/*.*js"]),
	{
		plugins: {
			react,
			import: _import,
			"jsx-a11y": jsxA11Y,
			"react-hooks": reactHooks,
		},

		languageOptions: {
			globals: {
				...globals.browser,
				...globals.commonjs,
				...globals.jest,
				...globals.node,
			},

			parser: babelParser,
			ecmaVersion: 5,
			sourceType: "module",

			parserOptions: {
				requireConfigFile: false,

				babelOptions: {
					presets: ["react-app"],
				},
			},
		},

		settings: {
			react: {
				version: "detect",
			},
		},

		rules: {
			"array-callback-return": "warn",

			"default-case": [
				"warn",
				{
					commentPattern: "^no default$",
				},
			],

			"dot-location": ["warn", "property"],
			eqeqeq: ["warn", "smart"],
			"new-parens": "warn",
			"no-array-constructor": "warn",
			"no-caller": "warn",
			"no-cond-assign": ["warn", "except-parens"],
			"no-const-assign": "warn",
			"no-control-regex": "warn",
			"no-delete-var": "warn",
			"no-dupe-args": "warn",
			"no-dupe-class-members": "warn",
			"no-dupe-keys": "warn",
			"no-duplicate-case": "warn",
			"no-empty-character-class": "warn",
			"no-empty-pattern": "warn",
			"no-eval": "warn",
			"no-ex-assign": "warn",
			"no-extend-native": "warn",
			"no-extra-bind": "warn",
			"no-extra-label": "warn",
			"no-fallthrough": "warn",
			"no-func-assign": "warn",
			"no-implied-eval": "warn",
			"no-invalid-regexp": "warn",
			"no-iterator": "warn",
			"no-label-var": "warn",

			"no-labels": [
				"warn",
				{
					allowLoop: true,
					allowSwitch: false,
				},
			],

			"no-lone-blocks": "warn",
			"no-loop-func": "warn",

			"no-mixed-operators": [
				"warn",
				{
					groups: [
						["&", "|", "^", "~", "<<", ">>", ">>>"],
						["==", "!=", "===", "!==", ">", ">=", "<", "<="],
						["&&", "||"],
						["in", "instanceof"],
					],

					allowSamePrecedence: false,
				},
			],

			"no-multi-str": "warn",
			"no-global-assign": "warn",
			"no-unsafe-negation": "warn",
			"no-new-func": "warn",
			"no-new-object": "warn",
			"no-new-symbol": "warn",
			"no-new-wrappers": "warn",
			"no-obj-calls": "warn",
			"no-octal": "warn",
			"no-octal-escape": "warn",
			"no-redeclare": "warn",
			"no-regex-spaces": "warn",
			"no-restricted-syntax": ["warn", "WithStatement"],
			"no-script-url": "warn",
			"no-self-assign": "warn",
			"no-self-compare": "warn",
			"no-sequences": "warn",
			"no-shadow-restricted-names": "warn",
			"no-sparse-arrays": "warn",
			"no-template-curly-in-string": "warn",
			"no-this-before-super": "warn",
			"no-throw-literal": "warn",
			"no-undef": "error",

			"no-restricted-globals": [
				"error",
				"addEventListener",
				"blur",
				"close",
				"closed",
				"confirm",
				"defaultStatus",
				"defaultstatus",
				"event",
				"external",
				"find",
				"focus",
				"frameElement",
				"frames",
				"history",
				"innerHeight",
				"innerWidth",
				"length",
				"location",
				"locationbar",
				"menubar",
				"moveBy",
				"moveTo",
				"name",
				"onblur",
				"onerror",
				"onfocus",
				"onload",
				"onresize",
				"onunload",
				"open",
				"opener",
				"opera",
				"outerHeight",
				"outerWidth",
				"pageXOffset",
				"pageYOffset",
				"parent",
				"print",
				"removeEventListener",
				"resizeBy",
				"resizeTo",
				"screen",
				"screenLeft",
				"screenTop",
				"screenX",
				"screenY",
				"scroll",
				"scrollbars",
				"scrollBy",
				"scrollTo",
				"scrollX",
				"scrollY",
				"self",
				"status",
				"statusbar",
				"stop",
				"toolbar",
				"top",
			],

			"no-unreachable": "warn",

			"no-unused-expressions": [
				"error",
				{
					allowShortCircuit: true,
					allowTernary: true,
					allowTaggedTemplates: true,
				},
			],

			"no-unused-labels": "warn",

			"no-unused-vars": [
				"warn",
				{
					args: "none",
					ignoreRestSiblings: true,
				},
			],

			"no-use-before-define": [
				"warn",
				{
					functions: false,
					classes: false,
					variables: false,
				},
			],

			"no-useless-computed-key": "warn",
			"no-useless-concat": "warn",
			"no-useless-constructor": "warn",
			"no-useless-escape": "warn",

			"no-useless-rename": [
				"warn",
				{
					ignoreDestructuring: false,
					ignoreImport: false,
					ignoreExport: false,
				},
			],

			"no-with": "warn",
			"no-whitespace-before-property": "warn",
			"react-hooks/exhaustive-deps": "warn",
			"require-yield": "warn",
			"rest-spread-spacing": ["warn", "never"],
			strict: ["warn", "never"],
			"unicode-bom": ["warn", "never"],
			"use-isnan": "warn",
			"valid-typeof": "warn",

			"no-restricted-properties": [
				"error",
				{
					object: "require",
					property: "ensure",
				},
				{
					object: "System",
					property: "import",
				},
			],

			"getter-return": "warn",
			"import/first": "error",
			"import/no-amd": "error",
			"import/no-anonymous-default-export": "warn",
			"import/no-webpack-loader-syntax": "error",

			"react/forbid-foreign-prop-types": [
				"warn",
				{
					allowInPropTypes: true,
				},
			],

			"react/jsx-no-comment-textnodes": "warn",
			"react/jsx-no-duplicate-props": "warn",
			"react/jsx-no-target-blank": "warn",
			"react/jsx-no-undef": "error",

			"react/jsx-pascal-case": [
				"warn",
				{
					allowAllCaps: true,
					ignore: [],
				},
			],

			"react/jsx-uses-vars": "warn",
			"react/jsx-uses-react": "warn",
			"react/no-danger-with-children": "warn",
			"react/no-direct-mutation-state": "warn",
			"react/no-is-mounted": "warn",
			"react/no-typos": "error",
			"react/require-render-return": "error",
			"react/style-prop-object": "warn",
			"jsx-a11y/alt-text": "warn",
			"jsx-a11y/anchor-has-content": "warn",

			"jsx-a11y/anchor-is-valid": [
				"warn",
				{
					aspects: ["noHref", "invalidHref"],
				},
			],

			"jsx-a11y/aria-activedescendant-has-tabindex": "warn",
			"jsx-a11y/aria-props": "warn",
			"jsx-a11y/aria-proptypes": "warn",

			"jsx-a11y/aria-role": [
				"warn",
				{
					ignoreNonDOM: true,
				},
			],

			"jsx-a11y/aria-unsupported-elements": "warn",
			"jsx-a11y/heading-has-content": "warn",
			"jsx-a11y/iframe-has-title": "warn",
			"jsx-a11y/img-redundant-alt": "warn",
			"jsx-a11y/no-access-key": "warn",
			"jsx-a11y/no-distracting-elements": "warn",
			"jsx-a11y/no-redundant-roles": "warn",
			"jsx-a11y/role-has-required-aria-props": "warn",
			"jsx-a11y/role-supports-aria-props": "warn",
			"jsx-a11y/scope": "warn",
			"react-hooks/rules-of-hooks": "error",
		},
	},
	{
		files: ["**/*.ts?(x)"],

		plugins: {
			"@typescript-eslint": typescriptEslint,
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2018,
			sourceType: "module",

			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},

				warnOnUnsupportedTypeScriptVersion: true,
			},
		},

		rules: {
			"default-case": "off",
			"no-dupe-class-members": "off",
			"no-undef": "off",
			"@typescript-eslint/consistent-type-assertions": "warn",
			"no-array-constructor": "off",
			"@typescript-eslint/no-array-constructor": "warn",
			"no-redeclare": "off",
			"@typescript-eslint/no-redeclare": "warn",
			"no-use-before-define": "off",

			"@typescript-eslint/no-use-before-define": [
				"warn",
				{
					functions: false,
					classes: false,
					variables: false,
					typedefs: false,
				},
			],

			"no-unused-expressions": "off",

			"@typescript-eslint/no-unused-expressions": [
				"error",
				{
					allowShortCircuit: true,
					allowTernary: true,
					allowTaggedTemplates: true,
				},
			],

			"no-unused-vars": "off",

			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					args: "none",
					ignoreRestSiblings: true,
				},
			],

			"no-useless-constructor": "off",
			"@typescript-eslint/no-useless-constructor": "warn",
		},
	},
]);
