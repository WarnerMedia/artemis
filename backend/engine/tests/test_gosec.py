"""
Tests GoSec Plugin
"""

import json
import unittest
from unittest.mock import MagicMock, patch

from engine.plugins.gosec.main import amend_rule, get_cwe_reason, parse_scan, run_gosec
from engine.plugins.lib import utils

TEST_GOSEC_OUTPUT = {
    "Issues": [
        {
            "severity": "HIGH",
            "confidence": "MEDIUM",
            "cwe": {"id": "338", "URL": "https://cwe.mitre.org/data/definitions/338.html"},
            "rule_id": "G404",
            "details": "Use of weak random number generator (math/rand instead of crypto/rand)",
            "file": "/go/golang-examples/expert/dynparallel.go",
            "code": (
                "116: \t\trand.Seed(time.Now().UnixNano() + int64(i))\n117: \t\trandom = rand.Intn(6400) + 1\n"
                '118: \t\tfmt.Printf("sending request for the %v prime number on channel %v\\n", '
                "enNmbr(strconv.Itoa(random)), i)\n"
            ),
            "line": "117",
            "column": "12",
        },
        {
            "severity": "HIGH",
            "confidence": "HIGH",
            "cwe": {"id": "295", "URL": "https://cwe.mitre.org/data/definitions/295.html"},
            "rule_id": "G402",
            "details": "TLS MinVersion too low.",
            "file": "/go/golang-examples/expert/httpsd.go",
            "code": (
                "108: \n109: \t\tconfig := tls.Config{\n110: \t\t\tCertificates: []tls.Certificate{cert},\n111: "
                "\t\t\t//MinVersion:   tls.VersionSSL30, //don't use SSLv3, "
                "https://www.openssl.org/~bodo/ssl-poodle.pdf\n112: \t\t\tMinVersion: tls.VersionTLS10,\n113: "
                "\t\t\t//MinVersion:   tls.VersionTLS11,\n114: \t\t\t//MinVersion:   tls.VersionTLS12,\n115: \t\t}\n"
                "116: \t\tconfig.Rand = rand.Reader\n"
            ),
            "line": "109-115",
            "column": "13",
        },
        {
            "severity": "MEDIUM",
            "confidence": "HIGH",
            "cwe": {"id": "326", "URL": "https://cwe.mitre.org/data/definitions/326.html"},
            "rule_id": "G401",
            "details": "Use of weak cryptographic primitive",
            "file": "/go/golang-examples/beginner/hashing.go",
            "code": (
                '14: \tinput := "Lorem Ipsum dolor sit Amet"\n15: \tmd5 := md5.New()\n'
                "16: \tsha_256 := sha256.New()\n"
            ),
            "line": "15",
            "column": "9",
        },
        {
            "severity": "MEDIUM",
            "confidence": "HIGH",
            "cwe": {"id": "78", "URL": "https://cwe.mitre.org/data/definitions/78.html"},
            "rule_id": "G204",
            "details": "Subprocess launched with variable",
            "file": "/go/golang-examples/expert/gocomment.go",
            "code": (
                '18: (\t\tgosrc := string(gosrcs)\n19: \t\tgorun, _ := exec.Command("go", "build", '
                "input).Output()\n20: \t\tgostr := string(gorun)\n"
            ),
            "line": "19",
            "column": "15",
        },
        {
            "severity": "LOW",
            "confidence": "HIGH",
            "cwe": {"id": "242", "URL": "https://cwe.mitre.org/data/definitions/242.html"},
            "rule_id": "G103",
            "details": "Use of unsafe calls should be audited",
            "file": "/go/golang-examples/expert/cgo.go",
            "code": "65: \tC.print(cs)\n66: \tC.free(unsafe.Pointer(cs))\n67: \n",
            "line": "66",
            "column": "9",
        },
        {
            "severity": "LOW",
            "confidence": "HIGH",
            "cwe": {"id": "703", "URL": "https://cwe.mitre.org/data/definitions/703.html"},
            "rule_id": "G104",
            "details": "Errors unhandled.",
            "file": "/go/golang-examples/expert/upload.go",
            "code": (
                "47: \t\t\tbuf, _ := ioutil.ReadAll(file)\n48: \t\t\tioutil.WriteFile(path, buf, os.ModePerm)\n"
                "49: \t\t}\n"
            ),
            "line": "48",
            "column": "4",
        },
    ],
    "Stats": {"files": 80, "lines": 3400, "nosec": 0, "found": 55},
}

TEST_GOSEC_OUTPUT_STRING = json.dumps(TEST_GOSEC_OUTPUT).encode("utf-8")

