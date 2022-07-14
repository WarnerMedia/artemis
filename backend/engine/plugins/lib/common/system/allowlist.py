from fnmatch import fnmatch

from artemislib.singleton import Singleton


class SystemAllowList(metaclass=Singleton):
    def __init__(self, model=None, al_type: str = None) -> None:
        self.model = None
        if model is None:
            from artemisdb.artemisdb.models import SystemAllowListItem  # pylint: disable=import-outside-toplevel

            self.model = SystemAllowListItem

        # Load the System Allowlist from the DB
        self._items = self._load_al(al_type)

    def _load_al(self, al_type: str) -> list:
        return [item["value"] for item in self.model.objects.filter(item_type=al_type).values("value")]

    def ignore_secret(self, filename: str, value: str) -> bool:
        for item in self._items:
            if (
                ("filename" in item and "value" not in item and fnmatch(filename, item["filename"]))
                or ("value" in item and "filename" not in item and fnmatch(value, item["value"]))
                or (
                    "value" in item
                    and "filename" in item
                    and fnmatch(filename, item["filename"])
                    and fnmatch(value, item["value"])
                )
            ):
                return True
        return False
