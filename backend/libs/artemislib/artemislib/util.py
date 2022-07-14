def dict_eq(a, b, keys=None):
    for key in keys or []:
        if a[key] != b[key]:
            return False
    return True
