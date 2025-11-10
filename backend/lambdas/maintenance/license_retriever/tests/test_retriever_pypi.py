import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from license_retriever.retrievers import pypi


@pytest.mark.parametrize(
    "pypi_response,expected_result",
    [
        pytest.param({}, [], id="should return empty array if no license"),
        pytest.param({"info": {"license": "mit"}}, ["mit"], id="should return single license from info.license"),
        pytest.param(
            {"info": {"license": "gpl-3.0"}}, ["gpl-3.0"], id="should return single license from info.license"
        ),
        pytest.param(
            {"info": {"classifiers": ["License :: OSI Approved :: MIT License"]}},
            ["mit"],
            id="should handle classifiers",
        ),
    ],
)
@pytest.mark.asyncio
async def test_retrieve_pypi_licenses_batch(pypi_response, expected_result):
    """Test batch function with mocked responses for pypi"""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = pypi_response

    mock_get_cm = AsyncMock()
    mock_get_cm.__aenter__.return_value = mock_response

    mock_session = MagicMock()
    mock_session.get.return_value = mock_get_cm

    with patch("aiohttp.ClientSession") as mock_session_class:
        mock_session_class.return_value.__aenter__.return_value = mock_session

        packages = [("name", "version")]
        result = await pypi.retrieve_pypi_licenses_batch(packages)

        assert "name@version" in result
        assert result["name@version"] == expected_result
