class BaseResolver:
    """
    Abstract class for file format-specific line number resolvers
    """

    def find(self, search: str):
        pass
