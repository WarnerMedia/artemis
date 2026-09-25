import itertools
import json
import json_stream
import traceback
import yaml

from pathlib import Path
from typing import Any, Iterable, Iterator, NamedTuple, Optional, TypedDict
from yaml import YAMLError

from engine.plugins.lib import utils


log = utils.setup_logging("api_specs")

json_extensions = {"json"}
yaml_extensions = {"yaml", "yml"}

version_fields = {
    "asyncapi",  # AsyncAPI
    "openapi",  # OpenAPI 3.x
    "swagger",  # Swagger 2.x
    "swaggerVersion",  # Swagger 1.x
}


class SpecMetadata(TypedDict):
    path: str
    field: str
    version: str


class IgnoreUnknownTagsLoader(yaml.SafeLoader):
    # PyYAML will throw an exception if it sees a tag (ex: !Ref) that does not have a corresponding
    # constructor. So, we create a custom SafeLoader and add a constructor that just returns None to
    # ignore them
    pass


IgnoreUnknownTagsLoader.add_multi_constructor("!", lambda *_args, **_kwargs: None)


class Status(NamedTuple):
    success: bool
    debug: list[str]
    alerts: list[str]
    errors: list[str]


def main(in_args=None):
    status = Status(True, [], [], [])
    args = utils.parse_args(in_args)

    specs = list(search(args.path, status))

    event_info = [spec["path"] for spec in specs]
    details = {
        "api_specs": {
            spec["path"]: {
                "field": spec["field"],
                "version": spec["version"],
            }
            for spec in specs
        },
    }

    print(
        json.dumps(
            {
                "success": status.success,
                "details": details,
                "truncated": False,
                "debug": status.debug,
                "alerts": status.alerts,
                "errors": status.errors,
                "event_info": event_info,
            }
        )
    )


def search(path: str, status: Status) -> Iterator[SpecMetadata]:
    return itertools.chain(
        search_for_json(path, status),
        search_for_yaml(path, status),
    )


def search_for_json(path: str, status: Status) -> Iterator[SpecMetadata]:
    json_paths = get_paths_with_extensions(path, json_extensions)

    for json_path in json_paths:
        relative_path = str(json_path.relative_to(path))

        if not json_path.is_symlink():
            spec = get_json_spec(json_path, status, relative_path)

            if spec:
                yield spec
        else:
            # Ignore symlinks, since they are either to another file in the repository or are
            # outside the repository and irrelevant
            message = f'Found symlink, "{relative_path}". Skipping...'

            status.alerts.append(message)
            log.warning(message)


def search_for_yaml(path: str, status: Status) -> Iterator[SpecMetadata]:
    yaml_paths = get_paths_with_extensions(path, yaml_extensions)

    for yaml_path in yaml_paths:
        relative_path = str(yaml_path.relative_to(path))

        if not yaml_path.is_symlink():
            specs = get_yaml_specs(yaml_path, status, relative_path)

            for spec in specs:
                yield spec
        else:
            # Ignore symlinks, since they are either to another file in the repository or are
            # outside the repository and irrelevant
            message = f'Found symlink, "{relative_path}". Skipping...'

            status.alerts.append(message)
            log.warning(message)


def get_json_spec(path: Path, status: Status, print_path: str) -> Optional[SpecMetadata]:
    log.debug(f"Checking if {print_path} is a spec...")

    file_results: list[SpecMetadata] = []

    def visitor(version, field_tuple):
        (field, *_) = field_tuple

        if field in version_fields:
            log.info(f'Found spec, "{print_path}". It has field, "{field}", with value "{version}".')

            file_results.append(
                {
                    "path": print_path,
                    "field": field,
                    "version": sanitize_version(version),
                }
            )

    with open(path, "r") as file:
        try:
            json_stream.visit(file, visitor)
        except StopIteration:
            pass
        except RecursionError:
            message = f'Error while trying to read, "{print_path}". There are likely too deeply nested objects or arrays. Skipping...'

            status.alerts.append(message)
            log.warning(message)
        except ValueError:
            message = f'Error while trying to read, "{print_path}". It may not be valid JSON. Skipping...'

            status.alerts.append(message)
            log.warning(message)
        except Exception:
            message = f'Unexpected error while trying to read, "{print_path}. Skipping...'

            status.errors.append(message)
            log.error(message)

            log.error(traceback.format_exc())

    if file_results:
        # A file can contain multiple version fields, so we pop one off to return so that we do not
        # duplicate files
        return file_results.pop(0)


def get_yaml_specs(path: Path, status: Status, print_path: str) -> Iterator[SpecMetadata]:
    log.debug(f'Checking if "{print_path}" is a spec...')

    with open(path, "r") as file:
        try:
            # YAML specs can have multiple YAML documents in a single file (with '---'), so we must
            # parse all and iterate through them
            yaml_docs = yaml.load_all(file, Loader=IgnoreUnknownTagsLoader)

            for data in yaml_docs:
                # Spec should be dict at top level
                if isinstance(data, dict):
                    for field in version_fields:
                        version = data.get(field)

                        if version is not None:
                            log.info(f'Found spec, "{print_path}". It has field, "{field}" with value "{version}".')

                            yield {
                                "path": print_path,
                                "field": field,
                                "version": sanitize_version(version),
                            }

                            # We only want to yield one result per file, even if the file has
                            # multiple version_fields
                            break
        except UnicodeDecodeError:
            message = f'UnicodeDecodeError while trying to read, "{print_path}". Skipping...'

            status.alerts.append(message)
            log.warning(message)
        except YAMLError:
            message = f'Error while trying to read, "{print_path}". It may not be valid YAML. Skipping...'

            status.alerts.append(message)
            log.warning(message)
        except Exception:
            message = f'Unexpected error while trying to read, "{print_path}. Skipping...'

            status.errors.append(message)
            log.error(message)

            log.error(traceback.format_exc())


def get_paths_with_extensions(path: str, extensions: Iterable[str]) -> Iterator[Path]:
    base = Path(path)

    results_map = map(lambda ext: base.rglob(f"*.{ext}"), extensions)
    return itertools.chain.from_iterable(results_map)


def sanitize_version(version: Any) -> str:
    # This is whatever is stored in the field with key within `version_fields`. As a result, it can
    # be anything (imagine the case of a file that models a person and has a field "swagger" with a
    # novel-length string describing how cool they are)
    #
    # Realistically, this should be a short version string, like `3.1.0`. Theoretically, it could
    # also include other characters (ex: `3.1.0-rc2` or `4.2.0-alpha`), which limits regex
    # validation. So, we convert it to a string and truncate exceptionally-long results
    return str(version)[:50]


if __name__ == "__main__":
    main()
