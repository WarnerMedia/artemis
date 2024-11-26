# Checkov plugin

## Custom configuration

The Checkov plugin supports custom configurations. The format for a configurations is as follows. All configuration items are optional.

```json
{
  "s3_config_path": "mybucket/foo/bar/configdir",
  "severities_file": "severities.json",
  "external_checks_dir": "checks",
}
```

- `s3_config_path` - the S3 bucket + directory which contains Checkov configuration files

If `s3_config_path` is specified:

- `severities_file` - path to file within the S3 directory containing Checkov severities map.
- `external_checks_dir` - path to directory within the S3 directory containing custom Checkov checks
