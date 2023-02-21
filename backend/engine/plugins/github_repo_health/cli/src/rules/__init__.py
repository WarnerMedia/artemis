from .branch_commit_signing import BranchCommitSigning
from .branch_enforce_admins import BranchEnforceAdmins
from .branch_pull_requests import BranchPullRequests
from .branch_status_checks import BranchStatusChecks
from .repo_actions import RepoActions
from .repo_code_scanning import RepoCodeScanning
from .repo_files import RepoFiles
from .repo_secret_scanning import RepoSecretScanning
from .repo_security_alerts import RepoSecurityAlerts

rules_dict = {
    BranchCommitSigning.identifier: BranchCommitSigning,
    BranchEnforceAdmins.identifier: BranchEnforceAdmins,
    BranchPullRequests.identifier: BranchPullRequests,
    BranchStatusChecks.identifier: BranchStatusChecks,
    RepoActions.identifier: RepoActions,
    RepoCodeScanning.identifier: RepoCodeScanning,
    RepoFiles.identifier: RepoFiles,
    RepoSecretScanning.identifier: RepoSecretScanning,
    RepoSecurityAlerts.identifier: RepoSecurityAlerts,
}
