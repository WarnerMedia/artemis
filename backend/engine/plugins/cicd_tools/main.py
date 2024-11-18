import json

from typing import Optional, TypedDict

from engine.plugins.lib import utils
from engine.plugins.cicd_tools.interfaces.detector import Detector, DetectorResult, ConfigData

from engine.plugins.cicd_tools.detectors.aws_codebuild_detector import AWSCodeBuildDetector
from engine.plugins.cicd_tools.detectors.electron_forge_detector import ElectronForgeDetector
from engine.plugins.cicd_tools.detectors.pattern_detector import PatternDetector, ValidatorFn


class PatternDetectorConfig(TypedDict):
    id: str
    name: str
    patterns: list[str]
    validator: Optional[ValidatorFn]


class CICDToolsDetails(TypedDict):
    display_name: str
    configs: list[ConfigData]


log = utils.setup_logging("cicd_tools")


# For CICD tools with simple config patterns, we can search with a glob pattern instead of writing a
# full detector
pattern_detector_configs: list[PatternDetectorConfig] = [
    {
        "id": "azure_pipelines",
        "name": "Azure Pipelines",
        "patterns": [
            "**/*azure-pipelines.yml",
            "**/*azure-pipelines.yaml",
        ],
        "validator": None,
    },
    {
        "id": "circleci",
        "name": "CircleCI",
        "patterns": [
            ".circleci/config.yml",
            ".circleci/config.yaml",
        ],
        "validator": None,
    },
    {
        "id": "github_actions",
        "name": "GitHub Actions",
        "patterns": [
            ".github/workflows/*.yml",
            ".github/workflows/*.yaml",
        ],
        "validator": None,
    },
    {
        "id": "gitlab_ci",
        "name": "GitLab CI",
        "patterns": [
            ".gitlab-ci.yml",
            ".gitlab-ci.yaml",
        ],
        "validator": None,
    },
    {
        "id": "jenkins",
        "name": "Jenkins",
        "patterns": [
            "**/*Jenkinsfile*",
        ],
        "validator": None,
    },
    {
        "id": "teamcity",
        "name": "TeamCity",
        "patterns": [
            ".teamcity/",
        ],
        "validator": None,
    },
    {
        "id": "travis_ci",
        "name": "Travis CI",
        "patterns": [
            ".travis.yml",
            ".travis.yaml",
        ],
        "validator": None,
    },
    {
        "id": "bitrise",
        "name": "BitRise",
        "patterns": [
            "**/*bitrise*.yml",
            "**/*bitrise*.yaml",
        ],
        "validator": None,
    },
]


detectors: list[Detector] = [
    # Some detectors have more complicated detection logic. These need dedicated detectors
    AWSCodeBuildDetector(),
    ElectronForgeDetector(),
]
detectors.extend(
    [
        PatternDetector(config["id"], config["name"], config["patterns"], config["validator"])
        for config in pattern_detector_configs
    ]
)


def main(in_args=None):
    args = utils.parse_args(in_args)

    results = find_tools(args.path)
    in_use_results = [item for item in results if item["in_use"]]

    details = get_details(in_use_results)
    event_info = [item["id"] for item in in_use_results]

    # Use raw `results` instead of `in_use_results` for messages, since there may still be errors
    # when `in_use=False`
    debug, alerts, errors = get_messages(results)

    print(
        json.dumps(
            {
                "success": True,  # Always succeed, this is informational for now
                "details": details,
                "truncated": False,
                "debug": debug,
                "alerts": alerts,
                "errors": errors,
                "event_info": event_info,
            }
        )
    )


def find_tools(path: str) -> list[DetectorResult]:
    return [detector.check(path) for detector in detectors]


def get_details(results: list[DetectorResult]) -> dict[str, dict[str, CICDToolsDetails]]:
    return {
        "cicd_tools": {
            item["id"]: {
                "display_name": item["name"],
                "configs": item["configs"],
            }
            for item in results
        }
    }


def get_messages(results: list[DetectorResult]) -> tuple[list[str], list[str], list[str]]:
    debug = []
    alerts = []
    errors = []

    for item in results:
        debug.extend(item["debug"])
        alerts.extend(item["alerts"])
        errors.extend(item["errors"])

    return debug, alerts, errors


if __name__ == "__main__":
    main()
