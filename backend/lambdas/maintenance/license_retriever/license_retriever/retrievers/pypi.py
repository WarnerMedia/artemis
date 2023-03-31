import requests

from artemislib.logging import Logger
from license_retriever.util.github import get_license

LOG = Logger(__name__)


def retrieve_pypi_licenses(name: str, version: str) -> list:
    package_info = get_package_info(name, version)
    if not package_info:
        return []

    if package_info.get("info", {}).get("license"):
        return [package_info["info"]["license"].lower()]

    # Getting accurate license information out of the classifiers is messy
    # https://github.com/pypa/trove-classifiers/issues/17
    #
    # Try our best here so that we can report *something*
    licenses = []
    for classifier in package_info.get("info", {}).get("classifiers", []):
        if classifier in CLASSIFIER_MAP:
            licenses.append(CLASSIFIER_MAP[classifier])

    if not licenses and package_info.get("info", {}).get("home_page", "").startswith("https://github.com"):
        repo_license = get_license(package_info["info"]["home_page"])
        if repo_license:
            licenses.append(repo_license)
    return licenses


def get_package_info(name: str, version: str) -> dict:
    url = f"https://pypi.org/pypi/{name}/{version}/json"

    r = requests.get(url)
    if r.status_code == 200:
        return r.json()
    else:
        LOG.error("Unable to find package info for %s %s: HTTP %s", name, version, r.status_code)
        return {}


# Mapping of classifiers to identifiers. Uses the SPDX identifier when possible.
CLASSIFIER_MAP = {
    "License :: Aladdin Free Public License (AFPL)": "aladdin",
    "License :: CC0 1.0 Universal (CC0 1.0) Public Domain Dedication": "cc0-1.0",
    "License :: CeCILL-B Free Software License Agreement (CECILL-B)": "cecill-b",
    "License :: CeCILL-C Free Software License Agreement (CECILL-C)": "cecill-c",
    "License :: DFSG approved": "dfsg",
    "License :: Eiffel Forum License (EFL)": "efl",
    "License :: Free For Educational Use": "edu",
    "License :: Free For Home Use": "home",
    "License :: Free To Use But Restricted": "restricted",
    "License :: Free for non-commercial use": "noncommerical",
    "License :: Freely Distributable": "free-distro",
    "License :: Freeware": "freeware",
    "License :: GUST Font License 1.0": "gust-1.0",
    "License :: GUST Font License 2006-09-30": "gust-2006-09-30",
    "License :: Netscape Public License (NPL)": "npl",
    "License :: Nokia Open Source License (NOKOS)": "nokia",
    "License :: OSI Approved": "osi",
    "License :: OSI Approved :: Academic Free License (AFL)": "afl",
    "License :: OSI Approved :: Apache Software License": "apache",
    "License :: OSI Approved :: Apple Public Source License": "apsl",
    "License :: OSI Approved :: Artistic License": "artistic",
    "License :: OSI Approved :: Attribution Assurance License": "aal",
    "License :: OSI Approved :: BSD License": "bsd",
    "License :: OSI Approved :: Boost Software License 1.0 (BSL-1.0)": "bsl-1.0",
    "License :: OSI Approved :: CEA CNRS Inria Logiciel Libre License, version 2.1 (CeCILL-2.1)": "cecill-2.1",
    "License :: OSI Approved :: Common Development and Distribution License 1.0 (CDDL-1.0)": "cddl-1.0",
    "License :: OSI Approved :: Common Public License": "common",
    "License :: OSI Approved :: Eclipse Public License 1.0 (EPL-1.0)": "epl-1.0",
    "License :: OSI Approved :: Eclipse Public License 2.0 (EPL-2.0)": "epl-2.0",
    "License :: OSI Approved :: Eiffel Forum License": "efl",
    "License :: OSI Approved :: European Union Public Licence 1.0 (EUPL 1.0)": "eupl-1.0",
    "License :: OSI Approved :: European Union Public Licence 1.1 (EUPL 1.1)": "eupl-1.1",
    "License :: OSI Approved :: European Union Public Licence 1.2 (EUPL 1.2)": "eupl-1.2",
    "License :: OSI Approved :: GNU Affero General Public License v3": "agpl-3.0-only",
    "License :: OSI Approved :: GNU Affero General Public License v3 or later (AGPLv3+)": "agpl-3.0-or-later",
    "License :: OSI Approved :: GNU Free Documentation License (FDL)": "gfdl",
    "License :: OSI Approved :: GNU General Public License (GPL)": "gpl",
    "License :: OSI Approved :: GNU General Public License v2 (GPLv2)": "gpl-2.0-only",
    "License :: OSI Approved :: GNU General Public License v2 or later (GPLv2+)": "gpl-2.0-or-later",
    "License :: OSI Approved :: GNU General Public License v3 (GPLv3)": "gpl-3.0-only",
    "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)": "gpl-3.0-or-later",
    "License :: OSI Approved :: GNU Lesser General Public License v2 (LGPLv2)": "lgpl-2.0-only",
    "License :: OSI Approved :: GNU Lesser General Public License v2 or later (LGPLv2+)": "lgpl-2.0-or-later",
    "License :: OSI Approved :: GNU Lesser General Public License v3 (LGPLv3)": "lgpl-3.0-only",
    "License :: OSI Approved :: GNU Lesser General Public License v3 or later (LGPLv3+)": "lgpl-3.0-or-later",
    "License :: OSI Approved :: GNU Library or Lesser General Public License (LGPL)": "lgpl",
    "License :: OSI Approved :: Historical Permission Notice and Disclaimer (HPND)": "hpnd",
    "License :: OSI Approved :: IBM Public License": "ibm",
    "License :: OSI Approved :: ISC License (ISCL)": "isc",
    "License :: OSI Approved :: Intel Open Source License": "intel",
    "License :: OSI Approved :: Jabber Open Source License": "jabber",
    "License :: OSI Approved :: MIT License": "mit",
    "License :: OSI Approved :: MIT No Attribution License (MIT-0)": "mit-0",
    "License :: OSI Approved :: MITRE Collaborative Virtual Workspace License (CVW)": "cvw",
    "License :: OSI Approved :: MirOS License (MirOS)": "miros",
    "License :: OSI Approved :: Motosoto License": "motosoto",
    "License :: OSI Approved :: Mozilla Public License 1.0 (MPL)": "mpl-1.0",
    "License :: OSI Approved :: Mozilla Public License 1.1 (MPL 1.1)": "mpl-1.1",
    "License :: OSI Approved :: Mozilla Public License 2.0 (MPL 2.0)": "mpl-2.0",
    "License :: OSI Approved :: Mulan Permissive Software License v2 (MulanPSL-2.0)": "mulanpsl-2.0",
    "License :: OSI Approved :: Nethack General Public License": "ngpl",
    "License :: OSI Approved :: Nokia Open Source License": "nokia",
    "License :: OSI Approved :: Open Group Test Suite License": "ogtsl",
    "License :: OSI Approved :: Open Software License 3.0 (OSL-3.0)": "osl-3.0",
    "License :: OSI Approved :: PostgreSQL License": "postgresql",
    "License :: OSI Approved :: Python License (CNRI Python License)": "python",
    "License :: OSI Approved :: Python Software Foundation License": "psf-2.0",
    "License :: OSI Approved :: Qt Public License (QPL)": "qpl-1.0",
    "License :: OSI Approved :: Ricoh Source Code Public License": "rscpl",
    "License :: OSI Approved :: SIL Open Font License 1.1 (OFL-1.1)": "ofl-1.1",
    "License :: OSI Approved :: Sleepycat License": "sleepycat",
    "License :: OSI Approved :: Sun Industry Standards Source License (SISSL)": "sissl",
    "License :: OSI Approved :: Sun Public License": "spl-1.0",
    "License :: OSI Approved :: The Unlicense (Unlicense)": "unlicense",
    "License :: OSI Approved :: Universal Permissive License (UPL)": "upl-1.0",
    "License :: OSI Approved :: University of Illinois/NCSA Open Source License": "ncsa",
    "License :: OSI Approved :: Vovida Software License 1.0": "vsl-1.0",
    "License :: OSI Approved :: W3C License": "w3c",
    "License :: OSI Approved :: X.Net License": "xnet",
    "License :: OSI Approved :: Zope Public License": "zpl",
    "License :: OSI Approved :: zlib/libpng License": "zlib",
    "License :: Other/Proprietary License": "other",
    "License :: Public Domain": "pd",
    "License :: Repoze Public License": "repoze",
}

