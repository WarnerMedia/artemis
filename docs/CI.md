# CI Integration


### Considerations

Before integrating Artemis into your CI pipeline you will need to consider a few things:

1. Identify a user with appropriate permissions to make the CI changes.
1. Identify a user who will "own" the Artemis API key (this may be the same user as #1). The Artemis API key is used by the integration to authorize calls to the Artemis REST API (using the HTTP header x-api-key).
1. Identify where in the CI pipeline you want to run the scan.
1. Determine whether you want to gate your build/deployment based on scan results.

### How to setup Artemis in CI

1. Ensure the integration user (see Considerations #2 above) has access to view/scan all necessary repos in the Artemis web UI.
 
1. Create an API key for the user or service account you want to “own” the integration (see Considerations #2 above).
 
1. Add the integration to your CI pipeline at the stage determined in Considerations #2 above.  


**Note**: The artemis-scan.sh script used in the GitHub Actions CI integration should be generic enough to use in any CI pipeline as long as it supports a Unix shell
 
Once the CI integration is in-place, you should also be able to view scans initiated via the CI integration in the Artemis UI.

Here is an example of how Artemis can integrate with [GitHub Actions](actions.md)

**[Main](../README.md)**



