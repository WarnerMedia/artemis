# Artemis Plugin Comparison Tool

This is a utility that takes one or more scans and evaluates their results, producing a spreadsheet
identifying which findings were identified by which plugins. The intention is to be able to compare
plugins against each other and see where there is overlap or differences in capabilities.

```bash
$ artemis_plugin_comparer --help
usage: artemis_plugin_comparer [-h] --scans SCANS [--outfile OUTFILE]

Artemis Plugin Comparison Tool 2022.4

optional arguments:
  -h, --help         show this help message and exit
  --scans SCANS      CSV list of scan IDs to analyze
  --outfile OUTFILE  Location to write results matrix
```
