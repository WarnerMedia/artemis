"use strict";

const babelJest = require("babel-jest").default;
const { createAppBabelOptions } = require("../babel.config");

module.exports = babelJest.createTransformer(
	createAppBabelOptions({
		env: "test",
	}),
);
