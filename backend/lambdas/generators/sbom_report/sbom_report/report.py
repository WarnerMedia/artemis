from artemisdb.artemisdb.models import Dependency, Scan


def get_report(scan_id):
    scan = Scan.objects.filter(scan_id=scan_id).first()
    if not scan:
        return None

    report = scan.to_dict()
    report["sbom"] = []

    for dep in scan.dependency_set.filter(parent__isnull=True):
        report["sbom"].append(process_dep(dep))

    return report


def process_dep(dep):
    c = dep.component.to_dict()
    c.update({"source": dep.source, "deps": get_deps(dep)})
    return c


def get_deps(parent) -> list:
    ret = []
    for dep in Dependency.objects.filter(parent=parent):
        ret.append(process_dep(dep))
    return ret