# Map of identifiers to license names. Only includes licenses that are not in the SPDX list.
# Some of these are less-specific versions of what is in the SPDX list where it cannot be
# determined which version actually applies.
PYPI_LICENSE_MAP = {
    "dfsg": "DFSG approved",
    "efl": "Eiffel Forum License",
    "edu": "Free For Educational Use",
    "home": "Free For Home Use",
    "restricted": "Free To Use But Restricted",
    "noncommercial": "Free for non-commercial use",
    "free-distro": "Freely Distributable",
    "freeware": "Freeware",
    "gust-1.0": "GUST Font License 1.0",
    "gust-2006-09-30": "GUST Font License 2006-09-30",
    "npl": "Netscape Public License",
    "osi": "Unspecified OSI Approved License",
    "afl": "Academic Free License",
    "apache": "Apache Software License",
    "apsl": "Apple Public Source License",
    "artistic": "Artistic License",
    "aal": "Attribution Assurance License",
    "bsd": "BSD License",
    "common": "Common Public License",
    "efl": "Eiffel Forum License",
    "gfdl": "GNU Free Documentation License",
    "gpl": "GNU General Public License",
    "lgpl": "GNU Library or Lesser General Public License",
    "ibm": "IBM Public License",
    "jabber": "Jabber Open Source License",
    "cvw": "MITRE Collaborative Virtual Workspace License",
    "python": "Python License (CNRI Python License)",
    "zpl": "Zope Public License",
    "other": "Other/Proprietary License",
    "pd": "Public Domain",
    "repoze": "Repoze Public License",
}
