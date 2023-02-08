# API Examples

## Authentication

The API accepts a key in the `x-api-key` header.  
You can create an API key in the User Profile section of the Artemis web UI.

## Initiating a single scan

The primary API interface for creating scans, retrieving reports and scan history, and manipulating the allow list follows the format `/api/v1/SERVICE/ORG/REPO` where `SERVICE` is the name of the VCS the repo resides in, such as github or an hostname, in the case of an internal VCS. `ORG` is the organization within the VCS, such as testorg. Some VCS, such as GitLab allow for arbitrary nesting of subgroups. In that case the set of subgroups is part of the ORG, such as group/group1/group2. Finally, REPO is the repository name.

For example, in the case of a repository named example in the `testorg` GitHub organization the SERVICE is github, the ORG is `testorg`, and the REPO is `example`. Therefore, the API endpoint for scanning the example repository would be `/api/v1/github/testorg/example`

To initiate a scan, POST to the `/api/v1/SERVICE/ORG/REPO` endpoint for the repository you wish to scan. The body of the POST request is a JSON object. If the body is empty all the defaults are used. The object fields are:

* branch: [OPTIONAL, default: HEAD] The branch to scan. If omitted the scan is run against the HEAD ref.
* depth: [OPTIONAL, default: 500] If a tool allows a GitHub depth limit, the max number of commits to examine. Otherwise this value is ignored.
* plugins: [OPTIONAL] The specific plugins to run against the repository. If omitted, all plugins are run. If included but empty, no plugins are run.
* categories: [OPTIONAL] The specific plugin categories to run against the repository. If omitted, all plugins are run. If included alongside plugins (above), all plugins under the specified categories PLUS the plugins within the plugins list will be run.
* callback: [OPTIONAL] A dictionary containing the URL to POST to when the scan is completed and a client-defined identifier to echo back in the POST body.
	* url: Callback URL.
	* **client_id: Client-defined ID string.

## Initiating multiple scans for the same service

You can initiate more than on scan at a time for different repositories, provided all of the repositories are in the same service. They do not need to all be in the same organization. For this, the API endpoint is /api/v1/SERVICE. Instead of the POST body being a single JSON object the body is a JSON array of objects, each being a single repo scan request. The object fields are the same as with the single request above but with two non-optional additions:

* repo: The name of the repository, excluding the owner
* org: The organization the repository belongs to

### Examples

Scan a repo using default settings:

```
curl -X POST \
https://example.com/api/v1/github/testorg/example \
-H 'x-api-key: APIKEYGOESHERE'
```

Scan the dev branch of a repo using only the `gitsecrets` plugin, plugins in the inventory category, and a callback:

```
curl -X POST \
  https://example.com/api/v1/github/testorg/example \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: APIKEYGOESHERE' \
  -d '{
    "branch": "dev",
    "plugins": [
      "gitsecrets"
    ],
    "categories": [
      "inventory"
    ],
    "callback": {
      "url": "https://example.com/myhandler",
      "client_id": "12345"
    }
  }'
```

Scan two repos within GitHub, one using only the `gitsecrets` plugin, the inventory category, and a callback, and the other using default settings:

```
curl -X POST \
  https://example.com/api/v1/github \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: APIKEYGOESHERE' \
  -d '[
    {
      "org": "testorg",
      "repo": "example",
      "branch": "dev",
      "plugins": [
        "gitsecrets"
      ],
      "categories": [
        "inventory"
      ],
      "callback": {
        "url": "https://example.com/myhandler",
        "client_id": "12345"
      }
    },
    {
      "org": "testorg",
      "repo" "testrepo"
    }
  ]'
```

## Retrieving a report

To retrieve the most recent scan report GET the `/api/v1/SERVICE/ORG/REPO` resource. To retrieve a specific scan report GET the `/api/v1/SERVICE/ORG/REPO/SCAN_ID` resource.

### Examples

Get the latest report for a specific repository:

