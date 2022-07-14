import csv


def write_file(results: dict, outfile: str) -> None:
    plugins = set()
    for vuln_id in results:
        plugins.update(results[vuln_id]["plugins"].keys())
    plugins = sorted(list(plugins))

    rows = [["ID", "Severity"] + plugins]  # Header row
    for vuln_id in sorted(results.keys()):
        row = [vuln_id, results[vuln_id]["severity"]]
        for plugin in plugins:
            row.append(results[vuln_id]["plugins"].get(plugin, False))
        rows.append(row)

    with open(outfile, "w") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(rows)
