# pylint: disable=too-many-instance-attributes
import os
import re
from string import Template

from engine.plugins.lib.utils import setup_logging

log = setup_logging("gitsecrets")

DEFAULT_SEPARATOR = ":"
DEFAULT_SETTER_ERROR_MESSAGE = "property $property is read only"

# !!! IMPORTANT
# This regex needs to match the git-secrets regexes in Dockerfiles/data/secret-patterns
REGEXES = [
    re.compile(str(r"(amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})")),
    re.compile(str(r"(AIza[0-9A-Za-z_-]{35})")),
    re.compile(str(r"(https://hooks.slack.com/services/T[a-zA-Z0-9_]{8}/B[a-zA-Z0-9_]{8}/[a-zA-Z0-9_]{24})")),
    re.compile(str(r"(AKIA[A-Z0-9]{16})")),
    re.compile(str(r"(ASIA[A-Z0-9]{16})")),
    re.compile(str(r"(ACCA[A-Z0-9]{16})")),
    re.compile(str(r"(EAACEdEose0cBA[0-9A-Za-z]{16,255})")),
    re.compile(str(r"([f|F][a|A][c|C][e|E][b|B][o|O][o|O][k|K](.){1,64}['|\"][0-9a-f]{32}['|\"])")),
    re.compile(str(r"([a|A][p|P][i|I][_]?[k|K][e|E][y|Y](.){1,64}['|\"][0-9a-zA-Z]{32,45}['|\"])")),
    re.compile(str(r"([s|S][e|E][c|C][r|R][e|E][t|T](.){1,64}['|\"][0-9a-zA-Z]{32,45}['|\"])")),
    re.compile(str(r"([0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com)")),
    re.compile(str(r"(ya29\.[0-9A-Za-z\-_]{55})")),
    re.compile(
        str(
            (
                r"((ftp|ftps|http|https|mongodb|mongodb\+srv|postgres)"
                r"://[^/\s:@]{3,64}:[^/\s:@]{3,64}@[a-zA-Z0-9\.-]+(:[0-9]{1,5}){0,1})"
            )
        )
    ),
    re.compile(
        str(r"([h|H][e|E][r|R][o|O][k|K][u|U](.){1,64}[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})")
    ),
    re.compile(str(r"([0-9a-f]{32}-us[0-9]{1,2})")),
    re.compile(str(r"(key-[0-9a-zA-Z]{32})")),
    re.compile(str(r"(access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32})")),
    re.compile(str(r"(sk_live_[0-9a-z]{32})")),
    re.compile(str(r"(xox[p|b|o|a]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})")),
    re.compile(str(r"(sk_live_[0-9a-zA-Z]{24})")),
    re.compile(str(r"(rk_live_[0-9a-zA-Z]{24})")),
    re.compile(str(r"(sq0atp-[0-9A-Za-z\-_]{22})")),
    re.compile(str(r"(sq0csp-[0-9A-Za-z\-_]{43})")),
    re.compile(str(r"(SK[0-9a-fA-F]{32})")),
    re.compile(str(r"([t|T][w|W][i|I][t|T][t|T][e|E][r|R](.){1,64}[1-9][0-9]+-[0-9a-zA-Z]{40})")),
    re.compile(str(r"([t|T][w|W][i|I][t|T][t|T][e|E][r|R](.){1,64}['|\"][0-9a-zA-Z]{35,44}['|\"])")),
    re.compile(str(r"((A3T[A-Z0-9]|AKIA|ASIA|ACCA)[A-Z0-9]{16})")),
    re.compile(str(r"([-]{5}BEGIN\s((RSA|DSA|EC|PGP|OPENSSH)\s)?PRIVATE\s(KEY|KEY\sBLOCK)[-]{5})")),
    re.compile(str(r"(gh[pousr]_[A-Za-z0-9_]{36,255})")),
    re.compile(str(r"(github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})")),
]


