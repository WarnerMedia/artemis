import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch, MagicMock

from engine.plugins.lib.node_common import (
    NpmScanContext,
    _detect_lockfile,
    _is_workspace_root,
    _classify_directories,
    check_registry_reachable,
    build_npm_context,
)


class TemporaryDirectoryTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.base = Path(self.temp_dir.name)

    def _write_package_json(self, directory: Path, contents: dict | str) -> Path:
        directory.mkdir(parents=True, exist_ok=True)
        package_json = directory / "package.json"
        text = contents if isinstance(contents, str) else json.dumps(contents)
        package_json.write_text(text, encoding="utf-8")
        return package_json


class TestDetectLockfile(TemporaryDirectoryTestCase):
    def test_npm_lockfile(self):
        (self.base / "package-lock.json").touch()
        self.assertEqual(_detect_lockfile(str(self.base)), "npm")

    def test_yarn_lockfile(self):
        (self.base / "yarn.lock").touch()
        self.assertEqual(_detect_lockfile(str(self.base)), "yarn")

    def test_pnpm_lockfile(self):
        (self.base / "pnpm-lock.yaml").touch()
        self.assertEqual(_detect_lockfile(str(self.base)), "pnpm")

    def test_bun_lockfile(self):
        (self.base / "bun.lock").touch()
        self.assertEqual(_detect_lockfile(str(self.base)), "bun")

    def test_no_lockfile(self):
        self.assertIsNone(_detect_lockfile(str(self.base)))


class TestIsWorkspaceRoot(TemporaryDirectoryTestCase):
    def test_npm_array_workspaces(self):
        package_json = self._write_package_json(
            self.base,
            {"name": "root", "workspaces": ["packages/*"]},
        )
        self.assertTrue(_is_workspace_root(str(package_json)))

    def test_yarn_classic_object_workspaces(self):
        package_json = self._write_package_json(
            self.base,
            {"name": "root", "workspaces": {"packages": ["packages/*"]}},
        )
        self.assertTrue(_is_workspace_root(str(package_json)))

    def test_no_workspaces_field(self):
        package_json = self._write_package_json(self.base, {"name": "standalone"})
        self.assertFalse(_is_workspace_root(str(package_json)))

    def test_malformed_json(self):
        package_json = self._write_package_json(self.base, "{invalid json")
        self.assertFalse(_is_workspace_root(str(package_json)))


class TestClassifyDirectories(TemporaryDirectoryTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.root = self.base / "root"
        self.root_package_json = self._write_package_json(
            self.root,
            {"workspaces": ["packages/*"]},
        )

    def test_workspace_root_and_members(self):
        member_package_json = self._write_package_json(self.root / "packages" / "a", {"name": "a"})
        standalone_package_json = self._write_package_json(self.base / "other", {"name": "other"})

        roots, members, std = _classify_directories(
            [
                str(self.root_package_json),
                str(member_package_json),
                str(standalone_package_json),
            ]
        )

        self.assertIn(str(self.root), roots)
        self.assertIn(str(member_package_json.parent), members)
        self.assertIn(str(standalone_package_json.parent), std)
        self.assertNotIn(str(member_package_json.parent), roots)

    def test_nested_non_member_is_standalone(self):
        """A directory nested under a workspace root but outside the declared globs
        should be classified as standalone, not as a workspace member."""
        # Matches the glob
        member_package_json = self._write_package_json(self.root / "packages" / "core", {"name": "core"})

        # Nested under root but does NOT match packages/*
        standalone_package_json = self._write_package_json(self.root / "tools" / "cli", {"name": "cli"})

        roots, members, std = _classify_directories(
            [
                str(self.root_package_json),
                str(member_package_json),
                str(standalone_package_json),
            ]
        )

        self.assertIn(str(self.root), roots)
        self.assertIn(str(member_package_json.parent), members)
        self.assertIn(str(standalone_package_json.parent), std)
        self.assertNotIn(str(standalone_package_json.parent), members)


class TestCheckRegistryReachable(unittest.TestCase):
    @patch("engine.plugins.lib.node_common.subprocess.run")
    def test_reachable(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0)
        self.assertTrue(check_registry_reachable("/repo"))
        mock_run.assert_called_once()
        self.assertEqual(mock_run.call_args[0][0], ["npm", "ping"])
        self.assertEqual(mock_run.call_args.kwargs["cwd"], "/repo")

    @patch("engine.plugins.lib.node_common.subprocess.run")
    def test_unreachable(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1)
        self.assertFalse(check_registry_reachable("/repo"))

    @patch("engine.plugins.lib.node_common.subprocess.run")
    def test_timeout(self, mock_run):
        """npm ping timing out should return False."""
        import subprocess

        mock_run.side_effect = subprocess.TimeoutExpired(cmd=["npm"], timeout=10)
        self.assertFalse(check_registry_reachable("/repo"))


class TestNpmScanContext(TemporaryDirectoryTestCase):
    def setUp(self) -> None:
        super().setUp()
        registry_patch = patch("engine.plugins.lib.node_common.check_registry_reachable", return_value=True)
        registry_patch.start()
        self.addCleanup(registry_patch.stop)

    def test_empty_repo(self):
        result = build_npm_context(str(self.base))
        self.assertIsInstance(result, NpmScanContext)
        self.assertEqual(len(result.needs_npm_generation), 0)

    def test_workspace_monorepo_with_yarn_lock(self):
        # Workspace root with yarn.lock
        self._write_package_json(self.base, {"workspaces": ["packages/*"]})
        (self.base / "yarn.lock").touch()

        # Workspace member
        member_package_json = self._write_package_json(self.base / "packages" / "core", {"name": "core"})

        result = build_npm_context(str(self.base))

        self.assertIn(str(self.base), result.workspace_roots)
        self.assertEqual(result.workspace_roots[str(self.base)], "yarn")
        self.assertIn(str(member_package_json.parent), result.workspace_members)
        self.assertEqual(len(result.needs_npm_generation), 0)

    def test_standalone_no_lockfile_generates(self):
        self._write_package_json(self.base, {"name": "standalone"})

        result = build_npm_context(str(self.base))

        self.assertIn(str(self.base), result.standalone_dirs)
        self.assertIsNone(result.standalone_dirs[str(self.base)])
        self.assertIn(str(self.base), result.needs_npm_generation)

    @patch("engine.plugins.lib.node_common.check_registry_reachable", return_value=False)
    def test_unreachable_registry_skips_generation(self, _mock_reachable):
        self._write_package_json(self.base, {"name": "standalone"})

        result = build_npm_context(str(self.base))

        self.assertFalse(result.registry_reachable)
        self.assertEqual(len(result.needs_npm_generation), 0)
        self.assertTrue(any("unreachable" in alert for alert in result.alerts))

    def test_node_modules_excluded(self):
        self._write_package_json(self.base, {"name": "root"})
        node_module_package_json = self._write_package_json(
            self.base / "node_modules" / "some-pkg",
            {"name": "some-pkg"},
        )

        result = build_npm_context(str(self.base))

        # node_modules should not appear in any classification
        self.assertNotIn(str(node_module_package_json.parent), result.standalone_dirs)
        self.assertNotIn(str(node_module_package_json.parent), result.workspace_members)
