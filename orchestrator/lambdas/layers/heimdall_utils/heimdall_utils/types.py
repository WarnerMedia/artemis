from typing import Literal, TypedDict, Annotated
from typing_extensions import NotRequired

# Supported Artemis Plugins
ArtemisPlugin = Annotated[str, "Security plugin from Artemis"]

# Support Version Control Services
Service = Literal["ado", "bitbucket", "github", "gitlab"]


class Page(TypedDict):
    branch_cursor: str
    repo_cursor: str


class HeimdallTask(TypedDict):
    org: str
    repo: str
    service: Service
    plugins: list[ArtemisPlugin]
    batch_id: str


class OrgTask(HeimdallTask):
    page: Page
    default_branch_only: bool
    redundant_scan_query: str


class RepoTask(HeimdallTask):
    batch_priority: bool

    branch: NotRequired[str]  # When empty, its a scan on the default branch
