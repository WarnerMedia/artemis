from dataclasses import dataclass, field


@dataclass
class MockGroup:
    parent: any = None
    name: str = "test_group"
    description: str = "test_description"
    permissions: dict = field(default_factory=dict)
    id: int = 0
    group_id: str = "23fjwojc329j2flkjavlkn23"
    created: int = 0
    created_by: str = "fun@example.com"

    def to_dict(self):
        return {
            "id": self.group_id,
            "parent": self.parent.group_id if self.parent else None,
            "name": self.name,
            "description": self.description,
            "created": self.created,
            "created_by": self.created_by,
            "permissions": {
                "scope": self.permissions.get("scope"),
                "features": self.permissions.get("features"),
                "allowlist": False,
                "admin": True,
            },
        }


MOCK_GROUP_RESPONSE_1 = {
    "id": 1,
    "parent": None,
    "name": "Artemis Group",
    "description": "Test group meant for mocking purposes only",
    "created": "2022-01-10T22:14:05.164665+00:00",
    "created_by": "testuser@example.com",
    "permissions": {
        "scope": [
            "github/testorg/testrepo",
        ],
        "features": {"Snyk": True},
    },
}
