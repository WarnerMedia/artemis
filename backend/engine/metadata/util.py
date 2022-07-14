from fnmatch import fnmatch


def is_name_in_patterns(name, patterns: list) -> bool:
    for pattern in patterns:
        if fnmatch(name, pattern):
            return True
    return False
