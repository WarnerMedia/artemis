from setuptools import find_packages, setup

# Get the version from the package. This allows the version to be
# available inside the package for use at runtime.
__version__ = None  # Will get set in next line
# pylint: disable=exec-used,consider-using-with
exec(open("heimdall_repos/__version__.py").read())

with open("README.md", "r") as fh:
    long_description = fh.read()


setup(
    name="heimdall_repos",
    version=__version__,
    author="WMCSO AppSec",
    author_email="cso_appsec@warnermedia.com",
    description="Heimdall Repos Library",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url=("https://github.com/warnermedia/artemis/orchestrator/lambdas/layers/heimdall_repos"),
    packages=find_packages(),
    setup_requires=[],
    install_requires=[
        "requests~=2.31",
    ],
    tests_require=[],
    classifiers=[
        "Programming Language :: Python :: 3.9",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Environment :: Console",
        "Topic :: Security",
    ],
)
