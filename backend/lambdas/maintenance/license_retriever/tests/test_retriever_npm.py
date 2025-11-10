import pytest
from unittest.mock import patch, AsyncMock, MagicMock
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
        pytest.param(
            {
                "licenses": [
                    {"type": GPL},
                    {"type": MIT},
                ]
            },
            [GPL.lower(), MIT.lower()],
            id="should return each license if license is in 'licenses' property with an array of objects with 'type' property",
        ),
    ],
)
@pytest.mark.asyncio
async def test_retrieve_npm_licenses_batch(npm_response, expected_result):
    """Test batch function with mocked responses"""

    # Mock the aiohttp session and response with proper async context manager
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = npm_response

    mock_get_cm = AsyncMock()
    mock_get_cm.__aenter__.return_value = mock_response

    mock_session = MagicMock()
    mock_session.get.return_value = mock_get_cm

    with patch("aiohttp.ClientSession") as mock_session_class:
        mock_session_class.return_value.__aenter__.return_value = mock_session

        # Test single package batch
        packages = [("name", "version")]
        result = await npm.retrieve_npm_licenses_batch(packages)

        assert "name@version" in result
        assert result["name@version"] == expected_result
