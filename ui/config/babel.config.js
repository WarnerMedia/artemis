"use strict";

const createEnvPreset = (env, { corejs = false } = {}) => {
	if (env === "test") {
		return [
			require.resolve("@babel/preset-env"),
			{ targets: { node: "current" } },
		];
	}

	return [
		require.resolve("@babel/preset-env"),
		{
			...(corejs && { corejs: 3 }),
			exclude: ["transform-typeof-symbol"],
		},
	];
};

const createAppBabelOptions = ({ env }) => ({
	babelrc: false,
	configFile: false,
	presets: [
		createEnvPreset(env, { corejs: true }),
		[
			require.resolve("@babel/preset-react"),
			{
				development: env !== "production",
			},
		],
		[
			require.resolve("@babel/preset-typescript"),
			{ onlyRemoveTypeImports: false },
		],
	],
	plugins: [require.resolve("@lingui/babel-plugin-lingui-macro")],
});

const createDependenciesBabelOptions = ({ env }) => ({
	babelrc: false,
	configFile: false,
	presets: [createEnvPreset(env)],
});

module.exports = {
	createAppBabelOptions,
	createDependenciesBabelOptions,
};
