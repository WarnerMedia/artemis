import unittest

from pathlib import Path
from unittest.mock import mock_open, patch

from engine.plugins.api_specs.main import (
    get_paths_with_extensions,
    sanitize_version,
    search_for_json,
    search_for_yaml,
    Status,
)


BASE = "/work/base"


class TestPluginApiSpecs(unittest.TestCase):
    def test_sanitize_version(self):
        result = sanitize_version("3.1.0")

        self.assertEqual("3.1.0", result)

    def test_sanitize_version_with_alphanumeric(self):
        result = sanitize_version("3.1.0-rc2")

        self.assertEqual("3.1.0-rc2", result)

    def test_sanitize_version_with_numeric(self):
        result = sanitize_version(3.0)

        self.assertEqual("3.0", result)

    def test_sanitize_version_truncates_long_strings(self):
        long_version = "a" * 100

        result = sanitize_version(long_version)

        self.assertEqual("a" * 50, result)

    def test_get_paths_with_extensions_single_extension(self):
        with patch("pathlib.Path.rglob") as mock_rglob:
            mock_rglob.return_value = [Path(f"{BASE}/test.json")]

            result = list(get_paths_with_extensions(BASE, ["json"]))

            self.assertEqual([Path(f"{BASE}/test.json")], result)
            mock_rglob.assert_called_once_with("*.json")

    def test_get_paths_with_extensions_multiple_extensions(self):
        with patch("pathlib.Path.rglob") as mock_rglob:
            mock_rglob.side_effect = [
                [Path(f"{BASE}/test.yaml")],
                [Path(f"{BASE}/test.yml")],
            ]

            result = list(get_paths_with_extensions(BASE, ["yaml", "yml"]))

            self.assertEqual(2, len(result))
            self.assertIn(Path(f"{BASE}/test.yaml"), result)
            self.assertIn(Path(f"{BASE}/test.yml"), result)
            mock_rglob.assert_any_call("*.yml")
            mock_rglob.assert_any_call("*.yaml")

    @patch("builtins.open", new_callable=mock_open, read_data='{"openapi": "3.0.0"}')
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_openapi_spec(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/openapi.json")
        mock_get_paths.return_value = [json_path]

        # Simulate json_stream.visit calling the visitor with the version field
        def visit_side_effect(file, visitor):
            visitor("3.0.0", ("openapi",))

        mock_visit.side_effect = visit_side_effect

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("openapi.json", result[0]["path"])
        self.assertEqual("openapi", result[0]["field"])
        self.assertEqual("3.0.0", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data='{"swagger": "2.0"}')
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_swagger_spec(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/swagger.json")
        mock_get_paths.return_value = [json_path]

        def visit_side_effect(file, visitor):
            visitor("2.0", ("swagger",))

        mock_visit.side_effect = visit_side_effect

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("swagger.json", result[0]["path"])
        self.assertEqual("swagger", result[0]["field"])
        self.assertEqual("2.0", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data='{"asyncapi": "2.5.0"}')
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_asyncapi_spec(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/asyncapi.json")
        mock_get_paths.return_value = [json_path]

        def visit_side_effect(file, visitor):
            visitor("2.5.0", ("asyncapi",))

        mock_visit.side_effect = visit_side_effect

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("asyncapi.json", result[0]["path"])
        self.assertEqual("asyncapi", result[0]["field"])
        self.assertEqual("2.5.0", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data='{"swaggerVersion": "1.2"}')
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_swagger_v1_spec(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/swagger-v1.json")
        mock_get_paths.return_value = [json_path]

        def visit_side_effect(file, visitor):
            visitor("1.2", ("swaggerVersion",))

        mock_visit.side_effect = visit_side_effect

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("swagger-v1.json", result[0]["path"])
        self.assertEqual("swaggerVersion", result[0]["field"])
        self.assertEqual("1.2", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data='{"name": "not a spec"}')
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_not_a_spec(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/package.json")
        mock_get_paths.return_value = [json_path]

        def visit_side_effect(file, visitor):
            visitor("my-package", ("name",))

        mock_visit.side_effect = visit_side_effect

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        self.assertEqual(0, len(result))

    @patch("builtins.open", new_callable=mock_open, read_data="invalid json")
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_invalid_json(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/invalid.json")
        mock_get_paths.return_value = [json_path]
        mock_visit.side_effect = ValueError("Invalid JSON")

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        self.assertEqual(0, len(result))
        self.assertEqual(1, len(status.alerts))
        self.assertIn("Error", status.alerts[0])
        self.assertIn("invalid.json", status.alerts[0])

    @patch("builtins.open", new_callable=mock_open, read_data='{"openapi": "3.0.0", "swagger": "2.0"}')
    @patch("json_stream.visit")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_multiple_version_fields(self, mock_get_paths, mock_visit, _mock_file):
        json_path = Path(f"{BASE}/multi.json")
        mock_get_paths.return_value = [json_path]

        def visit_side_effect(file, visitor):
            visitor("3.0.0", ("openapi",))
            visitor("2.0", ("swagger",))

        mock_visit.side_effect = visit_side_effect

        status = Status(True, [], [], [])
        result = list(search_for_json(BASE, status))

        # Should only return one result
        self.assertEqual(1, len(result))

    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_json_symlink(self, mock_get_paths):
        json_path = Path(f"{BASE}/symlink.json")
        mock_get_paths.return_value = [json_path]

        # Patch Path.is_symlink to return True
        with patch.object(Path, "is_symlink", return_value=True):
            status = Status(True, [], [], [])
            result = list(search_for_json(BASE, status))
            self.assertEqual(0, len(result))
            self.assertEqual(1, len(status.alerts))
            self.assertIn("symlink.json", status.alerts[0])

    @patch("builtins.open", new_callable=mock_open, read_data="openapi: 3.0.0\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_openapi_spec(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/openapi.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("openapi.yaml", result[0]["path"])
        self.assertEqual("openapi", result[0]["field"])
        self.assertEqual("3.0.0", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data="swagger: '2.0'\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_swagger_spec(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/swagger.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("swagger.yaml", result[0]["path"])
        self.assertEqual("swagger", result[0]["field"])
        self.assertEqual("2.0", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data="asyncapi: 2.5.0\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_asyncapi_spec(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/asyncapi.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(1, len(result))
        self.assertEqual("asyncapi.yaml", result[0]["path"])
        self.assertEqual("asyncapi", result[0]["field"])
        self.assertEqual("2.5.0", result[0]["version"])

    @patch("builtins.open", new_callable=mock_open, read_data="name: not a spec\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_not_a_spec(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/config.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(0, len(result))

    @patch("builtins.open", new_callable=mock_open, read_data="field: !Ref MyVersion\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_with_custom_tags(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/cloudformation.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(0, len(result))

    @patch("builtins.open", new_callable=mock_open, read_data="invalid: yaml: :\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_invalid_yaml(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/invalid.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(0, len(result))
        self.assertEqual(1, len(status.alerts))
        self.assertIn("Error", status.alerts[0])
        self.assertIn("invalid.yaml", status.alerts[0])

    @patch("builtins.open", new_callable=mock_open, read_data="- item1\n- item2\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_array_top_level(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/array.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        self.assertEqual(0, len(result))

    @patch("builtins.open", new_callable=mock_open, read_data="openapi: 3.0.0\nswagger: 2.0\n")
    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_multiple_version_fields(self, mock_get_paths, _mock_file):
        yaml_path = Path(f"{BASE}/multi.yaml")
        mock_get_paths.return_value = [yaml_path]

        status = Status(True, [], [], [])
        result = list(search_for_yaml(BASE, status))

        # Should only return one result (the first one found)
        self.assertEqual(1, len(result))

    @patch("engine.plugins.api_specs.main.get_paths_with_extensions")
    def test_search_for_yaml_symlink(self, mock_get_paths):
        yaml_path = Path(f"{BASE}/symlink.yaml")
        mock_get_paths.return_value = [yaml_path]

        # Patch Path.is_symlink to return True
        with patch.object(Path, "is_symlink", return_value=True):
            status = Status(True, [], [], [])
            result = list(search_for_yaml(BASE, status))
            self.assertEqual(0, len(result))
            self.assertEqual(1, len(status.alerts))
            self.assertIn("symlink.yaml", status.alerts[0])


if __name__ == "__main__":
    unittest.main()
