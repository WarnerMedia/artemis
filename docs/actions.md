# GitHub Actions Integrations
Create a file like this in your repo’s `.github/workflows` directory and give it a name that is indicative of it’s function, such as `artemis.yml` or `scan.yml`

This scan will occur when a PR is created since it is set to run on the `pull_request` lifecycle event.


```
name: Artemis

on: pull_request

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run Artemis scan
        env:
          ARTEMIS_API_KEY: ${{ secrets.ARTEMIS_API_KEY }}
        run: |
          curl --silent --show-error --fail \
            https://example.com/ci-tools/shell/artemis-scan.sh \
            --header "x-api-key: $ARTEMIS_API_KEY" \
            --output artemis-scan.sh
          /bin/bash artemis-scan.sh github ${{ github.repository }} ${{ github.head_ref }} critical,high
```

### Authorizing the scan

In order for the scan to run you will need to plumb the API key from your secrets manager into the GitHub Action (refer to CI Integration step #2 for information on API key creation)
In GitHub Enterprise, this can be achieved by adding a secret named ARTEMIS_API_KEY in the "Repository Secrets" section of the repository's Settings > Secrets.

**Note**: In the script above, this secret is set in a shell environment variable of the build runner so it is accessible in the initiated artemis-scan.sh script.

### Artemis-scan.sh  
The artemis-scan.sh script is used in this GitHub Action integration, but it is not limited to use in GitHub integrations, it should be generic enough that any CI system that allows Unix shell scripts should be able to consume this script.

The script takes 4 parameters:  
1. The `service` (version control system) where the source code lives. This matches the VCS portion of the "Version Control System" field in the Artemis UI. For example, `github` for GitHub Enterprise.   
1. The repository where the source code lives. This may include an organization name or other pathing to the source code, for example, `testorg/example`.    
1. The `branch` name.     
1. A comma-separated list of vulnerability severities that you want to trigger a scan failure.      
Values include: critical, high, medium, low, negligible

A "scan failure" means that the `artemis-scan.sh` script will return an error message and a non-zero return 
code if any of the specified conditions are met.
By default, the script will always return a failure if any secrets are detected in addition to any vulnerability severities the user specifies. 

### Project Status

Whether you decide to gate builds based on scan results, it can be beneficial to add some high-level visibility of scan results to a project so that team members can take appropriate corrective actions.


>Important: Result status should just be a high-level pass/fail - it should not expose any of the sensitive findings from the actual scan results.

In GitHub Enterprise, this can be accomplished by:

1. Ensure that the GitHub Action returns a non-zero return code if the scan fails (this is the default behavior of the GitHub Action example above)
1. Configure GitHub so that the PR may pass even if the Artemis scan action fails:
Go to the GitHub repo Settings > Branches > Edit Branch Protection Rules
In the “Protect matching branches” section you’ll notice there’s a checkbox for “Require status checks pass before merging” – if this is checked then all actions specified in the “Status checks that are required” table must pass. Ensure that the artemis/scan action is removed from that list.

    Now the action should run on `pull_request` and may fail, but the failure shouldn’t prevent the PR from being merged.

    You can always enable `Require status checks pass before merging` in the repository's Branch Protection Rules when you decide you want to gate PRs based on scan results.
    
3. To surface the scan status in the GitHub project page, navigate to the repo's Settings > Actions. Click the artemis/scan action from the “Workflows” column on the left-hand side of the page.
 If you click the “…” beside the filter box with placeholder text “Filter workflow runs” you can select “Create status badge”
 This should provide some Markdown code to generate a passing/failing badge for CI status.
 Copy this Markdown code and add it to top of the `README.md` file for that repo. This should then display a CI scan pass/fail badge at the top of the repository's README. 

![CI Badge](images/ci_badge.png)

**[Main](../README.md)**

