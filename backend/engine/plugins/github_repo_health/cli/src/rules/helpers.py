array_config_schema = {
    "all_of": {"type": "array", "items": {"type": "string"}},
    "any_of": {"type": "array", "items": {"type": "string"}},
    "none_of": {"type": "array", "items": {"type": "string"}},
}


def evaluate_array_config(config, eval_fn):
    """
    Config has three optional fields.
    all_of -> array of items. Passes if all of the items eval to true
    any_of -> array of items. Passes if any of the items eval to true
    none_of -> array of items. Passes if none of the items eval to true
    """

    all_of = config.get("all_of")
    any_of = config.get("any_of")
    none_of = config.get("none_of")

    all_of_pass = all_of is None or all(map(eval_fn, all_of))
    any_of_pass = any_of is None or any(map(eval_fn, any_of))
    none_of_pass = none_of is None or not any(map(eval_fn, none_of))

    return all_of_pass and any_of_pass and none_of_pass


def add_metadata(passing, check, config={}, error_message=None):
    name = config.get("name") or check.name
    description = config.get("description") or check.description
    id = config.get("id") or check.identifier

    result = {
        "id": id,
        "name": name,
        "description": description,
        "pass": passing,
    }

    if error_message:
        result["error_message"] = error_message

    return result


def is_subdict_of(expected, target):
    """
    Checks that all keys and values in expected are in target
    """
    keys = expected.keys()

    results = map(lambda key: target.get(key) == expected.get(key), keys)

    return all(results)
