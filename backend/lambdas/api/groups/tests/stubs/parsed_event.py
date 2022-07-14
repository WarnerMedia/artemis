class ParsedEventStub:
    def __init__(self, body=None):
        if body:
            self.body = body
        else:
            self.body = {
                "parent": "182",
                "name": "test name",
                "description": "test description",
                "permissions": {"scope": {}},
            }
