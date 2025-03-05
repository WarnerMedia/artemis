"""
findsecbugs_java21 plugin
"""

from engine.plugins.lib import utils
from engine.plugins.lib.findsecbugs_common.main_util import main_util

log = utils.setup_logging("findsecbugs_java_21")


def main():
    log.info("Starting FindSecBugs for Java 21")
    print(main_util())


if __name__ == "__main__":
    main()
