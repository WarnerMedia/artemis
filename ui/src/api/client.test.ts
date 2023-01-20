import axios, { AxiosRequestConfig } from "axios";
import client, {
	AuthError,
	exportsForTesting,
	handleException,
} from "./client";
import store from "app/store";
import { addNotification } from "features/notifications/notificationsSlice";
import { setGlobalException } from "features/globalException/globalExceptionSlice";
import { APP_NOTIFICATION_DELAY } from "app/globals";
import { ScanOptionsForm } from "features/scans/scansSchemas";
import {
	pluginCatalog,
	sbomPlugins,
	secretPlugins,
	staticPlugins,
	techPlugins,
	vulnPlugins,
} from "app/scanPlugins";

jest.useFakeTimers();

describe("api client", () => {
	test("formatError should throw AuthError on 401 response", () => {
		const error = {
			response: {
				status: 401,
			},
		};
		const exception = () => {
			exportsForTesting._formatError(error, "default");
		};
		expect(exception).toThrow(AuthError);
		expect(exception).toThrowError(/session expired/i);
	});

	test("formatError should throw failed.error if set in response", () => {
		const error = {
			response: {
				data: {
					failed: [{ error: "it failed" }],
				},
			},
		};
		const exception = () => {
			exportsForTesting._formatError(error, "default");
		};
		expect(exception).toThrowError("it failed");
	});

	test("formatError should throw statusText if set in response", () => {
		const error = {
			response: {
				statusText: "it failed",
			},
		};
		const exception = () => {
			exportsForTesting._formatError(error, "default");
		};
		expect(exception).toThrowError("it failed");
	});

	test("formatError should throw defaultError instead of error messsage", () => {
		const error = {
			message: "it failed",
		};
		const exception = () => {
			exportsForTesting._formatError(error, "default");
		};
		expect(exception).toThrowError("default");
	});

	test("formatError should throw defaulted error instead of error messsage", () => {
		const error = {
			message: "it failed",
		};
		const exception = () => {
			exportsForTesting._formatError(error);
		};
		expect(exception).toThrowError(/unknown error/i);
	});

	// test if a function calls a redux dispatch
	test("handleException should dispatch an addNotification action for non-auth errors", () => {
		const spy = jest.spyOn(store, "dispatch");
		const error = new Error("it failed");
		handleException(error);
		expect(spy).toHaveBeenCalledWith({
			payload: {
				message: error.message, // should match our error
				type: "error",
			},
			type: addNotification.type, // should dispatch addNotification (type)
		});
		spy.mockRestore();
	});

	describe("handleException tests", () => {
		let dispatchSpy: any;
		let timeoutSpy: any;
		let error: any;

		beforeEach(() => {
			dispatchSpy = jest.spyOn(store, "dispatch");
			timeoutSpy = jest.spyOn(global, "setTimeout");
			error = new AuthError("auth failed");
			handleException(error);
		});
		afterEach(() => {
			dispatchSpy.mockRestore();
			timeoutSpy.mockRestore();
		});

		it("should dispatch setGlobalException action for auth errors", () => {
			expect(dispatchSpy).toHaveBeenCalledWith({
				payload: { message: error.message, action: "login" }, // globalException is a single string
				type: setGlobalException.type, // should dispatch addNotification (type)
			});
		});

		it("should set a 6-second timeout", () => {
			expect(setTimeout).toHaveBeenCalledTimes(1);
			expect(setTimeout).toHaveBeenLastCalledWith(
				exportsForTesting._redirect, // should call redirect
				APP_NOTIFICATION_DELAY // should set a delay
			);
		});
	});

	describe("_redirect tests", () => {
		it("should reload current page", () => {
			// mock window.location.reload
			const globalWindow = global.window;
			global.window = Object.create(window);
			Object.defineProperty(window, "location", {
				value: {
					reload: jest.fn(),
				},
			});

			exportsForTesting._redirect();
			expect(window.location.reload).toHaveBeenCalled();
			global.window = globalWindow;
		});
	});

	describe("addScan tests", () => {
		let mockRequest: jest.SpyInstance<
			Promise<unknown>,
			[config: AxiosRequestConfig<unknown>]
		>;
		const vcsOrg = "vcs/org";
		const repo = "repo";

		beforeEach(() => {
			mockRequest = jest.spyOn(axios, "request");
			mockRequest.mockImplementation(() => {
				return Promise.resolve({
					data: {
						failed: [],
						queued: ["/org/repo/1aaaaaaa-2bbb-3ccc-4ddd-5eeeeeeeeeee"],
					},
				});
			});
		});

		afterEach(() => {
			mockRequest.mockRestore();
		});

		it("vcsOrg required", async () => {
			const data = {};
			const exception = async () => {
				return client.addScan({ data: data as ScanOptionsForm });
			};
			await expect(exception()).rejects.toThrow(Error);
		});

		it("scan form options translate to scan options", async () => {
			const data: ScanOptionsForm = {
				vcsOrg: vcsOrg,
				repo: repo,
				branch: "branch",
				depth: 111,
				includeDev: true,
			};
			await client.addScan({ data: data });
			expect(mockRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						branch: "branch",
						depth: 111,
						include_dev: true,
					}),
					url: `${data.vcsOrg}/${data.repo}`,
					// don't check headers, baseUrl
				})
			);
		});

		it("scan form with no plugins or categories disables all scan categories and plugins", async () => {
			const data: ScanOptionsForm = {
				vcsOrg: vcsOrg,
				repo: repo,
			};

			// Jest expect() compares object props using toBe(), which matches array content and order
			// we don't really care about the order so sort both the categories we'll test against and
			// the call
			const categories = Object.keys(pluginCatalog)
				.map((category) => `-${category}`)
				.sort();

			await client.addScan({ data: data });

			// usually don't make a broad cast like this, but this is in a test
			// sort the mock call categories for comparison
			(mockRequest.mock.calls[0][0] as any).data.categories.sort();
			expect(mockRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						categories: categories,
						plugins: [],
					}),
					url: `${data.vcsOrg}/${data.repo}`,
					// don't check headers, baseUrl
				})
			);
		});

		it("scan form enabling all categories no plugins enables associated categories, plugins disabled", async () => {
			const data: ScanOptionsForm = {
				vcsOrg: vcsOrg,
				repo: repo,
				secrets: true,
				staticAnalysis: true,
				inventory: true,
				vulnerability: true,
				sbom: true,
				// all individual plugins disabled
			};

			const categories = Object.keys(pluginCatalog).sort();
			const plugins = [
				...secretPlugins,
				...staticPlugins,
				...techPlugins,
				...vulnPlugins,
				...sbomPlugins,
			]
				.map((plugin) => `-${plugin}`)
				.sort();

			await client.addScan({ data: data });
			(mockRequest.mock.calls[0][0] as any).data.categories.sort();
			(mockRequest.mock.calls[0][0] as any).data.plugins.sort();
			expect(mockRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						categories: categories,
						plugins: plugins,
					}),
					url: `${data.vcsOrg}/${data.repo}`,
				})
			);
		});

		it("scan form enabling secret category and 1 plugin enabled", async () => {
			const data: ScanOptionsForm = {
				vcsOrg: vcsOrg,
				repo: repo,
				secrets: true,
				secretPlugins: ["gitsecrets"],
				// all individual plugins disabled
			};

			const categories = Object.keys(pluginCatalog)
				.map((category) =>
					category === "secret" ? `${category}` : `-${category}`
				)
				.sort();

			await client.addScan({ data: data });
			(mockRequest.mock.calls[0][0] as any).data.categories.sort();
			expect(mockRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						categories: categories,
						plugins: ["-truffle_hog"],
					}),
					url: `${data.vcsOrg}/${data.repo}`,
				})
			);
		});
	});
});
