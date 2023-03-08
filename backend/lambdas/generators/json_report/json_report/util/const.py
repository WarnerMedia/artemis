"""
Constants file
"""

FORMAT_FULL = "full"
SEVERITY = ["critical", "high", "medium", "low", "negligible", ""]
WL_STATIC_ANALYSIS_KEYS = {"filename": str, "line": int, "type": str}
WL_CONFIGURATION_KEYS = {"id": str}
DEFAULT_SCAN_QUERY_PARAMS = {"format": FORMAT_FULL, "filter_diff": True}
SEVERITY_DICT = {"": -1, "NONE": 0, "NEGLIGIBLE": 1, "LOW": 2, "MEDIUM": 3, "HIGH": 4, "CRITICAL": 5}
