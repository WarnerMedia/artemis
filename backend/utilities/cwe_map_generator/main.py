"""
Generates a JSON mapping of CWE IDs to names.

The CWE database is published as an XML file within a zip archive.
This downloads the database and extracts the CWE info.
"""
# pyright: strict

import json
import logging
from pathlib import Path
import requests
from sys import stderr
import tempfile
import time
from typing import Any, IO
import xmltodict
import zipfile

LOG = logging.getLogger("cwe_map_generator")
logging.basicConfig(stream=stderr, level=logging.INFO)

CACHE_DIR = Path(".cache")
CWE_DB_URL = "https://cwe.mitre.org/data/xml/cwec_latest.xml.zip"

# Maps CWE ID to name.
CWEMapping = dict[int, str]


def fetch(src: str, dest: Path):
    """Download / update the database."""
    dest.parent.mkdir(mode=0o700, parents=True, exist_ok=True)

    headers: dict[str, str] = {}
    try:
        headers["If-Modified-Since"] = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime(dest.stat().st_mtime))
    except FileNotFoundError:
        pass

    LOG.info(f"Downloading {src} -> {dest}")

    with requests.get(src, headers=headers, stream=True) as req:
        if req.status_code == 304:
            LOG.info("Database up-to-date.")
            return
        req.raise_for_status()

        with tempfile.TemporaryDirectory() as tempdir:
            outfile = Path(tempdir) / "download.tmp"
            with outfile.open("wb") as f:
                for chunk in req.iter_content(chunk_size=64 * 1024):
                    f.write(chunk)
            outfile.rename(dest)


def generate(rin: IO[bytes]) -> CWEMapping:
    """
    Parse a CWE databsae XML file.
    Returns a mapping of CWE ID to name.
    Raises xmltodict.ParsingInterrupted if the XML file is not the
    expected format.
    """
    retv: CWEMapping = {}

    def elem(path: list[tuple[str, Any]], elem: dict[str, Any]) -> bool:
        root = path[0][0]
        if root != "Weakness_Catalog":
            return False

        name = path[-1][0]
        if name == "Weakness":
            retv[int(elem["@ID"])] = str(elem["@Name"])

        return True

    xmltodict.parse(rin, item_depth=3, item_callback=elem)
    return retv


def process(src: Path) -> CWEMapping:
    """Process an individual zip archive."""
    srczip = zipfile.ZipFile(src)

    for filename in srczip.namelist():
        # Ignore extraneous files such as readmes, etc.
        if not filename.endswith(".xml"):
            continue

        with srczip.open(filename, "r") as reader:
            LOG.info(f"Processing: {src}/{filename}")
            try:
                if mapping := generate(reader):
                    # We assume that only one of the XML files in the zip
                    # contains the CWE list, so now that we've found it,
                    # we can stop looking.
                    return mapping
            except xmltodict.ParsingInterrupted:
                # Not the XML file we're looking for.
                continue

    raise FileNotFoundError(f"No CWE XML file found in {srczip}")


def main():
    db_path = CACHE_DIR / "cwe.zip"
    fetch(CWE_DB_URL, db_path)
    print(json.dumps(process(db_path), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
