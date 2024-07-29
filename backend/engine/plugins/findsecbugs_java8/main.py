"""
findsecbugs_java8 plugin
"""

from engine.plugins.lib import utils
from engine.plugins.lib.findsecbugs_common.main_util import main_util

log = utils.setup_logging("findsecbugs_java_8")


def main():
    log.info("Starting FindSecBugs for Java 8")
    print(main_util())


if __name__ == "__main__":
    main()
