import uuid

from django.db import transaction
from django.db.models import Q, QuerySet

from artemisdb.artemisdb.models import Plugin, Scan, Vulnerability
from artemislib.logging import Logger
from processor.sbom import get_component
from utils.plugin import Result

LOG = Logger(__name__)

# Advisories starting with these prefixes should have them stripped off
ADVISORY_ID_PREFIX_STRIP_LIST = [
    "https://github.com/advisories/",
    "https://cve.mitre.org/cgi-bin/cvename.cgi?name=",
    "https://nvd.nist.gov/vuln/detail/",
]

# Only care about advisories meeting these formats
ADVISORY_ID_PREFIX_LIST = [
    "CVE",
    "GHSA",
    "https://sca.analysiscenter.veracode.com/vulnerability-database/vulnerabilities/",
    "https://avd.aquasec.com/",
    "https://snyk.io/vuln/",
    "https://security.snyk.io/vuln/",
    "https://www.npmjs.com/advisories/",
    "https://bugzilla.redhat.com/show_bug.cgi?id=",
    "https://nodesecurity.io/advisories/",
    "https://security-tracker.debian.org/tracker/",
    "https://hackerone.com/reports/",
    "NSWG",
] + ADVISORY_ID_PREFIX_STRIP_LIST


def process_vulns(result: Result, scan: Scan, plugin_name: str) -> None:
    """
    Process all of the vulns in the plugin results into the vulnerability inventory.
    """
    plugin = Plugin.objects.get(name=plugin_name)
    for v in result.details:
        advisory_ids = _filter_advisory_ids(v.get("inventory", {}).get("advisory_ids", [v["id"]]))

        # Build a Q filter for any of the advisory IDs
        adv_ids_filter = None
        for adv_id in advisory_ids:
            if adv_ids_filter is None:
                adv_ids_filter = Q(advisory_ids__contains=adv_id)
            else:
                adv_ids_filter |= Q(advisory_ids__contains=adv_id)

        vulns = Vulnerability.objects.filter(adv_ids_filter).order_by("added")

        created = False
        if vulns.count() == 0:
            LOG.debug("Creating vuln for %s", advisory_ids)
            # No vulns reference any of the advisory IDs so create a new one
            vuln = Vulnerability.objects.create(
                vuln_id=uuid.uuid4(),
                description=v["description"].strip(),
                remediation=v["remediation"].strip(),
                severity=v["severity"],
                advisory_ids=advisory_ids,
            )
            created = True
        elif vulns.count() > 1:
            LOG.debug("Merging vulns %s", vulns)
            # More than one vuln reference the advisory IDs so merge them into a single vuln
            vuln = _merge_vulns(vulns)
        else:
            # Only one vuln references any of the advisory IDs so use it
            vuln = vulns.first()
            LOG.debug("Found existing vuln %s", vuln.vuln_id)

        # Update plugin mapping for this vuln, if needed
        if not vuln.plugins.filter(pk=plugin.pk).exists():
            vuln.plugins.add(plugin)

        # Update component mapping for this vuln, if needed
        if "component" in v.get("inventory", {}):
            component = get_component(v["inventory"]["component"]["name"], v["inventory"]["component"]["version"], scan)
            if not vuln.components.filter(pk=component.pk).exists():
                vuln.components.add(component)

        if created:
            LOG.debug("Added %s to vuln inventory (%s)", v["id"], vuln.vuln_id)
        else:
            modified = False

            # Add any advisory IDs that are not present
            for adv_id in advisory_ids:
                if adv_id not in vuln.advisory_ids:
                    vuln.advisory_ids.append(adv_id)
                    modified = True

            # Use the longer description on the assumption that longer is going to be better.
            # Don't update the description if it has been customized.
            if len(vuln.description) < len(v["description"].strip()) and not vuln.description_customized:
                vuln.description = v["description"].strip()
                modified = True

            # Use the longer remediation on the assumption that longer is going to be better.
            # Don't update the remediation if it has been customized.
            if len(vuln.remediation) < len(v["remediation"].strip()) and not vuln.remediation_customized:
                vuln.remediation = v["remediation"].strip()
                modified = True

            # Store the most severe of the severities if they are different
            if vuln.severity != v["severity"]:
                most_severe = Vulnerability.most_severe(vuln.severity, v["severity"])
                if vuln.severity != most_severe:
                    vuln.severity = most_severe
                    modified = True

            if modified:
                LOG.debug("Updated %s in vuln inventory (%s)", v["id"], vuln.vuln_id)
                vuln.save()

        if "inventory" in v:
            # Delete the inventory part of the plugin result because we don't need to store it in the DB
            del v["inventory"]


def _merge_vulns(vulns: QuerySet) -> Vulnerability:
    """
    Merge the vulns matching the provided QuerySet into a single vuln, deleting the others.
    """
    vuln = None
    with transaction.atomic():
        for v in vulns:
            if vuln is None:
                vuln = v
            else:
                # Use the longer description on the assumption that longer is going to be better.
                # Don't update the description if it has been customized.
                if len(vuln.description) < len(v.description) and not vuln.description_customized:
                    vuln.description = v.description

                # Use the longer remediation on the assumption that longer is going to be better.
                # Don't update the remediation if it has been customized.
                if len(vuln.remediation) < len(v.remediation) and not vuln.remediation_customized:
                    vuln.remediation = v.remediation

                # Store the most severe of the severities if they are different
                if vuln.severity != v.severity:
                    vuln.severity = Vulnerability.most_severe(vuln.severity, v.severity)

                # Make sure the surviving vuln has all of the plugins mapped
                for plugin in v.plugins.all():
                    if not vuln.plugins.filter(pk=plugin.pk).exists():
                        vuln.plugins.add(plugin)

                # Make sure the surviving vuln has all of the components mapped
                for component in v.components.all():
                    if not vuln.components.filter(pk=component.pk).exists():
                        vuln.components.add(component)

                # Make sure all the advisory IDs are included
                for adv_id in v.advisory_ids:
                    if adv_id not in vuln.advisory_ids:
                        vuln.advisory_ids.append(adv_id)

                # Save the surving vuln, delete the other one
                vuln.save()
                v.delete()

    return vuln


def _filter_advisory_ids(full_advisory_ids: list) -> list[str]:
    """
    Filter a list of advisory IDs to just include those that match the defined prefixes.
    """
    advisory_ids = set()
    for adv_id in full_advisory_ids:
        for prefix in ADVISORY_ID_PREFIX_LIST:
            if adv_id.startswith(prefix):
                for strip_prefix in ADVISORY_ID_PREFIX_STRIP_LIST:
                    if adv_id.startswith(strip_prefix):
                        adv_id = adv_id.replace(strip_prefix, "")
                advisory_ids.add(adv_id)
                break
        else:
            LOG.debug("Ignoring advisory ID: %s", adv_id)
    if not advisory_ids:
        LOG.info("No unfiltered advisory IDs in %s", full_advisory_ids)
        advisory_ids = full_advisory_ids
    return list(advisory_ids)
