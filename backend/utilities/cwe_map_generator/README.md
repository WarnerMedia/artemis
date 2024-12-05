# CWE mapping generator

Generates a JSON file mapping of CWE IDs to names.

This is currently used by the gosec plugin.

The latest CWE database is downloaded from cwe.mitre.org. Since this database is not updated often, the mapping JSON file is intended to be updated manually when the gosec plugin is updated.

## Usage

```bash
python main.py > ../../engine/plugins/gosec/cwe.json
```
