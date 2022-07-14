import unittest
from collections import namedtuple
from unittest.mock import patch

from engine.plugins.gitsecrets import main

TEST_RESPONSE_BYTES_1 = b"\xf0\x9f\xa4\xa8"
TEST_RESPONSE_DECODED_1 = "🤨"
TEST_RESPONSE_BYTES_2 = "😉".encode("utf-16")
TEST_RESPONSE_BYTES_3 = "♞".encode("utf-16")

TEST_GIT_SECRETS_BYTES = (
    b"fatal: not a git repository (or any of the parent directories): "
    b".git\napp/test/docs/docs.htm:185:style='mso-bookmark:pdo'>"
    b"<span style='mso-tab-count:1'>\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0 </span>$dsn "
    b"= 'postgres://localhost/mydb?persist';<span style='mso-spacerun:yes'>\xa0 "
    b"</span># persist is optional</span></pre><pre\n\n[ERROR] Matched one or more prohibited "
    b"patterns\n\nPossible mitigations:\n- Mark false positives as allowed using: git config "
    b"--add secrets.allowed ...\n- Mark false positives as allowed by adding regular expressions "
    b"to .gitallowed at repository's root directory\n- List your configured patterns: git config "
    b"--get-all secrets.patterns\n- List your configured allowed patterns: git config --get-all "
    b"secrets.allowed\n- List your configured allowed patterns in .gitallowed at repository's "
    b"root directory\n- Use --no-verify if this is a one-time false positive\n "
)

TEST_GIT_BLAME_BYTES = (
    b"35702d1527511111a920def45bfbf3f694b7210d 1185 1185 1\nauthor Walter Scott\nauthor-mail "
    b"<wascott@example.com>\nauthor-time 1499200109\nauthor-tz -0400\ncommitter Walter "
    b"Scott\ncommitter-mail <wascott@example.com>\ncommitter-time 1499200109\ncommitter-tz "
    b"-0400\nsummary initial addition of docker container for phpcalendar\nboundary\nfilename "
    b"app/test/docs/docs.htm\n\tstyle='mso-bookmark:pdo'><span "
    b"style='mso-tab-count:1'>\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0 </span>$dsn = "
    b"'postgres://localhost/mydb?persist';<span style='mso-spacerun:yes'>\xa0 </span># "
    b"persist is optional</span></pre><pre\n "
)

SUBPROCESS_RESPONSE = namedtuple("subprocess_response", ["returncode", "stdout", "stderr"])


class TestGitSecrets(unittest.TestCase):
    def test_decode_response_invalid_char_1(self):
        result = main.decode_response(TEST_RESPONSE_BYTES_1)

        self.assertEqual(TEST_RESPONSE_DECODED_1, result)

    def test_decode_response_invalid_char_2(self):
        result = main.decode_response(TEST_RESPONSE_BYTES_2)

        self.assertTrue(result)

    def test_decode_response_invalid_char_3(self):
        result = main.decode_response(TEST_RESPONSE_BYTES_3)

        self.assertTrue(result)

    @patch.object(main, "execute_git_blame")
    def test_blame_success(self, mock_blame):
        self.assertEqual(main.execute_git_blame, mock_blame)
        mock_blame.return_value = SUBPROCESS_RESPONSE(0, TEST_GIT_BLAME_BYTES, None)

        result = main.blame("does it matter?", "goes/to/somewhere", 1)

        self.assertEqual(
            main.GIT_BLAME_RESULT(
                "Walter Scott <wascott@example.com>",
                "35702d1527511111a920def45bfbf3f694b7210d",
                "2017-07-04T20:28:29.000000+00:00",
            ),
            result,
        )

    @patch.object(main.SystemAllowList, "_load_al")
    @patch.object(main.SystemAllowList, "ignore_secret")
    @patch.object(main.SecretProcessor, "process_response")
    @patch.object(main, "execute_git_secrets")
    @patch.object(main, "execute_git_blame")
    def test_run_git_secrets_full_detail(self, mock_blame, mock_secrets, mock_process, mock_ignore, mock_load_al):
        self.assertEqual(main.execute_git_blame, mock_blame)
        self.assertEqual(main.execute_git_secrets, mock_secrets)
        self.assertEqual(main.SecretProcessor.process_response, mock_process)
        mock_blame.return_value = SUBPROCESS_RESPONSE(0, TEST_GIT_BLAME_BYTES, None)
        mock_secrets.return_value = SUBPROCESS_RESPONSE(1, None, TEST_GIT_SECRETS_BYTES)
        mock_process.return_value = True
        mock_ignore.return_value = False
        mock_load_al.return_value = []
        expected_result = main.GIT_SECRETS_RESULT([], {})

        result = main.run_git_secrets("scan/path/file")

        self.assertNotEqual(expected_result, result)

    @patch.object(main.SystemAllowList, "_load_al")
    @patch.object(main, "execute_git_secrets")
    def test_run_git_secrets_result_code_0(self, mock_secrets, mock_load_al):
        self.assertEqual(main.execute_git_secrets, mock_secrets)
        mock_secrets.return_value = SUBPROCESS_RESPONSE(0, None, None)
        mock_load_al.return_value = []
        expected_result = main.GIT_SECRETS_RESULT([], {})

        result = main.run_git_secrets("scan/path/file")

        self.assertEqual(expected_result, result)