TEST_PARSE_SCAN_OUTPUT = [
    {
        "filename": "expert/dynparallel.go",
        "severity": "low",
        "message": (
            "Use of weak random number generator (math/rand instead of crypto/rand). The need for crypto rand "
            "is context based and should be used when generating api keys, tokens, etc. "
            "If the number being generated does not need to be secure, rand can be used."
        ),
        "line": 117,
        "type": "338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)",
    },
    {
        "filename": "expert/httpsd.go",
        "severity": "high",
        "message": "TLS MinVersion too low.",
        "line": 109,
        "type": "295: Improper Certificate Validation",
    },
    {
        "filename": "beginner/hashing.go",
        "severity": "medium",
        "message": "Use of weak cryptographic primitive",
        "line": 15,
        "type": "326: Inadequate Encryption Strength",
    },
    {
        "filename": "expert/gocomment.go",
        "severity": "medium",
        "message": "Subprocess launched with variable",
        "line": 19,
        "type": "78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')",
    },
    {
        "filename": "expert/cgo.go",
        "severity": "low",
        "message": "Use of unsafe calls should be audited",
        "line": 66,
        "type": "242: Use of Inherently Dangerous Function",
    },
    {
        "filename": "expert/upload.go",
        "severity": "low",
        "message": "Errors unhandled.",
        "line": 48,
        "type": "703: Improper Check or Handling of Exceptional Conditions",
    },
]

TEST_AMEND_G404_INPUT = {
    "severity": "HIGH",
    "confidence": "MEDIUM",
    "cwe": {"id": "338", "URL": "https://cwe.mitre.org/data/definitions/338.html"},
    "rule_id": "G404",
    "details": "Use of weak random number generator (math/rand instead of crypto/rand)",
    "file": "/go/golang-examples/expert/dynparallel.go",
    "code": (
        "116: \t\trand.Seed(time.Now().UnixNano() + int64(i))\n117: \t\trandom = rand.Intn(6400) + 1\n118: \t\t"
        'fmt.Printf("sending request for the %v prime number on channel %v\\n", enNmbr(strconv.Itoa(random)), i)\n'
    ),
    "line": "117",
    "column": "12",
}
TEST_AMEND_G404_OUTPUT = {
    "filename": "expert/dynparallel.go",
    "severity": "low",
    "message": (
        "Use of weak random number generator (math/rand instead of crypto/rand). The need for crypto rand is "
        "context based and should be used when generating api keys, tokens, etc. "
        "If the number being generated does not need to be secure, rand can be used."
    ),
    "line": 117,
    "type": "338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)",
}

TEST_AMEND_G307_INPUT = {
    "severity": "MEDIUM",
    "confidence": "MEDIUM",
    "cwe": {"id": "703", "URL": "https://cwe.mitre.org/data/definitions/703.html"},
    "rule_id": "G307",
    "details": 'Deferring unsafe method "Close" on type "*os.File"',
    "file": "/go/golang-examples/expert/dynparallel.go",
    "line": "107",
    "column": "12",
}
TEST_AMEND_G307_OUTPUT = {
    "filename": "expert/dynparallel.go",
    "severity": "low",
    "message": 'Deferring unsafe method "Close" on type "*os.File"',
    "line": 107,
    "type": "703: Improper Check or Handling of Exceptional Conditions",
}


class TestGoSec(unittest.TestCase):
    def test_parse_scan(self):
        """
        tests the entire output from run_gosec to make sure
        parsing output is correct
        """
        expected_output = TEST_PARSE_SCAN_OUTPUT
        output = parse_scan(TEST_GOSEC_OUTPUT, "/go/golang-examples/")
        self.assertEqual(expected_output, output)

    def test_amend_rule_G404(self):
        """
        tests amend_rule edits a G404 warning severity to low and amends its details accordingly
        edits a G307 warning severity to low
        """
        expected_output = TEST_AMEND_G404_OUTPUT
        output = amend_rule(TEST_AMEND_G404_INPUT, "/go/golang-examples/")
        self.assertEqual(expected_output, output)

    def test_amend_rule_G307(self):
        """
        tests amend_rule edits a G307 warning severity to low
        """
        expected_output = TEST_AMEND_G307_OUTPUT
        output = amend_rule(TEST_AMEND_G307_INPUT, "/go/golang-examples/")
        self.assertEqual(expected_output, output)

    @patch("engine.plugins.gosec.main.subprocess")
    def test_run_gosec(self, mock_subprocess):
        """
        test run_gosec when returncode will be 1
        """
        mock_subprocess_output = MagicMock()
        mock_subprocess_output.stdout = TEST_GOSEC_OUTPUT_STRING
        mock_subprocess_output.returncode = 1
        mock_subprocess.run.return_value = mock_subprocess_output
        run_gosec_output = run_gosec("/go/golang-examples/")
        self.assertListEqual(run_gosec_output, TEST_PARSE_SCAN_OUTPUT)

    @patch("engine.plugins.gosec.main.subprocess")
    def test_run_gosec_no_packages_found(self, mock_subprocess):
        """
        test run_gosec when no packages found, returncode will be 1, but stdout will be b''
        """
        mock_subprocess_output = MagicMock()
        mock_subprocess_output.stdout = b""
        mock_subprocess_output.returncode = 1
        mock_subprocess.run.return_value = mock_subprocess_output
        run_gosec_output = run_gosec(utils.CODE_DIRECTORY)
        self.assertListEqual(run_gosec_output, [])

    def test_get_cwe_reason(self):
        """
        tests get_cwe_reason id -> name lookup
        """
        expected_output = "Improper Certificate Validation"
        output = get_cwe_reason("295")
        self.assertEqual(output, expected_output)

    def test_get_cwe_reason_noid(self):
        """
        tests for bad cweid/no cweid
        """
        expected_output = "No Vulnerability Name Available"
        output = get_cwe_reason("")
        self.assertEqual(output, expected_output)


if __name__ == "__main__":
    unittest.main()
