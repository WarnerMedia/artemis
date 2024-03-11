import importlib
from fnmatch import fnmatch

from artemislib.logging import Logger
from env import METADATA_SCHEME_MODULES

LOG = Logger(__name__)


def is_name_in_patterns(name, patterns: list) -> bool:
    for pattern in patterns:
        if fnmatch(name, pattern):
            return True
    return False


def load_schemes() -> dict:
    """
    Load the metadata processing plugin modules and populate the schemes dictionary
    """
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
    #
    # It is required that each module has a SCHEME_NAME string and a method called get_metadata to
    # facilitate building of the schemes mapping dictionary.
    schemes = {}
    for module in METADATA_SCHEME_MODULES:
        try:
            m = importlib.import_module(module)
            schemes[m.SCHEME_NAME] = m.get_metadata
        except (ModuleNotFoundError, AttributeError) as e:
            LOG.error("Unable to load metadata processing module %s, Error: %s", module, e)
    return schemes
