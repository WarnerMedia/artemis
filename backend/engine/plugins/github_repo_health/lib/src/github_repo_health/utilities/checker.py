from github_repo_health import rules


class Checker:
    def __init__(self, github, config):
        """
        Construct a Checker object

        :param github: An authenticated Github object
        :param config: An array, where items have 'type' fields that are check ids to run
            - The rest of the object acts as the config. Depending on the check, this is optional and only a "type" field is required
        """

        self._github = github
        self._config = config

    def run(self, owner, repo, branch):
        # Filter out rules that are explicitly disabled
        # A rule with a config that omits the 'enabled' property will still be run
        rule_configs = self._config.get("rules")
        checks_to_run = filter(lambda rule_config: rule_config.get("enabled", True), rule_configs)

        results = map(
            lambda rule_config: self.run_check(rule_config, owner, repo, branch),
            checks_to_run,
        )

        return list(results)

    def run_check(self, rule_config, owner, repo, branch):
        rule_type = rule_config.get("type")
        rule = rules.rules_dict.get(rule_type)

        if rule_type is None:
            raise Exception('Rule configurations must have "type" field')
        if rule is None:
            raise Exception(f'Unrecognized rule type: "{rule_type}"')

        return rule.check(self._github, owner, repo, branch, rule_config)

    @staticmethod
    def get_available_rules():
        keys = rules.rules_dict.keys()

        def get_rule(key):
            rule = rules.rules_dict.get(key)

            return {
                "type": rule.identifier,
                "name": rule.name,
                "description": rule.description,
                "config_schema": rule.config_schema,
            }

        return list(map(get_rule, keys))