```
curl -X GET \
  https://example.com/v1/repo/testorg/example \
  -H 'x-api-key: APIKEYGOESHERE'
```

Get a specific report:

```curl -X GET \
  https://example.com/v1/repo/testorg/example/abc0123-0abc-0123-0abc-00abc0123abc \
  -H 'x-api-key: APIKEYGOESHERE'
```

## Allow-listing Findings

Findings can be allow-listed so that they do not appear in reports or affect the overall success status of the report.

### Operations

* `GET /api/v1/SERVICE/ORG/REPO/whitelist` - Get allowlist for repository. Can be filtered with the type query parameter.
* `GET /api/v1/SERVICE/ORG/REPO/whitelist/UUID` - Get specific allowlist item.
* `POST /api/v1/SERVICE/ORG/REPO/whitelist` - Create new allowlist item.
* `PUT /api/v1/SERVICE/ORG/REPO/whitelist/UUID` - Update existing allowlist item.
* `DELETE /api/v1/SERVICE/ORG/REPO/whitelist/UUID` - Delete existing allowlist item.

The whitelist payload is a JSON blob:

```
{
  "id": "<UUID>",
  "type": "vulnerability | secret | static_analysis",
  "value": {}
}
```
The value format is dependent on the type.

### Vulnerability

```
{
  "component": "<COMPONENT>",
  "id": "<ID>",
  "source": "<DEPENDENCY_SOURCE>"
}
```
### Secret
```
{
  "filename": "<FILENAME>",
  "line": <LINE_NUM>,
  "commit": "<COMMIT_HASH>"
}
```

**Note:** To allowlist a specific commit, the filename still must be specified, even if the file has already been removed from the repository. An example of this scenario is that if an SSH key is found in a repository and it gets removed, the commit history will still be flagged by Artemis for containing the key that was checked in. You will need to whitelist the commit once the repository owner has removed and changed the key.

### Examples
**Get** the full allowlist:

```
curl -X GET \
  https://example.com/api/v1/github/testorg/example/whitelist \
  -H 'x-api-key: APIKEYGOESHERE'
```
  
**Get** just the allowlisted secrets:

```
curl -X GET \
  https://example.com/api/v1/github/testorg/example/whitelist?type=secret \
  -H 'x-api-key: APIKEYGOESHERE' 
```

**Create** a new allowlist item:  

```
curl -X POST \
  https://example.com/api/v1/github/testorg/example/whitelist \
    -H 'Content-Type: application/json' \
    -H 'x-api-key: APIKEYGOESHERE' \
    -d '{
      "type": "vulnerability",
      "value": {
        "component": "library-1.2.3",
        "id": "CVE-2020-1234567",
        "source": "Dockerfile"
      }
    }'
```

**Delete** an existing allowlist item:

```
curl -X DELETE \
  https://example.com/api/v1/github/testorg/example/whitelist/abc0123-0abc-0123-0abc-00abc0123abc \
  -H 'x-api-key: APIKEYGOESHERE'  
```

## SBOM

### Initiating an SBOM scan

Run a scan and enable the `sbom` plugin category

```
curl -X POST \
  https://example.com/api/v1/SERVICE/ORG/REPO \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: APIKEYGOESHERE' \
  -d '{ "categories": ["sbom"] }'
```  

### List components
List all components discovered through SBOM scanning

```
curl -X GET \
  https://example.com/api/v1/sbom/components \
  -H 'x-api-key: APIKEYGOESHERE'
```

List all components with GPL licenses discovered through SBOM scanning

```
curl -X GET \
  https://example.com/api/v1/sbom/components?license__contains=GPL \
  -H 'x-api-key: APIKEYGOESHERE'
```

### List Repositories

List all repositories using a specific component

```
curl -X GET \
  https://example.com/api/v1/sbom/components/COMPONENT/VERSION/repos \
  -H 'x-api-key: APIKEYGOESHERE'
```  
  
    

**[Main](../README.md)**
