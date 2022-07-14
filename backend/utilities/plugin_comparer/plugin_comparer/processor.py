def process_scans(scans: list) -> dict:
    ret = {}
    for scan in scans:
        vulns = scan["results"].get("vulnerabilities", {})
        for component in vulns:
            for vuln_id in vulns[component]:
                if vuln_id not in ret:
                    ret[vuln_id] = {"severity": vulns[component][vuln_id]["severity"], "plugins": {}}
                for plugin in vulns[component][vuln_id]["source_plugins"]:
                    ret[vuln_id]["plugins"][plugin] = True
    return ret
