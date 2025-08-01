from datetime import datetime, timezone
from typing import Optional

from artemislib.singleton import Singleton


class DBLookupCache(metaclass=Singleton):
    def __init__(self, cache_item_model=None) -> None:
        self.cache_item_model = None
        if cache_item_model is None:
            from artemisdb.artemisdb.models import CacheItem  # pylint: disable=import-outside-toplevel

            self.cache_item_model = CacheItem

    def lookup(self, key: str) -> Optional[str]:
        if self.cache_item_model is None or key is None:
            return None

        try:
            item = self.cache_item_model.objects.get(key=key)
            if item.expires is not None and item.expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                return None
            item.accessed = datetime.now(timezone.utc)
            item.save()
            return item.value
        except self.cache_item_model.DoesNotExist:
            return None

    def store(self, key: str, value: str, expires: Optional[datetime] = None):
        if self.cache_item_model is not None:
            self.cache_item_model.objects.update_or_create(key=key, defaults={"value": value, "expires": expires})
