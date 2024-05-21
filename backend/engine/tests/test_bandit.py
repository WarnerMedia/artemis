"""
Tests Bandit Plugin
"""

import unittest

from engine.plugins.bandit import main as bandit


class TestBandit(unittest.TestCase):
    def test_build_dict(self):
        """
        tests the entire output from run_bandit to make sure
        that only desired output gets passed
        :return: list
        """
        data = {
            "errors": [],
            "generated_at": "2019-06-07T17:33:47.000000+00:00",
            "metrics": {
                "/src/dvpwa/run.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 12,
                    "nosec": 0,
                },
                "/src/dvpwa/sqli/__init__.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 0,
                    "nosec": 0,
                },
                "/src/dvpwa/sqli/app.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 31,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/dao/__init__.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 0,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/dao/course.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 41,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/dao/mark.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 31,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/dao/review.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 30,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/dao/student.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 1.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 1.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 38,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/dao/user.py": {
                    "CONFIDENCE.HIGH": 1.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 1.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 34,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/middlewares.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 60,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/routes.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 24,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/schema/__init__.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 0,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/schema/config.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 19,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/schema/forms.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 14,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/services/__init__.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 0,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/services/db.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 16,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/services/redis.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 13,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/utils/__init__.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 0,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/utils/auth.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 25,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/utils/jinja2.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 13,
                    "nosec": 0,
                },
                "/src/dvpwa"
                "/sqli/views.py": {
                    "CONFIDENCE.HIGH": 0.0,
                    "CONFIDENCE.LOW": 0.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 0.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 138,
                    "nosec": 0,
                },
                "_totals": {
                    "CONFIDENCE.HIGH": 1.0,
                    "CONFIDENCE.LOW": 1.0,
                    "CONFIDENCE.MEDIUM": 0.0,
                    "CONFIDENCE.UNDEFINED": 0.0,
                    "SEVERITY.HIGH": 0.0,
                    "SEVERITY.LOW": 0.0,
                    "SEVERITY.MEDIUM": 2.0,
                    "SEVERITY.UNDEFINED": 0.0,
                    "loc": 539,
                    "nosec": 0,
                },
            },
            "results": [
                {
                    "code": "41     async def create"
                    "(conn: Connection, name: str):\n42"
                    '         q = ("INSERT INTO'
                    ' students (name) "\n43'
                    '              "VALUES'
                    " ('%(name)s')\" % {'name': name})\n44"
                    "         async with conn.cursor"
                    "() as cur:\n",
                    "filename": "/src" "/dvpwa/sqli/dao/student.py",
                    "issue_confidence": "LOW",
                    "issue_severity": "MEDIUM",
                    "issue_text": "Possible SQL injection vector" " through string-based query construction.",
                    "line_number": 42,
                    "line_range": [42, 43],
                    "more_info": "https://bandit.readthedocs.io/en"
                    "/latest/plugins/"
                    "b608_hardcoded_sql_expressions.html",
                    "test_id": "B608",
                    "test_name": "hardcoded_sql_expressions",
                },
                {
                    "code": "40     def check_password(self, password: str)"
                    ":\n41         "
                    "return self.pwd_hash == md5"
                    "(password.encode('utf-8')).hexdigest()\n",
                    "filename": "/src/dvpwa/" "sqli/dao/user.py",
                    "issue_confidence": "HIGH",
                    "issue_severity": "MEDIUM",
                    "issue_text": "Use of insecure MD2, MD4, MD5," " or SHA1 hash function.",
                    "line_number": 41,
                    "line_range": [41],
                    "more_info": "https://bandit.readthedocs.io/" "en/latest/blacklists/blacklist_calls.html#b303-md5",
                    "test_id": "B303",
                    "test_name": "blacklist",
                },
            ],
        }
        expected = [
            {
                "filename": "/dvpwa/sqli/dao/student.py",
                "line": 42,
                "message": "Possible SQL injection vector through string-based query " "construction.",
                "severity": "medium",
                "type": "B608: hardcoded_sql_expressions",
            },
            {
                "filename": "/dvpwa/sqli/dao/user.py",
                "line": 41,
                "message": "Use of insecure MD2, MD4, MD5, or SHA1 hash function.",
                "severity": "medium",
                "type": "B303: blacklist",
            },
        ]

        actual = bandit.build_dict(data, "/src")
        self.assertEqual(expected, actual)


if __name__ == "__main__":
    unittest.main()
