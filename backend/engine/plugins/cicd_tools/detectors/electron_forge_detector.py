import json

from pathlib import Path
from typing import Callable

from engine.plugins.cicd_tools.interfaces.detector import Detector, DetectorResult


ValidatorFn = Callable[[Path], bool]

ID = "electron_forge"
NAME = "Electron Forge"


class ElectronForgeDetector(Detector):
    """
    ElectronForge has configs either in a forge.config.js file or as a config.forge property in a
    package.json.
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

        forge_configs = Path(path).rglob("**/forge.config.js")
        package_jsons = Path(path).rglob("**/package.json")

        for config in forge_configs:
            result["in_use"] = True
            result["configs"].append(str(config.relative_to(path)))

        for package_json in package_jsons:
            try:
                if has_forge_config(package_json):
                    result["in_use"] = True
                    result["configs"].append(str(package_json.relative_to(path)))
            except json.decoder.JSONDecodeError:
                result["alerts"].append(f"Failed to parse package.json file: {package_json.relative_to(path)}")

        return result


def has_forge_config(package_json_path: Path) -> bool:
    if package_json_path.is_file():
        with package_json_path.open() as file:
            package_json = json.load(file)

            forge_config = package_json.get("config", {}).get("forge", None)

            return forge_config is not None
    else:
        return False
