from typing import Tuple

from metadata.util import is_name_in_patterns, load_schemes

default_schemes = load_schemes()


def get_all_metadata(app_metadata_settings, service, repo, working_dir, schemes: dict = None) -> Tuple[dict, dict]:
    """Get the metadata for all supported schemes

    The available schemes are expected to have been loaded via load_schemes().
    If omitted, then the default schemes loaded from the system configuration will be used.

    returns (metadata, timestamps)
    """
    result = {}
    timestamps = {}
    for scheme in schemes if schemes != None else default_schemes:
        if scheme in app_metadata_settings:
            metadata = app_metadata_settings[scheme]
            if is_name_in_patterns(repo, metadata["include"]) and not is_name_in_patterns(repo, metadata["exclude"]):
                result[scheme], timestamps[scheme] = schemes[scheme](service, repo, working_dir)
    return result, timestamps
