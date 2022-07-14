import os
from glob import glob


def get_folders_with_file(path, filename):
    """
    Globs the path and all underlying folders for a specific filename,
    returning the directory of each unique result.
    :param path: working directory
    :param filename: string filename to search
    :return: set of directory paths
    """
    results = set()
    paths = glob(f"{path}/**/{filename}", recursive=True)

    for file_path in paths:
        results.add(os.path.dirname(os.path.abspath(file_path)))
    return results
