"""
Testing Bundler-Audit
"""

import textwrap
import unittest

from engine.plugins.bundler_audit import main as bundler


class TestBundlerAudit(unittest.TestCase):
    def test_parse_stderr_stacktrace(self):
        """
        Tests parse_stderr extracts the error message from a stacktrace.
        """
        data = textwrap.dedent("""\
            /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/bundler-audit-0.6.0/lib/bundler/audit/scanner.rb:43:in `read': No such file or directory @ rb_sysopen - /src/Gemfile.lock (Errno::ENOENT)
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/bundler-audit-0.6.0/lib/bundler/audit/scanner.rb:43:in `initialize'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/bundler-audit-0.6.0/lib/bundler/audit/cli.rb:41:in `new'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/bundler-audit-0.6.0/lib/bundler/audit/cli.rb:41:in `check'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/thor-0.20.3/lib/thor/command.rb:27:in `run'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/thor-0.20.3/lib/thor/invocation.rb:126:in `invoke_command'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/thor-0.20.3/lib/thor.rb:387:in `dispatch'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/thor-0.20.3/lib/thor/base.rb:466:in `start'
            \tfrom /opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/bundler-audit-0.6.0/bin/bundle-audit:10:in `<top (required)>'
            \tfrom /opt/ruby/2.3.0/bin/bundle-audit:23:in `load'
            \tfrom /opt/ruby/2.3.0/bin/bundle-audit:23:in `<main>'
            """)
        expected = [
            "/opt/ruby/2.3.0/lib/ruby/gems/2.3.0/gems/bundler-audit-0.6.0/lib/bundler/audit/scanner.rb:43:in `read': No such file or directory @ rb_sysopen - /src/Gemfile.lock (Errno::ENOENT)"
        ]
        actual = bundler.parse_stderr(data)
        self.assertEqual(actual, expected)

    def test_parse_stderr_simple(self):
        """
        Tests parse_stderr passes-through simple error messages.
        """
        data = (
            "Git is not installed!\n"
            + 'failed to download https://github.com/rubysec/ruby-advisory-db.git to "/root/.local/share/ruby-advisory-db"\n'
        )
        expected = [
            "Git is not installed!",
            'failed to download https://github.com/rubysec/ruby-advisory-db.git to "/root/.local/share/ruby-advisory-db"',
        ]
        actual = bundler.parse_stderr(data)
        self.assertEqual(actual, expected)

    def test_build_dict0(self):
        """
        testing how build_dict would react if there was no data running
        through build_dict from the subprocess
        :param self: data
        :return: None
        """
        test = ""
        actual = bundler.parse_output(test)
        expected = {}
        self.assertEqual(actual, expected)

    def test_build_dict1(self):
        """
        testing how build_dict would react if there was one instance data
        running through build_dict from the subprocess
        :param self: data
        :return: list
        """
        test = (
            "Name: actionpack\n"
            "Version: 4.2.0\n"
            "CVE: CVE-2016-2098\n"
            "Criticality: Unknown\n"
            "URL: https://groups.google.com/forum/#!topic/"
            "rubyonrails-security/ly-IH-fxr_Q\n"
            "Title: Possible remote code execution vulnerability in "
            "Action Pack\n"
            "Solution: upgrade to ~> 3.2.22.2, >= 4.2.5.2, ~> 4.2.5, "
            ">= 4.1.14.2, ~> 4.1.14\n\n"
            "Vulnerablities Found!"
        )
        actual = bundler.parse_output(test)
        expected = {
            "details": [
                {
                    "component": "actionpack-4.2.0",
                    "source": "Gemfile.lock",
                    "id": "CVE-2016-2098",
                    "description": "Possible remote code execution " "vulnerability in Action Pack",
                    "severity": "",
                    "remediation": "upgrade to ~> 3.2.22.2, >= 4.2.5.2, " "~> 4.2.5, >= 4.1.14.2, ~> 4.1.14",
                    "inventory": {
                        "component": {"name": "actionpack", "version": "4.2.0", "type": "gem"},
                        "advisory_ids": [
                            "CVE-2016-2098",
                            "https://groups.google.com/forum/#!topic/rubyonrails-security/ly-IH-fxr_Q",
                        ],
                    },
                }
            ],
            "truncated": False,
        }
        self.assertEqual(actual, expected)

    def test_build_dict2(self):
        """
        testing how build_dict would react if there was multiple instances of
        data running through build_dict from the subprocess
        :param self: data
        :return: list
        """
        test = (
            "Name: actionpack\n"
            "Version: 4.2.0\n"
            "CVE: CVE-2016-2098\n"
            "Criticality: Unknown\n"
            "URL: https://groups.google.com/forum/#!topic/"
            "rubyonrails-security/ly-IH-fxr_Q\n"
            "Title: Possible remote code execution vulnerability in "
            "Action Pack\n"
            "Solution: upgrade to ~> 3.2.22.2, >= 4.2.5.2, ~> 4.2.5, "
            ">= 4.1.14.2, ~> 4.1.14\n\n"
            "Name: actionpack\n"
            "Version: 4.2.0\n"
            "CVE: CVE-2015-7576\n"
            "Criticality: Unknown\n"
            "URL: https://groups.google.com/forum/#!topic/"
            "rubyonrails-security/ANv0HDHEC3k\n"
            "Title: Timing attack vulnerability in basic authentication "
            "in Action Controller.\n"
            "Solution: upgrade to >= 5.0.0.beta1.1, >= 4.2.5.1, ~> 4.2.5, "
            ">= 4.1.14.1, ~> 4.1.14, ~> 3.2.22.1\n\n"
            "Vulnerablities Found!"
        )
        actual = bundler.parse_output(test)
        expected = {
            "details": [
                {
                    "component": "actionpack-4.2.0",
                    "source": "Gemfile.lock",
                    "id": "CVE-2016-2098",
                    "description": "Possible remote code execution " "vulnerability in Action Pack",
                    "severity": "",
                    "remediation": "upgrade to ~> 3.2.22.2, >= 4.2.5.2, " "~> 4.2.5, >= 4.1.14.2, ~> 4.1.14",
                    "inventory": {
                        "component": {"name": "actionpack", "version": "4.2.0", "type": "gem"},
                        "advisory_ids": [
                            "CVE-2016-2098",
                            "https://groups.google.com/forum/#!topic/rubyonrails-security/ly-IH-fxr_Q",
                        ],
                    },
                },
                {
                    "component": "actionpack-4.2.0",
                    "source": "Gemfile.lock",
                    "id": "CVE-2015-7576",
                    "description": "Timing attack vulnerability in basic " "authentication in Action Controller.",
                    "severity": "",
                    "remediation": "upgrade to >= 5.0.0.beta1.1, >= 4.2.5.1,"
                    " ~> 4.2.5, >= 4.1.14.1, ~> 4.1.14, "
                    "~> 3.2.22.1",
                    "inventory": {
                        "component": {"name": "actionpack", "version": "4.2.0", "type": "gem"},
                        "advisory_ids": [
                            "CVE-2015-7576",
                            "https://groups.google.com/forum/#!topic/rubyonrails-security/ANv0HDHEC3k",
                        ],
                    },
                },
            ],
            "truncated": False,
        }
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 2)

    def test_build_dict3(self):
        """
        testing how build_dict would react if there were multiple different
        types of identifiers given
        :param self: data
        :return: list
        """
        test = (
            "Name: actionpack\n"
            "Version: 4.2.0\n"
            "GHSA: GHSA-8727-m6gj-mc37\n"
            "Criticality: Unknown\n"
            "URL: https://groups.google.com/forum/#!topic/"
            "rubyonrails-security/ly-IH-fxr_Q\n"
            "Title: Possible remote code execution vulnerability in "
            "Action Pack\n"
            "Solution: upgrade to ~> 3.2.22.2, >= 4.2.5.2, ~> 4.2.5, "
            ">= 4.1.14.2, ~> 4.1.14\n\n"
            "Name: actionpack\n"
            "Version: 4.2.0\n"
            "Criticality: Unknown\n"
            "URL: https://groups.google.com/forum/#!topic/"
            "rubyonrails-security/ANv0HDHEC3k\n"
            "Title: Timing attack vulnerability in basic authentication "
            "in Action Controller.\n"
            "Solution: upgrade to >= 5.0.0.beta1.1, >= 4.2.5.1, ~> 4.2.5, "
            ">= 4.1.14.1, ~> 4.1.14, ~> 3.2.22.1\n\n"
            "Vulnerablities Found!"
        )

        # "Name: actionpack\n"
        # "Version: 4.2.7\n"
        # "GHSA: GHSA-8727-m6gj-mc37\n"
        # "Criticality: Unknown\n"
        # "URL: https://groups.google.com/forum/#!topic/"
        # "rubyonrails-security/f6ioe4sdpbY\n"
        # "Title: Possible Strong Parameters Bypass in"
        # "ActionPack\n"
        # "Solution: upgrade to ~> 5.2.4, >= 5.2.4.3, "
        # ">= 6.0.3.1\n\n"

        actual = bundler.parse_output(test)
        expected = {
            "details": [
                {
                    "component": "actionpack-4.2.0",
                    "source": "Gemfile.lock",
                    "id": "GHSA-8727-m6gj-mc37",
                    "description": "Possible remote code execution " "vulnerability in Action Pack",
                    "severity": "",
                    "remediation": "upgrade to ~> 3.2.22.2, >= 4.2.5.2, " "~> 4.2.5, >= 4.1.14.2, ~> 4.1.14",
                    "inventory": {
                        "component": {"name": "actionpack", "version": "4.2.0", "type": "gem"},
                        "advisory_ids": [
                            "GHSA-8727-m6gj-mc37",
                            "https://groups.google.com/forum/#!topic/rubyonrails-security/ly-IH-fxr_Q",
                        ],
                    },
                },
                {
                    "component": "actionpack-4.2.0",
                    "source": "Gemfile.lock",
                    "id": "https://groups.google.com/forum/#!topic/rubyonrails-security/ANv0HDHEC3k",
                    "description": "Timing attack vulnerability in basic " "authentication in Action Controller.",
                    "severity": "",
                    "remediation": "upgrade to >= 5.0.0.beta1.1, >= 4.2.5.1,"
                    " ~> 4.2.5, >= 4.1.14.1, ~> 4.1.14, "
                    "~> 3.2.22.1",
                    "inventory": {
                        "component": {"name": "actionpack", "version": "4.2.0", "type": "gem"},
                        "advisory_ids": ["https://groups.google.com/forum/#!topic/rubyonrails-security/ANv0HDHEC3k"],
                    },
                },
            ],
            "truncated": False,
        }
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 2)

    def test_build_dict4(self):
        """
        testing how build_dict would react if there were no unique
        identifiers found
        :param self: data
        :return: list
        """
        test = (
            "Name: actionpack\n"
            "Version: 4.2.0\n"
            "Criticality: Unknown\n"
            "Title: Possible remote code execution vulnerability in "
            "Action Pack\n"
            "Solution: upgrade to ~> 3.2.22.2, >= 4.2.5.2, ~> 4.2.5, "
            ">= 4.1.14.2, ~> 4.1.14\n\n"
        )
        actual = bundler.parse_output(test)
        expected = {"details": [{}], "truncated": False}
        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
