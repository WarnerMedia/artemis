import { RootState } from "app/rootReducer";
import { sampleMetaData2, sampleMetaData3, sampleMetaData4, sampleMetaData5, sampleMetaData6 } from "custom/sampleMetaData";

export const mockColors = [
	{background: "#9C27B0", text: "#fff"},
	{background: "#9E9E9E", text: "#fff"},
	{background: "#F44336", text: "#fff"},
	{background: "#66BB6A", text: "#fff"},
	{background: "#E91E63", text: "#fff"},
	{background: "#FFEB3B", text: "#fff"},
	{background: "#FF7043", text: "#fff"},
	{background: "#9CCC65", text: "#fff"},
	{background: "#607D8B", text: "#fff"},
	{background: "#EC407A", text: "#fff"},
	{background: "#5C6BC0", text: "#fff"},
	{background: "#EF5350", text: "#fff"},
	{background: "#FFEE58", text: "#fff"},
	{background: "#4CAF50", text: "#fff"},
	{background: "#FFA726", text: "#fff"},
	{background: "#009688", text: "#fff"},
	{background: "#CDDC39", text: "#fff"},
	{background: "#2196F3", text: "#fff"},
	{background: "#FFCA28", text: "#fff"},
	{background: "#673AB7", text: "#fff"},
	{background: "#26C6DA", text: "#fff"},
	{background: "#AB47BC", text: "#fff"},
	{background: "#03A9F4", text: "#fff"},
	{background: "#FF5722", text: "#fff"},
	{background: "#FF9800", text: "#fff"},
];

// from the mirage API
export const scanMockData = {
	repo: "goodOrg/repo",
	initiated_by: "Bronn@example.com",
	service: "goodVcs",
	branch: "main",
	scan_options: {
		categories: ["inventory"],
		plugins: ["Beta", "-echo", "alpha", "-charlie", "delta"],
		depth: 166,
		include_dev: false,
		callback: {
			url: null,
			client_id: null,
		},
		batch_priority: false,
	},
	status: "completed",
	status_detail: {
		plugin_name: "inventory scan",
		plugin_start_time: "2021-02-11T17:40:09+00:00",
		current_plugin: 1,
		total_plugins: 1,
	},
	timestamps: {
		queued: "2021-02-11T17:40:09+00:00",
		start: "2021-02-11T17:40:09+00:00",
		end: "2021-02-11T17:40:09+00:00",
	},
	scan_id: "a63626e9-my-pretend-id-8698bedd967b",
	application_metadata: {},
	success: true,
	truncated: false,
	errors: {},
	results_summary: {
		vulnerabilities: null,
		secrets: null,
		static_analysis: null,
		inventory: {
			technology_discovery: 12,
		},
	},
	results: {
		vulnerabilities: {},
		secrets: {},
		static_analysis: {},
		inventory: {
			base_images: {
				golang: {
					tags: ["latest", "2.2", "3.3", "4.4"],
					digests: [],
				},
				python: {
					tags: ["latest", "3.2", "4.4", "5.5"],
					digests: [],
				},
				ubuntu: {
					tags: [
						"1.1",
						"2.2",
						"3.3",
						"4.4",
						"5.5",
						"6.6",
						"7.7",
						"8.8",
						"9.9",
						"10.10",
					],
					digests: [],
				},
			},
			technology_discovery: {
				PHP: 14.01,
				Erlang: 0.11,
				LISP: 0.29,
				Dockerfile: 0.07,
				Haskell: 0.36,
				Java: 66.77,
				Python: 0.19,
				Makefile: 4.82,
				Typescript: 0.4,
				JavaScript: 4.07,
				Go: 8.9,
				Perl: 0.01,
			},
		},
	},
};

export const mockScan001 = {
	repo: "goodOrg/somerepo", // service and repo need to match currentUser scope to run a scan
	scan_id: "57bc001d-9876-cdef-ffff-9b2916567f27",
	initiated_by: "someperson@example.com",
	service: "goodVcs",
	branch: null,
	engine_id: "i-123456789-e987654321",
	scan_options: {
		categories: ["secret", "inventory", "vulnerability", "-static_analysis"],
		plugins: [
			"pluginname01",
			"pluginname02",
			"pluginname07",
			"-pluginname08",
			"-pluginname09",
			"-pluginname10",
		],
		depth: 500,
		include_dev: false,
		callback: {
			url: null,
			client_id: null,
		},
		batch_priority: false,
		include_paths: [],
		exclude_paths: [],
	},
	status: "completed",
	application_metadata: {},
	status_detail: {
		plugin_name: "some_checker_name",
		plugin_start_time: "2021-03-04T18:42:29.237119+00:00",
		current_plugin: 10,
		total_plugins: 10,
	},
	timestamps: {
		queued: "2021-03-04T18:41:13.008949+00:00",
		start: "2021-03-04T18:41:13.157924+00:00",
		end: "2021-03-04T18:43:17.025446+00:00",
	},
	success: false,
	truncated: false,
	errors: {
		"A Scanner": ["Plugin returned invalid output: "],
	},
	results_summary: {
		vulnerabilities: {
			critical: 1,
			high: 1,
			medium: 1,
			low: 2,
			negligible: 0,
			"": 1,
		},
		static_analysis: null,
		secrets: 7,
		inventory: {
			base_images: 3,
			technology_discovery: 9,
		},
	},
	results: {
		vulnerabilities: {
			somevuln01: {
				"https://example.com/some/link/here": {
					source: ["somefile.lock"],
					severity: "",
					description: "bad",
					remediation: "",
				},
				"CVE-2016-9999": {
					source: ["somefile"],
					severity: "high",
					description: "HTTP Proxy header vulnerability",
					remediation: "",
				},
			},
			somevuln02: {
				"CVE-2017-9999": {
					source: ["somefile.lock"],
					severity: "medium",
					description: "Prototype pollution",
					remediation: "Upgrade",
				},
			},
			somevuln03: {
				"CVE-2018-9999": {
					source: ["somefile.lock"],
					severity: "low",
					description: "Insecure use",
					remediation: "Upgrade",
				},
			},
			somevuln04: {
				"CVE-2019-9999": {
					source: ["node/some/path/here", "node/some/path/here"],
					severity: "low",
					description:
						'Regular expression denial of service vulnerability',
					remediation: "Update to a newer version",
				},
			},
			somevuln05: {
				"CVE-2020-9999": {
					source: ["node/some/path/here1", "node/some/path/here2"],
					severity: "critical",
					description:
						"Prototype Pollution",
					remediation: "a remediation",
					source_plugins: ["plugin1", "plugin2", "plugin3", "plugin4"],
				},
			},
			somevuln06: {
				"CVE-2021-9999": {
					source: ["node/some/path/here"],
					severity: "high",
					description:
						"Regular expression denial of service",
					remediation: "",
				},
			},
		},
		secrets: {
			"aws/demo": [
				{
					type: "aws",
					line: 1,
					commit: "8437582743858d38473872587483",
				},
			],
			"mongodb/test_settings1.json": [
				{
					type: "mongo",
					line: 1,
					commit: "89482954839285943892584932849",
				},
				{
					type: "mongo",
					line: 2,
					commit: "89482954839285943892584932849",
				},
			],
			"mongodb/test_settings2.json": [
				{
					type: "mongo",
					line: 1,
					commit: "58437287548302574832750473280570432",
				},
				{
					type: "mongo",
					line: 2,
					commit: "58437287548302574832750473280570432",
				},
			],
			"google/fake_key.json": [
				{
					type: "google",
					line: 1,
					commit: "54837208547382057483275402358493270584320532",
				},
				{
					type: "google",
					line: 2,
					commit: "54837208547382057483275402358493270584320532",
				},
			],
		},
		static_analysis: {},
		inventory: {
			base_images: {
				golang: {
					tags: ["latest"],
					digests: [],
				},
				python: {
					tags: ["3.7"],
					digests: [],
				},
				ubuntu: {
					tags: ["latest"],
					digests: [],
				},
			},
			technology_discovery: {
				PHP: 1.57,
				Java: 32.26,
				Ruby: 56.07,
				JavaScript: 4.58,
				TypeScript: 0.89,
			},
		},
	},
};

export const mockScan002 = {
	repo: "goodOrg/somerepo", // service and repo need to match mockCurrentUser so that user can run a scan
	scan_id: "53421c47-cccc-dddd-8f31-4038164922f1",
	initiated_by: "Bronn@example.com",
	service: "goodVcs",
	branch: null,
	engine_id: "i-0d311engineid-3ead79238510",
	scan_options: {
		categories: ["static_analysis", "vulnerability", "-secret", "-inventory"],
		plugins: [
			"plugin01",
			"plugin02",
			"plugin03",
			"-plugin04",
			"-plugin05",
			"-plugin06",
		],
		depth: 500,
		include_dev: false,
		callback: {
			url: null,
			client_id: null,
		},
		batch_priority: false,
		include_paths: [],
		exclude_paths: [],
	},
	status: "completed",
	application_metadata: {},
	status_detail: {
		plugin_name: "bundler_audit",
		plugin_start_time: "2021-03-05T00:46:39.607687+00:00",
		current_plugin: 18,
		total_plugins: 18,
	},
	timestamps: {
		queued: "2021-03-05T00:41:14.303429+00:00",
		start: "2021-03-05T00:41:14.440714+00:00",
		end: "2021-03-05T00:46:41.480019+00:00",
	},
	success: false,
	truncated: false,
	errors: {
		"A Scanner": ["Plugin returned invalid output: "],
	},
	results_summary: {
		vulnerabilities: {
			critical: 0,
			high: 0,
			medium: 0,
			low: 0,
			negligible: 0,
			"": 0,
		},
		secrets: null,
		static_analysis: {
			critical: 0,
			high: 0,
			medium: 10,
			low: 9,
			negligible: 0,
			"": 13,
		},
		inventory: null,
	},
	results: {
		vulnerabilities: {},
		secrets: {},
		static_analysis: {
			"auth.json": [
				{
					line: 5,
					type: "Password Hardcoded",
					message: "A hardcoded password in plain text was identified.",
					severity: "",
				},
			],
			"pylint/example.py": [
				{
					line: 1,
					type: "unused-import",
					message: "Unused import json",
					severity: "",
				},
			],
			"app/controllers/app_controller.rb": [
				{
					line: 8,
					type: "Basic Auth",
					message: "Basic authentication password stored in source code",
					severity: "",
				},
			],
			"app/controllers/widgets_controller.rb": [
				{
					line: 50,
					type: "Redirect",
					message: "Possible unprotected redirect",
					severity: "",
				},
				{
					line: 69,
					type: "Redirect",
					message: "Possible unprotected redirect",
					severity: "",
				},
			],
			"node/some/path/here/anotherone.js": [
				{
					line: 4,
					type: "",
					message: "Parsing error: Unexpected token i",
					severity: "medium",
				},
			],
			"node/some/path/here/anotherone2.js": [
				{
					line: 12,
					type: "",
					message: "Parsing error: Unexpected token >",
					severity: "medium",
				},
			],
			"node/some/path/here/anotherone3.js": [
				{
					line: 4,
					type: "",
					message: "Parsing error: The keyword 'const' is reserved",
					severity: "medium",
				},
			],
			"node/some/path/here/anotherone33.js": [
				{
					line: 4,
					type: "",
					message: "Parsing error: The keyword 'class' is reserved",
					severity: "medium",
				},
			],
			"node/some/path/here/anotherone4.js": [
				{
					line: 1,
					type: "",
					message: "Parsing error: The keyword 'export' is reserved",
					severity: "medium",
				},
			],
			"typescript/class.tsx": [
				{
					line: 1,
					type: "",
					message: "Parsing error: The keyword 'import' is reserved",
					severity: "medium",
				},
			],
			"typescript/index.tsx": [
				{
					line: 2,
					type: "",
					message: "Parsing error: The keyword 'import' is reserved",
					severity: "medium",
				},
			],
			"JDBCSessionDataStore.java": [
				{
					line: 100,
					type: "SQL",
					message:
						"Statement vulnerable to SQL injection",
					severity: "",
				},
				{
					line: 200,
					type: "SQL",
					message:
						"Statement vulnerable to SQL injection",
					severity: "",
				},
				{
					line: 300,
					type: "SQL",
					message:
						"Statement vulnerable to SQL injection",
					severity: "",
				},
				{
					line: 400,
					type: "SQL",
					message:
						"Statement vulnerable to SQL injection",
					severity: "",
				},
				{
					line: 500,
					type: "SQL",
					message:
						"Statement vulnerable to SQL injection",
					severity: "",
				},
				{
					line: 600,
					type: "SQL",
					message:
						"Statement vulnerable to SQL injection",
					severity: "",
				},
			],
			"python/unsafe_subprocess/test.py": [
				{
					line: 1,
					type: "B404: blacklist",
					message:
						"Consider possible security implications associated with subprocess module.",
					severity: "low",
				},
				{
					line: 10,
					type: "B607: start_process_with_partial_path",
					message: "Starting a process with a partial executable path",
					severity: "low",
				},
				{
					line: 13,
					type: "B602: subprocess_popen_with_shell_equals_true",
					message:
						"subprocess call with shell=True seems safe, but may be changed in the future, consider rewriting without shell",
					severity: "low",
				},
			],
			"cloudfront/example_1.yaml": [
				{
					line: 44,
					type: "E0000",
					message: 'Duplicate resource found',
					severity: "medium",
				},
			],
			"cloudfront/example_4.yaml": [
				{
					line: 44,
					type: "E3001",
					message:
						"Invalid or unsupported type",
					severity: "medium",
				},
			],
			"cloudfront/example_5.yaml": [
				{
					line: 44,
					type: "E3030",
					message:
						"Specify a valid value for type",
					severity: "medium",
				},
			],
			"cloudfront/not_cloudflare.yaml": [
				{
					line: 44,
					type: "W4002",
					message:
						'Potential sensitive data in plaintext',
					severity: "low",
				},
				{
					line: 44,
					type: "W4002",
					message:
						'Potential sensitive data in plaintext',
					severity: "low",
				},
				{
					line: 44,
					type: "W4002",
					message:
						'Potential sensitive data in plaintext',
					severity: "low",
				},
				{
					line: 44,
					type: "W4002",
					message:
						'Potential sensitive data in plaintext',
					severity: "low",
				},
				{
					line: 44,
					type: "W4002",
					message:
						'Potential sensitive data in plaintext',
					severity: "low",
				},
				{
					line: 44,
					type: "W4002",
					message:
						'Potential sensitive data in plaintext',
					severity: "low",
				},
			],
		},
		inventory: {},
	},
};

