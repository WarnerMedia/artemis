###############################################################################
# Environment Configuration
#
# These need to be set for the particular deployment and will depend on the
# environment.
###############################################################################

# AWS account ID
ACCOUNT_ID :=

# Region within the account to deploy to
REGION :=

# Value to set as the "maintainer" tag in all docker images
MAINTAINER :=

# GitHub org/repo where this code resides
# Used by the artemis_scan target for running an Artemis scan of Artemis itself
REPO_NAME :=