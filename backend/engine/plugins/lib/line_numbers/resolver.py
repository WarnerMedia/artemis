import os

from engine.plugins.lib.line_numbers.node import NodeResolver
from engine.plugins.lib.line_numbers.pom import PomResolver


class LineNumberResolver:
    def __init__(self, filename: str = None) -> None:
        """
        Initialize the resolver. If a filename is provided load it and set the default filename.
        """
        self.resolvers = {}
        self.default_filename = filename
        if filename:
            self.load_file(filename)

    def find(self, search: str, filename: str = None) -> dict:
        """
        Find the line number in the file for the search string.
        """
        if search is None:
            return {}

        if filename:
            # Filename is provided so load the file and search it
            if self.load_file(filename):
                return self.resolvers[filename].find(search)
            return {}
        elif self.default_filename:
            # No filename so search the default
            return self.resolvers[self.default_filename].find(search)

    def load_file(self, filename: str) -> bool:
        """
        Load the file into an appropriate resolver and store it
        """
        if filename in self.resolvers:
            # File has already been loaded. Do nothing.
            return True

        if os.path.basename(filename) == "package.json":
            self.resolvers[filename] = NodeResolver(filename, lockfile=False)
            return True
        elif os.path.basename(filename) == "package-lock.json":
            self.resolvers[filename] = NodeResolver(filename, lockfile=True)
            return True
        elif os.path.basename(filename) == "pom.xml":
            self.resolvers[filename] = PomResolver(filename)
            return True

        return False
