from typing import Tuple

from metadata.util import is_name_in_patterns

# The schemes dictionary takes the following format:
#
# {
#   "scheme_name": callable
# }
#
# The callable is a method the retrieves the application metadata for this repository. This
# could be accomplished by reading a file on disk, calling out to an external inventory
# system, parsing a repository naming scheme, or something else. The callable returns a
# dictionary containing the metadata. The format of the dictionary is dependent on the
# implementation of the metadata scheme. More than one scheme may be supported at a time.
#
# Whether a particular scheme applies to a repository is defined by the "application_metadata"
# field in the services.json service definitions:
#
#  [...]
#  "application_metadata": {
#    "scheme_one": {
#      "include": [
#        "org1/*"
#      ],
#      "exclude": []
#    },
#    "scheme_two": {
#      "include": [
#        "*"
#      ],
#      "exclude": [
#        "org1/*"
#      ]
#    }
#  }
#  [...]
#
# In the above example snippet from services.json scheme_one would apply to all repos within
# the "org1" org and scheme_two would apply to all others within this service. To match this
# the schemes dictionary would need to have two schemes mapped with callable methods to
# processes them appropriately:
#
# schemes = {
#   "scheme_one": get_scheme_one_metadata,
#   "scheme_two": get_scheme_two_metadata
# }
#
# Where get_scheme_one_metadata and get_scheme_two_metadata are appropriately implemented and
# imported here.
#
# IMPORTANT: The callable that retrieves the application metadata should account for sanitation
# of the retrieved metadata, if it comes from a user-controlled (and therefore untrusted) source
schemes = {}


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