class SecretProcessor:
    """
    Takes in a line of git secrets output and gets the file path, offending line number, secret, and secret type
    """

    def __init__(self, separator=DEFAULT_SEPARATOR, base_path=None):
        self.separator = separator
        self.split = None
        self._filename = None
        self._line_number = None
        self._secret = None
        self._secret_type = None
        self._base_path = base_path

    def process_response(self, line: str) -> bool:
        """
        Processes the secret line, finding the needed content and removing from the original list.
        """
        self.split = line.split(self.separator)
        if not self._process_filename():
            return False
        if not self._process_line_number():
            return False
        if not self._process_secret():
            return False
        self._process_secret_type()
        return True

    def _process_filename(self) -> bool:
        """
        Takes the secret split list, pulls the file path from the beginning, and checks if the file exists.
        If it does not, further portions of the split list are added (along with the separator used to split)
        If a file is found: the variable _filename is set and used contents in the split list are removed
        If a file is not found or the full split list (-2 items for the line_number or secret) is utilized: return False
        """
        filename = self.split[0]
        # We are limiting the range to len()-1 because there are two items reserved for the line_number and secret.
        # we only need len()-1 because range ends before the last value
        for split_num in range(1, len(self.split) - 1):
            if os.path.isfile(filename):
                self.filename = filename
                self.split = self.split[split_num:]
                return True
            filename = f"{filename}{self.separator}{self.split[split_num]}"
        return False

    def _process_line_number(self) -> bool:
        """
        Get the int line number number from the first item in the split list.
        If the item can be converted to an int, the line_number variable is set,
        If the first item in the list is not an int, causing a ValueError, return False
        """
        try:
            self.line_number = int(self.split[0])
            self.split = self.split[1:]
            return True
        except ValueError:
            return False

    def _process_secret_type(self) -> None:
        """
        Determines secret type based on _secret variable content.
        Sets _secret_type
        """
        stype = "other"
        if self.secret.startswith("-----"):
            stype = "ssh"
        elif "mongodb://" in self.secret:
            stype = "mongo"
        elif "mongodb+srv://" in self.secret:
            stype = "mongo"
        elif "postgres://" in self.secret:
            stype = "postgres"
        elif "hooks.slack.com" in self.secret:
            stype = "slack"
        elif ("http" in self.secret or "https" in self.secret) and ":6379" in self.secret:
            stype = "redis"
        elif "http" in self.secret or "https" in self.secret or "ftp" in self.secret or "ftps" in self.secret:
            stype = "urlauth"
        elif "AIza" in self.secret:
            stype = "google"
        else:
            for prefix in ("AKIA", "ASIA", "ACCA"):
                if prefix in self.secret:
                    stype = "aws"
        self.secret_type = stype

    def _extract_match(self, secret: str) -> str:
        """
        Cuts down the secret variable to the important piece necessary to identify the secret type
        If a match is found, return the matched portion
        If no match is found, return the full secret variable
        """
        # git-secrets returns the entire line that was matched. We only want to
        # return the specific match.
        for regex in REGEXES:
            match = regex.search(secret)
            if match:
                return match.group(0)
        return secret

    def _process_secret(self) -> bool:
        """
        Combine the remaining items of the split list, extract the important information, and set secret variable.
        If extract_match somehow returns None, return False.
        """
        secret = f"{self.separator}".join(self.split).strip()
        secret = self._extract_match(secret)
        if not secret:
            return False
        self.secret = secret
        return True

    @property
    def filename(self) -> str:
        return self._filename

    @filename.setter
    def filename(self, filename):
        if not self._filename:
            self._filename = filename

            # Remove the base path, if present
            if self._base_path and self._filename.startswith(self._base_path):
                self._filename = self._filename.replace(self._base_path, "", 1)

            # Remove the leading slash, if present
            if self._filename.startswith("/"):
                self._filename = self._filename[1:]
        else:
            raise ValueError(Template(DEFAULT_SETTER_ERROR_MESSAGE).substitute(property="filename"))

    @property
    def line_number(self) -> int:
        return self._line_number

    @line_number.setter
    def line_number(self, line_number):
        if not self._line_number:
            self._line_number = line_number
        else:
            raise ValueError(Template(DEFAULT_SETTER_ERROR_MESSAGE).substitute(property="line_number"))

    @property
    def secret(self) -> str:
        return self._secret

    @secret.setter
    def secret(self, secret):
        if not self._secret:
            self._secret = secret
        else:
            raise ValueError(Template(DEFAULT_SETTER_ERROR_MESSAGE).substitute(property="secret"))

    @property
    def secret_type(self) -> str:
        return self._secret_type

    @secret_type.setter
    def secret_type(self, secret_type):
        if not self._secret_type:
            self._secret_type = secret_type
        else:
            raise ValueError(Template(DEFAULT_SETTER_ERROR_MESSAGE).substitute(property="secret_type"))
