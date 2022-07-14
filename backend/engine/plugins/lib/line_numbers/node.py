from engine.plugins.lib.line_numbers.base import BaseResolver


class NodeResolver(BaseResolver):
    def __init__(self, filename: str, lockfile: bool = False) -> None:
        """
        Initiate the Nodejs line number resolver. Load the line numbers from either package.json or package-lock.json.
        This loads the line numbers for each line of potential interest regardless of if it will be needed so that we
        only have to open and parse these potentially-large files once.
        """
        self.lockfile = lockfile
        if lockfile:
            self._load_lines_lockfile(filename)
        else:
            self._load_lines_package_file(filename)

    def _load_lines_lockfile(self, lockfile: str) -> None:
        """
        Load the line number of each integrity value in package-lock.json
        """
        self.lines = {}
        with open(lockfile) as fp:
            for num, line in enumerate(fp, 1):
                if '"integrity":' in line:
                    value = line.split('"')[-2]
                    self.lines[value] = {"filename": lockfile, "line": num}

    def _load_lines_package_file(self, package_file) -> dict:
        """
        Load the line number of each dependency in package.json
        """
        self.lines = {}
        with open(package_file) as fp:
            in_deps = False
            for num, line in enumerate(fp, 1):
                if '"dependencies":' in line or '"devDependencies":' in line:
                    in_deps = True
                    continue
                elif in_deps and "}" in line:
                    in_deps = False

                if in_deps:
                    value = line.split('"')[1]
                    self.lines[value] = {"filename": package_file, "line": num}
        return self.lines

    def find(self, search: str) -> dict:
        """
        Find the line number for a package by either its path or integrity value
        """
        if self.lockfile:
            # Look for the integrity value in the lockfile
            if search in self.lines:
                return {
                    "filename": self.lines[search]["filename"],
                    "line": self.lines[search]["line"],
                }
        else:
            # Look for the base component in the package file
            base = search.split(">")[0]
            if base in self.lines:
                return {
                    "filename": self.lines[base]["filename"],
                    "line": self.lines[base]["line"],
                }
        return {}
