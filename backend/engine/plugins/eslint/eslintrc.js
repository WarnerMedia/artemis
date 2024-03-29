module.exports = exports = {
	"plugins": [
		"security"
	],
	"extends": ["plugin:security/recommended-legacy"],
	"parserOptions": {
		"ecmaVersion": "latest"
	},
	
	// Add Typescript Support
	"overrides": [
		{
			"files": ["**/*.ts", "**/*.tsx"],
			"parser": "@typescript-eslint/parser"
		}
	]
}