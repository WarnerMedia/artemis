import re
from typing import Tuple

import requests
from django.db.models import Q

from artemisdb.artemisdb.consts import ComponentType
from artemisdb.artemisdb.models import Component, License
from artemislib.logging import Logger
from license_retriever.retrievers.gem import retrieve_gem_licenses
from license_retriever.retrievers.go import retrieve_go_licenses
from license_retriever.retrievers.npm import retrieve_npm_licenses
from license_retriever.retrievers.php import retrieve_php_licenses
from license_retriever.retrievers.pypi import retrieve_pypi_licenses, PYPI_LICENSE_MAP

LOG = Logger("license_retriever")

RETRIEVERS = {
    ComponentType.NPM.value: retrieve_npm_licenses,
    ComponentType.PYPI.value: retrieve_pypi_licenses,
    ComponentType.GEM.value: retrieve_gem_licenses,
    ComponentType.GO.value: retrieve_go_licenses,
    ComponentType.PHP.value: retrieve_php_licenses,
    # Maven not supported yet
}


def handler(_event=None, _context=None):
    LOG.info("Retrieving missing license information")

    spdx_licenses = None

    components = Component.objects.filter(
        Q(component_type__in=RETRIEVERS.keys()) | Q(component_type__isnull=True), licenses__isnull=True
    )

    if components.count() > 0:
        spdx_licenses = download_spdx_licenses()  # Only download the license information if it will be needed
        for component in Component.objects.filter(
            Q(component_type__in=RETRIEVERS.keys()) | Q(component_type__isnull=True), licenses__isnull=True
        ):
            LOG.info("Retrieving licenses for %s package %s", component.component_type or "<None>", component)

            licenses = []
            if component.component_type is not None:
                # The component type is known so use the specific retriever for that type
                licenses = RETRIEVERS[component.component_type](component.name, component.version)
            else:
                # The component type is not known so try all the retrievers and see if we get a match
                LOG.info("Package type for %s is not known, attempting all retrievers", component)
                for component_type in RETRIEVERS:
                    LOG.info("Trying %s retriever", component_type)
                    licenses = RETRIEVERS[component_type](component.name, component.version)
                    if licenses:
                        # Got a match to record the component type
                        LOG.info("%s is identified as a %s package", component, component_type)
                        component.component_type = component_type
                        component.save()
                        break
                else:
                    # Package type was not identified. Set it to "unknown" so that we don't keep trying.
                    LOG.info("Package type was not identified for %s", component)
                    component.component_type = ComponentType.UNKNOWN.value
                    component.save()

            license_objs = []
            for license in licenses:
                license_id, license_name = license_lookup(license, spdx_licenses)
                if license_id is not None:
                    LOG.info("Found license: %s", license_id)
                    license_obj, _ = License.objects.get_or_create(
                        license_id=license_id, defaults={"name": license_name}
                    )
                    license_objs.append(license_obj)

            if license_objs:
                component.licenses.set([license_obj])
            else:
                LOG.info("No licenses found")
    else:
        LOG.info("No components to process")

    not_supported = (
        Component.objects.filter(licenses__isnull=True, component_type__isnull=False)
        .exclude(component_type__in=RETRIEVERS.keys())
        .count()
    )
    LOG.info("%s components with unsupported types are missing licenses", not_supported)


def license_lookup(license, spdx_licenses) -> Tuple[str, str]:
    if license in spdx_licenses:
        return license, spdx_licenses[license]
    elif license in PYPI_LICENSE_MAP:
        return license, PYPI_LICENSE_MAP[license]
    if re.match("^[a-zA-Z0-9(): _.+-]+$", license):
        # License contains all valid characters
        return license, license
    LOG.info("Unexpected license ID: %s", license)
    # Prevent the storing of bad data
    return None, None


def download_spdx_licenses() -> dict:
    # The Software Package Data Exchange (SPDX) standard is an open standard hosted by the Linux Foundation.
    # The SPDX Licenses List is part of the standard and is a list of common licenses for the purpose of
    # reliable identification of licenses in software projects. The machine-readable versions of the
    # license list is stored in GitHub. https://spdx.org/licenses/
    LOG.info("Downloading latest SPDX license data")
    r = requests.get("https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json")
    if r.status_code == 200:
        licenses = {}
        # Convert the licenses list into a dict for easier usage
        for license in r.json()["licenses"]:
            licenses[license["licenseId"].lower()] = license["name"]
        return licenses

    LOG.error("Unable to retrieve SPDX license data: [HTTP %s] %s", r.status_code, r.text)
    return {}
