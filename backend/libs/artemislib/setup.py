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
        "aws-lambda-powertools~=3.2",
        "boto3~=1.34",
        "boto3-stubs[ec2,lambda,s3,secretsmanager,sqs]~=1.35",
        # pyjwt requires the cryptography library but it needs to be installed
        # separately because it contains platform-dependent pre-compiled code
        "pyjwt[crypto]~=2.8",
        "requests~=2.31",
    ],
    tests_require=["pytest~=8.2"],
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
