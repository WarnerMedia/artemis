import json
import os
import unittest
from decimal import Decimal
from unittest.mock import patch

from mock import PropertyMock

from artemisdb.artemisdb.models import Scan
from engine.plugins.veracode_sbom.main import process_sbom as process_veracode_output
from engine.processor.sbom import process_sbom as flatten_sbom_and_write_to_s3
from utils.plugin import Result

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_VERACODE_OUTPUT_PATH = os.path.join(TEST_DIR, "data", "veracode", "sample-sbom-results.json")
EXPECTED_JSON = '[{"name": "PyLibrary", "version": "1.0.0", "licenses": [], "source": "requirements.txt", "deps": [], "type": null}, {"name": "pylibrary", "version": "1.0.0", "licenses": [{"id": "MIT", "name": "MIT license (MIT)"}], "source": "PYPI", "deps": [], "type": "pypi"}]'


VERACODE_SBOM_RESULT = Result(
    name="Veracode SBOM",
    type="sbom",
    success=True,
    truncated=False,
    details=[],
    errors=[],
    alerts=[],
    debug=[],
)


@patch("engine.processor.sbom.write_sbom_json", autospec=True)
@patch("engine.processor.sbom.process_dependency")
class TestVeracodeSbomParser(unittest.TestCase):
    def test_sbom_parse(self, _, mock_write_sbom_json):
        with open(TEST_VERACODE_OUTPUT_PATH) as f:
            output = json.load(f, parse_float=Decimal)

        # process raw Veracode output in the same way SBOM plugin does
        graph = process_veracode_output(graphs=output["records"][0]["graphs"], libs=output["records"][0]["libraries"])

        mock_result = unittest.mock.MagicMock(side_effect=VERACODE_SBOM_RESULT)
        type(mock_result).details = PropertyMock(return_value=graph)
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())

        flatten_sbom_and_write_to_s3(mock_result, mock_scan)

        # asserts that the json sent to s3 is equal to the expected json
        mock_write_sbom_json.assert_called_with(mock_scan.scan_id, json.loads(EXPECTED_JSON))
