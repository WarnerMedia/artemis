from collections import namedtuple

PLUGIN_RESULTS = namedtuple("PLUGIN_RESULTS", ["findings", "errors", "success", "summary"])


class PluginErrors:
    def __init__(self) -> None:
        self.errors = {}
        self.alerts = {}
        self.debug = {}

    def update(self, obj, name_override=None):
        if isinstance(obj, PluginErrors):
            self.errors.update(obj.errors)
            self.alerts.update(obj.alerts)
            self.debug.update(obj.debug)
        else:
            name = name_override or obj.plugin_name
            if obj.errors:
                self.errors[name] = obj.errors
            if obj.alerts:
                self.alerts[name] = obj.alerts
            if obj.debug:
                self.debug[name] = obj.debug

    def __eq__(self, o: object) -> bool:
        if not isinstance(o, PluginErrors):
            return NotImplemented
        return self.errors == o.errors and self.alerts == o.alerts and self.debug == o.debug
