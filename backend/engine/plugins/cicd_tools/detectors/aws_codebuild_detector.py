import json

from pathlib import Path
from typing import Callable

from engine.plugins.cicd_tools.interfaces.detector import Detector, DetectorResult


ValidatorFn = Callable[[Path], bool]

ID = "aws_codebuild"
NAME = "AWS CodeBuild"


class AWSCodeBuildDetector(Detector):
    """
    AWS CodeBuild has "buildspec.yml" as a convention, but it's customizable.
    We have noticed any of the following patterns, so they should all be reported as CodeBuild:
    - buildspec.yml
    - buildspec-deploy.yml
    - /buildspec/region/deploy.yml
    """

    def check(self, path: str) -> DetectorResult:
        result: DetectorResult = {
            "id": ID,
            "name": NAME,
            "configs": [],
            "in_use": False,
            "debug": [],
            "alerts": [],
            "errors": [],
        }

        buildspec_dirs = Path(path).rglob("**/*buildspec*/")
        buildspec_files = Path(path).rglob("**/*buildspec*.yml")

        for dir in buildspec_dirs:
            yaml_files = dir.rglob("**/*.yml")

            for file in yaml_files:
                result["in_use"] = True
                result["configs"].append(str(file.relative_to(path)))

        for config in buildspec_files:
            result["in_use"] = True
            result["configs"].append(str(config.relative_to(path)))

        return result
