/* istanbul ignore file */
// ^ this is for testing-only and should be excluded from code coverage
import AppGlobals from "app/globals";
import {
	configPlugins,
	sbomPlugins,
	secretPlugins,
	staticPlugins,
	techPlugins,
	vulnPlugins,
} from "app/scanPlugins";
import {
	sampleMetaData1,
	sampleMetaData2,
	sampleMetaData3,
	sampleMetaData4,
	sampleMetaData5,
	sampleMetaData6,
} from "custom/sampleMetaData";
import { HiddenFinding } from "features/hiddenFindings/hiddenFindingsSchemas";
import { Key } from "features/keys/keysSchemas";
import {
	AnalysisReport,
	ResultsAnalysis,
	ResultsConfiguration,
	ResultsVulnComponents,
	ScanCategories,
	ScanHistory,
	SecretFinding,
	SecretValidity,
} from "features/scans/scansSchemas";
import {
	VcsService,
	githubAuthRegex,
} from "features/vcsServices/vcsServicesSchemas";
import { DateTime, Duration } from "luxon";
import { Request, Response, createServer } from "miragejs";
import { customAlphabet } from "nanoid";
import queryString from "query-string";
import { formatDate } from "utils/formatters";

// common elements to all requested scans
interface Location {
	service: string;
	org: string;
	repo: string;
}

interface ScanOpts {
	scanId: string;
	branch: string | null;
	depth: number | null;
	includeDev: boolean;
	includePaths?: string[];
	excludePaths?: string[];
	categories: ScanCategories[];
	plugins: string[];
	initiatedBy: string | null;
	progressToFailure?: boolean;
	batch?: boolean;
}

interface Entity extends ScanHistory {
	gen?: IterableIterator<AnalysisReport> | null; // generator function returning full scan progress details
	priorResults?: AnalysisReport;
	progressToFailure?: boolean;
}

interface Entities {
	[scanId: string]: Entity;
}

interface Adapter {
	ids: string[];
	entities: Entities;
}

type UserItem = string | null;

interface RandomUserProps {
	userIndex?: number;
	includeNull?: boolean;
}

// define a superset of the SecretFinding interface that includes a secret string that can be filtered using "secret_raw" allowlist type
interface SecretFindingRaw extends SecretFinding {
	_string?: string;
}

interface SecretFindingRawResult {
	[key: string]: SecretFindingRaw[];
}

