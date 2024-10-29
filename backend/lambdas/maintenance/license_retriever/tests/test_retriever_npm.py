import pytest

from unittest.mock import patch
from license_retriever.retrievers import npm

GPL = "GPL-3.0"
MIT = "MIT"

GPL_OR_MIT_SPDX = f"({GPL} OR {MIT})"


@pytest.mark.parametrize(
    "npm_response,expected_result",
    [
        pytest.param({}, [], id="should return empty array if no license"),
        pytest.param({"license": {"name": GPL}}, [], id="should return empty array if unexpected license format"),
        pytest.param(
            {"license": GPL},
            [GPL.lower()],
            id="should return a single license if license is a single license in a string",
        ),
        pytest.param(
            {"license": {"type": GPL}},
            [GPL.lower()],
            id="should return a single license if license is a single license in 'type' property of an object",
        ),
        pytest.param(
            {"license": GPL_OR_MIT_SPDX},
            [GPL_OR_MIT_SPDX.lower()],
            id="should return whole expression if license is a SPDX expression in a string",
        ),
        pytest.param(
            {"license": [GPL, MIT]},
            [GPL.lower(), MIT.lower()],
            id="should return each license if license is an array of string",
        ),
        pytest.param(
            {"licenses": [GPL, MIT]},
            [GPL.lower(), MIT.lower()],
            id="should return each license if license is an array of string in 'licenses' property",
        ),
        pytest.param(
            {
                "license": [
                    {"type": GPL},
                    {"type": MIT},
                ]
            },
            [GPL.lower(), MIT.lower()],
            id="should return each license if license is an array of objects with 'type' property",
        ),
    ],
)
@patch("requests.get")
def test_retrieve_npm_licenses(mock_get, npm_response, expected_result):
    mock_get.return_value = FakeGetResponse(npm_response)

    result = npm.retrieve_npm_licenses("name", "version")

    assert result == expected_result


class FakeGetResponse:
    def __init__(self, response: dict):
        self.response = response
        self.status_code = 200

    def json(self) -> dict:
        return self.response
