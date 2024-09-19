from dataclasses import dataclass
from re import Pattern

@dataclass
class SecretRegex:
    finding_type: str
    regex: Pattern
