import django
from django.conf import settings

from artemisdb import settings as artemisdb_settings

settings.configure(
    DATABASES=artemisdb_settings.DATABASES,
    SECRET_KEY=artemisdb_settings.SECRET_KEY,
    INSTALLED_APPS=artemisdb_settings.INSTALLED_APPS,
    LANGUAGE_CODE=artemisdb_settings.LANGUAGE_CODE,
    TIME_ZONE=artemisdb_settings.TIME_ZONE,
    USE_I18N=artemisdb_settings.USE_I18N,
    USE_L10N=artemisdb_settings.USE_L10N,
    US_TZ=artemisdb_settings.USE_TZ,
    MIGRATION_MODULES=artemisdb_settings.MIGRATION_MODULES,
    DEFAULT_AUTO_FIELD=artemisdb_settings.DEFAULT_AUTO_FIELD,
)
django.setup()
