from .branch_protection_commit_signing import BranchProtectionCommitSigning
from .branch_protection_enforce_admins import BranchProtectionEnforceAdmins
from .branch_protection_pull_requests import BranchProtectionPullRequests
from .branch_protection_status_checks import BranchProtectionStatusChecks
from .branch_rule_commit_signing import BranchRuleCommitSigning
from .branch_rule_pull_requests import BranchRulePullRequests
from .branch_rule_status_checks import BranchRuleStatusChecks
from .branch_ruleset_bypass_actors import BranchRulesetBypassActors
from .repo_actions import RepoActions
from .repo_code_scanning import RepoCodeScanning
from .repo_files import RepoFiles
from .repo_secret_scanning import RepoSecretScanning
from .repo_security_alerts import RepoSecurityAlerts

rules_dict = {
    BranchProtectionCommitSigning.identifier: BranchProtectionCommitSigning,
    BranchProtectionEnforceAdmins.identifier: BranchProtectionEnforceAdmins,
    BranchProtectionPullRequests.identifier: BranchProtectionPullRequests,
    BranchProtectionStatusChecks.identifier: BranchProtectionStatusChecks,
    BranchRuleCommitSigning.identifier: BranchRuleCommitSigning,
    BranchRulePullRequests.identifier: BranchRulePullRequests,
    BranchRuleStatusChecks.identifier: BranchRuleStatusChecks,
    BranchRulesetBypassActors.identifier: BranchRulesetBypassActors,
    RepoActions.identifier: RepoActions,
    RepoCodeScanning.identifier: RepoCodeScanning,
    RepoFiles.identifier: RepoFiles,
    RepoSecretScanning.identifier: RepoSecretScanning,
    RepoSecurityAlerts.identifier: RepoSecurityAlerts,
}
