SEVERITY = {0: "negligible", 1: "low", 2: "medium"}


def convert_severity_from_num(severity_num):
    """
    Converts int severity numbers from plugins like eslint to a string severity.
    """
    return SEVERITY.get(severity_num, "")
