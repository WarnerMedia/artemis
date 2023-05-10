from setuptools import find_packages, setup

# Get the version from the package. This allows the version to be
# available inside the package for use at runtime.
__version__ = None  # Will get set in next line
# pylint: disable=exec-used
exec(open("artemislib/__version__.py").read())

with open("README.md", "r") as fh:
    long_description = fh.read()


setup(
    name="artemislib",
    version=__version__,
    author="WMCSO AppSec",
    author_email="cso_appsec@warnermedia.com",
    description="Shared library for Artemis",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url=("https://github.com/warnermedia/artemis/backend/libs/artemislib"),
    packages=find_packages(),
    setup_requires=["pytest-runner"],
    install_requires=[
        "boto3",
        # pyjwt requires the cryptography library but it needs to be installed
        # separately because it contains platform-dependent pre-compiled code
        "pyjwt",
        "requests",
        "urllib3<2",  # https://github.com/boto/botocore/issues/2926
    ],
    tests_require=["pytest"],
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