// mock a REST API server
// MirageJS will intercept requests and match them against defined router patterns to return pre-canned results
// this will only run in dev mode and in test to return deterministic results based on input
// otherwise, calls in production will go to the real Artemis APIs
export function makeServer() {
	const server = createServer({
		routes() {
			this.namespace = process.env.REACT_APP_API_NAMESPACE || "/api";

			// add request delay in dev, NOT in test
			if (process.env.NODE_ENV === "development") {
				this.timing = AppGlobals.APP_DEV_REQUEST_DELAY; // enable API response delay to slow down ALL the API requests to view UI progress bars, animations
			}

			// passing-in a userIndex will return a (non-random) user from the list
			// otherwise, a random user will be returned
			const getRandomUser = (props: RandomUserProps) => {
				const { userIndex, includeNull = false } = props;

				// obviously not an exhaustive list, sorry if I omitted your personal favorite :P
				const users: UserItem[] = [
					"This.'Is'My.Name?&#<testme>", // some fun characters to test encoding
					"Eddard Stark",
					"Robert Baratheon",
					"Jaime Lannister",
					"Catelyn Stark",
					"Cersei Lannister",
					"Daenerys Stormborn First Of Her Name The Unburnt Queen Of The Andals And The First Men Khaleesi Of The Great Grass Sea Breaker Of Chains And Mother Of Dragons Targaryen",
					"Jorah Mormont",
					"Viserys Targaryen",
					"Jon Snow",
					"Robb Stark",
					"Sansa Stark",
					"Arya Stark",
					"Theon Greyjoy",
					"Brandon Stark",
					"Joffrey Baratheon",
					"Sandor Clegane",
					"Tyrion Lannister",
					"Petyr Baelish",
					"Davos Seaworth",
					"Samwell Tarly",
					"Stannis Baratheon",
					"Melisandre",
					"Jeor Mormont",
					"Bronn",
					"Varys",
					"Shae",
					"Margaery Tyrell",
					"Tywin Lannister",
					"Talisa Maegyr",
					"Ygritte",
					"Gendry",
					"Tormund Giantsbane",
					"Brienne of Tarth",
					"Ramsay Bolton",
					"Gilly",
					"Daario Naharis",
					"Missandei",
					"Ellaria Sand",
					"Tommen Baratheon",
					"Jaqen H'ghar",
					"Roose Bolton",
					"Grey Worm",
				];
				if (includeNull) {
					users.push(null);
				}
				const i =
					userIndex || userIndex === 0
						? userIndex
						: Math.floor(Math.random() * users.length);
				const user = users[i];
				let email = user;
				// random users are actually groups (name instead of email address)
				if (email && Math.random() < 0.4) {
					email = email.replace(/ /g, ".") + "@example.com";
				}
				// random items are deleted
				if (email && Math.random() < 0.3) {
					email +=
						"_DELETED_" +
						DateTime.utc()
							.minus({ days: Math.floor(Math.random() * 365) })
							.toUnixInteger();
				}
				return [user, email];
			};

			// use nanoid to generate a fake scan_id in the format:
			// [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
			const generateId = () => {
				// nanoid uses it's own unique id generator that doesn't match our UUIDs
				// so we need to define the format we want nanoid to use for generating scan ids
				// using customAlphabet
				const charSet = "0123456789abcdef";
				const uuid8 = customAlphabet(charSet, 8);
				const uuid4 = customAlphabet(charSet, 4);
				const uuid12 = customAlphabet(charSet, 12);
				return [uuid8(), uuid4(), uuid4(), uuid4(), uuid12()].join("-");
			};

			let lastScanMetadataOffset = 0;
			const lastScanMetadataBase = DateTime.fromISO("2025-01-01T12:00:00Z");

			const generateLastScanMetadata = () => {
				const created = lastScanMetadataBase
					.plus(
						Duration.fromObject({
							days: lastScanMetadataOffset,
							hours: lastScanMetadataOffset,
							minutes: lastScanMetadataOffset,
						}),
					)
					.toISO();
				lastScanMetadataOffset += 1;

				const scan_id = generateId();

				return {
					created,
					scan_id,
				};
			};

			// use nanoid to generate a fake api key in the format:
			// [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
			const generateApiKey = () => {
				const charSet = "0123456789abcdef";
				const uuid8 = customAlphabet(charSet, 8);
				const uuid4 = customAlphabet(charSet, 4);
				const uuid12 = customAlphabet(charSet, 12);
				return [
					uuid8(),
					uuid4(),
					uuid4(),
					uuid4(),
					uuid12(),
					uuid8(),
					uuid4(),
					uuid4(),
					uuid4(),
					uuid12(),
				].join("-");
			};

			// use nanoid to generate a fake engine_id in the format:
			// i-[0-9a-f-]{17}
			const generateEngineId = () => {
				const charSet = "0123456789abcdef-";
				return "i-" + customAlphabet(charSet, 17)();
			};

			// return a new Date in localeString format
			// with milliseconds removed and UTC offset (Z) removed to match current rest API
			const formatNewDate = () => {
				return new Date().toISOString().replace(/\.[0-9]{3}Z$/, "");
			};

			let [defaultUser, defaultEmail] = getRandomUser({ includeNull: false }); // can pass-in a userId here to test a specific user
			const defaults: any = {
				scanCount: 1000, // several full pages of scan results plus a final page with a few results
				userCount: 43, // users in getRandomUser
				goodVcs: "goodVcs",
				badVcs: "badVcs",
				sessionVcs: "session",
				goodOrg: "goodOrg",
				badOrg: "badOrg",
				sessionOrg: "timeout",
				branch: null,
				categories: [
					"inventory",
					"secret",
					"static_analysis",
					"vulnerability",
					"configuration",
					"sbom",
				] as ScanCategories[],
				plugins: [
					...techPlugins,
					...secretPlugins,
					...staticPlugins,
					...vulnPlugins,
					...sbomPlugins,
					...configPlugins,
				],
				depth: 500,
				includeDev: false,
				limit: 50, // API items per page default
				currentUser: defaultEmail,
				format: "full",
				supportedServices: ["github"],
				showMaintenance: Math.random() < 0.5,
			};
			// patterns to test for scope file path globbing
			// see: https://docs.python.org/3/library/fnmatch.html#fnmatch.fnmatch
			defaults["currentUserScope"] =
				Math.random() < 0.5
					? // test: matches 1+ occurrence of any character
						["*"]
					: [
							...new Set([
								// remove duplicates
								// test: matches any character in seq once
								`${defaults.goodVcs}/${defaults.goodOrg}/regex-[0-9]`,
								// test: matches any character not insequence once
								`${defaults.goodVcs}/${defaults.goodOrg}/org/path/not/[!0-9]`,
								// test: matches single occurrence of any character
								`${defaults.goodVcs}/${defaults.goodOrg}/org/path/?`,
								// test: exact match
								`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/repo`,
								// test: don't interpret . as a regex "any" character
								// test: interpret [?] as literal ? not as a regex pattern
								`${defaults.goodVcs}.${defaults.goodOrg}.com/interpret[?]`,
								`${AppGlobals.APP_DEMO_USER_VCSORG}/${AppGlobals.APP_DEMO_USER_REPO}`,
							]),
						];
			// common fields to all requested scans for a particular repo
			const location: Location = {
				service: "",
				org: "",
				repo: "",
			};
			let scans: Adapter = {
				// Unique IDs of each item. Must be string uuid
				ids: [],
				// A lookup table mapping entity IDs to the corresponding entity objects
				entities: {},
			};
			let allUsers: any = {
				ids: [],
				entities: {},
			};
			// accessible outside generate() functiuons so we can access each finding's severity for hidden findings
			const scanVulnResults: ResultsVulnComponents = {
				"": {
					"CVE-2020-0000": {
						source: ["docker/Dockerfile", "docker/Dockerfile.dev"],
						severity: "critical",
						// test long description in dialog
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec fermentum turpis eget mauris sollicitudin sagittis. Vestibulum dapibus at tellus vitae dictum. Donec et dolor quis urna malesuada interdum. Integer dignissim quam id mauris vehicula, id eleifend lectus aliquet. Morbi lectus libero, vulputate a eros id, pellentesque pellentesque nisi. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec dictum lobortis ante et faucibus. Vivamus elementum blandit quam eu eleifend. Integer nunc lorem, luctus at nunc aliquet, semper interdum arcu. Proin facilisis ornare purus at semper. Integer non lobortis velit, lobortis elementum magna. Duis tincidunt, nulla sed euismod rhoncus, nunc magna tempus velit, in imperdiet lacus nibh vel dui. Suspendisse ullamcorper sem nulla, at cursus lectus pretium vitae. Aliquam erat volutpat. Phasellus pharetra nunc vitae tellus porta, ultrices fermentum libero venenatis. Cras in sem lectus. Nulla urna risus, varius in ultricies at, vehicula quis dui. Etiam tincidunt lectus urna, non porttitor ligula scelerisque ut. Morbi tincidunt nulla et quam accumsan dictum eget vitae velit. Sed vitae mi vestibulum, dapibus mi ac, ultrices ligula. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam luctus tellus a mauris viverra, at vestibulum nunc vestibulum. Morbi tempus varius dolor, non tincidunt ipsum aliquet egestas. Morbi at augue luctus, elementum magna eu, dapibus ante. Pellentesque accumsan non enim sed luctus. Morbi vel faucibus lorem. Proin arcu enim, facilisis et blandit sit amet, pellentesque vel mauris. Aenean ex diam, suscipit eu molestie id, lacinia quis neque. Sed velit sem, gravida at molestie ut, suscipit a quam. Fusce viverra nisi mauris, eu porta nulla suscipit ut.	Aenean a congue odio. In maximus nisi non blandit placerat. Vestibulum eleifend urna eu augue molestie, non molestie justo tincidunt. Vivamus elit odio, sodales id pellentesque et, maximus quis urna. Nullam commodo lacus nisi, vel scelerisque augue eleifend ac. Phasellus efficitur libero non velit aliquam, sit amet faucibus justo iaculis. Maecenas orci arcu, lobortis vel purus non, maximus auctor erat. Fusce ac interdum risus. Aenean dictum, magna ac mollis bibendum, arcu lacus bibendum dui, eu semper quam felis a urna. Ut eleifend euismod sapien, et facilisis nisi porta blandit. Pellentesque viverra nisl vitae lacus ultrices condimentum.",
						remediation: "",
						// test without source_plugins field
					},
					"CVE-2021-0101": {
						source: ["docker/Dockerfile", "docker/Dockerfile.multistage"],
						severity: "critical",
						description:
							"Pellentesque viverra nisl vitae lacus ultrices condimentum. ThisIsAVeryLongRunOnLineToTestLineWrappingInTheLeftGridBoxInTheDialogDisplayingTheseResultsToTheUser.",
						remediation: "Won't fix",
						source_plugins: null,
					},
					"CVE-2018-00000": {
						source: ["docker/Dockerfile.multistage"],
						severity: "medium",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse convallis tempor ligula vel tempus.",
						remediation: "",
						source_plugins: ["Trivy Container Image"],
					},
					"CVE-2016-00000": {
						source: ["docker/Dockerfile"],
						severity: "negligible",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras elementum fringilla elementum.",
						remediation: "",
						source_plugins: [
							"Trivy Container Image",
							"Aqua Container Security",
						],
					},
				},
				component1: {
					"CVE-2019-00000": {
						source: [
							// test many source files (and long source lines) - 34 total
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
							"docker/Dockerfile.platform27",
						],
						severity: "high",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
						remediation: "imagine a remediation here",
						source_plugins: [
							"Plugin3",
							"Plugin4",
							"Plugin6",
							"Plugin7",
							"Plugin8",
							"Plugin1",
							"Plugin2",
							"Plugin5",
							"Plugin9",
							"Plugin10",
						],
					},
					"CVE-2017-0000": {
						source: [
							"docker/Dockerfile.platform",
							"node/module/package.json: direct>indirect",
							"node/module/package.json: direct>indirect2",
						],
						severity: "low",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sollicitudin pellentesque luctus.",
						remediation: "",
						source_plugins: ["Trivy", "Aqua Container Security", "NPM Audit"],
					},
				},
				component2: {
					"CVE-2018-00000": {
						source: ["docker/Dockerfile.multistage"],
						severity: "medium",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse convallis tempor ligula vel tempus.",
						remediation: "",
					},
				},
				component3: {
					"CVE-2017-0000": {
						source: ["docker/Dockerfile.platform"],
						severity: "low",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sollicitudin pellentesque luctus.",
						remediation: "",
					},
				},
				component4: {
					"CVE-2016-00000": {
						source: ["docker/Dockerfile"],
						severity: "", // "" is valid severity
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras elementum fringilla elementum.",
						remediation: "",
					},
				},
				component5: {
					"https://npmjs.com/advisories/20202": {
						source: ["Gemfile.lock"],
						severity: "high",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
						remediation: "You might consider fixing it",
						source_plugins: ["Bundler Audit"],
					},
				},
				component6: {
					"https://npmjs.com/advisories/10101": {
						source: ["yarn.lock"],
						severity: "critical",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Urna molestie at elementum eu.",
						remediation: ":(",
						source_plugins: ["NPM Audit"],
					},
				},
				component7: {
					"https://npmjs.com/advisories/30303": {
						source: ["package-lock.json"],
						severity: "",
						description:
							"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Eu non diam phasellus vestibulum.",
						remediation: "",
						source_plugins: ["NPM Audit"],
					},
				},
				component8: {
					"https://npmjs.com/advisories/40404": {
						source: ["src/app/App.js"],
						severity: "critical",
						description: "Imperitus fiximus immediatus",
						remediation:
							"we recommend that this be fixed. quickly. i'm talking to you",
						source_plugins: ["NPM Audit"],
					},
				},
			};
			const scanAnalysisResults: ResultsAnalysis = {
				"/this/is/a/really/long/path/to/a/file/identified/as/a/static/analysis/finding/filename/is/code.py":
					[
						{
							line: 7,
							type: "", // test blank type
							message:
								"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel pellentesque sem",
							severity: "critical",
						},
						{
							line: 9,
							type: "SQL Injection",
							message: "Lorem ipsum pellentesque vel pellentesque sem",
							severity: "critical",
						},
						{
							line: 12,
							type: "Auth",
							message:
								"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam sit amet feugiat mi, sit amet imperdiet nunc",
							severity: "low",
						},
						{
							line: 15,
							type: "Path Traversal",
							message:
								"Lorem ipsum dolor sit amet, consectetur adipiscing elit",
							severity: "medium",
						},
					],
				"app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb":
					[
						{
							line: 8,
							type: "CSRF",
							message:
								"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sed ipsum eu enim finibus dignissim. In mollis molestie risus eget condimentum",
							severity: "high",
						},
						{
							line: 14,
							type: "Potential template injection",
							message: "Lorem ipsum in mollis molestie risus eget condimentum",
							severity: "medium",
						},
						{
							line: 33,
							type: "XSS",
							message: "Lorem ipsum ut sed ipsum eu enim finibus dignissim.",
							severity: "critical",
						},
					],
			};
			const scanConfigResults: ResultsConfiguration = {
				github_branch_check1: {
					name: "Branch - Check 1",
					description:
						"Lorem ipsum sit amet justo donec enim diam vulputate ut pharetra sit",
					severity: "medium",
					docs_url: "http://example.com",
				},
				github_branch_check2: {
					name: "Branch - Check 2",
					description:
						"Lorem ipsum ligula ullamcorper malesuada proin libero nunc consequat interdum varius sit",
					severity: "critical",
				},
				github_branch_check3: {
					name: "Branch - Check 3",
					description:
						"Lorem ipsum felis bibendum ut tristique et egestas quis ipsum suspendisse ultrices",
					severity: "",
				},
				github_branch_check4: {
					name: "Branch - Check 4",
					description:
						"Lorem ipsum purus semper eget duis at tellus at urna condimentum mattis",
					severity: "negligible",
				},
				github_branch_check5: {
					name: "Branch - Check 5",
					description:
						"Lorem ipsum ac habitasse platea dictumst vestibulum rhoncus est pellentesque elit ullamcorper",
					severity: "high",
				},
				github_repo_check1: {
					name: "Repository - Check 1",
					description:
						"Lorem ipsum aliquam malesuada bibendum arcu vitae elementum curabitur vitae nunc sed",
					severity: "",
				},
				github_repo_check2: {
					name: "Repository - Check 2",
					description:
						"Lorem ipsum ullamcorper morbi tincidunt ornare massa eget egestas purus viverra accumsan",
					severity: "high",
				},
				github_repo_check3: {
					name: "Repository - Check 3",
					description:
						"Lorem ipsum purus ut faucibus pulvinar elementum integer enim neque volutpat ac",
					severity: "high",
				},
				github_repo_check4: {
					name: "Repository - Check 4",
					description:
						"Lorem ipsum non consectetur a erat nam at lectus urna duis convallis",
					severity: "critical",
				},
				github_repo_check5: {
					name: "Repository - Check 5",
					description:
						"Lorem ipsum risus quis varius quam quisque id diam vel quam elementum",
					severity: "critical",
				},
			};
			// add some existing hidden findings
			let hiddenFindings: HiddenFinding[] = [
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2020-0000",
						component: "",
						source: "docker/Dockerfile",
						severity: "critical",
					},
					expires: "2022-01-01T13:01:01Z",
					reason: "test existing hidden finding",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
				},
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2020-0000",
						component: "",
						source: "docker/Dockerfile.dev",
						severity: "critical",
					},
					expires: "2022-01-01T13:01:01Z",
					reason: "test existing hidden finding",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
				},
				{
					id: generateId(),
					type: "secret",
					value: {
						filename: "folder/badfile",
						line: 17,
						commit: "q3498tlsdf9834tkjsdfg98u34t",
						location: "commit",
					},
					expires: null,
					reason: "test existing hidden finding, secret",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "secret",
					value: {
						filename: "folder/badfile2",
						line: 177,
						commit: "q3498tlsdf9834tkjsdfg98u34t",
					},
					expires: null,
					reason: "test existing hidden finding, secret",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "secret",
					value: {
						filename: "pull_request_title",
						line: 0,
						commit: "",
						url: "https://github.com/WarnerMedia/artemis/pull/1#issuecomment-000",
						location: "pull_request_title",
					},
					expires: null,
					reason: "test secret in pull request",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				// expired hidden finding
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2018-00000",
						severity: "medium",
						component: "",
						source: "docker/Dockerfile.multistage",
					},
					expires: DateTime.utc().minus({ days: 10 }).toJSON(),
					reason: "expired hidden finding",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
				},
				// next 4 items mock the scenario where a finding is only hidden in a subset of files (matching a particular component+CVEID)
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2019-00000",
						component: "component1",
						source:
							"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency1",
					},
					expires: DateTime.utc().minus({ days: 5 }).toJSON(),
					reason:
						"expiring test hiding a subset of files with vuln finding (1)",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2019-00000",
						component: "component1",
						source:
							"node/a_very_long_directory_name_tests_and_samples/package.json: component>component-thingy>anothercomponent>dependency1>dependency2>dependency3>dependency4>dependency5>dependency6>target-dependency2",
					},
					expires: DateTime.utc().minus({ days: 5 }).toJSON(),
					reason:
						"expiring test hiding a subset of files with vuln finding (2)",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2019-00000",
						component: "component1",
						source: "docker/Dockerfile.platform7",
					},
					expires: DateTime.utc().minus({ days: 5 }).toJSON(),
					reason:
						"expiring test hiding a subset of files with vuln finding (3)",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "vulnerability",
					value: {
						id: "CVE-2019-00000",
						component: "component1",
						source: "docker/Dockerfile.platform27",
					},
					expires: DateTime.utc().minus({ days: 5 }).toJSON(),
					reason:
						"expiring test hiding a subset of files with vuln finding (4)",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				// secret_raw type
				{
					id: generateId(),
					type: "secret_raw",
					value: {
						value: "test.me",
					},
					expires: null,
					reason: "test secret_raw type",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				// vulnerability_raw type
				{
					id: generateId(),
					type: "vulnerability_raw",
					value: {
						id: "CVE-2021-0101",
						severity: "critical",
					},
					expires: DateTime.utc().minus({ days: 5 }).toJSON(),
					reason: "test expired vulnerability_raw type",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				// static analysis type
				{
					id: generateId(),
					type: "static_analysis",
					value: {
						filename:
							"app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
						line: 14,
						type: "Potential template injection",
					},
					expires: null,
					reason: "test static_analysis type",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "static_analysis",
					value: {
						filename:
							"app/src/ruby/files/mvc/controllers/controllers_for_the_application/application_controller.rb",
						line: 33,
						type: "XSS",
					},
					expires: DateTime.utc().minus({ days: 2 }).toJSON(),
					reason: "test expired static_analysis type",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				// configurationn type
				{
					id: generateId(),
					type: "configuration",
					value: {
						id: "github_branch_check4",
					},
					expires: DateTime.utc().minus({ days: 2 }).toJSON(),
					reason: "test expired configuration type",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
				{
					id: generateId(),
					type: "configuration",
					value: {
						id: "github_repo_check2",
					},
					expires: null,
					reason: "test expired configuration type",
					created_by: defaultEmail,
					created: "2021-01-01T13:01:01Z",
					updated_by: defaultEmail,
					updated: "2021-02-02T14:02:02Z",
				},
			];
			const userKeys: Key[] = [
				{
					id: generateId(),
					name: "admin api key",
					created: DateTime.utc()
						.minus({ days: Math.floor(Math.random() * 365) })
						.toJSON() ?? undefined,
					last_used: formatNewDate(),
					expires: DateTime.utc()
						.minus({ days: Math.floor(Math.random() * 365) })
						.plus({ years: 1 })
						.toJSON(),
					scope: defaults.currentUserScope,
					admin: true,
					features: {
						snyk: true,
						feature1: true,
						feature2: false,
						feature3: true,
					},
					userEmail: ""
				},
				{
					id: generateId(),
					name: "expired api key",
					created: DateTime.utc().minus({ days: 256 }).toJSON() ?? undefined,
					last_used: null,
					expires: DateTime.utc().minus({ days: 1 }).toJSON(),
					scope: defaults.currentUserScope,
					admin: false,
					features: { snyk: true, feature1: false },
					userEmail: ""
				},
				{
					id: generateId(),
					name: "standard api key",
					created: DateTime.utc()
						.minus({ days: Math.floor(Math.random() * 365) })
						.toJSON() ?? undefined,
					last_used: null,
					expires: DateTime.utc()
						.plus({ days: Math.floor(Math.random() * 365) })
						.toJSON(),
					scope: defaults.currentUserScope,
					admin: false,
					features: {},
					userEmail: ""
				},
			];
			const userVcsServices: VcsService[] = [];

			// remove hidden findings from vuln object
			const filterVulns = (
				vulns: ResultsVulnComponents,
			): ResultsVulnComponents => {
				// deep-copy vulns input
				const vr: ResultsVulnComponents = JSON.parse(JSON.stringify(vulns));

				// filter out (remove) any matching hidden findings
				hiddenFindings.forEach((f) => {
					// don't remove expired hidden findings from results
					let dateOk = true;
					if (f.expires) {
						const expires = new Date(f.expires);
						dateOk = expires > new Date();
					}
					if (
						f.type === "vulnerability" &&
						f.value.component in vr &&
						f.value.id in vr[f.value.component] &&
						vr[f.value.component][f.value.id].source.includes(f.value.source)
					) {
						// update hidden finding, add severity from the corresponding vulnerability item
						f.value.severity = vr[f.value.component][f.value.id].severity;
						if (dateOk) {
							// remove finding for for each source file
							const i = vr[f.value.component][f.value.id].source.findIndex(
								(source) => {
									return source === f.value.source;
								},
							);
							if (i !== -1) {
								vr[f.value.component][f.value.id].source.splice(i, 1);

								// if there are no more source files for this component/CVE, remove the parent CVE
								if (vr[f.value.component][f.value.id].source.length === 0) {
									delete vr[f.value.component][f.value.id];

									// if there are no more CVEs for this component, remove the parent component
									if (Object.keys(vr[f.value.component]).length === 0) {
										delete vr[f.value.component];
									}
								}
							}
						}
					} else if (f.type === "vulnerability_raw") {
						for (const [component, vulnList] of Object.entries(vr)) {
							if (f.value.id in vulnList) {
								// update hidden finding, add severity from the corresponding vulnerability item
								f.value.severity = vr[component][f.value.id].severity; // make these "vr"?
								if (dateOk) {
									delete vr[component][f.value.id];
									if (Object.keys(vr[component]).length === 0) {
										delete vr[component];
									}
								}
							}
						}
					}
				});
				return vr;
			};

			// calculate vuln summary report
			const genVulnSummary = (scan: AnalysisReport) => {
				const summary = {
					critical: 0,
					high: 0,
					medium: 0,
					low: 0,
					negligible: 0,
					"": 0,
				};

				if (
					(scan.scan_options.categories &&
						scan.scan_options.categories.includes("vulnerability")) ||
					(scan.scan_options.plugins &&
						isPluginInCategory(scan.scan_options.plugins || [], vulnPlugins))
				) {
					for (const [, vulnList] of Object.entries(
						scan?.results?.vulnerabilities ?? {},
					)) {
						for (const [, details] of Object.entries(vulnList ?? {})) {
							summary[details.severity] += 1;
						}
					}
					return summary;
				}
				return null;
			};

			const generateVulnResults = (scan: AnalysisReport) => {
				scan!.results!.vulnerabilities = JSON.parse(
					JSON.stringify(scanVulnResults),
				);
				scan!.results_summary!.vulnerabilities = genVulnSummary(scan);
			};

			// remove hidden findings from secrets object
			const filterSecrets = (secrets: SecretFindingRawResult) => {
				// deep-copy secrets input
				const sr: SecretFindingRawResult = JSON.parse(JSON.stringify(secrets));

				// filter out (remove) any matching hidden findings
				hiddenFindings.forEach((f) => {
					if (f.type === "secret" && f.value.filename in sr) {
						// don't remove expired hidden findings from results
						let dateOk = true;
						if (f.expires) {
							const expires = new Date(f.expires);
							dateOk = expires > new Date();
						}
						for (let i = 0; i < sr[f.value.filename].length; i += 1) {
							if (
								sr[f.value.filename][i].line === f.value.line &&
								sr[f.value.filename][i].commit === f.value.commit &&
								dateOk
							) {
								sr[f.value.filename].splice(i, 1);
								if (sr[f.value.filename].length === 0) {
									delete sr[f.value.filename];
								}
								break;
							}
						}
					} else if (f.type === "secret_raw") {
						for (const [filePath, secretList] of Object.entries(sr)) {
							// loop through list in reverse, so when we remove items it won't mess up the next item index
							for (let i = secretList.length - 1; i >= 0; i--) {
								if (
									secretList[i]?._string &&
									secretList[i]._string === f.value.value
								) {
									secretList.splice(i, 1);
								}
							}
							if (secretList.length === 0) {
								delete sr[filePath];
							}
						}
					}
				});
				return sr;
			};

			// calculate secret summary report
			const genSecretsSummary = (scan: AnalysisReport) => {
				let count = 0;
				if (
					(scan.scan_options.categories &&
						scan.scan_options.categories.includes("secret")) ||
					(scan.scan_options.plugins &&
						isPluginInCategory(scan.scan_options.plugins || [], secretPlugins))
				) {
					for (const [, secretList] of Object.entries(
						scan?.results?.secrets ?? {},
					)) {
						if (Array.isArray(secretList)) {
							count += secretList.length;
						}
					}
					return count;
				}
				return null;
			};

			const generateSecretResults = (scan: AnalysisReport) => {
				scan!.results!.secrets = {
					"/this/is/a/really/long/path/to/a/file/identified/as/a/secret/filename/is/slack.pass":
						[
							{
								type: "slack, github",
								line: 2,
								commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
								location: "commit",
								url: "",
								details: [
									{
										type: "slack",
										validity: SecretValidity.Active,
										source: "GHAS Secrets",
									},
									{
										type: "github",
										validity: SecretValidity.Unknown,
										source: "Trufflehog Scanner",
									},
								],
							},
							{
								type: "slack",
								line: 12,
								commit: "badc0ffee0ddf00dbadc0ffee0ddf00dbadc0ffee",
							},
							{
								// @ts-ignore
								_string: "test.me", // not part of API, used for filtering secret_raw by string value
								type: "slack",
								line: 22,
								commit: "badc0ffee0ddf00dbadc0ffee0ddf00dbadc0ffee",
								location: "commit",
								url: "",
								details: [
									{
										type: "slack",
										validity: SecretValidity.Active,
										source: "GHAS Secrets",
									},
									{
										type: "slack",
										validity: SecretValidity.Unknown,
										source: "Trufflehog Scanner",
									},
								],
							},
						],
					"/another/very/long/path/string/fully/qualified/path/to/aws.pass": [
						{
							type: "aws",
							line: 1,
							commit: "badc0ffee0ddf00dbadc0ffee0ddf00dbadc0ffee",
							location: "commit",
							url: "",
							details: [
								{
									type: "aws",
									validity: SecretValidity.Inactive,
									source: "GHAS Secrets",
								},
								{
									type: "aws",
									validity: SecretValidity.Unknown,
									source: "Trufflehog Scanner",
								},
							],
						},
					],
					commit_message: [
						{
							type: "github",
							line: 0,
							commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
							location: "commit",
							url: "",
							details: [
								{
									type: "github",
									validity: "inactive",
									source: "Trufflehog Scanner",
								},
							],
						},
					],
					discussion_comment: [
						{
							type: "slack_api_token",
							line: 0,
							commit: "",
							url: "https://github.com/WarnerMedia/artemis/discussions/1#discussioncomment-000",
							location: "discussion_comment",
							details: [
								{
									type: "slack_api_token",
									validity: "inactive",
									source: "GitHub Advanced Security Secrets",
								},
							],
						},
					],
					pull_request_review: [
						{
							type: "slack_api_token",
							line: 0,
							commit: "",
							url: "https://github.com/WarnerMedia/artemis/pull/1#pullrequestreview-000",
							location: "pull_request_review",
							details: [
								{
									type: "slack_api_token",
									validity: "inactive",
									source: "GitHub Advanced Security Secrets",
								},
							],
						},
					],
					"/path/postgres.pass": [
						{
							// @ts-ignore
							_string: "test.me",
							type: "postgres",
							line: 2,
							commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
							details: [
								{
									type: "postgres",
									validity: SecretValidity.Inactive,
									source: "GHAS Secrets",
								},
								{
									type: "postgres",
									validity: SecretValidity.Inactive,
									source: "Trufflehog Scanner",
								},
							],
						},
						{
							// @ts-ignore
							_string: "test.me",
							type: "postgres",
							line: 8,
							commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
							details: [
								{
									type: "postgres",
									validity: SecretValidity.Inactive,
									source: "GHAS Secrets",
								},
								{
									type: "postgres",
									validity: SecretValidity.Inactive,
									source: "Trufflehog Scanner",
								},
							],
						},
						{
							type: "postgres",
							line: 8,
							commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
							details: [
								{
									type: "postgres",
									validity: SecretValidity.Inactive,
									source: "GHAS Secrets",
									location: "commit",
								},
								{
									type: "postgres",
									validity: SecretValidity.Inactive,
									source: "Trufflehog Scanner",
									location: "",
								},
							],
						},
					],
					"/path/to/ssh.pass": [
						{
							type: "ssh",
							line: 1,
							commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
							details: [
								{
									type: "SSH Private Key",
									validity: SecretValidity.Unknown,
									source: "Trufflehog Scanner",
								},
								{
									type: "ssh",
									validity: SecretValidity.Inactive,
									source: "GHAS Secrets",
								},
							],
						},
					],
					"/path/to/file/google.pass": [
						{
							// @ts-ignore
							_string: "test.me",
							type: "google",
							line: 2,
							commit: "badc0ffee0ddf00dbadc0ffee0ddf00dbadc0ffee",
							details: [
								{
									type: "google",
									validity: SecretValidity.Unknown,
									source: "Trufflehog",
								},
							],
						},
					],
				} as SecretFindingRawResult;
				scan!.results_summary!.secrets = genSecretsSummary(scan);
			};

			// remove hidden findings from static analysis object
			const filterAnalysis = (analysis: ResultsAnalysis): ResultsAnalysis => {
				// deep-copy analysis input
				const ar: ResultsAnalysis = JSON.parse(JSON.stringify(analysis));

				// filter out (remove) any matching hidden findings
				hiddenFindings.forEach((f) => {
					if (f.type === "static_analysis" && f.value.filename in ar) {
						// don't remove expired hidden findings from results
						let dateOk = true;
						if (f.expires) {
							const expires = new Date(f.expires);
							dateOk = expires > new Date();
						}
						for (let i = 0; i < ar[f.value.filename].length; i += 1) {
							if (
								ar[f.value.filename][i].line === f.value.line &&
								ar[f.value.filename][i].type === f.value.type
							) {
								// update hidden finding, add severity from the corresponding static analysis item
								f.value.severity = ar[f.value.filename][i].severity;
								if (dateOk) {
									ar[f.value.filename].splice(i, 1);
									if (ar[f.value.filename].length === 0) {
										delete ar[f.value.filename];
									}
									break;
								}
							}
						}
					}
				});
				return ar;
			};

			// calculate analysis summary report
			const genAnalysisSummary = (scan: AnalysisReport) => {
				const summary = {
					critical: 0,
					high: 0,
					medium: 0,
					low: 0,
					negligible: 0,
					"": 0,
				};
				if (
					(scan.scan_options.categories &&
						scan.scan_options.categories.includes("static_analysis")) ||
					(scan.scan_options.plugins &&
						isPluginInCategory(scan.scan_options.plugins || [], staticPlugins))
				) {
					for (const [, analysisList] of Object.entries(
						scan?.results?.static_analysis ?? {},
					)) {
						analysisList.forEach((sa) => {
							summary[sa.severity] += 1;
						});
					}
					return summary;
				}
				return null;
			};

			const generateAnalysisResults = (scan: AnalysisReport) => {
				scan!.results!.static_analysis = JSON.parse(
					JSON.stringify(scanAnalysisResults),
				);
				scan!.results_summary!.static_analysis = genAnalysisSummary(scan);
			};

			// remove hidden findings from configuration object
			const filterConfig = (
				config: ResultsConfiguration,
			): ResultsConfiguration => {
				// deep-copy config input
				const cg: ResultsConfiguration = JSON.parse(JSON.stringify(config));

				// filter out (remove) any matching hidden findings
				hiddenFindings.forEach((f) => {
					if (f.type === "configuration" && f.value.id in cg) {
						// don't remove expired hidden findings from results
						let dateOk = true;
						if (f.expires) {
							const expires = new Date(f.expires);
							dateOk = expires > new Date();
						}
						// update hidden finding, add severity from the corresponding configuration item
						f.value.severity = cg[f.value.id].severity;
						if (dateOk) {
							delete cg[f.value.id];
						}
					}
				});
				return cg;
			};

			// calculate configuration summary report
			const genConfigSummary = (scan: AnalysisReport) => {
				const summary = {
					critical: 0,
					high: 0,
					medium: 0,
					low: 0,
					negligible: 0,
					"": 0,
				};
				if (
					(scan.scan_options.categories &&
						scan.scan_options.categories.includes("configuration")) ||
					(scan.scan_options.plugins &&
						isPluginInCategory(scan.scan_options.plugins || [], configPlugins))
				) {
					for (const [, cg] of Object.entries(
						scan?.results?.configuration ?? {},
					)) {
						summary[cg.severity] += 1;
					}
					return summary;
				}
				return null;
			};

			const generateConfigResults = (scan: AnalysisReport) => {
				scan!.results!.configuration = JSON.parse(
					JSON.stringify(scanConfigResults),
				);
				scan!.results_summary!.configuration = genConfigSummary(scan);
			};

			const generateInventoryResults = (scan: AnalysisReport) => {
				scan!.results_summary!.inventory = {
					base_images: 3,
					cicd_tools: 2,
					technology_discovery: 12,
				};

				scan!.results!.inventory = {
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
					cicd_tools: {
						github_actions: {
							display_name: "Github Actions",
							configs: [{ path: ".github/workflows/deploy.yml" }],
						},
						jenkins: {
							display_name: "Jenkins",
							configs: [{ path: "Jenkinsfile" }, { path: "build/Jenkinsfile" }],
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
				};
			};

			// slim wrapper for new Response to save some vertical space
			const createResponse = (code: number, message: string) => {
				return new Response(
					code,
					{},
					{
						message: message,
					},
				);
			};

			const isPluginInCategory = (
				scanPlugins: string[],
				categoryPlugins: string[],
			) => {
				for (let i = 0; i < scanPlugins.length; i += 1) {
					if (categoryPlugins.includes(scanPlugins[i])) {
						return true;
					}
				}
				return false;
			};

			function* generateScanContent(
				entity: Entity,
			): IterableIterator<AnalysisReport> {
				let currentPlugin = 0;
				let totalPlugins = 0; // counting categories as plugins

				// condense all plugins in a category into a single scan generator increment
				// instead of having to progress through all enabled plugins
				if (entity.scan_options.categories) {
					const enabledCats: string[] = entity.scan_options.categories.filter(
						(cat: string) => {
							return !cat.startsWith("-");
						},
					);
					// count the category if any plugin in that category is enabled
					if (
						isPluginInCategory(
							entity.scan_options.plugins || [],
							vulnPlugins,
						) &&
						!enabledCats.includes("vulnerability")
					) {
						enabledCats.push("vulnerability");
					}
					if (
						isPluginInCategory(
							entity.scan_options.plugins || [],
							staticPlugins,
						) &&
						!enabledCats.includes("static_analysis")
					) {
						enabledCats.push("static_analysis");
					}
					if (
						isPluginInCategory(
							entity.scan_options.plugins || [],
							secretPlugins,
						) &&
						!enabledCats.includes("secret")
					) {
						enabledCats.push("secret");
					}
					if (
						isPluginInCategory(
							entity.scan_options.plugins || [],
							techPlugins,
						) &&
						!enabledCats.includes("inventory")
					) {
						enabledCats.push("inventory");
					}
					if (
						isPluginInCategory(
							entity.scan_options.plugins || [],
							configPlugins,
						) &&
						!enabledCats.includes("configuration")
					) {
						enabledCats.push("configuration");
					}
					if (
						isPluginInCategory(
							entity.scan_options.plugins || [],
							sbomPlugins,
						) &&
						!enabledCats.includes("sbom")
					) {
						enabledCats.push("sbom");
					}
					totalPlugins = enabledCats.length;
				}
				// get scanId from repo (field after last /)
				const scanId = entity.repo.split("/").pop() || generateId();
				const scan: AnalysisReport = {
					...entity,
					scan_id: scanId,
					engine_id: generateEngineId(),
					success: true,
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
					alerts: {
						"An array of things": ["Thing1", "Thing2", "Anotherthing"],
						"This Alert": ["Whoo, an array"],
						"That Alert": ["Make these alerts scroll"],
					},
					debug: {
						Setup: [
							"Dockerfiles automatically built for scanning: All the Dockerfiles",
						],
					},
					results_summary: {
						vulnerabilities: null,
						secrets: null,
						static_analysis: null,
						inventory: null,
						configuration: null,
					},
					results: {
						vulnerabilities: {},
						secrets: {},
						static_analysis: {},
						inventory: {},
						configuration: {},
					},
				};
				// overwrite repo from entity to remove scanId field
				scan.repo = `${location.org}/${location.repo}`;

				scan.application_metadata = {
					...sampleMetaData1,
				};
				yield scan; // queued state

				scan.timestamps.start = formatNewDate();
				scan.status = "processing";
				scan.status_detail = {
					plugin_name: null,
					plugin_start_time: null,
					current_plugin: null,
					total_plugins: null,
				};
				yield scan; // processing state

				let category: ScanCategories = "vulnerability";
				let plugin_name = `${category} scan`;
				if (
					(entity.scan_options.categories &&
						entity.scan_options.categories.includes(category)) ||
					isPluginInCategory(entity.scan_options.plugins || [], vulnPlugins)
				) {
					scan.status = `running plugin ${plugin_name}`;
					currentPlugin += 1;
					scan.status_detail = {
						plugin_name: plugin_name,
						plugin_start_time: formatNewDate(),
						current_plugin: currentPlugin,
						total_plugins: totalPlugins,
					};
					yield scan;
					generateVulnResults(scan);
					scan.success = false;
				}

				category = "secret";
				plugin_name = `${category} scan`;
				if (
					(entity.scan_options.categories &&
						entity.scan_options.categories.includes(category)) ||
					isPluginInCategory(entity.scan_options.plugins || [], secretPlugins)
				) {
					scan.status = `running plugin ${plugin_name}`;
					currentPlugin += 1;
					scan.status_detail = {
						plugin_name: plugin_name,
						plugin_start_time: formatNewDate(),
						current_plugin: currentPlugin,
						total_plugins: totalPlugins,
					};
					yield scan;
					generateSecretResults(scan);
					scan.success = false;
				}

				category = "static_analysis";
				plugin_name = `${category} scan`;
				if (
					(entity.scan_options.categories &&
						entity.scan_options.categories.includes(category)) ||
					isPluginInCategory(entity.scan_options.plugins || [], staticPlugins)
				) {
					scan.status = `running plugin ${plugin_name}`;
					currentPlugin += 1;
					scan.status_detail = {
						plugin_name: plugin_name,
						plugin_start_time: formatNewDate(),
						current_plugin: currentPlugin,
						total_plugins: totalPlugins,
					};
					yield scan;
					generateAnalysisResults(scan);
					scan.success = false;
				}

				category = "inventory";
				plugin_name = `${category} scan`;
				if (
					(entity.scan_options.categories &&
						entity.scan_options.categories.includes(category)) ||
					isPluginInCategory(entity.scan_options.plugins || [], techPlugins)
				) {
					scan.status = `running plugin ${plugin_name}`;
					currentPlugin += 1;
					scan.status_detail = {
						plugin_name: plugin_name,
						plugin_start_time: formatNewDate(),
						current_plugin: currentPlugin,
						total_plugins: totalPlugins,
					};
					yield scan;
					generateInventoryResults(scan);
				}

				category = "configuration";
				plugin_name = `${category} scan`;
				if (
					(entity.scan_options.categories &&
						entity.scan_options.categories.includes(category)) ||
					isPluginInCategory(entity.scan_options.plugins || [], configPlugins)
				) {
					scan.status = `running plugin ${plugin_name}`;
					currentPlugin += 1;
					scan.status_detail = {
						plugin_name: plugin_name,
						plugin_start_time: formatNewDate(),
						current_plugin: currentPlugin,
						total_plugins: totalPlugins,
					};
					yield scan;
					generateConfigResults(scan);
					scan.success = false;
				}

				category = "sbom";
				plugin_name = `${category} scan`;
				if (
					(entity.scan_options.categories &&
						entity.scan_options.categories.includes(category)) ||
					isPluginInCategory(entity.scan_options.plugins || [], sbomPlugins)
				) {
					scan.status = `running plugin ${plugin_name}`;
					currentPlugin += 1;
					scan.status_detail = {
						plugin_name: plugin_name,
						plugin_start_time: formatNewDate(),
						current_plugin: currentPlugin,
						total_plugins: totalPlugins,
					};
					yield scan;
					// sbom results are not included with regular scan results
				}

				scan.status = "completed";
				scan.timestamps.end = formatNewDate();
				yield scan;

				// allow individual, user-initiated scans to progress from complete
				// into mock terminated/failed states for testing
				// but don't allow this for all scans in scan history
				// otherwise you'll just have a huge array of terminated scans
				if (entity.progressToFailure) {
					scan.status = "failed";
					// return an extra error message
					if (scan.errors) {
						scan.errors["failed"] = "An unexpected error occurred unexpectedly";
					}
					yield scan;
				}

				if (entity.progressToFailure) {
					scan.status = "error";
					// return an extra error message
					if (scan.errors) {
						scan.errors["failed"] = "Repo too large (all the many KB)";
					}
					yield scan;
				}

				if (entity.progressToFailure) {
					scan.status = "terminated";
					if (scan.errors) {
						delete scan.errors["failed"];
						// don't return an extra error message so we can test this use-case
					}
					yield scan;
				}

				// create an endless generator returning last terminal state
				while (true) {
					yield scan;
				}
			}

			const getRandomFeatures = () => {
				const features: any = {};

				// should any features be available?
				if (Math.random() < 0.5) {
					for (let i = 1; i <= 10; i += 1) {
						// should featureN be available?
						if (Math.random() < 0.5) {
							// feature available true/false
							features["feature" + i.toString()] = Math.random() < 0.5;
						}
					}
				}
				if (Math.random() < 0.5) {
					features["snyk"] = Math.random() < 0.5;
				}
				return features;
			};

			this.get("/sbom/components", (_schema, request) => {
				const components = [
					{
						id: "0",
						last_scan: null,
						name: "a-lovely-component",
						version: "0.0.1",
						licenses: [
							{
								id: "unlicensed",
								name: "Unlicensed",
							},
						],
					},
					{
						id: "1",
						last_scan: "2022-01-01T01:01:01Z",
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
					},
					{
						id: "2",
						last_scan: "2022-02-02T02:02:02Z",
						name: "node/package",
						version: "1.0.0",
						licenses: [
							{
								id: "mit",
								name: "MIT license (MIT)",
							},
						],
					},
					{
						id: "3",
						last_scan: "2011-11-11T11:11:11Z",
						name: "component2",
						version: "1.2.3",
						licenses: [
							{
								id: "mit",
								name: "MIT license (MIT)",
							},
						],
					},
					{
						id: "4",
						last_scan: "2012-12-12T12:12:12Z",
						name: "opensource-lib",
						version: "3.2.1",
						licenses: [
							{
								id: "apache",
								name: "Apache",
							},
						],
					},
					{
						id: "5",
						last_scan: null,
						name: "bluetooth.ko",
						version: "0.0.5",
						licenses: [
							{
								id: "lgpl",
								name: "GNU Lesser General Public License",
							},
						],
					},
					{
						id: "6",
						last_scan: "2022-02-22T22:02:22Z",
						name: "os-file",
						version: "1.1.2",
						licenses: [
							{
								id: "bsd",
								name: "BSD 3-Clause",
							},
						],
					},
					{
						id: "7",
						last_scan: "2021-12-21T12:21:12Z",
						name: "another-component",
						version: "2.2.2",
						licenses: [],
					},
					{
						id: "8",
						last_scan: "2001-01-01T01:01:01Z",
						name: "nodejs-package",
						version: "1.0.0",
						licenses: [
							{
								id: "mit",
								name: "MIT license (MIT)",
							},
						],
					},
					{
						id: "9",
						last_scan: "2021-11-11T12:12:12Z",
						name: "python-library",
						version: "19.20.21",
						licenses: [
							{
								id: "gpl3",
								name: "GNU Public License v3",
							},
						],
					},
					{
						id: "10",
						last_scan: "2021-03-03T03:03:03Z",
						name: "library-for-neat-stuff",
						version: "0.6.1",
						licenses: [
							{
								id: "mit",
								name: "MIT license (MIT)",
							},
						],
					},
					{
						id: "11",
						last_scan: "2021-04-04T04:04:04Z",
						name: "scan-buddy",
						version: "0.0.1pre1",
						licenses: [
							{
								id: "internal",
								name: "Internal",
							},
						],
					},
					{
						id: "12",
						last_scan: "2022-01-02T02:01:02Z",
						name: "wow",
						version: "2.0.0",
						licenses: [
							{
								id: "bigcorp",
								name: "Big Corp",
							},
						],
					},
					{
						id: "13",
						last_scan: "2021-10-01T01:10:01Z",
						name: "that-library-everyone-uses",
						version: "1.1.1",
						licenses: [],
					},
					{
						id: "14",
						last_scan: "2021-09-09T10:01:10Z",
						name: "popular-lib",
						version: "x9000",
						licenses: [],
					},
					{
						id: "15",
						last_scan: "2021-01-02T03:04:05Z",
						name: "awesome-zazz",
						version: "99.0.1",
						licenses: [],
					},
					{
						id: "16",
						last_scan: "2022-12-11T10:09:08Z",
						name: "narwahl",
						version: "0.4.0",
						licenses: [],
					},
					{
						id: "17",
						last_scan: "2022-01-11T11:11:11Z",
						name: "unkompressor",
						version: "HEAD",
						licenses: [],
					},
					{
						id: "18",
						last_scan: "2021-08-24T23:45:00Z",
						name: "pickle",
						version: "0.1.3",
						licenses: [
							{
								id: "mit",
								name: "MIT license (MIT)",
							},
						],
					},
					{
						id: "19",
						last_scan: "2021-06-14T19:33:45Z",
						name: "awesome-game-sdk",
						version: "4.3.2",
						licenses: [
							{
								id: "gamecorp",
								name: "Game Corp",
							},
						],
					},
				];
				const entity = {
					ids: components.map((component) => component.id),
					entities: components,
				};
				return getFilteredResults(
					request,
					entity,
					"sbom/components",
					components.length,
					["id", "last_scan"],
				);
			});

			const repos = [
				{
					id: "0",
					service: "azure",
					repo: "tv/dev",
					risk: "priority",
					last_qualified_scan: "2022-02-02T14:00:00Z", // added for filtering, removed in getFilteredResults
					qualified_scan: {
						created: "2022-02-02T14:00:00Z",
						scan_id: generateId(),
					},
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData2,
					},
				},
				{
					id: "1",
					service: "azure",
					repo: "tv/qa",
					risk: "priority",
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData3,
					},
				},
				{
					id: "2",
					service: "azure",
					repo: "tv/test",
					risk: "critical",
					last_qualified_scan: "2022-03-02T12:00:00Z",
					qualified_scan: {
						created: "2022-03-02T12:00:00Z",
						scan_id: generateId(),
					},
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData4,
					},
				},
				{
					id: "3",
					service: "azure",
					repo: "tv/new-show",
					risk: "high",
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData5,
					},
				},
				{
					id: "4",
					service: "azure",
					repo: "tv/game-of-chairs",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "5",
					service: "azure",
					repo: "tv/dragon-house",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "6",
					service: "bitbucket",
					repo: "movies/2quick2angry",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "7",
					service: "bitbucket",
					repo: "movies/another_superhero_movie",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "8",
					service: "bitbucket",
					repo: "movies/thriller",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "9",
					service: "bitbucket",
					repo: "movies/action",
					risk: null,
					last_qualified_scan: "2021-12-12T12:12:12Z",
					qualified_scan: {
						created: "2021-12-12T12:12:12Z",
						scan_id: generateId(),
					},
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "10",
					service: "azure",
					repo: "tv/peasmaker/season2",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "11",
					service: "github",
					repo: "games/roleplayer",
					risk: null,
					last_qualified_scan: "2022-01-01T11:01:01Z",
					qualified_scan: {
						created: "2022-01-01T11:01:01Z",
						scan_id: generateId(),
					},
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData6,
					},
				},
				{
					id: "12",
					service: "github",
					repo: "games/strategy",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData1,
					},
				},
				{
					id: "13",
					service: "github",
					repo: "games/sports",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData1,
					},
				},
				{
					id: "14",
					service: "our-source.example.com",
					repo: "our-source-code",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData1,
					},
				},
				{
					id: "15",
					service: "bigrepo.example.com",
					repo: "cartoons-we-love",
					risk: null,
					last_qualified_scan: "2022-02-22T14:22:22Z",
					qualified_scan: {
						created: "2022-02-22T14:22:22Z",
						scan_id: generateId(),
					},
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData1,
					},
				},
				{
					id: "16",
					service: "teamstar.example.com",
					repo: "nothin-but-codes",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: {
						...sampleMetaData1,
					},
				},
				{
					id: "17",
					service: "allthecodes.example.com",
					repo: "documentation",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: null, // test entire object is null
				},
				{
					id: "18",
					service: "gitlab.com",
					repo: "gravity",
					risk: null,
					last_qualified_scan: "2021-01-11T11:11:11Z",
					qualified_scan: {
						created: "2021-01-11T11:11:11Z",
						scan_id: generateId(),
					},
					scan: generateLastScanMetadata(),
					application_metadata: null,
				},
				{
					id: "19",
					service: "gitlab.com",
					repo: "feeds",
					risk: null,
					qualified_scan: null,
					scan: generateLastScanMetadata(),
					application_metadata: null,
				},
			];

			this.get("/sbom/components/:name/:version/repos", (_schema, request) => {
				if (!("name" in request.params)) {
					return createResponse(400, "Invalid request, missing name");
				}
				const name: string = request.params.name;
				if (!("version" in request.params)) {
					return createResponse(400, "Invalid request, missing version");
				}
				const version = request.params.version;
				const entity = {
					ids: repos.map((repo) => repo.id),
					entities: repos,
				};
				return getFilteredResults(
					request,
					entity,
					`sbom/components/${name}/${version}/repos`,
					repos.length,
					[
						"id",
						"qualified_scan",
						"application_metadata",
						"last_qualified_scan",
					],
				);
			});

			this.get("/search/repositories", (_schema, request) => {
				const entity = {
					ids: repos.map((repo) => repo.id),
					entities: repos,
				};
				// miragejs doesn't correctly handle query params that can have multiple values
				// so parse them out of the querystring using QueryString and replace the miragejs qs
				if (request?.queryParams && "risk" in request.queryParams) {
					const search: any = queryString.parse(request.url);
					if ("risk" in search) {
						request.queryParams["risk"] = search["risk"];
					}
				}
				return getFilteredResults(
					request,
					entity,
					"search/repositories",
					repos.length,
					["id", "last_qualified_scan"],
				);
			});

			this.get("/search/vulnerabilities", (_schema, request) => {
				const vulnIds = [
					generateId(),
					generateId(),
					generateId(),
					generateId(),
					generateId(),
				];
				const vulns = [
					{
						id: vulnIds[0],
						advisory_ids: [
							"https://github.com/advisories/GHSA-00000",
							"CVE-2022-0101",
						],
						vuln_id: [
							// added for filtering, removed in getFilteredResults
							vulnIds[0],
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
							"nodejsscan",
							"aqua_cli_scanner",
							"trivy",
							"veracode_sca",
							"snyk",
							"a_totes_new_plugin",
							"youve_never_seen_this_plugin_before",
						],
						plugin: [
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
						id: vulnIds[1],
						advisory_ids: ["CVE-2022-0202"],
						vuln_id: [vulnIds[1], "CVE-2022-0202"],
						description: "This is another vulnerability description",
						severity: "critical",
						remediation: "This is another remediation text",
						components: {
							"component3-name": ["7.1.2"],
						},
						source_plugins: ["snyk", "veracode_sca"],
						plugin: ["snyk", "veracode_sca"],
					},
					{
						id: vulnIds[2],
						advisory_ids: [
							"https://github.com/advisories/GHSA-9999",
							"https://github.com/advisories/GHSA-9998",
							"CVE-2014-0101",
							"CVE-2014-0111",
						],
						vuln_id: [
							vulnIds[2],
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
						plugin: ["veracode_sca"],
					},
					{
						id: vulnIds[3],
						advisory_ids: ["CVE-2024-9999"],
						vuln_id: [vulnIds[3], "CVE-2024-9999"],
						description: "This vuln is so new it's a -1 day",
						severity: "critical",
						remediation: "No patches available yet",
						components: {
							javathing: ["4.3.2"],
						},
						source_plugins: [
							"veracode_sca",
							"snyk",
							"aqua_cli_scanner",
							"trivy",
						],
						plugin: ["veracode_sca", "snyk", "aqua_cli_scanner", "trivy"],
					},
					{
						id: vulnIds[4],
						advisory_ids: ["CVE-2000-9999"],
						vuln_id: [vulnIds[4], "CVE-2000-9999"],
						description: "Oh noes, y2k",
						severity: "",
						remediation: "Rollback all clocks to 1999, party on.",
						components: {
							allthethings: ["1.9.99"],
						},
						source_plugins: ["aqua_cli_scanner", "trivy"],
						plugin: ["aqua_cli_scanner", "trivy"],
					},
				];
				const entity: { ids: string[]; entities: any } = {
					ids: vulns.map((vuln) => vuln.id),
					entities: {},
				};
				vulns.forEach((vuln) => {
					entity.entities[vuln.id] = { ...vuln };
				});
				// miragejs doesn't correctly handle query params that can have multiple values
				// so parse them out of the querystring using QueryString and replace the miragejs qs
				if (request?.queryParams) {
					const search: any = queryString.parse(request.url);
					if ("severity" in request.queryParams && "severity" in search) {
						request.queryParams["severity"] = search["severity"];
					}
					if ("plugin" in request.queryParams && "plugin" in search) {
						request.queryParams["plugin"] = search["plugin"];
					}
				}
				return getFilteredResults(
					request,
					entity,
					"search/vulnerabilities",
					vulns.length,
					["vuln_id", "plugin"],
				);
			});

			this.get(
				"/search/vulnerabilities/:id/repositories",
				(_schema, request) => {
					if (!("id" in request.params)) {
						return createResponse(400, "Invalid request, missing id");
					}
					const id = request.params.id;
					const entity = {
						ids: repos.map((repo) => repo.id),
						entities: repos,
					};
					// miragejs doesn't correctly handle query params that can have multiple values
					// so parse them out of the querystring using QueryString and replace the miragejs qs
					if (request?.queryParams && "risk" in request.queryParams) {
						const search: any = queryString.parse(request.url);
						if ("risk" in search) {
							request.queryParams["risk"] = search["risk"];
						}
					}
					return getFilteredResults(
						request,
						entity,
						`search/vulnerabilities/${id}/repositories`,
						repos.length,
						["id", "last_qualified_scan"],
					);
				},
			);

			this.get("/system/status", () => {
				const currentCheck = formatDate(DateTime.utc().toJSON(), "long");
				const nextCheck = formatDate(
					DateTime.utc()
						.plus({ milliseconds: AppGlobals.APP_MAINT_CHECK_INTERVAL })
						.toJSON(),
					"long",
				);
				// trigger session timeout
				if (defaults.showMaintenance && Math.random() < 0.04) {
					return createResponse(401, "Session timeout");
				}
				return {
					maintenance: {
						enabled: false,
						message: defaults.showMaintenance
							? `The system is scheduled to go offline for maintenance tonight at 12:00 AM EST. Maintenance mode checked at: ${currentCheck}. Next check at: ${nextCheck}`
							: "",
					},
				};
			});

			// user requests /users
			// return a mocked current user
			this.get("/users/self", () => {
				return {
					scan_orgs: [
						...new Set([
							// remove duplicates
							`${defaults.goodVcs}/${defaults.goodOrg}`,
							`${defaults.goodVcs}/${defaults.goodOrg}/org/path`,
							`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField`,
							`${defaults.goodVcs}.${defaults.goodOrg}.com`,
							`${defaults.badVcs}/${defaults.badOrg}`,
							`${defaults.sessionVcs}/${defaults.sessionOrg}`,
							`${AppGlobals.APP_DEMO_USER_VCSORG}`,
							// search services
							"azure",
							"bitbucket",
							"github",
							"our-source.example.com",
							"bigrepo.example.com",
							"teamstar.example.com",
							"allthecodes.example.com",
							"gitlab.com",
						]),
					],
					email: defaults.currentUser,
					last_login: formatNewDate(),
					admin: Math.random() < 0.5,
					scope: defaults.currentUserScope,
					features: getRandomFeatures(),
				};
			});

			this.get("/users/self/keys", (_schema, request) => {
				const limit =
					request?.queryParams && request.queryParams.limit
						? parseInt(request.queryParams.limit as string, 10)
						: defaults.limit;
				const offset =
					request?.queryParams && request.queryParams.offset
						? parseInt(request.queryParams.offset as string, 10)
						: 0;
				const results = userKeys.slice(offset, offset + limit);
				let previous = null;
				let next = null;
				if (offset > 0) {
					previous = `/users/self/keys?limit=${limit}&offset=${offset - limit}`;
				}
				if (offset + limit < defaults.scanCount) {
					next = `/users/self/keys?limit=${limit}&offset=${offset + limit}`;
				}

				return {
					results: results,
					count: userKeys.length,
					next: next,
					previous: previous,
				};
			});

			this.get(`/users`, (_schema, request) => {
				return getUsers(request);
			});

			this.get(`/users/:id`, (_schema, request) => {
				// re-generate user mock data if if hasn't been generated before
				if (allUsers.ids.length === 0) {
					generateUsers();
				}

				if (!("id" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				const id = request.params.id;
				const user = allUsers.entities[id];
				if (!user) {
					return createResponse(404, "Not found");
				}
				return user;
			});

			const getVcsServiceByName = (name: string) => {
				return userVcsServices.find((service) => service.name === name);
			};

			this.get("/users/self/services", () => {
				return userVcsServices;
			});

			this.get("/users/self/services/:service", (_schema, request) => {
				if (!("service" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				const service = request.params.service;
				if (!defaults.supportedServices.includes(service)) {
					return createResponse(
						400,
						`Service ID invalid. Valid options: [${defaults.supportedServices.join(
							", ",
						)}]`,
					);
				}
				const foundService = getVcsServiceByName(service);
				if (!foundService) {
					return createResponse(404, "Not found");
				}
				return foundService;
			});

			this.delete("/users/:id", (_schema, request) => {
				if (!("id" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				const id = request.params.id;
				const idx = allUsers.ids.findIndex((userId: string) => {
					return userId === id;
				});
				if (idx === -1) {
					return createResponse(404, "Not found");
				}
				allUsers.ids.splice(idx, 1);
				delete allUsers.entities[id];
				return new Response(204);
			});

			this.delete("/users/self/keys/:id", (_schema, request) => {
				if (!("id" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				if (
					!/^[0123456789abcdef]{8}-[0123456789abcdef]{4}-[0123456789abcdef]{4}-[0123456789abcdef]{4}-[0123456789abcdef]{12}$/.test(
						request.params.id,
					)
				) {
					return createResponse(400, "Key ID invalid");
				}
				const id = request.params.id;
				const idx = userKeys.findIndex((key) => {
					return key.id === id;
				});
				if (idx === -1) {
					return createResponse(404, "Not found");
				}
				userKeys.splice(idx, 1);
				return new Response(204);
			});

			this.delete("/users/self/services/:service", (_schema, request) => {
				if (!("service" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				const service = request.params.service;
				if (!defaults.supportedServices.includes(service)) {
					return createResponse(
						400,
						`Service ID invalid. Valid options: [${defaults.supportedServices.join(
							", ",
						)}]`,
					);
				}
				const idx = userVcsServices.findIndex(
					(userService) => userService.name === service,
				);
				if (idx === -1) {
					return createResponse(404, "Not found");
				}
				userVcsServices.splice(idx, 1);
				return new Response(204);
			});

			this.post("/users/:id", (_schema, request) => {
				if (!("id" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				const id = request.params.id;
				const attrs = JSON.parse(request.requestBody);
				if ("email" in attrs) {
					return createResponse(400, "Unsupported key email");
				}
				if ("id" in attrs) {
					return createResponse(400, "Unsupported key id");
				}
				if ("last_login" in attrs) {
					return createResponse(400, "Unsupported key last_login");
				}
				if ("scan_orgs" in attrs) {
					return createResponse(400, "Unsupported key scan_orgs");
				}
				if (!("scope" in attrs)) {
					return createResponse(400, "'scope' is required");
				}
				if (!Array.isArray(attrs.scope)) {
					return createResponse(400, "Scope is invalid");
				}
				if (id === "fail@fail") {
					// force a 404 failure for testing
					return createResponse(400, "Unable to add user");
				}

				if (id in allUsers.entities) {
					return createResponse(409, "User exists");
				}

				// scan_orgs are _not_ scope, but they're fine for mock data
				let scanOrgs = [];
				if (attrs.scope.includes("*")) {
					// all test orgs
					scanOrgs = [
						`${defaults.goodVcs}/${defaults.goodOrg}`,
						`${defaults.goodVcs}/${defaults.goodOrg}/org/path`,
						`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField`,
						`${defaults.goodVcs}.${defaults.goodOrg}.com`,
						`${defaults.badVcs}/${defaults.badOrg}`,
						`${defaults.sessionVcs}/${defaults.sessionOrg}`,
					];
				} else {
					scanOrgs = [...attrs.scope];
				}
				const newUser = {
					email: id,
					admin: attrs?.admin ?? false,
					last_login: null,
					scope: attrs?.scope ?? [],
					features: attrs.features ?? {},
					scan_orgs: scanOrgs,
				};
				allUsers.ids.push(id);
				allUsers.entities[id] = { ...newUser };
				return newUser;
			});

			this.put("/users/:id", (_schema, request) => {
				if (!("id" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				const id = request.params.id;
				const attrs = JSON.parse(request.requestBody);
				if ("email" in attrs) {
					return createResponse(400, "Unsupported key email");
				}
				if ("id" in attrs) {
					return createResponse(400, "Unsupported key id");
				}
				if ("last_login" in attrs) {
					return createResponse(400, "Unsupported key last_login");
				}
				if ("scan_orgs" in attrs) {
					return createResponse(400, "Unsupported key scan_orgs");
				}
				if ("scope" in attrs && !Array.isArray(attrs.scope)) {
					return createResponse(400, "Scope is invalid");
				}
				if (id === "fail@fail") {
					// force a 404 failure for testing
					return createResponse(400, "Unable to edit user");
				}

				if (!("id" in request.params)) {
					return createResponse(400, "Invalid request");
				}
				let user = allUsers.entities[id];
				if (!user) {
					return createResponse(404, "Not found");
				}

				// scan_orgs are _not_ scope, but they're fine for mock data
				let scanOrgs = null;
				if (attrs?.scope) {
					if (attrs.scope.includes("*")) {
						// all test orgs
						scanOrgs = [
							`${defaults.goodVcs}/${defaults.goodOrg}`,
							`${defaults.goodVcs}/${defaults.goodOrg}/org/path`,
							`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField`,
							`${defaults.goodVcs}.${defaults.goodOrg}.com`,
							`${defaults.badVcs}/${defaults.badOrg}`,
							`${defaults.sessionVcs}/${defaults.sessionOrg}`,
						];
					} else {
						scanOrgs = [...attrs.scope];
					}
				}
				user = {
					email: id,
					admin: attrs?.admin ?? user.admin,
					last_login: user.last_login,
					scope: attrs?.scope ?? user.scope,
					features: attrs.features ?? user.features,
					scan_orgs: attrs?.scope ? scanOrgs : user.scan_orgs,
				};
				allUsers.entities[id] = { ...user };
				return user;
			});

			this.post("/users/self/keys", (_schema, request) => {
				const attrs = JSON.parse(request.requestBody);
				if (!("name" in attrs)) {
					return createResponse(400, "'name' is required");
				}
				if (!("scope" in attrs)) {
					return createResponse(400, "'scope' is required");
				}
				if (!Array.isArray(attrs.scope)) {
					return createResponse(400, "Scope is invalid");
				}
				if (attrs.name === "fail") {
					// force a 404 failure for testing
					return createResponse(400, "unable to create user api key");
				}
				userKeys.push({
					id: generateId(),
					name: attrs.name,
					created: formatNewDate(),
					last_used: null,
					expires: DateTime.utc()
						.minus({ days: Math.floor(Math.random() * 365) })
						.plus({ years: 1 })
						.toJSON(),
					scope: attrs.scope,
					admin: attrs.admin ?? false,
					features: attrs?.features ? { ...attrs.features } : {},
					userEmail: ""
				});
				return {
					key: generateApiKey(),
				};
			});

			this.post("/users/self/services", (_schema, request) => {
				const attrs = JSON.parse(request.requestBody);
				if (!("name" in attrs)) {
					return createResponse(400, "'name' is required");
				}
				if (!("params" in attrs)) {
					return createResponse(400, "'params' is required");
				}
				if (!defaults.supportedServices.includes(attrs.name)) {
					return createResponse(
						400,
						`Service ID invalid. Valid options: [${defaults.supportedServices.join(
							", ",
						)}]`,
					);
				}
				if (!("auth_code" in attrs.params) && !("username" in attrs.params)) {
					return createResponse(
						400,
						"Either auth_code or username param is required",
					);
				}
				// not actually validating auth_code, just checking length to throw a test error
				if (
					"auth_code" in attrs.params &&
					!githubAuthRegex.test(attrs.params.auth_code)
				) {
					return createResponse(400, "Invalid auth_code param");
				}
				if (getVcsServiceByName(attrs.name)) {
					return createResponse(
						409,
						`Service ${attrs.name} exists for user ${defaults.currentUser}`,
					);
				}
				const newService: VcsService = {
					name: attrs.name,
					username: defaultUser?.toLowerCase().replace(/\s/g, "") + "-github",
					linked: formatNewDate(),
				};
				userVcsServices.push(newService);
				return newService;
			});

			const categoryNotDisabled = (category: string) =>
				!category.startsWith("-");

			// creates a generator function for returning scan results
			// add scan entity to scans entities object
			// and return json for a queued item
			const addScan = (scanOpts: ScanOpts) => {
				let excludePaths = scanOpts?.excludePaths ?? [];
				if (
					scanOpts?.includePaths &&
					scanOpts.includePaths.length > 0 &&
					(!scanOpts?.excludePaths || scanOpts?.excludePaths.length === 0)
				) {
					excludePaths = ["*"];
				}

				const entity: Entity = {
					progressToFailure: scanOpts.progressToFailure || false,
					// scanHistory has scanId appended to repo path
					repo: `${location.org}/${location.repo}/${scanOpts.scanId}`,
					initiated_by: scanOpts.initiatedBy,
					service: location.service,
					branch: scanOpts.branch,
					scan_options: {
						categories: scanOpts.categories,
						plugins: scanOpts.plugins,
						depth: scanOpts.depth,
						include_dev: scanOpts.includeDev,
						callback: {
							url: null,
							client_id: null,
						},
						batch_priority: scanOpts?.batch ?? false,
						include_paths: scanOpts?.includePaths ?? [],
						exclude_paths: excludePaths,
					},
					status: "queued",
					status_detail: {
						plugin_name: null,
						plugin_start_time: null,
						current_plugin: null,
						total_plugins: null,
					},
					timestamps: {
						queued: formatNewDate(),
						start: null, // start time is null when queued
						end: null,
					},
					batch_id: scanOpts?.batch ? generateId() : null,
					batch_description:
						scanOpts?.batch && Math.random() < 0.5
							? `Batch Scan ${DateTime.utc()
									.minus({ days: Math.floor(Math.random() * 365) })
									.toJSON()}`
							: null,
					qualified:
						scanOpts.categories.length === defaults.categories.length &&
						scanOpts.categories.every(categoryNotDisabled),
				};
				entity["gen"] = generateScanContent(entity);
				[defaultUser, defaultEmail] = getRandomUser({ includeNull: true });

				// add new scan to entity object
				scans.entities[scanOpts.scanId] = entity;
				// future: we could enforce a specific ordering on the scans
				// but since they're all generated at the same time they'll
				// all pretty much have the same start time, so no reason to address at this time
				scans.ids.push(scanOpts.scanId);

				return entity;
			};

			const getLocation = (request: Request) => {
				// strip namespace from url
				const urlParts = request.url
					.replace(`${this.namespace}/`, "")
					.replace(/\/history.*$/, "")
					.replace(/\/whitelist.*$/, "")
					.replace(
						/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*$/,
						"",
					) // remove scan_id
					.split("/");
				if (urlParts.length > 2) {
					const [service, org, ...repoParts] = urlParts;
					const repo = repoParts.join("/");
					return [service, org, repo];
				}
				return [];
			};

			const handlePostScan = (request: Request) => {
				// currently (posting) a new scan clears out existing scans in the entity
				scans = {
					entities: {},
					ids: [],
				};
				[location.service, location.org, location.repo] = getLocation(request);
				if (!location.org || !location.repo) {
					return createResponse(
						400,
						`Unsupported repo: ${location.service}/${location.org}`,
					);
				}

				const attrs = JSON.parse(request.requestBody);
				const scanId = generateId();
				const categories = getCategories(
					attrs.categories || defaults.categories,
				);
				const plugins = getPlugins(
					attrs.categories || defaults.categories,
					attrs.plugins || defaults.plugins,
				);
				addScan({
					scanId: scanId,
					branch: attrs.branch || defaults.branch,
					categories: categories,
					plugins: plugins,
					depth: attrs.depth || defaults.depth,
					includeDev: attrs.include_dev || defaults.includeDev,
					includePaths: attrs.include_paths || [],
					excludePaths: attrs.exclude_paths || [],
					initiatedBy: defaults.currentUser,
					progressToFailure: true,
					batch: false, // user-initiated scans aren't batched
				});
				// return queued new scan
				return {
					queued: [`/${location.org}/${location.repo}/${scanId}`],
					failed: [],
				};
			};

			// this next set of routes creates (adds) a single new scan
			this.post(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo`,
				(_schema, request) => {
					return handlePostScan(request);
				},
			);

			// negative test case to generate a scan creation failure
			this.post(
				`/${defaults.badVcs}/${defaults.badOrg}/:repo`,
				(_schema, request) => {
					if (!request.params.repo) {
						return createResponse(
							400,
							`Unsupported repo: ${defaults.badVcs}/${defaults.badOrg}`,
						);
					}
					// return error as 400 response to match real API
					return new Response(
						400,
						{},
						{
							queued: [],
							// Note: these error messages are not translated because this is just a mock
							// these would be returned by the actual server-side REST API in production
							failed: [
								{
									repo: `/${defaults.badVcs}/${defaults.badOrg}/${request.params.repo}`,
									error: "Unable to start scan",
								},
							],
						},
					);
				},
			);

			// negative test case to generate a 401 / session timeout
			this.post(`/${defaults.sessionVcs}/${defaults.sessionOrg}/:repo`, () => {
				return createResponse(401, "Session timeout");
			});

			// return type is "any" because this is an Analysis or SBOM Report with additional mock fields
			// may not contain "scan_id" field when used for returning a scan history result
			const getScanResultsById = (scanId: string, format: string): any => {
				if (scanId && scanId in scans.entities) {
					const entity = scans.entities[scanId];
					if (entity.gen) {
						// return the next "phase" from the generator function
						// this will be the current scan state
						let results: any;
						if (format === "summary" || format === "full") {
							if (entity.priorResults) {
								// deep-copy object so if we set summary results it won't alter the source
								results = JSON.parse(JSON.stringify(entity.priorResults));
							} else {
								results = JSON.parse(JSON.stringify(entity.gen.next().value));
							}
						} else {
							// scan history
							results = JSON.parse(JSON.stringify(entity.gen.next().value));
							entity.priorResults = JSON.parse(JSON.stringify(results));
						}
						// update scanHistory entity so status matches latest phase
						entity.status = results.status;
						entity.status_detail = results.status_detail;
						entity.timestamps = results.timestamps;

						if (format === "sbom") {
							results.sbom = [
								{
									name: "component5",
									version: "4.3.2",
									licenses: [{ id: "mit", name: "MIT license (MIT)" }],
									source: "Gemfile.lock",
									deps: [],
								},
								{
									name: "component1",
									version: "0.1.0",
									licenses: [{ license_id: "apache", name: "Apache" }],
									source: "node/module/package.json",
									deps: [
										{
											name: "component7",
											version: "0.8.4",
											licenses: [{ id: "mit", name: "MIT license (MIT)" }],
											source: "node/module/package.json",
											deps: [
												{
													name: "component9",
													version: "0.1.10",
													licenses: [],
													source: "node/module/package.json",
													deps: [],
												},
												{
													name: "component10",
													version: "0.4.2",
													licenses: [{ id: "mit", name: "MIT license (MIT)" }],
													source: "node/module/package.json",
													deps: [],
												},
												{
													name: "component11",
													version: "1.2.3",
													licenses: [
														{ license_id: "unlicensed", name: "Unlicensed" },
													],
													source: "node/module/package.json",
													deps: [],
												},
												{
													name: "component12",
													version: "1.0.1",
													licenses: [{ id: "unknown", name: "UNKNOWN" }],
													source: "node/module/package.json",
													deps: [],
												},
												{
													name: "component13",
													version: "0.3.2",
													licenses: [{ id: "bsd", name: "BSD 3-Clause" }],
													source: "node/module/package.json",
													deps: [],
												},
												{
													name: "component14",
													version: "0.0.1",
													licenses: [
														{ license_id: "bsd", name: "BSD 3-Clause" },
													],
													source: "node/module/package.json",
													deps: [],
												},
												{
													name: "component15",
													version: "10.1.10",
													licenses: [],
													source: "node/module/package.json",
													deps: [],
												},
											],
										},
									],
								},
							];
						} else {
							// non-SBOM scans
							// filter results by hiddenFindings
							results.results.vulnerabilities = filterVulns(
								results.results.vulnerabilities,
							);
							results.results.secrets = filterSecrets(results.results.secrets);
							results.results.static_analysis = filterAnalysis(
								results.results.static_analysis,
							);
							results.results.configuration = filterConfig(
								results.results.configuration,
							);

							// and calculate new summary totals after filtering
							results.results_summary.vulnerabilities = genVulnSummary(
								results as AnalysisReport,
							);
							results.results_summary.secrets = genSecretsSummary(
								results as AnalysisReport,
							);
							results.results_summary.static_analysis = genAnalysisSummary(
								results as AnalysisReport,
							);
							results.results_summary.configuration = genConfigSummary(
								results as AnalysisReport,
							);
						}

						if (format === "summary") {
							// summary format only returns results_summary, not full results
							results.results = {};
						} else if (format === "history" || format === "sbom") {
							// scan history & sbom results omit fields
							delete results.results;
							delete results.results_summary;
							delete results.success;
							delete results.errors;
							delete results.alerts;
							delete results.debug;
							delete results.truncated;
							delete results.application_metadata;

							// scan history doesn't have separate scan_id field, id is included in repo path
							if (format === "history") {
								results.repo += "/" + results.scan_id;
								delete results.scan_id;
							}
						}

						// remove mock internals
						delete results.gen;
						delete results.progressToFailure;
						delete results.priorResults;

						return results;
					}
				}
				return null;
			};

			const getScanById = (request: Request) => {
				const scanId = request.params.scanId;
				if (!location.org || !location.repo) {
					// user requests an individual scan directly from results page
					// go ahead and generate some results for this scanid
					// and some associated scan history
					[location.service, location.org, location.repo] =
						getLocation(request);
					generateScanHistory(scanId);
				}
				const format = request?.queryParams?.format || defaults.format;
				const results = getScanResultsById(scanId, format);
				if (results) {
					return results;
				}

				return createResponse(400, `Unknown scan id`);
			};

			this.get(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo/:scanId`,
				(_schema, request) => {
					return getScanById(request);
				},
			);

			const getRandomBranchName = () => {
				const branches = [
					null,
					"dev",
					"test",
					"qa",
					"prod",
					"nonprod",
					"integration",
					"main",
				];
				return branches[Math.floor(Math.random() * branches.length)];
			};

			// input: array that contains only categories to run
			// output: array that includes all categories, categories that won't run prefixed with -
			const getCategories = (catsToRun: ScanCategories[]) => {
				const categories: ScanCategories[] = [];
				defaults.categories.forEach((cat: ScanCategories) => {
					categories.push(
						`${catsToRun.includes(cat) ? "" : "-"}${cat}` as ScanCategories,
					);
				});
				return categories;
			};

			// input: array that contains only plugins to run
			// output: array that includes all plugins, plugins that won't run prefixed with -
			const getPlugins = (
				catsToRun: ScanCategories[],
				pluginsToRun: string[],
			) => {
				let plugins: string[] = [];

				// check each scan category,
				// if enabled, enable all plugins in that category
				// if disabled, disable all plugins in that category
				defaults.categories.forEach((cat: ScanCategories) => {
					switch (cat) {
						case "configuration":
							if (catsToRun.includes(cat)) {
								plugins = [...plugins, ...configPlugins];
							} else {
								plugins = [
									...plugins,
									...configPlugins.map((plugin) => `-${plugin}`),
								];
							}
							break;
						case "inventory":
							if (catsToRun.includes(cat)) {
								plugins = [...plugins, ...techPlugins];
							} else {
								plugins = [
									...plugins,
									...techPlugins.map((plugin) => `-${plugin}`),
								];
							}
							break;
						case "secret":
							if (catsToRun.includes(cat)) {
								plugins = [...plugins, ...secretPlugins];
							} else {
								plugins = [
									...plugins,
									...secretPlugins.map((plugin) => `-${plugin}`),
								];
							}
							break;
						case "vulnerability":
							if (catsToRun.includes(cat)) {
								plugins = [...plugins, ...vulnPlugins];
							} else {
								plugins = [
									...plugins,
									...vulnPlugins.map((plugin) => `-${plugin}`),
								];
							}
							break;
						case "static_analysis":
							if (catsToRun.includes(cat)) {
								plugins = [...plugins, ...staticPlugins];
							} else {
								plugins = [
									...plugins,
									...staticPlugins.map((plugin) => `-${plugin}`),
								];
							}
							break;
						case "sbom":
							if (catsToRun.includes(cat)) {
								plugins = [...plugins, ...sbomPlugins];
							} else {
								plugins = [
									...plugins,
									...sbomPlugins.map((plugin) => `-${plugin}`),
								];
							}
							break;
					}
				});

				// loop through plugins specified and individually enable or disable
				for (let i = 0; i < plugins.length; i += 1) {
					for (let j = 0; j < pluginsToRun.length; j += 1) {
						if (
							plugins[i].replace(/^-/, "") === pluginsToRun[j].replace(/^-/, "")
						) {
							plugins[i] = pluginsToRun[j];
						}
					}
				}
				return plugins;
			};

			const getRandomCategories = () => {
				const categories: ScanCategories[] = [...defaults.categories];

				const retCategories: ScanCategories[] = [];
				for (let i = 0; i < categories.length; i += 1) {
					if (Math.random() < 0.5) {
						retCategories.push(categories[i]);
					}
				}

				return retCategories;
			};

			const getRandomPlugins = () => {
				const plugins: string[] = [...defaults.plugins];

				const retPlugins: string[] = [];
				for (let i = 0; i < plugins.length; i += 1) {
					if (Math.random() < 0.1) {
						retPlugins.push(plugins[i]);
					}
				}

				return retPlugins;
			};

			// generate a bunch of random scan history that can be paged in subsequent calls
			// if user passes-in a scanId, include that scanId in the history generated
			const generateScanHistory = (useScanId?: string) => {
				scans = {
					entities: {},
					ids: [],
				};
				for (let i = 0; i < defaults.scanCount; i += 1) {
					const scanId = i === 0 && useScanId ? useScanId : generateId();
					const categories = getCategories(getRandomCategories());
					const plugins = getPlugins(categories, getRandomPlugins());
					const [, randomEmail] = getRandomUser({ includeNull: true });
					const entity = addScan({
						scanId: scanId,
						branch: getRandomBranchName(),
						categories: categories,
						plugins: plugins,
						depth: Math.floor(Math.random() * (defaults.depth ?? 0)),
						includeDev: Math.random() < 0.5,
						initiatedBy: randomEmail,
						progressToFailure: false,
						batch: Math.random() < 0.75, // more batched scans
						includePaths:
							Math.random() < 0.5
								? ["include1", "include2", "include3", "include4"]
								: [],
						excludePaths:
							Math.random() < 0.5
								? ["exclude1", "exclude2", "exclude3", "exclude4"]
								: [],
					});

					// set each scan to be at a different status phase
					// by incrementing generator functions randomly based non # categories to scan
					if (entity.gen) {
						entity.progressToFailure = true; // allow initial scan state to be failed/terminated
						let results: AnalysisReport = entity.gen.next().value;
						for (
							let j = 0;
							j < Math.floor(Math.random() * (categories.length + 5)); // add extra increments for failure, error, terminated phases
							j += 1
						) {
							results = entity.gen.next().value;
						}

						// set back to false so scans can "progress" past complete state
						entity.progressToFailure = false;
						// copy status fields from current state into scan history "summary" entity
						entity.status = results.status;
						entity.status_detail = results.status_detail;
						entity.timestamps = results.timestamps;
					}
				}
				console.debug("generated total mock scans:", defaults.scanCount);
			};

			const getScanHistory = (request: Request) => {
				const [service, org, repo] = getLocation(request);
				if (!repo || repo === "fail") {
					// force a 404 failure for testing
					return createResponse(
						400,
						`Unsupported repo: ${location.service}/${location.org}`,
					);
				}

				// re-generate scan history mock data if:
				// if hasn't been generated before or
				// the repo requested (service, org, repo) has changed
				if (
					scans.ids.length < defaults.scanCount ||
					service !== location.service ||
					org !== location.org ||
					repo !== location.repo
				) {
					[location.service, location.org, location.repo] = [
						service,
						org,
						repo,
					];
					generateScanHistory();
				}
				[defaultUser, defaultEmail] = [null, null];

				const limit =
					request?.queryParams && request.queryParams.limit
						? parseInt(request.queryParams.limit as string, 10)
						: defaults.limit;
				const offset =
					request?.queryParams && request.queryParams.offset
						? parseInt(request.queryParams.offset as string, 10)
						: 0;
				const initiatedBy =
					request?.queryParams && request.queryParams.initiated_by;
				const includeBatch =
					request?.queryParams && request.queryParams.include_batch;
				const filteredScans: Adapter = {
					ids: [],
					entities: {},
				};
				let returnFrom = scans;
				// filter scan results
				if (initiatedBy || !includeBatch) {
					scans.ids.forEach((scanId) => {
						if (scanId in scans.entities) {
							if (initiatedBy && !includeBatch) {
								if (
									scans.entities[scanId].initiated_by === initiatedBy &&
									!scans.entities[scanId].scan_options?.batch_priority
								) {
									filteredScans.entities[scanId] = scans.entities[scanId];
									filteredScans.ids.push(scanId);
								}
							} else if (
								initiatedBy &&
								scans.entities[scanId].initiated_by === initiatedBy
							) {
								filteredScans.entities[scanId] = scans.entities[scanId];
								filteredScans.ids.push(scanId);
							} else if (
								!includeBatch &&
								!scans.entities[scanId].scan_options?.batch_priority
							) {
								filteredScans.entities[scanId] = scans.entities[scanId];
								filteredScans.ids.push(scanId);
							}
						}
					});
					returnFrom = filteredScans;
				}

				const scanIds = returnFrom.ids.slice(offset, offset + limit);
				const results: any = [];
				scanIds.forEach((scanId) => {
					if (scanId in returnFrom.entities) {
						results.push(getScanResultsById(scanId, "history"));
					}
				});

				let previous = null;
				let next = null;
				if (offset > 0) {
					previous = `${location.service}/${location.org}/${
						location.repo
					}/history?limit=${limit}&offset=${offset - limit}`;
					if (initiatedBy) {
						previous += `&initiated_by=${initiatedBy}`;
					}
					if (includeBatch) {
						previous += "&include_batch=true";
					}
				}
				if (offset + limit < defaults.scanCount) {
					next = `${location.service}/${location.org}/${
						location.repo
					}/history?limit=${limit}&offset=${offset + limit}`;
					if (initiatedBy) {
						next += `&initiated_by=${initiatedBy}`;
					}
					if (includeBatch) {
						next += "&include_batch=true";
					}
				}

				return {
					results: results,
					count: returnFrom.ids.length,
					next: next,
					previous: previous,
				};
			};

			const generateUsers = () => {
				allUsers = {
					entities: {},
					ids: [],
				};
				for (let i = 0; i < defaults.userCount; i += 1) {
					let [, randomEmail] = getRandomUser({
						userIndex: i,
						includeNull: false,
					});
					if (!randomEmail) {
						randomEmail = "self";
					}
					const scope =
						Math.random() < 0.5
							? // test: matches 1+ occurrence of any character
								["*"]
							: [
									// test: matches any character in seq once
									`${defaults.goodVcs}/${defaults.goodOrg}/regex-[0-9]`,
									// test: matches any character not insequence once
									`${defaults.goodVcs}/${defaults.goodOrg}/org/path/not/[!0-9]`,
									// test: matches single occurrence of any character
									`${defaults.goodVcs}/${defaults.goodOrg}/org/path/?`,
									// test: exact match
									`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/repo`,
									// test: don't interpret . as a regex "any" character
									// test: interpret [?] as literal ? not as a regex pattern
									`${defaults.goodVcs}.${defaults.goodOrg}.com/interpret[?]`,
								];
					let scanOrgs = [];
					if (scope[0] === "*") {
						scanOrgs = [
							`${defaults.goodVcs}/${defaults.goodOrg}`,
							`${defaults.goodVcs}/${defaults.goodOrg}/org/path`,
							`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField`,
							`${defaults.goodVcs}.${defaults.goodOrg}.com`,
							`${defaults.badVcs}/${defaults.badOrg}`,
							`${defaults.sessionVcs}/${defaults.sessionOrg}`,
						];
					} else {
						scanOrgs = [
							`${defaults.goodVcs}/${defaults.goodOrg}`,
							`${defaults.goodVcs}/${defaults.goodOrg}/org/path`,
							`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField`,
							`${defaults.goodVcs}.${defaults.goodOrg}.com]`,
						];
					}
					const entity = {
						email: randomEmail,
						admin: Math.random() < 0.25,
						last_login: DateTime.utc()
							.minus({ days: Math.floor(Math.random() * 365) })
							.toJSON(),
						scope: scope,
						features: getRandomFeatures(),
						scan_orgs: scanOrgs,
					};
					allUsers.entities[entity.email] = entity;
					// future: we could enforce a specific ordering on the scans
					// but since they're all generated at the same time they'll
					// all pretty much have the same start time, so no reason to address at this time
					allUsers.ids.push(entity.email);
				}
				console.debug("generated total mock users:", defaults.userCount);
			};

			const keyExists = (obj: any, key: string) => {
				if (!obj || (typeof obj !== "object" && !Array.isArray(obj))) {
					return null;
				} else if (key in obj) {
					return obj[key];
				} else if (Array.isArray(obj)) {
					for (let i = 0; i < obj.length; i++) {
						const result: any = keyExists(obj[i], key);
						if (result) {
							return result;
						}
					}
				} else {
					for (const k in obj) {
						const result: any = keyExists(obj[k], key);
						if (result) {
							return result;
						}
					}
				}
				return null;
			};

			// for an redux-style entity adapter, return a filtered/paged set of results based on request queryparams
			const getFilteredResults = (
				request: Request,
				adapter: any,
				path: string,
				totalCount: number,
				removeFields?: string[],
			) => {
				let filteredIds = [...adapter.ids];
				for (const [param, value] of Object.entries(
					request.queryParams || {},
				)) {
					// look for filtering fields
					if (!["limit", "offset", "order_by"].includes(param)) {
						filteredIds = filteredIds.filter((id: string) => {
							if (id in adapter.entities) {
								const entity = adapter.entities[id];
								if (param.endsWith("__contains")) {
									const field = param.replace(/__contains$/, "");
									// if we can't find an exact match with the filter on the field name
									// also try simple plural (e.g. "license" => "licenses")
									let v = keyExists(entity, field);
									if (v === null) {
										v = keyExists(entity, field + "s");
									}
									if (v) {
										const valueArr = Array.isArray(v) ? [...v] : [v];
										return valueArr.some((item: string) => {
											if (item && typeof item === "object") {
												// comparing against an object, see if there's a name field we can compare with filter
												if ("name" in item) {
													return (item["name"] as any).includes(value);
												}
												return true; // don't know what to do here, assume match
											}
											return item.includes(value as string);
										});
									}
								} else if (param.endsWith("__icontains")) {
									const field = param.replace(/__icontains$/, "");
									let v = keyExists(entity, field);
									if (v === null) {
										v = keyExists(entity, field + "s");
									}
									if (v) {
										const valueArr = Array.isArray(v) ? [...v] : [v];
										return valueArr.some((item: string) => {
											if (item && typeof item === "object") {
												// comparing against an object, see if there's a name field we can compare with filter
												if ("name" in item) {
													return (item["name"] as any)
														.toLowerCase()
														.includes((value as string).toLowerCase());
												}
												return true; // don't know what to do here, assume match
											}
											return item
												.toLowerCase()
												.includes((value as string).toLowerCase());
										});
									}
								} else if (param.endsWith("__lt")) {
									const field = param.replace(/__lt$/, "");
									let v = keyExists(entity, field);
									if (v === null) {
										v = keyExists(entity, field + "s");
									}
									if (v) {
										const valueArr = Array.isArray(v) ? [...v] : [v];
										return valueArr.some(
											(item: string) => item < (value as string),
										);
									}
								} else if (param.endsWith("__gt")) {
									const field = param.replace(/__gt$/, "");
									let v = keyExists(entity, field);
									if (v === null) {
										v = keyExists(entity, field + "s");
									}
									if (v) {
										const valueArr = Array.isArray(v) ? [...v] : [v];
										return valueArr.some(
											(item: string) => item > (value as string),
										);
									}
								} else if (param.endsWith("__isnull")) {
									const field = param.replace(/__isnull$/, "");
									let v = keyExists(entity, field);
									if (v === null) {
										v = keyExists(entity, field + "s");
									}
									const valueArr = Array.isArray(v) ? [...v] : [v];
									const isNull = !(
										(value as string).toLocaleLowerCase() === "false"
									);
									if (valueArr.length === 0) {
										return isNull;
									}
									return valueArr.some((item: string) => {
										return isNull ? item === null : item !== null;
									});
								} else {
									// exact
									const field = param;
									let v = keyExists(entity, field);
									if (v === null) {
										v = keyExists(entity, field + "s");
									}
									const valueArr = Array.isArray(v) ? [...v] : [v];
									return valueArr.some((item: string) => {
										if (item && typeof item === "object") {
											// comparing against an object, see if there's a name field we can compare with filter
											if ("name" in item) {
												return (item["name"] as any) === value;
											}
											return true; // don't know what to do here, assume match
										}
										if (Array.isArray(value)) {
											return value.includes(item);
										}
										return item === (value === "null" ? null : value);
									});
								}
							}
							return false;
						});
					}
				}

				const limit =
					request?.queryParams && request.queryParams.limit
						? parseInt(request.queryParams.limit as string, 10)
						: defaults.limit;
				const offset =
					request?.queryParams && request.queryParams.offset
						? parseInt(request.queryParams.offset as string, 10)
						: 0;
				const orderBy =
					request?.queryParams && (request.queryParams.order_by as string);
				let orderedIds = [...filteredIds];
				if (orderBy) {
					let desc = false;
					let field = orderBy;
					if (orderBy.startsWith("-")) {
						desc = true;
						field = orderBy.replace("-", "");
					}
					orderedIds = orderedIds.sort((a: string, b: string) => {
						if (a in adapter.entities && b in adapter.entities) {
							const obA = adapter.entities[a];
							const obB = adapter.entities[b];
							if (field in obA && field in obB) {
								const fieldA = obA[field];
								const fieldB = obB[field];
								if (desc) {
									if (typeof fieldB === "string") {
										return fieldB.localeCompare(fieldA);
									} else {
										// boolean/numeric
										return fieldA - fieldB;
									}
								} else {
									if (typeof fieldA === "string") {
										return fieldA.localeCompare(fieldB);
									} else {
										// boolean/numeric
										return fieldB - fieldA;
									}
								}
							}
						}
						return 0;
					});
				}

				const entityIds = orderedIds.slice(offset, offset + limit);
				const results: any = [];
				entityIds.forEach((entityId: string) => {
					if (entityId in adapter.entities) {
						const result = { ...adapter.entities[entityId] };
						// remove any fields used for internal use that are not returned by API
						if (removeFields && Array.isArray(removeFields)) {
							removeFields.forEach((field) => {
								delete result[field];
							});
						}
						results.push(result);
					}
				});

				let previous = null;
				let next = null;
				if (offset > 0) {
					previous = `${path}?limit=${limit}&offset=${offset - limit}`;
				}
				if (offset + limit < totalCount) {
					next = `${path}?limit=${limit}&offset=${offset + limit}`;
				}

				return {
					results: results,
					count: orderedIds.length,
					next: next,
					previous: previous,
				};
			};

			const getUsers = (request: Request) => {
				// (re)generate user mock data if if hasn't been generated before
				if (allUsers.ids.length === 0) {
					generateUsers();
				}
				return getFilteredResults(
					request,
					allUsers,
					"/users",
					defaults.userCount,
					["scan_orgs"],
				);
			};

			this.get(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo/history`,
				(_schema, request) => {
					return getScanHistory(request);
				},
			);

			// negative test case to generate a 401 / session timeout
			this.get(
				`/${defaults.sessionVcs}/${defaults.sessionOrg}/:repo/history`,
				() => {
					return createResponse(401, "Session timeout");
				},
			);

			const getHiddenFindings = (request: Request) => {
				const [service, org, repo] = getLocation(request);
				if (!repo || repo === "fail") {
					// force a 404 failure for testing
					return createResponse(
						400,
						`Unsupported repo: ${location.service}/${location.org}`,
					);
				}
				if (repo === "ok") {
					return new Response(204);
				}

				// reset repo hidden findings mock data if:
				// if hasn't been generated before or
				// the repo requested (service, org, repo) has changed
				if (
					service !== location.service ||
					org !== location.org ||
					repo !== location.repo
				) {
					[location.service, location.org, location.repo] = [
						service,
						org,
						repo,
					];
					hiddenFindings = [];
				}

				return hiddenFindings;
			};

			const addHiddenFinding = (request: Request) => {
				const [service, org, repo] = getLocation(request);
				if (!repo || repo === "fail") {
					// force a 404 failure for testing
					return createResponse(
						400,
						`Unsupported repo: ${location.service}/${location.org}`,
					);
				}

				// reset repo hidden findings mock data if:
				// if hasn't been generated before or
				// the repo requested (service, org, repo) has changed
				if (
					service !== location.service ||
					org !== location.org ||
					repo !== location.repo
				) {
					[location.service, location.org, location.repo] = [
						service,
						org,
						repo,
					];
					hiddenFindings = [];
				}

				const attrs = JSON.parse(request.requestBody);
				if (!("type" in attrs)) {
					return createResponse(400, 'Missing key: "type"');
				}
				if (!("value" in attrs)) {
					return createResponse(400, 'Missing key: "value"');
				}
				if (!("reason" in attrs)) {
					return createResponse(400, 'Missing key: "reason"');
				}
				if (typeof attrs.reason !== "string") {
					return createResponse(400, "Reason must be a string");
				}
				if (attrs.reason.length < 1 || attrs.reason.length > 512) {
					return createResponse(
						400,
						"Reason must be between 1 and 512 characters",
					);
				}
				// programmatically force a failure for mock testing
				if (attrs.reason === "fail") {
					// force a 404 failure for testing
					return createResponse(400, `Adding a hidden finding failed`);
				}

				let value = {};
				let severity = undefined;
				switch (attrs.type) {
					case "configuration":
						if (!("id" in attrs.value)) {
							return createResponse(400, 'Missing value key: "id"');
						}
						if (
							attrs.value.id in scanConfigResults &&
							"severity" in scanConfigResults[attrs.value.id]
						) {
							severity = scanConfigResults[attrs.value.id].severity;
						}
						value = {
							id: attrs.value.id,
							severity,
						};
						break;
					case "secret":
						if (!("filename" in attrs.value)) {
							return createResponse(400, 'Missing value key: "filename"');
						}
						if (!("line" in attrs.value)) {
							return createResponse(400, 'Missing value key: "line"');
						}
						if (!("commit" in attrs.value)) {
							return createResponse(400, 'Missing value key: "commit"');
						}
						value = {
							filename: attrs.value.filename,
							line: attrs.value.line,
							commit: attrs.value.commit,
						};
						break;
					case "secret_raw":
						if (!("value" in attrs.value)) {
							return createResponse(400, 'Missing value key: "value"');
						}
						value = {
							value: attrs.value.value,
						};
						break;
					case "static_analysis":
						if (!("filename" in attrs.value)) {
							return createResponse(400, 'Missing value key: "filename"');
						}
						if (!("line" in attrs.value)) {
							return createResponse(400, 'Missing value key: "line"');
						}
						if (!("type" in attrs.value)) {
							return createResponse(400, 'Missing value key: "type"');
						}
						if (attrs.value.filename in scanAnalysisResults) {
							for (
								let i = 0;
								i < scanAnalysisResults[attrs.value.filename].length;
								i += 1
							) {
								if (
									attrs.value.type ===
										scanAnalysisResults[attrs.value.filename][i].type &&
									attrs.value.line ===
										scanAnalysisResults[attrs.value.filename][i].line
								) {
									severity =
										scanAnalysisResults[attrs.value.filename][i].severity;
									break;
								}
							}
						}
						value = {
							filename: attrs.value.filename,
							line: attrs.value.line,
							type: attrs.value.type,
							severity,
						};
						break;
					case "vulnerability":
						if (!("id" in attrs.value)) {
							return createResponse(400, 'Missing value key: "id"');
						}
						if (!("component" in attrs.value)) {
							return createResponse(400, 'Missing value key: "component"');
						}
						if (!("source" in attrs.value)) {
							return createResponse(400, 'Missing value key: "source"');
						}
						if (
							attrs.value.component in scanVulnResults &&
							attrs.value.id in scanVulnResults[attrs.value.component]
						) {
							if (
								scanVulnResults[attrs.value.component][
									attrs.value.id
								].source.includes(attrs.value.source)
							) {
								severity =
									scanVulnResults[attrs.value.component][attrs.value.id]
										.severity;
							}
						}
						value = {
							id: attrs.value.id,
							source: attrs.value.source,
							component: attrs.value.component,
							severity,
						};
						break;
					case "vulnerability_raw":
						if (!("id" in attrs.value)) {
							return createResponse(400, 'Missing value key: "id"');
						}
						for (const [, vulns] of Object.entries(scanVulnResults ?? {})) {
							if (severity) {
								break;
							}
							for (const [id, details] of Object.entries(vulns ?? {})) {
								if (id === attrs.value.id) {
									severity = details.severity;
									break;
								}
							}
						}
						value = {
							id: attrs.value.id,
							severity,
						};
						break;
					default:
						return createResponse(400, `Invalid type: "${attrs.type}"`);
				}
				if (attrs.expires === null) {
					return createResponse(502, "Internal server error");
				}

				const newHiddenFinding = {
					type: attrs.type,
					value: value,
					reason: attrs.reason,
					expires: attrs?.expires ?? null,
					id: generateId(),
					// now returned by API
					created_by: defaults.currentUser,
					created: new Date().toISOString().replace(/Z$/, ""),
				} as HiddenFinding;
				// don't check for duplicates in hiddenFindings, duplicates are allowed in API
				hiddenFindings.push(newHiddenFinding);
				// return object is in array and does not contain a created_by field
				return [newHiddenFinding];
			};

			const updateHiddenFinding = (request: Request) => {
				const id = request.params.id;
				const [service, org, repo] = getLocation(request);
				if (!repo || repo === "fail") {
					// force a 404 failure for testing
					return createResponse(
						400,
						`Unsupported repo: ${location.service}/${location.org}`,
					);
				}
				if (
					service !== location.service ||
					org !== location.org ||
					repo !== location.repo
				) {
					[location.service, location.org, location.repo] = [
						service,
						org,
						repo,
					];
					return new Response(404);
				}

				const attrs = JSON.parse(request.requestBody);
				if (!("type" in attrs)) {
					return createResponse(400, 'Missing key: "type"');
				}
				if (!("value" in attrs)) {
					return createResponse(400, 'Missing key: "value"');
				}
				if (!("reason" in attrs)) {
					return createResponse(400, 'Missing key: "reason"');
				}
				if (typeof attrs.reason !== "string") {
					return createResponse(400, "Reason must be a string");
				}
				if (attrs.reason.length < 1 || attrs.reason.length > 512) {
					return createResponse(
						400,
						"Reason must be between 1 and 512 characters",
					);
				}
				// programmatically force a failure for mock testing
				if (attrs.reason === "fail") {
					// force a 404 failure for testing
					return createResponse(400, `Adding a hidden finding failed`);
				}

				let value = {};
				switch (attrs.type) {
					case "configuration":
						if (!("id" in attrs.value)) {
							return createResponse(400, 'Missing value key: "id"');
						}
						value = {
							id: attrs.value.id,
						};
						break;
					case "secret":
						if (!("filename" in attrs.value)) {
							return createResponse(400, 'Missing value key: "filename"');
						}
						if (!("line" in attrs.value)) {
							return createResponse(400, 'Missing value key: "line"');
						}
						if (!("commit" in attrs.value)) {
							return createResponse(400, 'Missing value key: "commit"');
						}
						value = {
							filename: attrs.value.filename,
							line: attrs.value.line,
							commit: attrs.value.commit,
						};
						break;
					case "secret_raw":
						if (!("value" in attrs.value)) {
							return createResponse(400, 'Missing value key: "value"');
						}
						value = {
							value: attrs.value.value,
						};
						break;
					case "static_analysis":
						if (!("filename" in attrs.value)) {
							return createResponse(400, 'Missing value key: "filename"');
						}
						if (!("line" in attrs.value)) {
							return createResponse(400, 'Missing value key: "line"');
						}
						if (!("type" in attrs.value)) {
							return createResponse(400, 'Missing value key: "type"');
						}
						value = {
							filename: attrs.value.filename,
							line: attrs.value.line,
							type: attrs.value.type,
						};
						break;
					case "vulnerability":
						if (!("id" in attrs.value)) {
							return createResponse(400, 'Missing value key: "id"');
						}
						if (!("component" in attrs.value)) {
							return createResponse(400, 'Missing value key: "component"');
						}
						if (!("source" in attrs.value)) {
							return createResponse(400, 'Missing value key: "source"');
						}
						value = {
							id: attrs.value.id,
							source: attrs.value.source,
							component: attrs.value.component,
						};
						break;
					case "vulnerability_raw":
						if (!("id" in attrs.value)) {
							return createResponse(400, 'Missing value key: "id"');
						}
						value = {
							id: attrs.value.id,
						};
						break;
					default:
						return createResponse(400, `Invalid type: "${attrs.type}"`);
				}
				if (attrs.expires === null) {
					return createResponse(502, "Internal server error");
				}

				// update existing finding values
				for (let i = 0; i < hiddenFindings.length; i += 1) {
					if (
						hiddenFindings[i].id === id &&
						hiddenFindings[i].type === attrs.type
					) {
						hiddenFindings[i] = {
							type: attrs.type,
							value: value,
							reason: attrs.reason,
							expires: attrs?.expires ?? null,
							id: id,
							updated_by: defaults.currentUser,
							updated: new Date().toISOString().replace(/Z$/, ""),
						} as HiddenFinding;
					}
				}
				return new Response(204);
			};

			const deleteHiddenFinding = (request: Request) => {
				const id = request.params.id;
				const [service, org, repo] = getLocation(request);
				if (!repo || repo === "fail") {
					// force a 404 failure for testing
					return createResponse(
						400,
						`Unsupported repo: ${location.service}/${location.org}`,
					);
				}
				if (
					service !== location.service ||
					org !== location.org ||
					repo !== location.repo
				) {
					return new Response(404);
				}

				// remove existing finding
				for (let i = 0; i < hiddenFindings.length; i += 1) {
					if (hiddenFindings[i].id === id) {
						hiddenFindings.splice(i, 1);
					}
				}
				return new Response(204);
			};

			this.get(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.get(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo/whitelist`,
				(_schema, request) => {
					return getHiddenFindings(request);
				},
			);

			this.post(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.post(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo/whitelist`,
				(_schema, request) => {
					return addHiddenFinding(request);
				},
			);

			this.put(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.put(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return updateHiddenFinding(request);
				},
			);

			this.delete(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`/${defaults.goodVcs}/${defaults.goodOrg}/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`${defaults.goodVcs}.${defaults.goodOrg}.com/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`${defaults.goodVcs}/${defaults.goodOrg}/org/path/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);

			this.delete(
				`${defaults.goodVcs}/${defaults.goodOrg}ThisIsAVeryLongNameForTheField/:org/:repo/whitelist/:id`,
				(_schema, request) => {
					return deleteHiddenFinding(request);
				},
			);
		},
	});

	return server;
}
