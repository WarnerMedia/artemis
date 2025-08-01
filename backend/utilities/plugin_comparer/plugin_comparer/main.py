import argparse
import importlib.metadata
from getpass import getpass

from plugin_comparer.csv import write_file
from plugin_comparer.processor import process_scans
from plugin_comparer.scans import parse_scan_ids, retrieve_scans

__version__ = importlib.metadata.version("api_runner")


def main():
    parser = argparse.ArgumentParser(description=f"Artemis Plugin Comparison Tool {__version__}")

    parser.add_argument("--scans", required=True, type=str, help="CSV list of scan IDs to analyze")
    parser.add_argument("--outfile", required=True, type=str, help="Location to write results matrix")
    parser.add_argument("--api-url", required=True, type=str, help="Artemis API endpoint")

    args = parser.parse_args()
    apikey = getpass("API Key: ")

    scan_ids = parse_scan_ids(args.scans)
    scans = retrieve_scans(scan_ids, apikey, args.api_url)
    results = process_scans(scans)
    write_file(results, args.outfile)
