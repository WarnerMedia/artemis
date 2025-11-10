import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from license_retriever.retrievers import gem


@pytest.mark.parametrize(
    "gem_response,expected_result",
    [
        pytest.param({}, [], id="should return empty array if no license"),
        pytest.param({"licenses": ["mit"]}, ["mit"], id="should return each license if licenses is an array of string"),
        pytest.param({"licenses": ["mit", "gpl-3.0"]}, ["mit", "gpl-3.0"], id="should return multiple licenses"),
    ],
)
@pytest.mark.asyncio
async def test_retrieve_gem_licenses_batch(gem_response, expected_result):
    """Test batch function with mocked responses for gem"""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = gem_response

    mock_get_cm = AsyncMock()
    mock_get_cm.__aenter__.return_value = mock_response

    mock_session = MagicMock()
    mock_session.get.return_value = mock_get_cm

    with patch("aiohttp.ClientSession") as mock_session_class:
        mock_session_class.return_value.__aenter__.return_value = mock_session

        packages = [("name", "version")]
        result = await gem.retrieve_gem_licenses_batch(packages)

        assert "name@version" in result
        assert result["name@version"] == expected_result
