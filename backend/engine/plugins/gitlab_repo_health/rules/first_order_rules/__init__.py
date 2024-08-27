from .branch_protection_commit_signing import BranchProtectionCommitSigning
from .branch_protection_prevent_secret_files import BranchProtectionPreventSecretFiles
from .branch_protection_codeowner_approval import BranchProtectionCodeOwnerApproval
from .branch_protection_enforce_admins import BranchProtectionEnforceAdmins
from .branch_protection_pull_requests import BranchProtectionPullRequests
from .repo_files import RepoFiles

# First order rules are rules that directly check things and do not contain other rules. This is
# essentially just non-composite rules. We group these together without CompositeRule so that
# composite_rules.py can import all other rules without circular imports
first_order_rules_dict = {
    BranchProtectionCommitSigning.identifier: BranchProtectionCommitSigning,
    BranchProtectionEnforceAdmins.identifier: BranchProtectionEnforceAdmins,
    BranchProtectionPullRequests.identifier: BranchProtectionPullRequests,
    BranchProtectionPreventSecretFiles.identifier: BranchProtectionPreventSecretFiles,
    BranchProtectionCodeOwnerApproval.identifier: BranchProtectionCodeOwnerApproval,
    RepoFiles.identifier: RepoFiles,
}
