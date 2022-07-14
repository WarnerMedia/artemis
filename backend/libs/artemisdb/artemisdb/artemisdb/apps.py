from django.apps import AppConfig


class ArtemisDBConfig(AppConfig):
    name = "artemisdb"
    verbose_name = "Artemis Database"

    # Set to False to prevent Django from selecting a configuration class automatically. This is needed due to a
    # change in how apps are detected in Django 3.2, which is incompatible with how the artemisdb library is
    # using Django.
    default = False
