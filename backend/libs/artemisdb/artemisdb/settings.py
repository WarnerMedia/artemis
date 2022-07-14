from artemislib.creds.db import DatabaseCreds
from artemislib.creds.django import DjangoSecrets

secrets = DjangoSecrets()
SECRET_KEY = secrets.secret_key

INSTALLED_APPS = [
    "artemisdb.artemisdb",
]

creds = DatabaseCreds()
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": creds.name,
        "USER": creds.username,
        "PASSWORD": creds.password,
        "HOST": creds.host,
        "PORT": creds.port,
    }
}

MIGRATION_MODULES = {"artemisdb": "artemisdb.artemisdb.migrations"}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True

PASSWORD_HASHERS = ["django.contrib.auth.hashers.PBKDF2PasswordHasher"]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
