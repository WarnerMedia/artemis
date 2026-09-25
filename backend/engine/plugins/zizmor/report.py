from pydantic import BaseModel, Field, RootModel

# JSON v1 models referenced from the Zizmor example and source code:
# https://docs.zizmor.sh/usage/#json
# Unused fields are omitted.


class Determinations(BaseModel):
    severity: str


class Point(BaseModel):
    row: int
    column: int


class ConcreteLocationLocation(BaseModel):
    start_point: Point


class ConcreteLocation(BaseModel):
    location: ConcreteLocationLocation


class LocalKey(BaseModel):
    given_path: str


class SymbolicKey(BaseModel):
    # We assume the input key is always of type "Local".
    # Any other types ("Remote", "Stdin", etc.) are ignored.
    local: LocalKey = Field(alias="Local")


class SymbolicLocation(BaseModel):
    key: SymbolicKey
    annotation: str


class Location(BaseModel):
    symbolic: SymbolicLocation
    concrete: ConcreteLocation


class Finding(BaseModel):
    desc: str
    determinations: Determinations
    locations: list[Location]


Report = RootModel[list[Finding]]
