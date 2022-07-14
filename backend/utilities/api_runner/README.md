# Analyzer Repo API Lambda

This is a utility for running an API Lambda locally. This expects that the `ANALYZER_*` are correctly set for
accessing an Analyzer environment, usually the local dev environment stood up by  `docker-compose.dev.yml`.

```bash
$ api_runner --help
usage: api_runner [-h] --api API --method METHOD --path PATH [--args ARGS] [--headers HEADERS] [--body BODY]

API Runner 2020.8

optional arguments:
  -h, --help         show this help message and exit
  --api API          API to run
  --method METHOD    HTTP method
  --path PATH        URL path
  --args ARGS        URL query args
  --headers HEADERS  Headers
  --body BODY        Request body
```

Example:

```bash
$ api_runner --api repo --method GET --path github/testorg/testrepo --headers "x-api-key: $ANALYZER_API_KEY"
[2020-08-19 14:41:45] WARNING  [repo.util.utils] S3_BUCKET is None, please confirm this is a testing environment.
Parsing ID: github/testorg/testrepo
{
  "isBase64Encoded": "false",
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"repo\": \"testorg/testrepo\", \"scan_id\": \"fc3ea9c7-9770-42a6-9151-b76814d3ef76\", \"service\": \"github\", \"branch\": null, \"status\": \"completed\", \"status_detail\": {\"plugin_name\": null, \"plugin_start_time\": null, \"current_plugin\": null, \"total_plugins\": null}, \"success\": false, \"truncated\": false, \"timestamps\": {\"start\": \"2020-07-31T14:04:58.474253+00:00\", \"end\": \"2020-07-31T14:05:10.054928+00:00\"}, \"errors\": {}, \"results\": {\"vulnerabilities\": {}, \"secrets\": {}, \"static_analysis\": {\"/work/base/node/bad_javascript/CR789393.md.js\": [{\"line\": 4, \"type\": \"\", \"message\": \"Parsing error: Unexpected token i\", \"severity\": \"medium\"}], \"/work/base/node/bad_javascript/CVE-2017-5088.md.js\": [{\"line\": 12, \"type\": \"\", \"message\": \"Parsing error: Unexpected token >\", \"severity\": \"medium\"}], \"/work/base/node/bad_javascript/CVE-2018-6142.md.js\": [{\"line\": 4, \"type\": \"\", \"message\": \"Parsing error: The keyword 'const' is reserved\", \"severity\": \"medium\"}], \"/work/base/node/bad_javascript/CVE-2018-6143.md.js\": [{\"line\": 4, \"type\": \"\", \"message\": \"Parsing error: The keyword 'class' is reserved\", \"severity\": \"medium\"}], \"/work/base/typescript/auth.ts\": [{\"line\": 1, \"type\": \"\", \"message\": \"Parsing error: The keyword 'export' is reserved\", \"severity\": \"medium\"}], \"/work/base/typescript/class.tsx\": [{\"line\": 1, \"type\": \"\", \"message\": \"Parsing error: The keyword 'import' is reserved\", \"severity\": \"medium\"}], \"/work/base/typescript/src/actions/index.tsx\": [{\"line\": 2, \"type\": \"\", \"message\": \"Parsing error: The keyword 'import' is reserved\", \"severity\": \"medium\"}]}, \"inventory\": {}}}"
}
```