export const mockHiddenFindings001 = [
	{
		id: "0694bbvulnerabilitye-b63b08cea490",
		type: "vulnerability",
		value: {
			id: "CVE-2222-11111",
			source: "node/dependency_vulnerability_samples/package-lock.json",
			component: "debug",
		},
		expires: null,
		reason: "test",
		created_by: "someperson@example.com",
	},
	{
		id: "df1461d0-6106-46f6-ababilitye-b63b08cea490",
		type: "secret",
		value: {
			line: 1,
			commit: "96c0e286ddb365e19b74442bdd03ae04b77112c8",
			filename: "slack/test_settings.json",
		},
		expires: null,
		reason: "test",
		created_by: "someperson@example.com",
	},
];

export const mockHiddenFindings002 = [];

export const mockHiddenFindings003 = [
	{
			"id": "cec197de-7e6c-6945-f3e6-030e56d7571c",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2020-0000",
					"component": "",
					"source": "docker/Dockerfile",
					"severity": "critical"
			},
			"expires": null,
			"reason": "test existing hidden finding",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "b48d9034-3eb0-2257-3a5c-37552451c508",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2020-0000",
					"component": "",
					"source": "docker/Dockerfile.dev",
					"severity": "critical"
			},
			"expires": null,
			"reason": "test existing hidden finding",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "a09657d1-3837-3c9d-918a-1e0f708a7f40",
			"type": "secret",
			"value": {
					"filename": "folder/badfile",
					"line": 17,
					"commit": "q3498tlsdf9834tkjsdfg98u34t"
			},
			"expires": null,
			"reason": "test existing hidden finding, secret",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "b3ad1e09-3f4e-6b3e-55ad-97e60712ebc1",
			"type": "secret",
			"value": {
					"filename": "folder/badfile2",
					"line": 177,
					"commit": "q3498tlsdf9834tkjsdfg98u34t"
			},
			"expires": null,
			"reason": "test existing hidden finding, secret",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "d24d0a7b-691f-06de-3db8-3e5af9322c1b",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2018-00000",
					"severity": "medium",
					"component": "",
					"source": "docker/Dockerfile.multistage"
			},
			"expires": "2021-09-15T20:14:46.495Z",
			"reason": "expired hidden finding",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "8f1677e7-0df9-c6b6-fedc-36bdc1b46cfe",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2019-00000",
					"component": "component1",
					"source": "node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency1"
			},
			"expires": "2021-09-20T20:14:46.499Z",
			"reason": "expiring test hiding a subset of files with vuln finding (1)",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "8a3477c0-357d-7522-22a5-b035bac17360",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2019-00000",
					"component": "component1",
					"source": "node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency2"
			},
			"expires": "2021-09-20T20:14:46.499Z",
			"reason": "expiring test hiding a subset of files with vuln finding (2)",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "c5fb558a-db99-2f77-1e37-9f1879a3c130",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2019-00000",
					"component": "component1",
					"source": "docker/Dockerfile.platform7"
			},
			"expires": "2021-09-20T20:14:46.500Z",
			"reason": "expiring test hiding a subset of files with vuln finding (3)",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "062264b3-8278-60eb-c05d-2cdfb6aeb3d0",
			"type": "vulnerability",
			"value": {
					"id": "CVE-2019-00000",
					"component": "component1",
					"source": "docker/Dockerfile.platform27"
			},
			"expires": "2021-09-20T20:14:46.500Z",
			"reason": "expiring test hiding a subset of files with vuln finding (4)",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "e084e54d-23b0-103f-6f7d-ceffff32eb6c",
			"type": "secret_raw",
			"value": {
					"value": "test.me"
			},
			"expires": null,
			"reason": "test secret_raw type",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "a6f41593-c3ef-6380-8721-d275175f91f1",
			"type": "vulnerability_raw",
			"value": {
					"id": "CVE-2021-0101",
					"severity": "critical"
			},
			"expires": "2021-09-20T20:14:46.500Z",
			"reason": "test expired vulnerability_raw type",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "76300da2-d5d4-af3d-0f65-f4d8d4b0ad9f",
			"type": "static_analysis",
			"value": {
					"filename": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
					"line": 14,
					"type": "Potential template injection"
			},
			"expires": null,
			"reason": "test static_analysis type",
			"created_by": "Jon.Snow@example.com"
	},
	{
			"id": "eb8abd85-b153-6fbb-5288-9b2dc4d854c5",
			"type": "static_analysis",
			"value": {
					"filename": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
					"line": 33,
					"type": "XSS"
			},
			"expires": "2021-09-23T20:14:46.500Z",
			"reason": "test expired static_analysis type",
			"created_by": "Jon.Snow@example.com"
	}
];

// note these are consolidated rows, not the raw hidden findings from the api
export const mockHFRows001 = [
	{
		keyId: "hiddenFinding-b16c564b-0875-4f8c-b706-59250eecf658",
		url: "goodVcs/goodOrg/repo",
		createdBy: "Gilly@example.com",
		type: "vulnerability",
		expires: "",
		source: ["package-lock.json"],
		location: "CVE-000-0000",
		component: "this-component",
		hiddenFindings: [
			{
				id: "b16c564b-0875-4f8c-b706-59250eecf658",
				type: "vulnerability",
				value: {
					id: "CVE-000-0000",
					source: "package-lock.json",
					component: "this-component",
				},
				expires: null,
				reason: "test",
				created_by: "Bronn@example.com",
			},
		],
	},
	{
		keyId: "hiddenFinding-af94262d-5a10-4a3d-ad57-30a4c84f25e3",
		url: "goodVcs/goodOrg/repo",
		createdBy: "Gilly@example.com",
		type: "vulnerability",
		expires: "",
		source: ["Dockerfile"],
		location: "CVE-2009-9999",
		component: "kernal-mod",
		hiddenFindings: [
			{
				id: "af94262d-5a10-4a3d-ad57-30a4c84f25e3",
				type: "vulnerability",
				value: {
					id: "CVE-2009-9999",
					source: "Dockerfile",
					component: "kernel-mod",
				},
				expires: null,
				reason: "test",
				created_by: "Bronn@example.com",
			},
		],
	},
	{
		keyId: "hiddenFinding-e9aa365e-70e8-47bc-ba9b-ca7911e6a16b",
		url: "goodVcs/goodOrg/repo",
		createdBy: "Gilly@example.com",
		type: "vulnerability",
		expires: "",
		source: ["Dockerfile"],
		location: "CVE-2021-9999",
		component: "shared-library",
		hiddenFindings: [
			{
				id: "e9aa365e-70e8-47bc-ba9b-ca7911e6a16b",
				type: "vulnerability",
				value: {
					id: "CVE-2021-9999",
					source: "Dockerfile",
					component: "shared-library",
				},
				expires: null,
				reason: "test",
				created_by: "Bronn@example.com",
			},
		],
	},
	{
		keyId: "hiddenFinding-d1c4bf6f-4c22-4b23-8d70-d46fba0e1bf1",
		url: "goodVcs/goodOrg/repo",
		createdBy: "Gilly@example.com",
		type: "static_analysis",
		expires: "",
		source: "pylint/example.py",
		location: 1,
		component: "unused-import",
		hiddenFindings: [
			{
				id: "d1c4bf6f-4c22-4b23-8d70-d46fba0e1bf1",
				type: "static_analysis",
				value: {
					line: 1,
					type: "unused-import",
					filename: "pylint/example.py",
				},
				expires: null,
				reason: "test",
				created_by: "Bronn@example.com",
			},
		],
	},
	{
		keyId: "hiddenFinding-4ec2a09b-5384-4978-809c-1864ee5d267e",
		url: "goodVcs/goodOrg/repo",
		createdBy: "Gilly@example.com",
		type: "static_analysis",
		expires: "",
		source: "cloudfront/not_cloudflare.yaml",
		location: 44,
		component: "W4002",
		hiddenFindings: [
			{
				id: "4ec2a09b-5384-4978-809c-1864ee5d267e",
				type: "static_analysis",
				value: {
					line: 44,
					type: "W4002",
					filename: "cloudfront/not_cloudflare.yaml",
				},
				expires: null,
				reason: "test",
				created_by: "Bronn@example.com",
			},
		],
	},
];

export const mockHFRows002 = [];

export const mockHiddenFindingsSummaryNone = {
	critical: 0,
	high: 0,
	medium: 0,
	low: 0,
	negligible: 0,
	"": 0,
	secret: 0,
	secret_raw: 0,
	static_analysis: 0,
	vulnerability: 0,
	vulnerability_raw: 0,
};

