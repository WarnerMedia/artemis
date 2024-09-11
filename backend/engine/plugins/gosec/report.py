from pydantic import BaseModel, Field

# JSON models referenced from the gosec sources:
# https://github.com/securego/gosec/blob/v2.18.2/report.go#L8-L13
# Unused fields are omitted.


class Weakness(BaseModel):
    id: str


class Issue(BaseModel):
    severity: str
    cwe: Weakness
    rule_id: str
    details: str
    file: str
    line: str


class Metrics(BaseModel):
    files: int
    lines: int
    nosec: int
    found: int


class ReportInfo(BaseModel):
    issues: list[Issue] = Field(alias="Issues")
    stats: Metrics = Field(alias="Stats")
