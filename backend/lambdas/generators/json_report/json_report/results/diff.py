def diff_includes(filename: str, linenum: int, diff_summary: dict) -> bool:
    if diff_summary is None:
        # If no diff summary always include the thing
        return True

    if not (filename and linenum):
        # Item does not specify filename and line so exclude the thing, erring on the side of suppressing something
        # we can't guarantee is in the diff instead possibly reporting things that are not in the diff and annoying
        # users with unrelated findings.
        return False

    # If the line number is in the range of lines modified for that file include it
    if filename in diff_summary:  # Filename is in summary
        for diff_range in diff_summary[filename]:  # Go through the list of ranges
            if diff_range[0] <= linenum <= diff_range[1]:  # Check if line number is in the range
                return True

    # filename:linenum was not in the diff so exclude it
    return False
