from typing import Tuple

from metadata.util import is_name_in_patterns, load_schemes

schemes = load_schemes()


def get_all_metadata(app_metadata_settings, service, repo, working_dir) -> Tuple[dict, dict]:
    """Get the metadata for all supported schemes

    returns (metadata, timestamps)
    """
    result = {}
    timestamps = {}
    for scheme in schemes:
        if scheme in app_metadata_settings:
            metadata = app_metadata_settings[scheme]
            if is_name_in_patterns(repo, metadata["include"]) and not is_name_in_patterns(repo, metadata["exclude"]):
                result[scheme], timestamps[scheme] = schemes[scheme](service, repo, working_dir)
    return result, timestamps
