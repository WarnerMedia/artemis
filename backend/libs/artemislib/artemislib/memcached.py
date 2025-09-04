import ssl
from pymemcache.client.base import Client
from artemislib.env import MEMCACHE_ENDPOINT, MEMCACHE_PORT

_memcache_client = None


def get_memcache_client():
    global _memcache_client
    if _memcache_client is None:
        context = ssl.create_default_context()
        _memcache_client = Client(
            server=(MEMCACHE_ENDPOINT, MEMCACHE_PORT),
            tls_context=context,
        )
    return _memcache_client
