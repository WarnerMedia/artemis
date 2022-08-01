from setuptools import find_packages, setup

# Get the version from the package. This allows the version to be
# available inside the package for use at runtime.
__version__ = None  # Will get set in next line
# pylint: disable=exec-used
exec(open("api_runner/__version__.py").read())

with open("README.md", "r") as fh:
    long_description = fh.read()


setup(
    name="api_runner",
    version=__version__,
    author="WMCSO AppSec",
    author_email="cso_appsec@warnermedia.com",
    description="API Runner Utility",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url=("https://github.com/warnermedia/artemis/backend/utilities/api_runner"),
    packages=find_packages(),
    setup_requires=["pytest-runner"],
    install_requires=[],
    tests_require=["pytest"],
    entry_points={"console_scripts": ["api_runner=api_runner.main:main"]},
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
