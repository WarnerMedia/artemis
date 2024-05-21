"""
findsecbugs_java13 plugin
"""

from engine.plugins.lib import utils
from engine.plugins.lib.findsecbugs_common.main_util import main_util

log = utils.setup_logging("findsecbugs_java_13")


def main():
    log.info("Starting FindSecBugs for Java 13")
    print(main_util())


if __name__ == "__main__":
    main()
