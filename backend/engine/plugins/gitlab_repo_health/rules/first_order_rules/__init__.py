from .branch_protection_commit_signing import BranchProtectionCommitSigning
from .branch_protection_enforce_admins import BranchProtectionEnforceAdmins
from .branch_protection_pull_requests import BranchProtectionPullRequests
from .branch_protection_status_checks import BranchProtectionStatusChecks
from .repo_files import RepoFiles

# First order rules are rules that directly check things and do not contain other rules. This is
# essentially just non-composite rules. We group these together without CompositeRule so that
# composite_rules.py can import all other rules without circular imports
first_order_rules_dict = {
    BranchProtectionCommitSigning.identifier: BranchProtectionCommitSigning,
    BranchProtectionEnforceAdmins.identifier: BranchProtectionEnforceAdmins,
    BranchProtectionPullRequests.identifier: BranchProtectionPullRequests,
    BranchProtectionStatusChecks.identifier: BranchProtectionStatusChecks,
    RepoFiles.identifier: RepoFiles,
}
