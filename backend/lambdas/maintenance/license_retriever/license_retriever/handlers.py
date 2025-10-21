import asyncio
import re
from typing import Tuple

import requests
from django.db.models import Q

from artemisdb.artemisdb.consts import ComponentType
from artemisdb.artemisdb.models import Component, License
from artemislib.logging import Logger
from license_retriever.retrievers.gem import retrieve_gem_licenses_batch
from license_retriever.retrievers.go import retrieve_go_licenses_batch
from license_retriever.retrievers.npm import retrieve_npm_licenses_batch
from license_retriever.retrievers.php import retrieve_php_licenses_batch
from license_retriever.retrievers.pypi import retrieve_pypi_licenses_batch, PYPI_LICENSE_MAP

LOG = Logger("license_retriever")

BATCH_RETRIEVERS = {
    ComponentType.NPM.value: retrieve_npm_licenses_batch,
    ComponentType.PYPI.value: retrieve_pypi_licenses_batch,
    ComponentType.GEM.value: retrieve_gem_licenses_batch,
    ComponentType.GO.value: retrieve_go_licenses_batch,
    ComponentType.PHP.value: retrieve_php_licenses_batch,
}


def handler(_event=None, _context=None):
    LOG.info("Retrieving missing license information")
    return asyncio.run(async_handler())


async def async_handler():
    spdx_licenses = None

    # Get all components that need license information - only supported types
    components = Component.objects.filter(
        Q(component_type__in=list(BATCH_RETRIEVERS.keys())) | Q(component_type__isnull=True), 
        licenses__isnull=True
    )

    if components.count() > 0:
        spdx_licenses = download_spdx_licenses()
        
        # Group components by type for batch processing
        components_by_type = {}
        unknown_components = []
        
        for component in components:
            if component.component_type is None:
                unknown_components.append(component)
            elif component.component_type in BATCH_RETRIEVERS:
                if component.component_type not in components_by_type:
                    components_by_type[component.component_type] = []
                components_by_type[component.component_type].append(component)
            else:
                LOG.warning("Component %s has unsupported type %s - skipping", component, component.component_type)
        
        # Process each component type as a batch
        for component_type, type_components in components_by_type.items():
            LOG.info("Processing %d %s packages in batch", len(type_components), component_type)
            await process_component_type_batch(component_type, type_components, spdx_licenses)
        
        # Process unknown components (try all retrievers)
        for component in unknown_components:
            await process_unknown_component(component, spdx_licenses)
    else:
        LOG.info("No components to process")

    # Report on unsupported types
    not_supported = (
        Component.objects.filter(licenses__isnull=True, component_type__isnull=False)
        .exclude(component_type__in=list(BATCH_RETRIEVERS.keys()))
        .count()
    )
    LOG.info("%s components with unsupported types are missing licenses", not_supported)


async def process_component_type_batch(component_type: str, components: list, spdx_licenses: dict):
    """Process all components of a given type using batch processing"""
    
    # Extract package info for batch processing
    packages = [(comp.name, comp.version) for comp in components]
    
    try:
        # Get the batch retriever function
        batch_retriever = BATCH_RETRIEVERS[component_type]
        
        # Process all packages of this type concurrently!
        LOG.info("Starting batch processing for %d %s packages", len(packages), component_type)
        all_licenses = await batch_retriever(packages, max_concurrent=10)
        
        # Map results back to components
        for component in components:
            package_key = f"{component.name}@{component.version}"
            licenses = all_licenses.get(package_key, [])
            
            LOG.info("Processing %s package %s with licenses: %s", component_type, component, licenses)
            await create_and_assign_licenses(component, licenses, spdx_licenses)
                
    except Exception as e:
        LOG.error("Error processing %s batch: %s", component_type, str(e))
        # No fallback - batch processing is required
        raise e


async def create_and_assign_licenses(component, licenses: list, spdx_licenses: dict):
    """Create license objects and assign them to a component"""
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
        component.licenses.set(license_objs)
    else:
        LOG.info("No licenses found for %s", component)


async def process_unknown_component(component, spdx_licenses: dict):
    """Process a component with unknown type by trying all batch retrievers"""
    LOG.info("Package type for %s is not known, attempting all batch retrievers", component)
    
    # Try each batch retriever type to identify the component
    for component_type in BATCH_RETRIEVERS:
        LOG.info("Trying %s batch retriever", component_type)
        try:
            single_batch_result = await BATCH_RETRIEVERS[component_type](
                [(component.name, component.version)], max_concurrent=1
            )
            package_key = f"{component.name}@{component.version}"
            licenses = single_batch_result.get(package_key, [])
            
            if licenses:
                # Got a match - record the component type and process licenses
                LOG.info("%s is identified as a %s package", component, component_type)
                component.component_type = component_type
                component.save()
                
                await create_and_assign_licenses(component, licenses, spdx_licenses)
                return
                
        except Exception as e:
            LOG.error("Error trying %s batch retriever for %s: %s", component_type, component, str(e))
    
    # Package type was not identified by any batch retriever
    LOG.info("Package type was not identified for %s", component)
    component.component_type = ComponentType.UNKNOWN.value
    component.save()


def license_lookup(license, spdx_licenses) -> Tuple[str | None, str | None]:
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