// consolidated hidden finding rows with each finding type, expirations, and unhidden files
// generated by server.ts mocks
export const mockHFRows003 = [
	{
			"keyId": "hiddenFinding-2d70ba68-98bc-06d5-1a6e-75f3f6973cca",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "vulnerability",
			"expires": "Never",
			"source": [
					"docker/Dockerfile",
					"docker/Dockerfile.dev"
			],
			"location": "CVE-2020-0000",
			"component": "",
			"severity": "critical",
			"hiddenFindings": [
					{
							"id": "2d70ba68-98bc-06d5-1a6e-75f3f6973cca",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2020-0000",
									"component": "",
									"source": "docker/Dockerfile",
									"severity": "critical"
							},
							"expires": null,
							"reason": "test existing hidden finding",
							"created_by": "Davos.Seaworth@example.com"
					},
					{
							"id": "6951e173-0f39-5bdb-5e01-585ccdc95a0c",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2020-0000",
									"component": "",
									"source": "docker/Dockerfile.dev",
									"severity": "critical"
							},
							"expires": null,
							"reason": "test existing hidden finding",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-7ec683a2-d3f7-734f-a948-eb88d1cc8788",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "secret",
			"expires": "Never",
			"source": "folder/badfile",
			"location": 17,
			"component": "q3498tlsdf9834tkjsdfg98u34t",
			"severity": "",
			"hiddenFindings": [
					{
							"id": "7ec683a2-d3f7-734f-a948-eb88d1cc8788",
							"type": "secret",
							"value": {
									"filename": "folder/badfile",
									"line": 17,
									"commit": "q3498tlsdf9834tkjsdfg98u34t"
							},
							"expires": null,
							"reason": "test existing hidden finding, secret",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-bc8b709f-8f47-773b-28b9-0838633e04f3",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "secret",
			"expires": "Never",
			"source": "folder/badfile2",
			"location": 177,
			"component": "q3498tlsdf9834tkjsdfg98u34t",
			"severity": "",
			"hiddenFindings": [
					{
							"id": "bc8b709f-8f47-773b-28b9-0838633e04f3",
							"type": "secret",
							"value": {
									"filename": "folder/badfile2",
									"line": 177,
									"commit": "q3498tlsdf9834tkjsdfg98u34t"
							},
							"expires": null,
							"reason": "test existing hidden finding, secret",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-158f10a4-cc4e-dc61-29f9-6d1fa262e842",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "vulnerability",
			"expires": "2021-08-04T20:48:21.467Z",
			"source": [
					"docker/Dockerfile.multistage"
			],
			"location": "CVE-2018-00000",
			"component": "",
			"severity": "medium",
			"hiddenFindings": [
					{
							"id": "158f10a4-cc4e-dc61-29f9-6d1fa262e842",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2018-00000",
									"severity": "medium",
									"component": "",
									"source": "docker/Dockerfile.multistage"
							},
							"expires": "2021-08-04T20:48:21.467Z",
							"reason": "expired hidden finding",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-2d61838e-55bf-d9a9-d4ce-47512e8f1ee4",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "vulnerability",
			"expires": "2021-08-09T20:48:21.479Z",
			"source": [
					"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency1",
					"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency2",
					"docker/Dockerfile.platform7",
					"docker/Dockerfile.platform27"
			],
			"location": "CVE-2019-00000",
			"component": "component1",
			"severity": "high",
			"hiddenFindings": [
					{
							"id": "2d61838e-55bf-d9a9-d4ce-47512e8f1ee4",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2019-00000",
									"component": "component1",
									"source": "node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency1",
									"severity": "high"
							},
							"expires": "2021-08-09T20:48:21.479Z",
							"reason": "expiring test hiding a subset of files with vuln finding (1)",
							"created_by": "Davos.Seaworth@example.com"
					},
					{
							"id": "becb22ea-6127-c0e3-bc7a-f111319cef15",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2019-00000",
									"component": "component1",
									"source": "node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency2",
									"severity": "high"
							},
							"expires": "2021-08-09T20:48:21.480Z",
							"reason": "expiring test hiding a subset of files with vuln finding (2)",
							"created_by": "Davos.Seaworth@example.com"
					},
					{
							"id": "04112a84-efe8-1893-5eb8-08f4ee34c151",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2019-00000",
									"component": "component1",
									"source": "docker/Dockerfile.platform7",
									"severity": "high"
							},
							"expires": "2021-08-09T20:48:21.480Z",
							"reason": "expiring test hiding a subset of files with vuln finding (3)",
							"created_by": "Davos.Seaworth@example.com"
					},
					{
							"id": "68b78d55-74c1-7724-3107-710f638777ef",
							"type": "vulnerability",
							"value": {
									"id": "CVE-2019-00000",
									"component": "component1",
									"source": "docker/Dockerfile.platform27",
									"severity": "high"
							},
							"expires": "2021-08-09T20:48:21.480Z",
							"reason": "expiring test hiding a subset of files with vuln finding (4)",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": [
					"node/a_very_long_directory_name_tests_and_samples/package.json: component",
					"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency3",
					"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency4",
					"node/a_very_long_directory_name_tests_and_samples/package.json: component1",
					"node/a_very_long_directory_name_tests_and_samples/package.json: component2",
					"docker/Dockerfile.platform2",
					"docker/Dockerfile.platform3",
					"docker/Dockerfile.platform4",
					"docker/Dockerfile.platform5",
					"docker/Dockerfile.platform6",
					"docker/Dockerfile.platform8",
					"docker/Dockerfile.platform9",
					"docker/Dockerfile.platform0",
					"docker/Dockerfile.platform10",
					"docker/Dockerfile.platform11",
					"docker/Dockerfile.platform12",
					"docker/Dockerfile.platform13",
					"docker/Dockerfile.platform14",
					"docker/Dockerfile.platform15",
					"docker/Dockerfile.platform16",
					"docker/Dockerfile.platform17",
					"docker/Dockerfile.platform18",
					"docker/Dockerfile.platform19",
					"docker/Dockerfile.platform20",
					"docker/Dockerfile.platform21",
					"docker/Dockerfile.platform22",
					"docker/Dockerfile.platform23",
					"docker/Dockerfile.platform24",
					"docker/Dockerfile.platform25",
					"docker/Dockerfile.platform26"
			]
	},
	{
			"keyId": "hiddenFinding-1d8ed466-3830-fa77-6fd3-be2ca7a8f174",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "secret_raw",
			"expires": "Never",
			"source": "Any",
			"location": "test.me",
			"component": "Any",
			"severity": "",
			"hiddenFindings": [
					{
							"id": "1d8ed466-3830-fa77-6fd3-be2ca7a8f174",
							"type": "secret_raw",
							"value": {
									"value": "test.me"
							},
							"expires": null,
							"reason": "test secret_raw type",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-0515b3d2-c04c-cde3-6082-44b60047e627",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "vulnerability_raw",
			"expires": "2021-08-09T20:48:21.480Z",
			"source": "Any",
			"location": "CVE-2021-0101",
			"component": "Any",
			"severity": "critical",
			"hiddenFindings": [
					{
							"id": "0515b3d2-c04c-cde3-6082-44b60047e627",
							"type": "vulnerability_raw",
							"value": {
									"id": "CVE-2021-0101",
									"severity": "critical"
							},
							"expires": "2021-08-09T20:48:21.480Z",
							"reason": "test expired vulnerability_raw type",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-aeaab0ad-7786-038c-4d8e-ebf4d6275b77",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "static_analysis",
			"expires": "Never",
			"source": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
			"location": 14,
			"component": "Potential template injection",
			"severity": "medium",
			"hiddenFindings": [
					{
							"id": "aeaab0ad-7786-038c-4d8e-ebf4d6275b77",
							"type": "static_analysis",
							"value": {
									"filename": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
									"line": 14,
									"type": "Potential template injection",
									"severity": "medium"
							},
							"expires": null,
							"reason": "test static_analysis type",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	},
	{
			"keyId": "hiddenFinding-12771a01-02a3-f353-3ff3-14deddea2eb8",
			"url": "goodVcs/goodOrg/repo",
			"createdBy": "Davos.Seaworth@example.com",
			"type": "static_analysis",
			"expires": "2021-08-12T20:48:21.480Z",
			"source": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
			"location": 33,
			"component": "XSS",
			"severity": "critical",
			"hiddenFindings": [
					{
							"id": "12771a01-02a3-f353-3ff3-14deddea2eb8",
							"type": "static_analysis",
							"value": {
									"filename": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
									"line": 33,
									"type": "XSS",
									"severity": "critical"
							},
							"expires": "2021-08-12T20:48:21.480Z",
							"reason": "test expired static_analysis type",
							"created_by": "Davos.Seaworth@example.com"
					}
			],
			"unhiddenFindings": []
	}
];

export const mockHFSummary003 = {
	...mockHiddenFindingsSummaryNone,
	critical: 3,
	high: 1,
	medium: 2,
	low: 0,
	negligible: 0,
	"": 0,
	secret: 2,
	secret_raw: 1,
	static_analysis: 2,
	vulnerability: 3,
	vulnerability_raw: 1,
};

export const mockCurrentUser = {
	scan_orgs: [
		"badVcs/badOrg",
		"goodVcs.goodOrg.com",
		"goodVcs/goodOrg",
		"goodVcs/goodOrg/org/path",
		"goodVcs/goodOrgThisIsAVeryLongNameForTheField",
	],
	email: "Brienne.of.Tarth@example.com",
	last_login: "2021-03-28T19:23:41+00:00",
	admin: true,
	scope: [
		"goodVcs/goodOrg/regex-[0-9]",
		"goodVcs/goodOrg/org/path/not/[!0-9]",
		"goodVcs/goodOrg/org/path/?",
		"goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo",
		"goodVcs.goodOrg.com/interpret[?]",
	],
	features: {feature1: true, feature2: false},
	id: "self",
};

// redux store state when no scans are displayed
export const mockStoreEmpty: RootState = {
	theme: {
		name: "purple",
		dark: "#fff",
		light: "#fff",
		main: "#fff",
		gradient: "#fff",
		gradientText: "#fff",
	},
	currentUser: {
		ids: ["self"],
		entities: {
			self: mockCurrentUser,
		},
		status: "succeeded",
		error: null,
		totalRecords: 1,
	},
	globalException: {
		message: "",
	},
	hiddenFindings: {
		ids: [],
		entities: {},
		status: "idle",
		action: null,
		error: null,
	},
	keys: {
		ids: [],
		entities: {},
		status: "idle",
		error: null,
		totalRecords: 0,
	},
	notifications: {
		ids: [],
		entities: {},
	},
	scans: {
		ids: [],
		entities: {},
		status: "idle",
		error: null,
		totalRecords: 0,
	},
	systemStatus: {
		maintenance: {
			enabled: false,
			message: "",
		},
		status: "succeeded",
		error: null,
	},
	users: {
		ids: [],
		entities: {},
		status: "idle",
		action: null,
		error: null,
		totalRecords: 0,
	},
	vcsServices: {
		ids: [],
		entities: {},
		status: "idle",
		error: null,
		totalRecords: 0,
		linking: {
			github: false,
		},
		unlinking: {
			github: false,
		},
	},
};

// redux store when a single scan is running
export const mockStoreScanId = "8d3b181b-1985-a548-3450-5b9f9b0062c2";
export const mockStoreSingleScan: RootState = {
	...mockStoreEmpty,
	scans: {
		ids: [mockStoreScanId],
		entities: {}, // entity added below
		status: "succeeded",
		error: null,
		totalRecords: 1,
	},
};
mockStoreSingleScan.scans.entities[mockStoreScanId] = {
	scan_id: mockStoreScanId,
	branch: "dev",
	status: "completed",
	timestamps: {
		queued: "2021-03-28T19:24:15+00:00",
		start: "2021-03-28T19:25:20+00:00",
		end: "2021-03-28T19:25:34+00:00",
	},
	repo: "goodOrg/repo",
	initiated_by: "Brienne.of.Tarth@example.com",
	service: "goodVcs",
	scan_options: {
		categories: ["inventory", "secret", "static_analysis", "vulnerability"],
		plugins: [],
		depth: 500,
		include_dev: false,
		callback: {
			url: null,
			client_id: null,
		},
		batch_priority: false,
		include_paths: [],
		exclude_paths: [],
	},
	status_detail: {
		plugin_name: "inventory scan",
		plugin_start_time: "2021-03-28T19:25:31+00:00",
		current_plugin: 4,
		total_plugins: 4,
	},
	engine_id: "i-da8859650fd47f1ac",
	application_metadata: {},
	success: false,
	truncated: false,
	errors: {
		"Some Scanner": [
			"Plugin returned invalid output: ",
			"Error1",
			"Error2",
			"Error3",
		],
		"Some Other Scanner": ["Make the scan alerts scroll"],
		"Yet One Other Scanner": ["Make the scan alerts scroll some more"],
	},
	results_summary: {
		vulnerabilities: {
			critical: 1,
			high: 1,
			medium: 2,
			low: 2,
			negligible: 1,
			"": 1,
		},
		secrets: 8,
		static_analysis: {
			critical: 3,
			high: 1,
			medium: 2,
			low: 1,
			negligible: 0,
			"": 0,
		},
		inventory: {
			base_images: 3,
			technology_discovery: 12,
		},
	}
};

export const mockStore50Scans: RootState = {
	...mockStoreEmpty,
	scans: {
		ids: [
			'f9c67c93-5042-35b4-22b1-08d7d955b913',
			'd917d175-17e3-1337-ea53-ce745be2b5a3',
			'6bfd7612-ef88-288b-7071-5e4cc9384588',
			'5bfbfc7e-6f92-388c-9b13-0b4cd8ea1c6d',
			'136a3d03-7509-296a-050f-ebe57bc4800c',
			'9990a263-b526-e278-e045-71693dc35fb7',
			'839e437b-fccd-cf4b-6bd2-319ba7cdaa6f',
			'edc2bd2e-c61f-61b7-fb39-72dedc1cf857',
			'ba8ca3bf-526c-687d-ff25-c70195c721a5',
			'c25b4101-e621-bf90-82d7-f72d478da6d8',
			'adbdaa84-4cc1-f124-69ad-806d97920cd0',
			'8e469945-27da-48bf-f48a-bb0463e194fd',
			'a8f407e7-0097-9d85-4c7c-78506f59e556',
			'82510225-cd71-ca58-becd-7eabb03e16d5',
			'aae24a4a-f523-dbbb-62bc-bbac3342c4cb',
			'a4389373-c858-4fa0-26b9-a8f0f19c6e75',
			'746c5a3c-0ebe-1530-58c4-cf5415f5a097',
			'548bb3d0-87db-daab-7f5a-270f4f6b474f',
			'8bc61918-3273-96e2-fe2b-285357753164',
			'bfc16816-a447-7865-7834-918eddf9f6a9',
			'7f1e7817-7f39-8493-a7bf-5cb64d0d0a92',
			'7f0ff371-12d3-41f8-e907-ef7f02061fb4',
			'32fd0a0f-0161-044f-ad2b-85a6a173e173',
			'c7234750-f8cc-e2d0-4ac4-07427290835a',
			'729d38d6-5bc6-6bab-d7e3-a76bc3a371c9',
			'e00f0bd3-7fd3-1724-de98-875c1f937eb0',
			'9bf4059e-ecb7-8969-0ffa-7b5d61b42f28',
			'4af45d21-d607-e7bb-2823-86593124e1d7',
			'3b232664-30e0-27f0-8390-498018c7b630',
			'59bb48c1-d0be-0f61-e36f-524a349a731a',
			'b592f45f-6273-2316-38a5-c93950248e58',
			'5c8c80c8-e447-1c3c-886e-77c7639ceea1',
			'33849581-b886-38d0-5d44-7b185bb525db',
			'a0b1a1dd-1721-130a-148f-e42c8a154af2',
			'256320ed-75ab-15f7-0b30-5736ea7cfb7f',
			'18533d5d-c12d-7283-ee63-b7dbe09e3448',
			'f4b45bc7-36ed-7855-64ab-726df70dbc63',
			'fd4eee75-896c-086d-e1fe-18a2e1257df5',
			'13c6e02e-51c9-1092-9a69-7f03079b9e5a',
			'aea3980a-195a-a279-1404-68fb6b6c02e6',
			'56c41460-5205-5534-f10e-053c9d796104',
			'a5c9d666-988d-4c8c-439a-d13205556127',
			'c1a48134-da5e-647f-1919-a6992e5a4307',
			'0f27a670-adf7-c6c7-842e-91b5b092f039',
			'0cdd785c-b11d-e241-ba4c-334a8db75c74',
			'e5abf5df-f5a7-9077-a82e-8b70a7c47785',
			'2771d959-ec5f-183d-4e0d-133f6f537ef6',
			'93bfb10b-b95f-2794-3af6-90346fa8067c',
			'ca9687dd-78ff-2489-352b-f4ad4235466c',
			'adf5174c-05f9-0434-2f68-7ff4d4845bb3'
		],
		entities: {
			'f9c67c93-5042-35b4-22b1-08d7d955b913': {
				repo: 'goodOrg/repo',
				initiated_by: 'Eddard.Stark@example.com',
				service: 'goodVcs',
				branch: 'test',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 55,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-a7-0943c4bae81e48',
				scan_id: 'f9c67c93-5042-35b4-22b1-08d7d955b913',
				success: false,
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'd917d175-17e3-1337-ea53-ce745be2b5a3': {
				repo: 'goodOrg/repo',
				initiated_by: 'Robb.Stark@example.com',
				service: 'goodVcs',
				branch: 'dev',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 260,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-1b3-d2645c154947e',
				scan_id: 'd917d175-17e3-1337-ea53-ce745be2b5a3',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'6bfd7612-ef88-288b-7071-5e4cc9384588': {
				repo: 'goodOrg/repo',
				initiated_by: 'Gendry@example.com',
				service: 'goodVcs',
				branch: 'test',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 347,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-aa90cec6ce3f2b8-b',
				scan_id: '6bfd7612-ef88-288b-7071-5e4cc9384588',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'5bfbfc7e-6f92-388c-9b13-0b4cd8ea1c6d': {
				repo: 'goodOrg/repo',
				initiated_by: 'Sansa.Stark@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 258,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-7485037f69-6fea09',
				scan_id: '5bfbfc7e-6f92-388c-9b13-0b4cd8ea1c6d',
				success: false,
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'136a3d03-7509-296a-050f-ebe57bc4800c': {
				repo: 'goodOrg/repo',
				initiated_by: 'Gendry@example.com',
				service: 'goodVcs',
				branch: null,
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 166,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:43:37+00:00'
				},
				engine_id: 'i-434611cf1b8431e35',
				scan_id: '136a3d03-7509-296a-050f-ebe57bc4800c',
				success: false,
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'9990a263-b526-e278-e045-71693dc35fb7': {
				repo: 'goodOrg/repo',
				initiated_by: 'Stannis.Baratheon@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 163,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-f29b751550067f15a',
				scan_id: '9990a263-b526-e278-e045-71693dc35fb7',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'839e437b-fccd-cf4b-6bd2-319ba7cdaa6f': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jeor.Mormont@example.com',
				service: 'goodVcs',
				branch: 'qa',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 9,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T17:43:45+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-5dc3-af55e75-cf40',
				scan_id: '839e437b-fccd-cf4b-6bd2-319ba7cdaa6f',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {},
				application_metadata: {}
			},
			'edc2bd2e-c61f-61b7-fb39-72dedc1cf857': {
				repo: 'goodOrg/repo',
				initiated_by: 'Eddard.Stark@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 400,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-698fdd77db-a07621',
				scan_id: 'edc2bd2e-c61f-61b7-fb39-72dedc1cf857',
				success: true,
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'ba8ca3bf-526c-687d-ff25-c70195c721a5': {
				repo: 'goodOrg/repo',
				initiated_by: 'Grey.Worm@example.com',
				service: 'goodVcs',
				branch: 'dev',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 199,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-937ad1981d70363ec',
				scan_id: 'ba8ca3bf-526c-687d-ff25-c70195c721a5',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'c25b4101-e621-bf90-82d7-f72d478da6d8': {
				repo: 'goodOrg/repo',
				initiated_by: 'Margaery.Tyrell@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 194,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-5ae490ede4cf2e7c9',
				scan_id: 'c25b4101-e621-bf90-82d7-f72d478da6d8',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'adbdaa84-4cc1-f124-69ad-806d97920cd0': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jeor.Mormont@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 228,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:43:45+00:00'
				},
				engine_id: 'i-bfa9-cb6446b3e13a',
				scan_id: 'adbdaa84-4cc1-f124-69ad-806d97920cd0',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'8e469945-27da-48bf-f48a-bb0463e194fd': {
				repo: 'goodOrg/repo',
				initiated_by: 'Gendry@example.com',
				service: 'goodVcs',
				branch: 'test',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 28,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-0e4ea35d768460-ce',
				scan_id: '8e469945-27da-48bf-f48a-bb0463e194fd',
				success: false,
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'a8f407e7-0097-9d85-4c7c-78506f59e556': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jon.Snow@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 370,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin static_analysis scan',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 3,
					total_plugins: 4
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-2a44d30aa2cfb6ec1',
				scan_id: 'a8f407e7-0097-9d85-4c7c-78506f59e556',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {}
			},
			'82510225-cd71-ca58-becd-7eabb03e16d5': {
				repo: 'goodOrg/repo',
				initiated_by: 'Tommen.Baratheon@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 446,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-dd260d3a5e995e942',
				scan_id: '82510225-cd71-ca58-becd-7eabb03e16d5',
				success: false,
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: null,
					inventory: null
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				application_metadata: {},
			},
			'aae24a4a-f523-dbbb-62bc-bbac3342c4cb': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jaime.Lannister@example.com',
				service: 'goodVcs',
				branch: 'qa',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 160,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T17:43:45+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-787b5dcdf51d6305f',
				scan_id: 'aae24a4a-f523-dbbb-62bc-bbac3342c4cb',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: null,
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'a4389373-c858-4fa0-26b9-a8f0f19c6e75': {
				repo: 'goodOrg/repo',
				initiated_by: 'Grey.Worm@example.com',
				service: 'goodVcs',
				branch: null,
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 450,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin vulnerability scan',
				status_detail: {
					plugin_name: 'vulnerability scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 1,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T17:43:45+00:00',
					end: null
				},
				engine_id: 'i-5473d87ab37d-5a09',
				scan_id: 'a4389373-c858-4fa0-26b9-a8f0f19c6e75',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					secrets: null,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'746c5a3c-0ebe-1530-58c4-cf5415f5a097': {
				repo: 'goodOrg/repo',
				initiated_by: 'Ygritte@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 330,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: null,
					plugin_start_time: null,
					current_plugin: null,
					total_plugins: null
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-2a-7d-c65d6113fe3',
				scan_id: '746c5a3c-0ebe-1530-58c4-cf5415f5a097',
				success: true,
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: null,
					inventory: null
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				application_metadata: {},
			},
			'548bb3d0-87db-daab-7f5a-270f4f6b474f': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jon.Snow@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 332,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin static_analysis scan',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i--aba93a36006ad60a',
				scan_id: '548bb3d0-87db-daab-7f5a-270f4f6b474f',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {}
			},
			'8bc61918-3273-96e2-fe2b-285357753164': {
				repo: 'goodOrg/repo',
				initiated_by: 'Melisandre@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 342,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-06a4b8f86c-dab63f',
				scan_id: '8bc61918-3273-96e2-fe2b-285357753164',
				success: true,
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				application_metadata: {},
			},
			'bfc16816-a447-7865-7834-918eddf9f6a9': {
				repo: 'goodOrg/repo',
				initiated_by: 'This.\'Is\'My.Name?&#<testme>@example.com',
				service: 'goodVcs',
				branch: 'integration',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 70,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin inventory scan',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-8c116a4224a-5d358',
				scan_id: 'bfc16816-a447-7865-7834-918eddf9f6a9',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'7f1e7817-7f39-8493-a7bf-5cb64d0d0a92': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jon.Snow@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 407,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin static_analysis scan',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 2,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-52846-599ec95534b',
				scan_id: '7f1e7817-7f39-8493-a7bf-5cb64d0d0a92',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'7f0ff371-12d3-41f8-e907-ef7f02061fb4': {
				repo: 'goodOrg/repo',
				initiated_by: 'Sansa.Stark@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 5,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-8d826a5432908df3-',
				scan_id: '7f0ff371-12d3-41f8-e907-ef7f02061fb4',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: null,
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'32fd0a0f-0161-044f-ad2b-85a6a173e173': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jaime.Lannister@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 103,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-eb-500f7a8529b1d2',
				scan_id: '32fd0a0f-0161-044f-ad2b-85a6a173e173',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'c7234750-f8cc-e2d0-4ac4-07427290835a': {
				repo: 'goodOrg/repo',
				initiated_by: 'Stannis.Baratheon@example.com',
				service: 'goodVcs',
				branch: 'integration',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 400,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i--2-818bbe-82900e7',
				scan_id: 'c7234750-f8cc-e2d0-4ac4-07427290835a',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {}
			},
			'729d38d6-5bc6-6bab-d7e3-a76bc3a371c9': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jorah.Mormont@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 485,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin inventory scan',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-ec2753919d36b5c4c',
				scan_id: '729d38d6-5bc6-6bab-d7e3-a76bc3a371c9',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'e00f0bd3-7fd3-1724-de98-875c1f937eb0': {
				repo: 'goodOrg/repo',
				initiated_by: 'Roose.Bolton@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 123,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'vulnerability scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-f-11854d26db1deed',
				scan_id: 'e00f0bd3-7fd3-1724-de98-875c1f937eb0',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: null,
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'9bf4059e-ecb7-8969-0ffa-7b5d61b42f28': {
				repo: 'goodOrg/repo',
				initiated_by: 'Tormund.Giantsbane@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 123,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin static_analysis scan',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-637dca6bff2e23fc5',
				scan_id: '9bf4059e-ecb7-8969-0ffa-7b5d61b42f28',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'4af45d21-d607-e7bb-2823-86593124e1d7': {
				repo: 'goodOrg/repo',
				initiated_by: 'Brienne.of.Tarth@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 83,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'terminated',
				status_detail: {
					plugin_name: null,
					plugin_start_time: null,
					current_plugin: null,
					total_plugins: null
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-52d1b523afa-96e58',
				scan_id: '4af45d21-d607-e7bb-2823-86593124e1d7',
				application_metadata: {},
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'3b232664-30e0-27f0-8390-498018c7b630': {
				repo: 'goodOrg/repo',
				initiated_by: 'Ygritte@example.com',
				service: 'goodVcs',
				branch: null,
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 446,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-797a5-1e-9d47de-a',
				scan_id: '3b232664-30e0-27f0-8390-498018c7b630',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'59bb48c1-d0be-0f61-e36f-524a349a731a': {
				repo: 'goodOrg/repo',
				initiated_by: 'Davos.Seaworth@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 309,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-ac1e-59-87b0c96fa',
				scan_id: '59bb48c1-d0be-0f61-e36f-524a349a731a',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {},
				application_metadata: {}
			},
			'b592f45f-6273-2316-38a5-c93950248e58': {
				repo: 'goodOrg/repo',
				initiated_by: 'Cersei.Lannister@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 478,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'processing',
				status_detail: {
					plugin_name: null,
					plugin_start_time: null,
					current_plugin: null,
					total_plugins: null
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T17:44:57+00:00',
					end: null
				},
				engine_id: 'i-37868b26d5a8db757',
				scan_id: 'b592f45f-6273-2316-38a5-c93950248e58',
				application_metadata: {},
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 0,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'5c8c80c8-e447-1c3c-886e-77c7639ceea1': {
				repo: 'goodOrg/repo',
				initiated_by: null,
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 422,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin secret scan',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 1,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i--382e526160713c59',
				scan_id: '5c8c80c8-e447-1c3c-886e-77c7639ceea1',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 0,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'33849581-b886-38d0-5d44-7b185bb525db': {
				repo: 'goodOrg/repo',
				initiated_by: 'Sandor.Clegane@example.com',
				service: 'goodVcs',
				branch: 'dev',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 27,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'error',
				status_detail: {
					plugin_name: null,
					plugin_start_time: null,
					current_plugin: null,
					total_plugins: null
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-4-27f963e98ea9d8e',
				scan_id: '33849581-b886-38d0-5d44-7b185bb525db',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'Repo too large (all the many KB)'
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: null,
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'a0b1a1dd-1721-130a-148f-e42c8a154af2': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jeor.Mormont@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 427,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-5daa9b6c569b4eaa0',
				scan_id: 'a0b1a1dd-1721-130a-148f-e42c8a154af2',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {}
			},
			'256320ed-75ab-15f7-0b30-5736ea7cfb7f': {
				repo: 'goodOrg/repo',
				initiated_by: 'Joffrey.Baratheon@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 98,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-7b0600-9a06c6e-cb',
				scan_id: '256320ed-75ab-15f7-0b30-5736ea7cfb7f',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {},
				application_metadata: {}
			},
			'18533d5d-c12d-7283-ee63-b7dbe09e3448': {
				repo: 'goodOrg/repo',
				initiated_by: 'Theon.Greyjoy@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 216,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-65301ba511-1d196-',
				scan_id: '18533d5d-c12d-7283-ee63-b7dbe09e3448',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {},
				application_metadata: {}
			},
			'f4b45bc7-36ed-7855-64ab-726df70dbc63': {
				repo: 'goodOrg/repo',
				initiated_by: 'Varys@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 161,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-f1b720f991be7b-ff',
				scan_id: 'f4b45bc7-36ed-7855-64ab-726df70dbc63',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'fd4eee75-896c-086d-e1fe-18a2e1257df5': {
				repo: 'goodOrg/repo',
				initiated_by: 'Ramsay.Bolton@example.com',
				service: 'goodVcs',
				branch: 'dev',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 238,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin vulnerability scan',
				status_detail: {
					plugin_name: 'vulnerability scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 1,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-102e2cc2f88b783db',
				scan_id: 'fd4eee75-896c-086d-e1fe-18a2e1257df5',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					secrets: 0,
					static_analysis: null,
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'13c6e02e-51c9-1092-9a69-7f03079b9e5a': {
				repo: 'goodOrg/repo',
				initiated_by: 'Joffrey.Baratheon@example.com',
				service: 'goodVcs',
				branch: 'dev',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 477,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin secret scan',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-0cedb-c51dfaef-4c',
				scan_id: '13c6e02e-51c9-1092-9a69-7f03079b9e5a',
				application_metadata: {},
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 0,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'aea3980a-195a-a279-1404-68fb6b6c02e6': {
				repo: 'goodOrg/repo',
				initiated_by: 'Eddard.Stark@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 479,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-20ecf8-f25b725af7',
				scan_id: 'aea3980a-195a-a279-1404-68fb6b6c02e6',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {}
			},
			'56c41460-5205-5534-f10e-053c9d796104': {
				repo: 'goodOrg/repo',
				initiated_by: 'Viserys.Targaryen@example.com',
				service: 'goodVcs',
				branch: 'prod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 120,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-78bb0f9e1cbab77c4',
				scan_id: '56c41460-5205-5534-f10e-053c9d796104',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {}
			},
			'a5c9d666-988d-4c8c-439a-d13205556127': {
				repo: 'goodOrg/repo',
				initiated_by: 'Jon.Snow@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'-inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 4,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin secret scan',
				status_detail: {
					plugin_name: 'secret scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 1,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-3203ea778e4a65592',
				scan_id: 'a5c9d666-988d-4c8c-439a-d13205556127',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 0,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'c1a48134-da5e-647f-1919-a6992e5a4307': {
				repo: 'goodOrg/repo',
				initiated_by: 'Shae@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'static_analysis',
						'-vulnerability'
					],
					depth: 154,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin inventory scan',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-be6-29a9-92b-7118',
				scan_id: 'c1a48134-da5e-647f-1919-a6992e5a4307',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 4,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'0f27a670-adf7-c6c7-842e-91b5b092f039': {
				repo: 'goodOrg/repo',
				initiated_by: 'Daenerys.Stormborn.First.Of.Her.Name.The.Unburnt.Queen.Of.The.Andals.And.The.First.Men.Khaleesi.Of.The.Great.Grass.Sea.Breaker.Of.Chains.And.Mother.Of.Dragons.Targaryen@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 165,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin vulnerability scan',
				status_detail: {
					plugin_name: 'vulnerability scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 1,
					total_plugins: 4
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-9d588f314849c-4-a',
				scan_id: '0f27a670-adf7-c6c7-842e-91b5b092f039',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					secrets: 0,
					static_analysis: {
						critical: 0,
						high: 0,
						medium: 0,
						low: 0,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {},
				application_metadata: {}
			},
			'0cdd785c-b11d-e241-ba4c-334a8db75c74': {
				repo: 'goodOrg/repo',
				initiated_by: 'This.\'Is\'My.Name?&#<testme>@example.com',
				service: 'goodVcs',
				branch: 'nonprod',
				scan_options: {
					categories: [
						'-inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					plugins: [
						'-inventory',
						'-secret',
						'static_analysis',
						'vulnerability'
					],
					depth: 301,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'static_analysis scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-bfb1-3ff-1507246f',
				scan_id: '0cdd785c-b11d-e241-ba4c-334a8db75c74',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: {
						critical: 3,
						high: 1,
						medium: 1,
						low: 1,
						negligible: 0,
						'': 0
					},
					inventory: null
				},
				results: {}
			},
			'e5abf5df-f5a7-9077-a82e-8b70a7c47785': {
				repo: 'goodOrg/repo',
				initiated_by: 'Tommen.Baratheon@example.com',
				service: 'goodVcs',
				branch: 'test',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 291,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 1,
					total_plugins: 1
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-f--02195a0ee6f02e',
				scan_id: 'e5abf5df-f5a7-9077-a82e-8b70a7c47785',
				application_metadata: {},
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: null,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {}
			},
			'2771d959-ec5f-183d-4e0d-133f6f537ef6': {
				repo: 'goodOrg/repo',
				initiated_by: 'Brienne.of.Tarth@example.com',
				service: 'goodVcs',
				branch: 'integration',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 0,
					include_dev: false,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'failed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T16:10:50+00:00'
				},
				engine_id: 'i-cc00cca5320bd-666',
				scan_id: '2771d959-ec5f-183d-4e0d-133f6f537ef6',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					],
					failed: 'An unexpected error occurred unexpectedly'
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {},
				application_metadata: {}
			},
			'93bfb10b-b95f-2794-3af6-90346fa8067c': {
				repo: 'goodOrg/repo',
				initiated_by: 'Catelyn.Stark@example.com',
				service: 'goodVcs',
				branch: 'main',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 170,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'completed',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T16:10:50+00:00',
					current_plugin: 3,
					total_plugins: 3
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: '2021-11-22T17:44:57+00:00'
				},
				engine_id: 'i-8bbdff1c-a31deafc',
				scan_id: '93bfb10b-b95f-2794-3af6-90346fa8067c',
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: 4,
					static_analysis: null,
					inventory: {
						base_images: 3,
						technology_discovery: 12
					}
				},
				results: {},
				application_metadata: {}
			},
			'ca9687dd-78ff-2489-352b-f4ad4235466c': {
				repo: 'goodOrg/repo',
				initiated_by: 'Daario.Naharis@example.com',
				service: 'goodVcs',
				branch: 'qa',
				scan_options: {
					categories: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					plugins: [
						'inventory',
						'-secret',
						'-static_analysis',
						'vulnerability'
					],
					depth: 186,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'running plugin inventory scan',
				status_detail: {
					plugin_name: 'inventory scan',
					plugin_start_time: '2021-11-22T17:44:57+00:00',
					current_plugin: 2,
					total_plugins: 2
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T16:10:50+00:00',
					end: null
				},
				engine_id: 'i-d38340af57db779b4',
				scan_id: 'ca9687dd-78ff-2489-352b-f4ad4235466c',
				application_metadata: {},
				success: false,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: {
						critical: 3,
						high: 2,
						medium: 2,
						low: 2,
						negligible: 1,
						'': 2
					},
					secrets: null,
					static_analysis: null,
					inventory: null
				},
				results: {}
			},
			'adf5174c-05f9-0434-2f68-7ff4d4845bb3': {
				repo: 'goodOrg/repo',
				initiated_by: 'Tywin.Lannister@example.com',
				service: 'goodVcs',
				branch: 'qa',
				scan_options: {
					categories: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					plugins: [
						'inventory',
						'secret',
						'-static_analysis',
						'-vulnerability'
					],
					depth: 211,
					include_dev: true,
					callback: {
						url: null,
						client_id: null
					},
					batch_priority: false,
					include_paths: [],
					exclude_paths: [],
				},
				status: 'processing',
				status_detail: {
					plugin_name: null,
					plugin_start_time: null,
					current_plugin: null,
					total_plugins: null
				},
				timestamps: {
					queued: '2021-11-22T16:10:50+00:00',
					start: '2021-11-22T17:44:57+00:00',
					end: null
				},
				engine_id: 'i-53a-a0337cd0c5aa-',
				scan_id: 'adf5174c-05f9-0434-2f68-7ff4d4845bb3',
				success: true,
				truncated: false,
				errors: {
					'Some Scanner': [
						'Plugin returned invalid output: ',
						'Error1',
						'Error2',
						'Error3'
					],
					'Some Other Scanner': [
						'Make the scan alerts scroll'
					],
					'Yet One Other Scanner': [
						'Make the scan alerts scroll some more'
					]
				},
				alerts: {
					'An array of things': [
						'Thing1',
						'Thing2',
						'Anotherthing'
					],
					'This Alert': [
						'Whoo, an array'
					],
					'That Alert': [
						'Make these alerts scroll'
					]
				},
				debug: {
					Setup: [
						'Dockerfiles automatically built for scanning: All the Dockerfiles'
					]
				},
				results_summary: {
					vulnerabilities: null,
					secrets: 0,
					static_analysis: null,
					inventory: null
				},
				results: {}
			}
		},
		status: 'succeeded',
		error: null,
		totalRecords: 260
	}
};

export const mockUsers: RootState = {
	...mockStoreEmpty,
  users: {
    ids: [
      'Arya.Stark@example.com',
      'Brandon.Stark@example.com',
      'Brienne.of.Tarth@example.com',
      'Bronn@example.com',
      'Catelyn.Stark@example.com',
      'Cersei.Lannister@example.com',
      'Daario.Naharis@example.com',
      'Daenerys.Stormborn.First.Of.Her.Name.The.Unburnt.Queen.Of.The.Andals.And.The.First.Men.Khaleesi.Of.The.Great.Grass.Sea.Breaker.Of.Chains.And.Mother.Of.Dragons.Targaryen@example.com',
      'Davos.Seaworth@example.com',
      'Eddard.Stark@example.com',
      'Ellaria.Sand@example.com',
      'Gendry@example.com',
      'Gilly@example.com',
      'Grey.Worm@example.com',
      'Jaime.Lannister@example.com',
      'Jaqen.H\'ghar@example.com',
      'Jeor.Mormont@example.com',
      'Joffrey.Baratheon@example.com',
      'Jon.Snow@example.com',
      'Jorah.Mormont@example.com',
      'Margaery.Tyrell@example.com',
      'Melisandre@example.com',
      'Missandei@example.com',
      'Petyr.Baelish@example.com',
      'Ramsay.Bolton@example.com',
      'Robb.Stark@example.com',
      'Robert.Baratheon@example.com',
      'Roose.Bolton@example.com',
      'Samwell.Tarly@example.com',
      'Sandor.Clegane@example.com',
      'Sansa.Stark@example.com',
      'Shae@example.com',
      'Stannis.Baratheon@example.com',
      'Talisa.Maegyr@example.com',
      'Theon.Greyjoy@example.com',
      'This.\'Is\'My.Name?&#<testme>@example.com',
      'Tommen.Baratheon@example.com',
      'Tormund.Giantsbane@example.com',
      'Tyrion.Lannister@example.com',
      'Tywin.Lannister@example.com',
      'Varys@example.com',
      'Viserys.Targaryen@example.com',
      'Ygritte@example.com'
    ],
    entities: {
      'Arya.Stark@example.com': {
        email: 'Arya.Stark@example.com',
        admin: true,
        last_login: '2020-12-30T16:00:05.019Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Brandon.Stark@example.com': {
        email: 'Brandon.Stark@example.com',
        admin: false,
        last_login: '2021-10-11T16:00:05.019Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Brienne.of.Tarth@example.com': {
        email: 'Brienne.of.Tarth@example.com',
        admin: false,
        last_login: '2021-08-07T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Bronn@example.com': {
        email: 'Bronn@example.com',
        admin: false,
        last_login: '2020-11-25T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Catelyn.Stark@example.com': {
        email: 'Catelyn.Stark@example.com',
        admin: false,
        last_login: '2021-05-21T16:00:05.018Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Cersei.Lannister@example.com': {
        email: 'Cersei.Lannister@example.com',
        admin: false,
        last_login: '2021-08-29T16:00:05.018Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Daario.Naharis@example.com': {
        email: 'Daario.Naharis@example.com',
        admin: true,
        last_login: '2020-12-15T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Daenerys.Stormborn.First.Of.Her.Name.The.Unburnt.Queen.Of.The.Andals.And.The.First.Men.Khaleesi.Of.The.Great.Grass.Sea.Breaker.Of.Chains.And.Mother.Of.Dragons.Targaryen@example.com': {
        email: 'Daenerys.Stormborn.First.Of.Her.Name.The.Unburnt.Queen.Of.The.Andals.And.The.First.Men.Khaleesi.Of.The.Great.Grass.Sea.Breaker.Of.Chains.And.Mother.Of.Dragons.Targaryen@example.com',
        admin: false,
        last_login: '2021-06-12T16:00:05.018Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Davos.Seaworth@example.com': {
        email: 'Davos.Seaworth@example.com',
        admin: false,
        last_login: '2021-07-06T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Eddard.Stark@example.com': {
        email: 'Eddard.Stark@example.com',
        admin: false,
        last_login: '2021-02-06T16:00:05.018Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Ellaria.Sand@example.com': {
        email: 'Ellaria.Sand@example.com',
        admin: false,
        last_login: '2021-08-06T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Gendry@example.com': {
        email: 'Gendry@example.com',
        admin: false,
        last_login: '2021-07-31T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Gilly@example.com': {
        email: 'Gilly@example.com',
        admin: true,
        last_login: '2021-06-05T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Grey.Worm@example.com': {
        email: 'Grey.Worm@example.com',
        admin: false,
        last_login: '2021-05-26T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Jaime.Lannister@example.com': {
        email: 'Jaime.Lannister@example.com',
        admin: false,
        last_login: '2021-11-02T16:00:05.018Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Jaqen.H\'ghar@example.com': {
        email: 'Jaqen.H\'ghar@example.com',
        admin: false,
        last_login: '2021-10-08T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Jeor.Mormont@example.com': {
        email: 'Jeor.Mormont@example.com',
        admin: false,
        last_login: '2021-04-18T16:00:05.019Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Joffrey.Baratheon@example.com': {
        email: 'Joffrey.Baratheon@example.com',
        admin: false,
        last_login: '2020-12-02T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Jon.Snow@example.com': {
        email: 'Jon.Snow@example.com',
        admin: true,
        last_login: '2021-05-20T16:00:05.018Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Jorah.Mormont@example.com': {
        email: 'Jorah.Mormont@example.com',
        admin: false,
        last_login: '2020-11-29T16:00:05.018Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Margaery.Tyrell@example.com': {
        email: 'Margaery.Tyrell@example.com',
        admin: false,
        last_login: '2021-11-14T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Melisandre@example.com': {
        email: 'Melisandre@example.com',
        admin: false,
        last_login: '2021-11-09T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Missandei@example.com': {
        email: 'Missandei@example.com',
        admin: true,
        last_login: '2021-05-19T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Petyr.Baelish@example.com': {
        email: 'Petyr.Baelish@example.com',
        admin: true,
        last_login: '2021-08-03T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Ramsay.Bolton@example.com': {
        email: 'Ramsay.Bolton@example.com',
        admin: false,
        last_login: '2021-03-12T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Robb.Stark@example.com': {
        email: 'Robb.Stark@example.com',
        admin: false,
        last_login: '2020-12-02T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Robert.Baratheon@example.com': {
        email: 'Robert.Baratheon@example.com',
        admin: true,
        last_login: '2021-02-05T16:00:05.018Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Roose.Bolton@example.com': {
        email: 'Roose.Bolton@example.com',
        admin: true,
        last_login: '2020-12-10T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Samwell.Tarly@example.com': {
        email: 'Samwell.Tarly@example.com',
        admin: false,
        last_login: '2021-02-24T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Sandor.Clegane@example.com': {
        email: 'Sandor.Clegane@example.com',
        admin: false,
        last_login: '2021-04-26T16:00:05.019Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Sansa.Stark@example.com': {
        email: 'Sansa.Stark@example.com',
        admin: false,
        last_login: '2021-07-12T16:00:05.019Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Shae@example.com': {
        email: 'Shae@example.com',
        admin: false,
        last_login: '2021-01-03T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Stannis.Baratheon@example.com': {
        email: 'Stannis.Baratheon@example.com',
        admin: true,
        last_login: '2021-08-01T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Talisa.Maegyr@example.com': {
        email: 'Talisa.Maegyr@example.com',
        admin: true,
        last_login: '2021-04-08T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Theon.Greyjoy@example.com': {
        email: 'Theon.Greyjoy@example.com',
        admin: false,
        last_login: '2021-09-21T16:00:05.019Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'This.\'Is\'My.Name?&#<testme>@example.com': {
        email: 'This.\'Is\'My.Name?&#<testme>@example.com',
        admin: false,
        last_login: '2021-05-12T16:00:05.017Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Tommen.Baratheon@example.com': {
        email: 'Tommen.Baratheon@example.com',
        admin: true,
        last_login: '2021-11-11T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Tormund.Giantsbane@example.com': {
        email: 'Tormund.Giantsbane@example.com',
        admin: false,
        last_login: '2021-03-05T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Tyrion.Lannister@example.com': {
        email: 'Tyrion.Lannister@example.com',
        admin: false,
        last_login: '2021-07-20T16:00:05.019Z',
        scope: [
          '*'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      },
      'Tywin.Lannister@example.com': {
        email: 'Tywin.Lannister@example.com',
        admin: false,
        last_login: '2021-03-20T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Varys@example.com': {
        email: 'Varys@example.com',
        admin: false,
        last_login: '2021-10-24T16:00:05.020Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Viserys.Targaryen@example.com': {
        email: 'Viserys.Targaryen@example.com',
        admin: false,
        last_login: '2021-09-30T16:00:05.018Z',
        scope: [
          'goodVcs/goodOrg/regex-[0-9]',
          'goodVcs/goodOrg/org/path/not/[!0-9]',
          'goodVcs/goodOrg/org/path/?',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField/repo',
          'goodVcs.goodOrg.com/interpret[?]'
        ],
        features: {
          snyk: false
        },
        scan_orgs: [
          'goodVcs.goodOrg.com]',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField'
        ]
      },
      'Ygritte@example.com': {
        email: 'Ygritte@example.com',
        admin: false,
        last_login: '2021-07-18T16:00:05.020Z',
        scope: [
          '*'
        ],
        features: {
          snyk: true
        },
        scan_orgs: [
          'badVcs/badOrg',
          'goodVcs.goodOrg.com',
          'goodVcs/goodOrg',
          'goodVcs/goodOrg/org/path',
          'goodVcs/goodOrgThisIsAVeryLongNameForTheField',
          'session/timeout'
        ]
      }
    },
    status: 'succeeded',
    action: null,
    error: null,
    totalRecords: 43
  },
};

export const mockStoreApiKeys: RootState = {
	...mockStoreEmpty,
  keys: {
    ids: [
      'c5365468-3e07-31f9-a613-dae804c84efb'
    ],
    entities: {
      'c5365468-3e07-31f9-a613-dae804c84efb': {
        id: 'c5365468-3e07-31f9-a613-dae804c84efb',
        name: 'test.me',
        created: '2021-11-24T19:08:28+00:00',
        last_used: null,
        expires: null,
        scope: [
          '*'
        ],
        admin: false,
        features: {
          snyk: false
        }
      }
    },
    status: 'succeeded',
    error: null,
    totalRecords: 1
  },
};

export const mockStoreNotification: RootState = {
	...mockStoreEmpty,
	scans: {
		entities: {},
		ids: [],
		error: null, // additions to default entity
		status: "idle",
		totalRecords: 5,
	},
	notifications: {
		entities: {
			0: {
				message: "Error",
				type: "error",
			},
			1: {
				message: "Warning",
				type: "warning",
			},
			2: {
				message: "Success",
				type: "success",
			},
			3: {
				message: "Info",
				type: "info",
			},
			4: {
				message: "Error2",
				type: "error",
			},
			5: {
				message: "Success2",
				type: "success",
			},
		},
		ids: [0, 1, 2, 3, 4, 5],
	},
	globalException: {
		message: "A global exception message",
		action: "login",
	},
	hiddenFindings: {
		ids: [0],
		status: "idle",
		action: "get",
		error: null,
		entities: {
			one: {
				type: "vulnerability_raw",
				value: { id: "raw_vuln" },
				reason: "found vuln",
			},
		},
	},
	keys: {
		ids: [0, 1, 2, 3, 4, 5],
		status: "succeeded",
		error: null,
		totalRecords: 6,
		entities: {},
	},
	users: {
		ids: [1, 2, 3],
		entities: {},
		status: "succeeded",
		action: null,
		error: null,
		totalRecords: 3,
	},
};

export const mockStoreScanSlice: RootState = {
	...mockStoreEmpty,
	scans: {
		totalRecords: 3,
		entities: {
			abc123: {
				repo: "repo1",
				scan_id: "abc123",
				initiated_by: null,
				service: "vcs1",
				branch: null,
				status: "queued",
				status_detail: {
					plugin_name: "test",
					plugin_start_time: null,
					current_plugin: 1,
					total_plugins: 5,
				},
				success: false,
				truncated: false,
				timestamps: { queued: null, start: null, end: null },
				errors: {},
				results: {
					vulnerabilities: {},
					secrets: {},
					static_analysis: {},
					inventory: {},
				},
				scan_options: {
					categories: [],
					plugins: [],
					depth: null,
					include_dev: true,
					batch_priority: true,
					include_paths: [],
					exclude_paths: [],
				},
			},
			xyz321: {
				repo: "repo2",
				scan_id: "xyz321",
				initiated_by: null,
				service: "vcs2",
				branch: null,
				status: "terminated",
				status_detail: {
					plugin_name: "test",
					plugin_start_time: null,
					current_plugin: 1,
					total_plugins: 5,
				},
				success: false,
				truncated: false,
				timestamps: { queued: null, start: null, end: null },
				errors: {},
				results: {
					vulnerabilities: {},
					secrets: {},
					static_analysis: {},
					inventory: {},
				},
				scan_options: {
					categories: [],
					plugins: [],
					depth: null,
					include_dev: true,
					batch_priority: true,
					include_paths: [],
					exclude_paths: [],
				},
			},
			scan_id: {
				repo: "repo3",
				scan_id: "scan_id",
				initiated_by: null,
				service: "vcs2",
				branch: null,
				status: "error",
				status_detail: {
					plugin_name: "test",
					plugin_start_time: null,
					current_plugin: 1,
					total_plugins: 5,
				},
				success: false,
				truncated: false,
				timestamps: { queued: null, start: null, end: null },
				errors: {},
				results: {
					vulnerabilities: {},
					secrets: {},
					static_analysis: {},
					inventory: {},
				},
				scan_options: {
					categories: [],
					plugins: [],
					depth: null,
					include_dev: true,
					batch_priority: true,
					include_paths: [],
					exclude_paths: [],
				},
			},
		},
		ids: ["abc123", "xyz321", "scan_id"],
		error: "rut roh it failed", // additions to default entity
		status: "failed",
	},
	notifications: {
		entities: {},
		ids: [],
	},
	globalException: {
		message: "global message",
		action: "login",
	},
	users: {
		ids: [1, 2, 3],
		entities: {},
		status: "succeeded",
		action: null,
		error: null,
		totalRecords: 3,
	},
	keys: {
		ids: ["abc123", "xyz321", "scan_id"],
		entities: {},
		error: null,
		status: "idle",
		totalRecords: 3,
	},
	hiddenFindings: {
		ids: [0],
		status: "idle",
		action: "get",
		error: null,
		entities: {
			one: {
				type: "vulnerability_raw",
				value: { id: "raw_vuln" },
				reason: "found vuln",
			},
		},
	},
};

export const vulnRow = {
	"keyId": "vulnerability-component1-CVE-2019-00000-high",
	"type": "vulnerability",
	"url": "goodVcs/goodOrg/repo",
	"createdBy": "Ellaria.Sand@example.com",
	"hasHiddenFindings": true,
	"hiddenFindings": [
			{
					"id": "596ee47d-65de-8c12-98c3-ca9eff3b4224",
					"type": "vulnerability",
					"value": {
							"id": "CVE-2019-00000",
							"component": "component1",
							"source": "node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency1",
							"severity": "high"
					},
					"expires": "2021-08-11T02:00:47.269Z",
					"reason": "expiring test hiding a subset of files with vuln finding (1)",
					"created_by": "Ellaria.Sand@example.com"
			},
			{
					"id": "69438fcb-13da-8b50-fe71-dfd0ccd91be1",
					"type": "vulnerability",
					"value": {
							"id": "CVE-2019-00000",
							"component": "component1",
							"source": "node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency2",
							"severity": "high"
					},
					"expires": "2021-08-11T02:00:47.269Z",
					"reason": "expiring test hiding a subset of files with vuln finding (2)",
					"created_by": "Ellaria.Sand@example.com"
			},
			{
					"id": "ed1edfd8-4056-a73a-77bb-d117a4b31f23",
					"type": "vulnerability",
					"value": {
							"id": "CVE-2019-00000",
							"component": "component1",
							"source": "docker/Dockerfile.platform7",
							"severity": "high"
					},
					"expires": "2021-08-11T02:00:47.270Z",
					"reason": "expiring test hiding a subset of files with vuln finding (3)",
					"created_by": "Ellaria.Sand@example.com"
			},
			{
					"id": "9a016aed-40f7-7a26-3477-b399337db20f",
					"type": "vulnerability",
					"value": {
							"id": "CVE-2019-00000",
							"component": "component1",
							"source": "docker/Dockerfile.platform27",
							"severity": "high"
					},
					"expires": "2021-08-11T02:00:47.270Z",
					"reason": "expiring test hiding a subset of files with vuln finding (4)",
					"created_by": "Ellaria.Sand@example.com"
			}
	],
	"unhiddenFindings": [
			"node/a_very_long_directory_name_tests_and_samples/package.json: component",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency3",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency4",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component1",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component2",
			"docker/Dockerfile.platform2",
			"docker/Dockerfile.platform3",
			"docker/Dockerfile.platform4",
			"docker/Dockerfile.platform5",
			"docker/Dockerfile.platform6",
			"docker/Dockerfile.platform8",
			"docker/Dockerfile.platform9",
			"docker/Dockerfile.platform0",
			"docker/Dockerfile.platform10",
			"docker/Dockerfile.platform11",
			"docker/Dockerfile.platform12",
			"docker/Dockerfile.platform13",
			"docker/Dockerfile.platform14",
			"docker/Dockerfile.platform15",
			"docker/Dockerfile.platform16",
			"docker/Dockerfile.platform17",
			"docker/Dockerfile.platform18",
			"docker/Dockerfile.platform19",
			"docker/Dockerfile.platform20",
			"docker/Dockerfile.platform21",
			"docker/Dockerfile.platform22",
			"docker/Dockerfile.platform23",
			"docker/Dockerfile.platform24",
			"docker/Dockerfile.platform25",
			"docker/Dockerfile.platform26"
	],
	"component": "component1",
	"id": "CVE-2019-00000",
	"severity": "high",
	"source": [
			"node/a_very_long_directory_name_tests_and_samples/package.json: component",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency1",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency2",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency3",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency4",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component1",
			"node/a_very_long_directory_name_tests_and_samples/package.json: component2",
			"docker/Dockerfile.platform2",
			"docker/Dockerfile.platform3",
			"docker/Dockerfile.platform4",
			"docker/Dockerfile.platform5",
			"docker/Dockerfile.platform6",
			"docker/Dockerfile.platform7",
			"docker/Dockerfile.platform8",
			"docker/Dockerfile.platform9",
			"docker/Dockerfile.platform0",
			"docker/Dockerfile.platform10",
			"docker/Dockerfile.platform11",
			"docker/Dockerfile.platform12",
			"docker/Dockerfile.platform13",
			"docker/Dockerfile.platform14",
			"docker/Dockerfile.platform15",
			"docker/Dockerfile.platform16",
			"docker/Dockerfile.platform17",
			"docker/Dockerfile.platform18",
			"docker/Dockerfile.platform19",
			"docker/Dockerfile.platform20",
			"docker/Dockerfile.platform21",
			"docker/Dockerfile.platform22",
			"docker/Dockerfile.platform23",
			"docker/Dockerfile.platform24",
			"docker/Dockerfile.platform25",
			"docker/Dockerfile.platform26",
			"docker/Dockerfile.platform27"
	],
	"description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	"remediation": "imagine a remediation here"
};

export const findingVulnRawRow = {
	component: "Any",
	createdBy: "Tywin.Lannister@example.com",
	expires: "2021-08-14T02:52:39.848Z",
	hiddenFindings: [{
		created_by: "Tywin.Lannister@example.com",
		expires: "2021-08-14T02:52:39.848Z",
		id: "623df464-4681-b71c-1094-60de27944170",
		reason: "test expired vulnerability_raw type",
		type: "vulnerability_raw",
		value: {
			id: "CVE-2021-0101",
			severity: "critical",
		}
	}],
	keyId: "hiddenFinding-623df464-4681-b71c-1094-60de27944170",
	location: "CVE-2021-0101",
	severity: "critical",
	source: "Any",
	type: "vulnerability_raw",
	unhiddenFindings: [],
	url: "goodVcs/goodOrg/repo"
};

export const analysisRow = {
	"keyId": "static_analysis-/this/is/a/really/long/path/to/a/file/identified/as/a/static/analysis/finding/filename/is/code.py-7--critical",
	"type": "static_analysis",
	"url": "goodVcs/goodOrg/repo",
	"createdBy": "Jaqen.H'ghar@example.com",
	"hasHiddenFindings": false,
	"filename": "/this/is/a/really/long/path/to/a/file/identified/as/a/static/analysis/finding/filename/is/code.py",
	"line": 7,
	"resource": "XSS",
	"message": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel pellentesque sem",
	"severity": "critical",
	"commit": "b55b138109624e5cb44c4c77c88b3eaa",
	"repo": "secretproject/bleading-edge-repo",
	"service": "github",
	"branch": "unique-branch",
};

export const findingAnalysisRow = {
	"keyId": "hiddenFinding-4afb7b09-1aa9-2d4d-60df-de796de080d6",
	"url": "goodVcs/goodOrg/repo",
	"createdBy": "Arya.Stark@example.com",
	"type": "static_analysis",
	"expires": "Never",
	"source": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
	"location": 14,
	"component": "Potential template injection",
	"severity": "medium",
	"hiddenFindings": [
			{
					"id": "4afb7b09-1aa9-2d4d-60df-de796de080d6",
					"type": "static_analysis",
					"value": {
							"filename": "app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
							"line": 14,
							"type": "Potential template injection",
							"severity": "medium"
					},
					"expires": null,
					"reason": "test static_analysis type",
					"created_by": "Arya.Stark@example.com",
					"created": "2021-01-01T13:01:01Z",
					"updated_by": "Bron@example.com",
					"updated": "2021-02-02T14:02:02Z",
			}
	],
	"unhiddenFindings": []
};

export const secretRow = {
	"keyId": "secret-/this/is/a/really/long/path/to/a/file/identified/as/a/secret/filename/is/slack.pass-2-slack-deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
	"type": "secret",
	"url": "goodVcs/goodOrg/repo",
	"createdBy": "Jaqen.H'ghar@example.com",
	"hasHiddenFindings": false,
	"filename": "/this/is/a/really/long/path/to/a/file/identified/as/a/secret/filename/is/slack.pass",
	"line": 2,
	"resource": "slack",
	"commit": "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
};

// note: no created, updated, updated_by fields to test legacy support
export const findingSecretRow = {
	"keyId": "hiddenFinding-41b79a3b-9ff5-84c6-2249-6311b0a2249f",
	"url": "goodVcs/goodOrg/repo",
	"createdBy": "Arya.Stark@example.com",
	"type": "secret",
	"expires": "Never",
	"source": "folder/badfile2",
	"location": 177,
	"component": "q3498tlsdf9834tkjsdfg98u34t",
	"severity": "",
	"hiddenFindings": [
		{
			"id": "41b79a3b-9ff5-84c6-2249-6311b0a2249f",
			"type": "secret",
			"value": {
				"filename": "folder/badfile2",
				"line": 177,
				"commit": "q3498tlsdf9834tkjsdfg98u34t"
			},
			"expires": null,
			"reason": "test existing hidden finding, secret",
			"created_by": "Arya.Stark@example.com"
		}
	],
	"unhiddenFindings": []
};

// finding created but not updated
export const findingSecretRawRow = {
	"keyId": "hiddenFinding-accf20ee-243e-36ab-3ca7-4384ebf3ad50",
	"url": "goodVcs/goodOrg/repo",
	"createdBy": "Arya.Stark@example.com",
	"type": "secret_raw",
	"expires": "Never",
	"source": "Any",
	"location": "test.me",
	"component": "Any",
	"severity": "",
	"hiddenFindings": [
		{
			"id": "accf20ee-243e-36ab-3ca7-4384ebf3ad50",
			"type": "secret_raw",
			"value": {
				"value": "test.me"
			},
			"expires": null,
			"reason": "test secret_raw type",
			"created_by": "Arya.Stark@example.com",
			"created": "2021-01-01T13:01:01Z",
		}
	],
	"unhiddenFindings": []
};

export const mockSearchComponents = {
	results: [
		{
			name: "a-lovely-component",
			version: "0.0.1",
			licenses: [
				{
					id: "unlicensed",
					name: "Unlicensed",
				},
			],
			_id: "component-a-lovely-component-0.0.1",
		},
		{
			name: "another-component",
			version: "2.2.2",
			licenses: [],
			_id: "component-another-component-2.2.2",
		},
		{
			name: "awesome-game-sdk",
			version: "4.3.2",
			licenses: [
				{
					id: "gamecorp",
					name: "Game Corp",
				},
			],
			_id: "component-awesome-game-sdk-4.3.2",
		},
		{
			name: "awesome-zazz",
			version: "99.0.1",
			licenses: [],
			_id: "component-awesome-zazz-99.0.1",
		},
		{
			name: "bluetooth.ko",
			version: "0.0.5",
			licenses: [
				{
					id: "lgpl",
					name: "GNU Lesser General Public License",
				},
			],
			_id: "component-bluetooth.ko-0.0.5",
		},
		{
			name: "component2",
			version: "1.2.3",
			licenses: [
				{
					id: "mit",
					name: "MIT license (MIT)",
				},
			],
			_id: "component-component2-1.2.3",
		},
		{
			name: "library-for-neat-stuff",
			version: "0.6.1",
			licenses: [
				{
					id: "mit",
					name: "MIT license (MIT)",
				},
			],
			_id: "component-library-for-neat-stuff-0.6.1",
		},
		{
			name: "narwahl",
			version: "0.4.0",
			licenses: [],
			_id: "component-narwahl-0.4.0",
		},
		{
			name: "node/package",
			version: "1.0.0",
			licenses: [
				{
					id: "mit",
					name: "MIT license (MIT)",
				},
			],
			_id: "component-node/package-1.0.0",
		},
		{
			name: "nodejs-package",
			version: "1.0.0",
			licenses: [
				{
					id: "mit",
					name: "MIT license (MIT)",
				},
			],
			_id: "component-nodejs-package-1.0.0",
		},
		{
			name: "opensource-lib",
			version: "3.2.1",
			licenses: [
				{
					id: "apache",
					name: "Apache",
				},
			],
			_id: "component-opensource-lib-3.2.1",
		},
		{
			name: "os-file",
			version: "1.1.2",
			licenses: [
				{
					id: "bsd",
					name: "BSD 3-Clause",
				},
			],
			_id: "component-os-file-1.1.2",
		},
		{
			name: "pickle",
			version: "0.1.3",
			licenses: [
				{
					id: "mit",
					name: "MIT license (MIT)",
				},
			],
			_id: "component-pickle-0.1.3",
		},
		{
			name: "popular-lib",
			version: "x9000",
			licenses: [],
			_id: "component-popular-lib-x9000",
		},
		{
			name: "python-library",
			version: "19.20.21",
			licenses: [
				{
					id: "gpl3",
					name: "GNU Public License v3",
				},
			],
			_id: "component-python-library-19.20.21",
		},
		{
			name: "scan-buddy",
			version: "0.0.1pre1",
			licenses: [
				{
					id: "internal",
					name: "Internal",
				},
			],
			_id: "component-scan-buddy-0.0.1pre1",
		},
		{
			name: "super-duper-software",
			version: "1.3.4b",
			licenses: [
				{
					id: "license1",
					name: "The First License",
				},
				{
					id: "license2",
					name: "The Second License",
				},
				{
					id: "license3",
					name: "The Third License",
				},
			],
			_id: "component-super-duper-software-1.3.4b",
		},
		{
			name: "that-library-everyone-uses",
			version: "1.1.1",
			licenses: [],
			_id: "component-that-library-everyone-uses-1.1.1",
		},
		{
			name: "unkompressor",
			version: "HEAD",
			licenses: [],
			_id: "component-unkompressor-HEAD",
		},
		{
			name: "wow",
			version: "2.0.0",
			licenses: [
				{
					id: "bigcorp",
					name: "Big Corp",
				},
			],
			_id: "component-wow-2.0.0",
		},
	],
	count: 20,
	next: null,
	previous: null,
};

// subset of fields in mockSearchRepos
export const mockSearchComponentRepos = {
	count: 20,
	next: null,
	previous: null,
	results: [
		{service: 'azure', repo: 'tv/dev', risk: 'priority'},
		{service: 'azure', repo: 'tv/qa', risk: 'priority'},
		{service: 'azure', repo: 'tv/test', risk: 'critical'},
		{service: 'azure', repo: 'tv/new-show', risk: 'high'},
		{service: 'azure', repo: 'tv/game-of-chairs', risk: null},
		{service: 'azure', repo: 'tv/dragon-house', risk: null},
		{service: 'azure', repo: 'tv/peasmaker/season2', risk: null},
		{service: 'bigrepo.example.com', repo: 'cartoons-we-love', risk: null},
		{service: 'bitbucket', repo: 'movies/2quick2angry', risk: null},
		{service: 'bitbucket', repo: 'movies/another_superhero_movie', risk: null},
	],
};

export const mockSearchRepos = {
	results: [
			{
					service: "azure",
					repo: "tv/dev",
					risk: "priority",
					qualified_scan: {
							created: "2022-02-02T14:00:00Z",
							scan_id: "9cb02b99-fdcb-4234-5127-4e418d600f46"
					},
					application_metadata: {
						...sampleMetaData2,
					}
			},
			{
					service: "azure",
					repo: "tv/qa",
					risk: "priority",
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData3,
					}
			},
			{
					service: "azure",
					repo: "tv/test",
					risk: "critical",
					qualified_scan: {
							created: "2022-03-02T12:00:00Z",
							scan_id: "a4d915a7-2ce0-c42e-9ab6-d6e95843160e"
					},
					application_metadata: {
						...sampleMetaData4,
					}
			},
			{
					service: "azure",
					repo: "tv/new-show",
					risk: "high",
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData5,
					}
			},
			{
					service: "azure",
					repo: "tv/game-of-chairs",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "azure",
					repo: "tv/dragon-house",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "azure",
					repo: "tv/peasmaker/season2",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "bigrepo.example.com",
					repo: "cartoons-we-love",
					risk: null,
					qualified_scan: {
							created: "2022-02-22T14:22:22Z",
							scan_id: "3446feae-1480-d43f-680e-7087bff49d38"
					},
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "bitbucket",
					repo: "movies/2quick2angry",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "bitbucket",
					repo: "movies/another_superhero_movie",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "bitbucket",
					repo: "movies/thriller",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "bitbucket",
					repo: "movies/action",
					risk: null,
					qualified_scan: {
							created: "2021-12-12T12:12:12Z",
							scan_id: "32bc93b8-c337-f25d-aa33-9fb961b520b5"
					},
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "allthecodes.example.com",
					repo: "documentation",
					risk: null,
					qualified_scan: null,
					application_metadata: null
			},
			{
					service: "github",
					repo: "games/roleplayer",
					risk: null,
					qualified_scan: {
							created: "2022-01-01T11:01:01Z",
							scan_id: "f4fa42b2-0640-d16e-e387-7e54e37ead88"
					},
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "github",
					repo: "games/strategy",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "github",
					repo: "games/sports",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "gitlab.com",
					repo: "gravity",
					risk: null,
					qualified_scan: {
							created: "2021-01-11T11:11:11Z",
							scan_id: "0ddda3a0-09c7-62df-9141-5db71833f439"
					},
					application_metadata: null
			},
			{
					service: "gitlab.com",
					repo: "feeds",
					risk: null,
					qualified_scan: null,
					application_metadata: null
			},
			{
					service: "our-source.example.com",
					repo: "our-source-code",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			},
			{
					service: "teamstar.example.com",
					repo: "nothin-but-codes",
					risk: null,
					qualified_scan: null,
					application_metadata: {
						...sampleMetaData6,
					}
			}
	],
	count: 20,
	next: null,
	previous: null
};

export const mockSearchVulnerabilities = {
	results: [{
		id: "a63626e9-my-pretend-id-8698bedd967b",
		advisory_ids: [
			"https://github.com/advisories/GHSA-00000",
			"CVE-2022-0101",
		],
		description: "This is a vulnerability description",
		severity: "high",
		remediation: "Fix it, asap",
		components: {
			"component1-name": ["1.0.0", "1.0.1", "1.0.2"],
			"component2-name": ["2.0.0", "2.0.1", "2.0.2"],
		},
		source_plugins: [
			"node_dependencies",
			"aqua_cli_scanner",
			"trivy",
			"veracode_sca",
			"snyk",
			"a_totes_new_plugin",
			"youve_never_seen_this_plugin_before",
		],
	},
	{
		id: "b73626e9-my-pretend-id-8698bedd968c",
		advisory_ids: ["CVE-2022-0202"],
		description: "This is another vulnerability description",
		severity: "critical",
		remediation: "This is another remediation text",
		components: {
			"component3-name": ["7.1.2"],
		},
		source_plugins: ["snyk", "veracode_sca"],
	},
	{
		id: "c83626e9-my-pretend-id-8698bedd969d",
		advisory_ids: [
			"https://github.com/advisories/GHSA-9999",
			"https://github.com/advisories/GHSA-9998",
			"CVE-2014-0101",
			"CVE-2014-0111",
		],
		description: "What is this still doing here?",
		severity: "high",
		remediation: "This should have been remediated by now",
		components: {
			"legacy-component": ["0.0.1", "0.0.2", "0.0.3"],
		},
		source_plugins: ["veracode_sca"],
	},
	{
		id: "d93626e9-my-pretend-id-8698bedd96ae",
		advisory_ids: ["CVE-2024-9999"],
		description: "This vuln is so new it's a -1 day",
		severity: "critical",
		remediation:
			"No patches available yet, better use some other security controls",
		components: {
			javathing: ["4.3.2"],
		},
		source_plugins: [
			"veracode_sca",
			"snyk",
			"aqua_cli_scanner",
			"trivy",
		],
	},
	{
		id: "ea3626e9-my-pretend-id-8698bedd96bf",
		advisory_ids: ["CVE-2000-9999"],
		description: "Oh noes, y2k",
		severity: "",
		remediation: "Rollback all clocks to 1999, party on.",
		components: {
			allthethings: ["1.9.99"],
		},
		source_plugins: ["aqua_cli_scanner", "trivy"],
	}],
	count: 5,
	next: null,
	previous: null
};
