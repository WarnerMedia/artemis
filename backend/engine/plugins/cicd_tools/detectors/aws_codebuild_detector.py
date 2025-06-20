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

        base = Path(path)
        try:
            buildspec_dirs = base.rglob("**/*buildspec*/")

            buildspec_files = list(base.rglob("**/*buildspec*.yml"))
            buildspec_files.extend(base.rglob("**/*buildspec*.yaml"))

            for dir in buildspec_dirs:
                yaml_files = list(dir.rglob("**/*.yml"))
                yaml_files.extend(dir.rglob("**/*.yaml"))

                for file in yaml_files:
                    result["in_use"] = True
                    result["configs"].append({"path": str(file.relative_to(path))})

            for config in buildspec_files:
                result["in_use"] = True
                result["configs"].append({"path": str(config.relative_to(path))})

        except OSError as e:
            result["errors"].append(f"Error during CodeBuild detection: {e}")
        return result
