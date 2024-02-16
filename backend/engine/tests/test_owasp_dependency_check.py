"""
Tests Owasp Dependency Check Plugin
"""

import os
import unittest

from engine.plugins.owasp_dependency_check import main as owasp

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
DEPENDENCY_CHECK_DIR = os.path.join(TEST_DIR, "data", "owasp_dependency_check/")
JAVA_DIR = os.path.join(TEST_DIR, "data", "java")

PARSED_ERROR = (
    [
        'org.owasp.dependencycheck.exception.InitializationException: Exception from bundle-audit process: java.io.IOException: Cannot run program "bundle-audit" (in directory "/tmp/dctemp2ebe5b42-3852-4a6b-8148-f0ebaa1af432"): error=2, No such file or directory. Disabling Ruby Bundle Audit Analyzer',
        "org.owasp.dependencycheck.analyzer.exception.SearchException: Could not perform Node Audit analysis. Invalid payload submitted to Node Audit API.",
    ],
)

PARSED_VULNERABILITIES = [
    {
        "component": "jackson-exploit-1.0-SNAPSHOT.jar (shaded: ch.qos.logback:logback-classic:1.2.3)",
        "source": "pom.xml",
        "id": "CVE-2021-42550",
        "description": "In logback version 1.2.7 and prior versions, an attacker with the required privileges to edit configurations files could craft a malicious configuration allowing to execute arbitrary code loaded from LDAP servers.",
        "severity": "medium",
        "remediation": "",
        "inventory": {
            "component": {"name": "CVE-2021-42550", "version": "", "type": "maven"},
            "advisory_ids": ["CVE-2021-42550"],
        },
    },
    {
        "component": "jackson-exploit-1.0-SNAPSHOT.jar (shaded: ch.qos.logback:logback-classic:1.2.3)",
        "source": "pom.xml",
        "id": "CVE-2023-6378",
        "description": "A serialization vulnerability in logback receiver component part of \nlogback version 1.4.11 allows an attacker to mount a Denial-Of-Service \nattack by sending poisoned data.\n\n",
        "severity": "high",
        "remediation": "",
        "inventory": {
            "component": {"name": "CVE-2023-6378", "version": "", "type": "maven"},
            "advisory_ids": ["CVE-2023-6378"],
        },
    },
    {
        "component": "jackson-exploit-1.0-SNAPSHOT.jar (shaded: ch.qos.logback:logback-core:1.2.3)",
        "source": "pom.xml",
        "id": "CVE-2021-42550",
        "description": "In logback version 1.2.7 and prior versions, an attacker with the required privileges to edit configurations files could craft a malicious configuration allowing to execute arbitrary code loaded from LDAP servers.",
        "severity": "medium",
        "remediation": "",
        "inventory": {
            "component": {"name": "CVE-2021-42550", "version": "", "type": "maven"},
            "advisory_ids": ["CVE-2021-42550"],
        },
    },
    {
        "component": "jackson-exploit-1.0-SNAPSHOT.jar (shaded: ch.qos.logback:logback-core:1.2.3)",
        "source": "pom.xml",
        "id": "CVE-2023-6378",
        "description": "A serialization vulnerability in logback receiver component part of \nlogback version 1.4.11 allows an attacker to mount a Denial-Of-Service \nattack by sending poisoned data.\n\n",
        "severity": "high",
        "remediation": "",
        "inventory": {
            "component": {"name": "CVE-2023-6378", "version": "", "type": "maven"},
            "advisory_ids": ["CVE-2023-6378"],
        },
    },
    {
        "component": "jackson-exploit-1.0-SNAPSHOT.jar (shaded: org.eclipse.jetty:jetty-io:9.4.8.v20171121)",
        "source": "pom.xml",
        "id": "CVE-2021-28165",
        "description": "In Eclipse Jetty 7.2.2 to 9.4.38, 10.0.0.alpha0 to 10.0.1, and 11.0.0.alpha0 to 11.0.1, CPU usage can reach 100% upon receiving a large invalid TLS frame.\n\nSonatype's research suggests that this CVE's details differ from those defined at NVD. See https://ossindex.sonatype.org/vulnerability/CVE-2021-28165 for details",
        "severity": "high",
        "remediation": "",
        "inventory": {
            "component": {"name": "CVE-2021-28165", "version": "", "type": "maven"},
            "advisory_ids": ["CVE-2021-28165"],
        },
    },
]

class TestBandit(unittest.TestCase):

    def test_parse_build_results(self):
        scan_report = owasp.parse_scanner_output_json(DEPENDENCY_CHECK_DIR, 0)

        self.assertListEqual(scan_report["errors"], PARSED_ERROR)
        self.assertListEqual(scan_report["output"], PARSED_VULNERABILITIES)

    
    def test_pom_exists(self):
        self.assertFalse(owasp.pom_exists(DEPENDENCY_CHECK_DIR))
        self.assertTrue(owasp.pom_exists(JAVA_DIR))
