import json
import subprocess
from typing import Optional, TypedDict

from engine.plugins.lib import utils

log = utils.setup_logging("base_images")


class Result(TypedDict):
    tags: list[str]
    digests: list[str]


def main(in_args=None):
    args = utils.parse_args(in_args)

    from_lines = find_from_lines(args.path)
    scan_results = process_from_lines(from_lines)
    event_info = build_event_info(scan_results)

    success = bool(scan_results)
    if success:
        scan_results = {"base_images": scan_results}
        event_info = {"base_images": event_info}

    # Print the results to stdout
    print(json.dumps({"success": success, "details": scan_results, "truncated": False, "event_info": event_info}))


def find_from_lines(path: str) -> list[str]:
    # Run egrep to look for all of the FROM lines in Dockerfiles.
    r = subprocess.run(
        [
            "egrep",
            "--binary-files=without-match",
            "--only-matching",
            "--no-filename",
            "--recursive",
            "--ignore-case",
            "--include",
            "Dockerfile*",
            "^([ ]+){0,1}FROM (--platform=){0,1}[-_.:\\${} /=a-z0-9]+$",
            path,
        ],
        capture_output=True,
        check=False,
    )

    # egrep returns 0 if there was a match and 1 if there were no matches
    if r.returncode != 0:
        return []

    return r.stdout.decode("UTF-8").strip().split("\n")


def process_from_lines(from_lines: list[str]) -> dict[str, Result]:
    images: dict[str, Result] = {}

    # Go through the FROM lines and extract just the image name and tag
    for line in from_lines:
        imagetag = extract_imagetag(line)
        if imagetag is None:
            continue
        image, tag, digest = split_image_and_tag(imagetag)
        if not image:
            # Skip invalid images
            continue
        if image not in images:
            images[image] = {"tags": [], "digests": []}
        if tag not in images[image]["digests" if digest else "tags"]:
            images[image]["digests" if digest else "tags"].append(tag)

    return images


def extract_imagetag(line: str) -> Optional[str]:
    split = line.split()
    if len(split) == 2:
        index = 1
    elif len(split) > 2:
        if split[1].startswith("--platform"):
            index = 2
        else:
            index = 1
    else:
        # This shouldn't happen since find_from_lines should only return
        # lines starting with "FROM ".
        log.error(f"Invalid FROM directive: {line}")
        return None

    return split[index]


def split_image_and_tag(in_image: str) -> tuple[Optional[str], str, bool]:
    image = in_image
    tag = "latest"  # If no tag or commit the default is "latest"
    digest = False

    if ":" in image:
        image, tag = in_image.split(":", maxsplit=1)
    elif "@" in image:
        image, tag = in_image.split("@", maxsplit=1)
        digest = True

    if not validate_image_tag(image):
        image = None
    if not validate_image_tag(tag):
        # If the tag is not valid assume latest so that the image is still recorded
        tag = "latest"
        digest = False

    return image, tag, digest


def validate_image_tag(val: str) -> bool:
    # Images or tags that have variables are invalid for this purpose
    if "$" in val:
        return False
    return True


def build_event_info(scan_results: dict[str, Result]) -> list[str]:
    event_info: list[str] = []
    for image in scan_results:
        for tag in scan_results[image]["tags"]:
            event_info.append(f"{image}:{tag}")
        for digest in scan_results[image]["digests"]:
            event_info.append(f"{image}@{digest}")
    return event_info


if __name__ == "__main__":  # pragma: no cover
    main()
