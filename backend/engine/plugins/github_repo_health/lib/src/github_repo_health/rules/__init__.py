# ignore star imports
# flake8: noqa: F403, F405
from .composite_rule import CompositeRule
from .first_order_rules import *

rules_dict = dict(first_order_rules_dict)
rules_dict[CompositeRule.identifier] = CompositeRule
