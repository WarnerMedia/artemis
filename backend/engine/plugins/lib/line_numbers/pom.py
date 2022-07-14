import re

from engine.plugins.lib.line_numbers.base import BaseResolver


class PomResolver(BaseResolver):
    def __init__(self, filename: str) -> None:
        if filename:
            self._load_lines(filename)

    def _load_lines(self, filename: str) -> None:
        """
        Load the line number of each integrity value in package-lock.json
        """
        self.lines = {}
        with open(filename) as fp:
            # XML does not have whitespace requirements so a dependency block can be 5 lines:
            #    <dependency>
            #      <groupId></groupId>
            #      <artifactId></artifactId>
            #      <version></version>
            #    </dependency>
            #
            # Or 1 line:
            #    <dependency><groupId></groupId><artifactId></artifactId><version></version></dependency>
            #
            # Or event something else weird like:
            #    <dependency><groupId></groupId><artifactId></artifactId>
            #    <version></version></dependency>
            #
            # We care about the line number of the <version> tag for each <artifactId> in the original file, not the
            # the file as it would be formatted if read into an XML processor and then written back out. In order to
            # do that we read through the file line by line and look for the <dependency> blocks in whatever format
            # they happen to exist.
            dep_lines = []
            dep_start = None
            for num, line in enumerate(fp, 1):
                # Dependency block starting
                if "<dependency>" in line:
                    dep_start = num  # Note the line it starts on

                # Inside a dependency block so add the current line, which might be the entire dependency block for all
                # we know.
                if dep_start is not None:
                    dep_lines.append(line)

                # Dependency block ending. This might be the same line as <dependency> or it might be several lines
                # later. Doesn't matter.
                if "</dependency>" in line:
                    # Process the dependency block
                    self._process_dep(dep_lines, dep_start, filename)

                    # Reset for the next block
                    dep_lines = []
                    dep_start = None

    def _process_dep(self, lines: dict, start: int, filename: str) -> None:
        group = None
        line_num = None

        for num, line in enumerate(lines, 0):
            match = re.match(".*<groupId>(.+)</groupId>.*", line)
            if match:
                group = match.group(1)

            if re.match(".*<version>(.+)</version>.*", line):
                line_num = start + num

        if group and line_num:
            self.lines[group] = {"filename": filename, "line": line_num}

    def find(self, search: str) -> dict:
        """
        Find the line number for a package
        """
        # Look for the base component in the package file
        base = search.split(">")[0]
        if base in self.lines:
            return {
                "filename": self.lines[base]["filename"],
                "line": self.lines[base]["line"],
            }
        return {}
